import { redis, isRedisReady } from './redis';
import { logger } from './logger';

const QUEUE_KEY = 'arena:queue';
const ELO_RANGE = 400; // Match within ±400 Elo; force-pair any two after timeout

export interface QueuedPlayer { userId: string; eloRating: number; joinedAt: number; }
export interface MatchPair { player1Id: string; player2Id: string; }

export class MatchmakingQueue {
    private pollingInterval: NodeJS.Timeout | null = null;
    private onMatchFound: ((pair: MatchPair) => void) | null = null;
    // In-memory fallback when Redis is unavailable
    private memQueue: Map<string, { elo: number; joinedAt: number }> = new Map();

    onMatch(callback: (pair: MatchPair) => void) { this.onMatchFound = callback; }

    async addToQueue(userId: string, eloRating: number): Promise<void> {
        this.memQueue.set(userId, { elo: eloRating, joinedAt: Date.now() });
        if (isRedisReady()) {
            await redis.zadd(QUEUE_KEY, eloRating, userId);
        }
        logger.info({ userId, eloRating, redisAvailable: isRedisReady() }, '[MATCHMAKING] Player added to queue');
    }

    async removeFromQueue(userId: string): Promise<void> {
        this.memQueue.delete(userId);
        if (isRedisReady()) {
            await redis.zrem(QUEUE_KEY, userId);
        }
        logger.info({ userId }, '[MATCHMAKING] Player removed from queue');
    }

    async getQueueSize(): Promise<number> {
        return this.memQueue.size;
    }

    private tryPairFromMemory(): MatchPair | null {
        if (this.memQueue.size < 2) return null;

        const players = Array.from(this.memQueue.entries())
            .map(([userId, { elo, joinedAt }]) => ({ userId, eloRating: elo, joinedAt }))
            .sort((a, b) => a.eloRating - b.eloRating);

        const now = Date.now();

        for (let i = 0; i < players.length - 1; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const eloDiff = Math.abs(players[i].eloRating - players[j].eloRating);
                // Expand range for players waiting > 30 seconds
                const waitTime = Math.max(now - players[i].joinedAt, now - players[j].joinedAt);
                const effectiveRange = ELO_RANGE + Math.floor(waitTime / 5000) * 100;

                if (eloDiff <= effectiveRange) {
                    this.memQueue.delete(players[i].userId);
                    this.memQueue.delete(players[j].userId);
                    const pair = { player1Id: players[i].userId, player2Id: players[j].userId };
                    logger.info(pair, '[MATCHMAKING] Players paired (in-memory)');
                    return pair;
                }
            }
        }
        return null;
    }

    async tryPairPlayers(): Promise<MatchPair | null> {
        // Always try in-memory first (it's the single source of truth now)
        const pair = this.tryPairFromMemory();
        if (pair) {
            // Also remove from Redis if available
            if (isRedisReady()) {
                await redis.zrem(QUEUE_KEY, pair.player1Id);
                await redis.zrem(QUEUE_KEY, pair.player2Id);
            }
            return pair;
        }
        return null;
    }

    startPolling(): void {
        if (this.pollingInterval) return;
        this.pollingInterval = setInterval(async () => {
            try {
                const pair = await this.tryPairPlayers();
                if (pair && this.onMatchFound) {
                    this.onMatchFound(pair);
                }
            } catch (err) {
                logger.error({ err }, '[MATCHMAKING] Polling error');
            }
        }, 500);
        logger.info('[MATCHMAKING] Background polling started (500ms interval)');
    }

    stopPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
}

export const matchmakingQueue = new MatchmakingQueue();
