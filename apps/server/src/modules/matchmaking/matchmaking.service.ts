import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';
import { db } from '../../db';
import { matches } from '@arena/database';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { problemsService } from '../problems/problems.service';
import { matchmakingQueue, type MatchPair } from '../../lib/matchmaking-queue';

/**
 * MatchmakingService — Orchestrates matchmaking using the Redis-backed MatchmakingQueue.
 *
 * The MatchmakingQueue handles the sorted set operations and background polling.
 * This service wires match creation logic into the queue's onMatch callback.
 */
export class MatchmakingService {
    private readonly MATCH_TTL = 3600; // 1 hour

    constructor(private io: Server) {
        // Register the match creation callback on the background polling loop
        matchmakingQueue.onMatch((pair: MatchPair) => {
            this.createMatch(pair.player1Id, pair.player2Id);
        });

        // Start the background polling loop (500ms interval)
        matchmakingQueue.startPolling();
        logger.info('[MATCHMAKING] Service initialized with background polling');
    }

    async findMatch(userId: string, eloRating: number) {
        logger.info({ userId, eloRating }, '[MATCHMAKING] User joining queue');
        await matchmakingQueue.addToQueue(userId, eloRating);
    }

    private async createMatch(player1Id: string, player2Id: string) {
        const matchId = crypto.randomUUID();

        try {
            // Select a random problem using the optimized service method
            const problem = await problemsService.getRandomProblem();

            if (!problem) {
                throw new Error('No problems available for match');
            }

            // Create record in DB — timestamps are now Date objects for PostgreSQL
            await db.insert(matches).values({
                id: matchId,
                player1Id,
                player2Id,
                problemId: problem.id,
                status: 'active',
                startedAt: new Date(),
            });

            // Store active match state in Redis for fast access
            await redis.setex(`match:${matchId}`, this.MATCH_TTL, JSON.stringify({
                id: matchId,
                player1Id,
                player2Id,
                problemId: problem.id,
                status: 'active'
            }));

            logger.info({ matchId, player1Id, player2Id }, '[MATCHMAKING] Match created');

            // Notify player 1
            this.io.to(`user:${player1Id}`).emit('MATCH_FOUND', {
                matchId,
                problem,
                opponentId: player2Id
            });

            // Notify player 2
            this.io.to(`user:${player2Id}`).emit('MATCH_FOUND', {
                matchId,
                problem,
                opponentId: player1Id
            });

        } catch (err) {
            logger.error({ err }, '[MATCHMAKING] Failed to create match');
            // Re-queue users if match creation fails (preserve their Elo)
            await matchmakingQueue.addToQueue(player1Id, 1200);
            await matchmakingQueue.addToQueue(player2Id, 1200);
        }
    }

    async removeFromQueue(userId: string) {
        await matchmakingQueue.removeFromQueue(userId);
    }

    /**
     * Get current queue depth (useful for metrics/admin dashboard).
     */
    async getQueueSize(): Promise<number> {
        return matchmakingQueue.getQueueSize();
    }
}
