import { Queue, Worker, Job } from 'bullmq';
import { bullmqConnection } from './connection';
import { db } from '../db';
import { users } from '@arena/database';
import { eq } from 'drizzle-orm';
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

// ── Skill Vector Structure ─────────────────────────────────────────────────

interface SkillVector {
    easy: { wins: number; total: number };
    medium: { wins: number; total: number };
    hard: { wins: number; total: number };
    avgExecutionTime: number;
    totalMatches: number;
    preferredLanguages: Record<number, number>; // languageId → count
    lastUpdated: string;
}

const DEFAULT_SKILL_VECTOR: SkillVector = {
    easy: { wins: 0, total: 0 },
    medium: { wins: 0, total: 0 },
    hard: { wins: 0, total: 0 },
    avgExecutionTime: 0,
    totalMatches: 0,
    preferredLanguages: {},
    lastUpdated: new Date().toISOString(),
};

// ── Worker ─────────────────────────────────────────────────────────────────

export const analyticsWorker = new Worker<AnalyticsJobData>(
    'analytics',
    async (job: Job<AnalyticsJobData>) => {
        const { userId, matchId, problemDifficulty, result, executionTime, languageId } = job.data;

        logger.info({ userId, matchId, jobId: job.id }, '[QUEUE:ANALYTICS] Processing skill vector update');

        // 1. Fetch current skill vector from DB
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { skillVector: true },
        });

        const currentVector: SkillVector = (user?.skillVector as SkillVector) || { ...DEFAULT_SKILL_VECTOR };

        // 2. Update difficulty-specific stats
        const difficulty = problemDifficulty.toLowerCase() as 'easy' | 'medium' | 'hard';
        if (currentVector[difficulty]) {
            currentVector[difficulty].total += 1;
            if (result === 'win') {
                currentVector[difficulty].wins += 1;
            }
        }

        // 3. Update aggregate stats
        currentVector.totalMatches += 1;

        if (executionTime !== null) {
            // Running average of execution time
            const prevTotal = currentVector.totalMatches - 1;
            currentVector.avgExecutionTime =
                (currentVector.avgExecutionTime * prevTotal + executionTime) / currentVector.totalMatches;
        }

        // 4. Track preferred languages
        currentVector.preferredLanguages[languageId] =
            (currentVector.preferredLanguages[languageId] || 0) + 1;

        currentVector.lastUpdated = new Date().toISOString();

        // 5. Write back to PostgreSQL (jsonb column)
        await db.update(users)
            .set({ skillVector: currentVector })
            .where(eq(users.id, userId));

        logger.info({ userId, totalMatches: currentVector.totalMatches }, '[QUEUE:ANALYTICS] Skill vector updated');

        return currentVector;
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
