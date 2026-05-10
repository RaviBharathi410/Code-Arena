import { Queue, Worker, Job } from 'bullmq';
import { bullmqConnection } from './connection';
import { db } from '../db';
import { users } from '@arena/database';
import { eq } from 'drizzle-orm';
import { leaderboard } from '../lib/leaderboard';
import { logger } from '../lib/logger';

// ── Queue Definition ───────────────────────────────────────────────────────

export interface EloJobData {
    winnerId: string;
    loserId: string;
    matchId: string;
    timeLimit: number;
    timeTaken: number;
}

export const eloQueue = new Queue<EloJobData>('elo-recalculation', {
    connection: bullmqConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
    },
});

// ── Socket.IO reference for emitting updates ──────────────────────────────

let socketIOInstance: any = null;

export function setSocketIOInstance(io: any) {
    socketIOInstance = io;
}

// ── Elo Calculation ────────────────────────────────────────────────────────

/**
 * Standard Elo formula with Time Limit Multiplier.
 * K=32 for players with <30 games, K=16 for experienced players.
 */
function calculateEloChange(winnerElo: number, loserElo: number, winnerGames: number, loserGames: number, timeLimit: number, timeTaken: number) {
    const kWinner = winnerGames < 30 ? 32 : 16;
    const kLoser = loserGames < 30 ? 32 : 16;

    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

    let baseWinnerGain = Math.round(kWinner * (1 - expectedWinner));
    let baseLoserLoss = Math.round(kLoser * (0 - expectedLoser));

    // Phase 3: Time Limit Penalty/Bonus
    // 2 min (120s) = 1.2x, 5 min (300s) = 1.0x, 10 min (600s) = 0.8x
    let timeMultiplier = 1.0;
    if (timeLimit <= 120) timeMultiplier = 1.2;
    else if (timeLimit >= 600) timeMultiplier = 0.8;

    // Time taken bonus (finish fast = slight bonus)
    // Up to 10% extra if finished instantly (unlikely), scales linearly
    const speedBonus = 1 + (0.1 * (1 - (timeTaken / timeLimit)));

    const winnerGain = Math.round(baseWinnerGain * timeMultiplier * speedBonus);
    const loserLoss = Math.round(baseLoserLoss * timeMultiplier);

    return { winnerGain, loserLoss };
}

// ── Worker ─────────────────────────────────────────────────────────────────

export const eloWorker = new Worker<EloJobData>(
    'elo-recalculation',
    async (job: Job<EloJobData>) => {
        const { winnerId, loserId, matchId, timeLimit = 300, timeTaken = 300 } = job.data;

        logger.info({ matchId, winnerId, loserId, jobId: job.id }, '[QUEUE:ELO] Processing Elo update');

        // 1. Fetch both players
        const winner = await db.query.users.findFirst({
            where: eq(users.id, winnerId),
        });
        const loser = await db.query.users.findFirst({
            where: eq(users.id, loserId),
        });

        if (!winner || !loser) {
            throw new Error(`Players not found: winner=${winnerId}, loser=${loserId}`);
        }

        // 2. Calculate Elo changes (K=32 for <30 games, K=16 thereafter)
        const winnerGames = (winner.wins || 0) + (winner.losses || 0);
        const loserGames = (loser.wins || 0) + (loser.losses || 0);
        const { winnerGain, loserLoss } = calculateEloChange(
            winner.eloRating,
            loser.eloRating,
            winnerGames,
            loserGames,
            timeLimit,
            timeTaken
        );

        const newWinnerElo = winner.eloRating + winnerGain;
        const newLoserElo = Math.max(0, loser.eloRating + loserLoss); // Floor at 0

        // 3. Update PostgreSQL
        await db.update(users)
            .set({
                eloRating: newWinnerElo,
                wins: (winner.wins || 0) + 1,
                updatedAt: new Date(),
            })
            .where(eq(users.id, winnerId));

        await db.update(users)
            .set({
                eloRating: newLoserElo,
                losses: (loser.losses || 0) + 1,
                updatedAt: new Date(),
            })
            .where(eq(users.id, loserId));

        // 4. Update Redis leaderboard sorted set
        await leaderboard.updateRating(winnerId, newWinnerElo);
        await leaderboard.updateRating(loserId, newLoserElo);

        // 5. Emit Elo update to both players via Socket.IO
        if (socketIOInstance) {
            socketIOInstance.to(matchId).emit('match:eloUpdate', {
                matchId,
                updates: [
                    { userId: winnerId, eloRating: newWinnerElo, change: winnerGain },
                    { userId: loserId, eloRating: newLoserElo, change: loserLoss },
                ],
            });
        }

        logger.info({
            matchId,
            winner: { id: winnerId, elo: `${winner.eloRating} → ${newWinnerElo} (+${winnerGain})` },
            loser: { id: loserId, elo: `${loser.eloRating} → ${newLoserElo} (${loserLoss})` },
        }, '[QUEUE:ELO] Elo update complete');

        return { newWinnerElo, newLoserElo, winnerGain, loserLoss };
    },
    {
        connection: bullmqConnection,
        concurrency: 5,
    }
);

eloWorker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, '[QUEUE:ELO] Job completed');
});

eloWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, '[QUEUE:ELO] Job failed');
});
