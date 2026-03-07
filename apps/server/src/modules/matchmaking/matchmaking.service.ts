import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';
import { db } from '../../db';
import { matches, problems } from '@arena/database';
import crypto from 'crypto';
import { Server } from 'socket.io';

export class MatchmakingService {
    private readonly QUEUE_KEY = 'matchmaking:queue';
    private readonly MATCH_TTL = 3600; // 1 hour

    constructor(private io: Server) { }

    async findMatch(userId: string, urlo: number) {
        logger.info(`[MATCHMAKING] User ${userId} joined queue with ELO ${urlo}`);

        // 1. Add user to Redis sorted set (ELO as score)
        await redis.zadd(this.QUEUE_KEY, urlo, userId);

        // 2. Look for opponents within ±50 ELO
        const matchFound = await this.tryPair(userId, urlo);

        if (!matchFound) {
            // 3. If no match found, wait and widening search if needed (handled via client polling or timed server loop)
            // For now, we simple notify "waiting"
            logger.debug(`[MATCHMAKING] No immediate match for ${userId}, waiting in queue.`);
        }
    }

    private async tryPair(userId: string, urlo: number): Promise<boolean> {
        // Find potential opponents in range [ELO - 50, ELO + 50]
        const range = 50;
        const potentialOpponents = await redis.zrangebyscore(
            this.QUEUE_KEY,
            urlo - range,
            urlo + range
        );

        // Filter out the joining user themselves
        const opponents = potentialOpponents.filter(id => id !== userId);

        if (opponents.length > 0) {
            const opponentId = opponents[0];

            // Atomically remove both from queue to prevent double matches
            const multi = redis.multi();
            multi.zrem(this.QUEUE_KEY, userId);
            multi.zrem(this.QUEUE_KEY, opponentId);
            const results = await multi.exec();

            // Check if both were actually removed (prevents race condition)
            if (results && results[0][1] === 1 && results[1][1] === 1) {
                await this.createMatch(userId, opponentId);
                return true;
            }
        }
        return false;
    }

    private async createMatch(player1Id: string, player2Id: string) {
        const matchId = crypto.randomUUID();

        try {
            // Select a random problem
            const allProblems = await db.select().from(problems).all();
            const problem = allProblems[Math.floor(Math.random() * allProblems.length)];

            if (!problem) {
                throw new Error('No problems available for match');
            }

            // Create record in DB
            await db.insert(matches).values({
                id: matchId,
                player1Id,
                player2Id,
                problemId: problem.id,
                status: 'active',
                startedAt: new Date().toISOString()
            });

            // Store active match state in Redis for fast access
            await redis.setex(`match:${matchId}`, this.MATCH_TTL, JSON.stringify({
                id: matchId,
                player1Id,
                player2Id,
                problemId: problem.id,
                status: 'active'
            }));

            logger.info(`[MATCHMAKING] Match created: ${matchId} (${player1Id} vs ${player2Id})`);

            // Notify both players via Socket.IO
            this.io.to(`user:${player1Id}`).to(`user:${player2Id}`).emit('MATCH_FOUND', {
                matchId,
                problem,
                opponentId: player1Id === player1Id ? player2Id : player1Id // Placeholder logic for UI
            });

        } catch (err) {
            logger.error({ err }, '[MATCHMAKING] Failed to create match');
            // Re-queue users if match creation fails?
            await redis.zadd(this.QUEUE_KEY, 0, player1Id); // Fallback ELO or re-fetch
            await redis.zadd(this.QUEUE_KEY, 0, player2Id);
        }
    }

    async removeFromQueue(userId: string) {
        await redis.zrem(this.QUEUE_KEY, userId);
        logger.info(`[MATCHMAKING] User ${userId} removed from queue`);
    }
}
