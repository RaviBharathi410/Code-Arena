import { Queue, Worker, Job } from 'bullmq';
import { bullmqConnection } from './connection';
import { User } from '../models/User';
import { MatchRoom } from '../models/MatchRoom';
import { Problem } from '../models/Problem';
import { logger } from '../lib/logger';
import { createBullMQRedisClient } from '../lib/redis';

// ── Queue Definition ───────────────────────────────────────────────────────

export interface AnalyticsJobData {
    userId: string;
    matchId: string;
    problemDifficulty: string;
    result: 'win' | 'loss';
    executionTime: number | null;
    languageId: number;
}

export const analyticsQueue = new Queue<AnalyticsJobData>('analytics', {
    connection: createBullMQRedisClient(),
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'fixed',
            delay: 5000,
        },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 1000 },
    },
});

// ── Worker ─────────────────────────────────────────────────────────────────

export const analyticsWorker = new Worker<AnalyticsJobData>(
    'analytics',
    async (job: Job<AnalyticsJobData>) => {
        const { userId, matchId, problemDifficulty, result } = job.data;

        logger.info({ userId, matchId, jobId: job.id }, '[QUEUE:ANALYTICS] Processing skill vector update');

        // 1. Fetch category and difficulty
        let category = 'arrays';
        let difficulty = problemDifficulty || 'easy';

        if (matchId) {
            const match = await MatchRoom.findById(matchId).populate('problemId').lean();
            const problem = match?.problemId as any;
            if (problem) {
                category = problem.category || category;
                difficulty = problem.difficulty || difficulty;
            }
        }

        // 2. Fetch current user skill vector and elo rating
        const user = await User.findById(userId).lean();

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        const currentVector = (user.skillVector as Record<string, number> | null) || {
            arrays: 1000,
            strings: 1000,
            trees: 1000,
            graphs: 1000,
            dp: 1000,
            math: 1000,
            sorting: 1000,
            hashing: 1000,
        };

        const catKey = category.toLowerCase();
        if (currentVector[catKey] === undefined) {
            currentVector[catKey] = 1000;
        }

        // 3. ELO-style per-category update
        const K = result === 'win' ? 32 : 16;
        const actual = result === 'win' ? 1 : 0;

        const diffMap: Record<string, number> = {
            easy: 1000,
            medium: 1400,
            hard: 1800,
        };
        const diffRating = diffMap[difficulty.toLowerCase()] || 1200;

        const currentCatRating = currentVector[catKey];
        const expected = 1 / (1 + Math.pow(10, (diffRating - currentCatRating) / 400));
        const delta = Math.round(K * (actual - expected));

        const newCatRating = Math.max(100, Math.min(3000, currentCatRating + delta));
        currentVector[catKey] = newCatRating;

        // 4. Update overall ELO and stats
        const isWin = result === 'win';
        const newElo = Math.max(100, Math.min(3000, user.eloRating + (isWin ? 32 : -16)));
        const newMatchesPlayed = user.matchesPlayed + 1;
        const newMatchesWon = user.matchesWon + (isWin ? 1 : 0);

        await User.updateOne({ _id: userId }, {
            $set: {
                skillVector: currentVector,
                eloRating: newElo,
                matchesPlayed: newMatchesPlayed,
                matchesWon: newMatchesWon,
            }
        });

        logger.info({ userId, category: catKey, prevRating: currentCatRating, newRating: newCatRating, elo: newElo }, '[QUEUE:ANALYTICS] Skill vector and ELO updated in DB');

        return {
            skillVector: currentVector,
            eloRating: newElo,
            matchesPlayed: newMatchesPlayed,
            matchesWon: newMatchesWon,
        };
    },
    {
        connection: createBullMQRedisClient(),
        concurrency: 5,
    }
);

analyticsWorker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, '[QUEUE:ANALYTICS] Job completed');
});

analyticsWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, '[QUEUE:ANALYTICS] Job failed');
});
