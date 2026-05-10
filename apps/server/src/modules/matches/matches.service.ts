import { db } from '../../db';
import { matches, users } from '@arena/database';
import { eq, desc, or } from 'drizzle-orm';
import { logger } from '../../lib/logger';
import { eloQueue, analyticsQueue } from '../../queues';
import { redis } from '../../lib/redis';

export class MatchesService {
    async getUserMatches(userId: string) {
        return db
            .select()
            .from(matches)
            .where(
                or(
                    eq(matches.player1Id, userId),
                    eq(matches.player2Id, userId)
                )
            )
            .orderBy(desc(matches.createdAt));
    }

    async getRecentMatches(userId: string, limit: number = 10) {
        return db
            .select()
            .from(matches)
            .where(
                or(
                    eq(matches.player1Id, userId),
                    eq(matches.player2Id, userId)
                )
            )
            .orderBy(desc(matches.createdAt))
            .limit(limit);
    }

    async getMatchById(id: string) {
        const match = await db.query.matches.findFirst({
            where: eq(matches.id, id),
        });
        if (!match) {
            throw new Error('Match not found');
        }
        return match;
    }

    async forfeitMatch(matchId: string, userId: string) {
        const match = await this.getMatchById(matchId);

        if (match.status !== 'active') {
            throw new Error('Match is not active');
        }

        if (match.player1Id !== userId && match.player2Id !== userId) {
            throw new Error('Forbidden: Not a participant');
        }

        const winnerId = match.player1Id === userId ? match.player2Id : match.player1Id;

        if (!winnerId) {
            throw new Error('Opponent not found');
        }

        return this.setWinner(matchId, winnerId);
    }

    /**
     * Set the winner of a match.
     *
     * Previously this did Elo calculation synchronously in a transaction.
     * Now it updates the match record and enqueues background jobs for:
     * 1. Elo recalculation (via eloQueue)
     * 2. Skill vector analytics (via analyticsQueue) for both players
     *
     * This eliminates blocking the request cycle with heavy computation.
     */
    async setWinner(matchId: string, winnerId: string) {
        // 1. Update match record atomically
        const match = await db.query.matches.findFirst({
            where: eq(matches.id, matchId),
        });

        if (!match || match.status !== 'active' || match.winnerId) {
            return match;
        }

        const [updatedMatch] = await db.update(matches)
            .set({
                winnerId,
                status: 'completed',
                endedAt: new Date(),
            })
            .where(eq(matches.id, matchId))
            .returning();

        const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;

        if (!loserId) {
            logger.warn({ matchId }, '[MATCH] No loser found (solo match?)');
            return updatedMatch;
        }

        // 2. Enqueue Elo recalculation (async, non-blocking)
        // Read timeTaken for winner from Redis (set at submission time)
        const timeTakenStr = await redis.get(`match:${matchId}:timeTaken:${winnerId}`);
        const timeTaken = timeTakenStr ? parseInt(timeTakenStr) : match.timeLimit ?? 300;
        const timeLimit = match.timeLimit ?? 300;

        await eloQueue.add('elo-update', {
            winnerId,
            loserId,
            matchId,
            timeLimit,
            timeTaken,
        }, {
            jobId: `elo-${matchId}`, // Idempotent: same match won't be processed twice
        });

        logger.info({ matchId, winnerId, loserId }, '[MATCH] Elo recalculation job enqueued');

        // 3. Enqueue analytics update for both players (async, non-blocking)
        // Fetch the problem to know difficulty
        const matchWithProblem = await db.query.matches.findFirst({
            where: eq(matches.id, matchId),
        });

        const problemDifficulty = 'medium'; // TODO: join with problems table for actual difficulty

        await analyticsQueue.add('analytics-winner', {
            userId: winnerId,
            matchId,
            problemDifficulty,
            result: 'win',
            executionTime: null,
            languageId: 0,
        });

        await analyticsQueue.add('analytics-loser', {
            userId: loserId,
            matchId,
            problemDifficulty,
            result: 'loss',
            executionTime: null,
            languageId: 0,
        });

        logger.info({ matchId }, '[MATCH] Analytics jobs enqueued for both players');

        return updatedMatch;
    }
}

export const matchesService = new MatchesService();
