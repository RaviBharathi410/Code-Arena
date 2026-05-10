import { redis } from './redis';
import { logger } from './logger';

const QUEUE_KEY = 'arena:queue';
const ELO_RANGE_INITIAL = 200; // Match players within ±200 Elo

export interface QueuedPlayer {
    userId: string;
    eloRating: number;
}

export interface MatchPair {
    player1Id: string;
    player2Id: string;
}

/**
 * MatchmakingQueue — Redis sorted set-backed matchmaking.
 *
 * Players are stored in a sorted set keyed by Elo rating.
 * A background polling loop runs every 500ms to pair players.
 */
export class MatchmakingQueue {
    private pollingInterval: NodeJS.Timeout | null = null;
    private onMatchFound: ((pair: MatchPair) => void) | null = null;

    /**
     * Register a callback that fires when two players are paired.
     */
    onMatch(callback: (pair: MatchPair) => void) {
        this.onMatchFound = callback;
    }

    /**
     * Add a player to the matchmaking queue.
     * Uses ZADD with their Elo rating as the score.
     */
    async addToQueue(userId: string, eloRating: number): Promise<void> {
        await redis.zadd(QUEUE_KEY, eloRating, userId);
        logger.info({ userId, eloRating }, '[MATCHMAKING] Player added to queue');
    }

    /**
     * Remove a player from the queue (cancel search / disconnect).
     */
    async removeFromQueue(userId: string): Promise<void> {
        await redis.zrem(QUEUE_KEY, userId);
        logger.info({ userId }, '[MATCHMAKING] Player removed from queue');
    }

    /**
     * Get the current queue depth.
     */
    async getQueueSize(): Promise<number> {
        const size = await redis.zcard(QUEUE_KEY);
        return size || 0;
    }

    /**
     * Attempt to pair two players within the Elo range.
     * Uses ZPOPMIN to atomically grab the lowest-rated player,
     * then searches for a valid opponent.
     */
    async tryPairPlayers(): Promise<MatchPair | null> {
        // Get all queued players sorted by Elo (ascending)
        const members = await redis.zrange(QUEUE_KEY, 0, -1, 'WITHSCORES');

        if (!members || members.length < 4) {
            // Need at least 2 players (each has userId + score = 4 entries)
            return null;
        }

        // Parse into player objects: [userId, score, userId, score, ...]
        const players: QueuedPlayer[] = [];
        for (let i = 0; i < members.length; i += 2) {
            players.push({
                userId: members[i],
                eloRating: parseInt(members[i + 1], 10),
            });
        }

        // Find the first valid pair within Elo range
        for (let i = 0; i < players.length - 1; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const eloDiff = Math.abs(players[i].eloRating - players[j].eloRating);
                if (eloDiff <= ELO_RANGE_INITIAL) {
                    // Atomically remove both from queue
                    const multi = redis.multi();
                    multi.zrem(QUEUE_KEY, players[i].userId);
                    multi.zrem(QUEUE_KEY, players[j].userId);
                    const results = await multi.exec();

                    // Verify both were actually removed (prevents race conditions)
                    if (results && results[0][1] === 1 && results[1][1] === 1) {
                        const pair: MatchPair = {
                            player1Id: players[i].userId,
                            player2Id: players[j].userId,
                        };
                        logger.info(pair, '[MATCHMAKING] Players paired');
                        return pair;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Start the background polling loop (every 500ms).
     * Continuously attempts to pair players in the queue.
     */
    startPolling(): void {
        if (this.pollingInterval) return; // Already running

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

    /**
     * Stop the background polling loop.
     */
    stopPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            logger.info('[MATCHMAKING] Background polling stopped');
        }
    }
}

export const matchmakingQueue = new MatchmakingQueue();
