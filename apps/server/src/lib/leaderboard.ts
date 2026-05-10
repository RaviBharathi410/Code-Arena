import { redis } from './redis';
import { logger } from './logger';

const LEADERBOARD_KEY = 'arena:leaderboard';

export interface LeaderboardEntry {
    userId: string;
    eloRating: number;
    rank: number;
}

/**
 * Leaderboard — Redis sorted set-backed real-time leaderboard.
 *
 * Uses ZADD to insert/update ratings and ZREVRANGE for top-N queries.
 * Much faster than querying PostgreSQL on every leaderboard request.
 */
export class Leaderboard {
    /**
     * Update a player's Elo in the leaderboard sorted set.
     * Called after every Elo recalculation.
     */
    async updateRating(userId: string, eloRating: number): Promise<void> {
        await redis.zadd(LEADERBOARD_KEY, eloRating, userId);
        logger.debug({ userId, eloRating }, '[LEADERBOARD] Rating updated');
    }

    /**
     * Remove a player from the leaderboard (e.g. account deletion).
     */
    async removePlayer(userId: string): Promise<void> {
        await redis.zrem(LEADERBOARD_KEY, userId);
    }

    /**
     * Get the top N players from the leaderboard.
     * Returns players sorted by Elo descending.
     */
    async getTop(limit: number = 50): Promise<LeaderboardEntry[]> {
        // ZREVRANGE returns highest scores first, with WITHSCORES
        const results = await redis.zrevrange(LEADERBOARD_KEY, 0, limit - 1, 'WITHSCORES');

        if (!results || results.length === 0) return [];

        const entries: LeaderboardEntry[] = [];
        for (let i = 0; i < results.length; i += 2) {
            entries.push({
                userId: results[i],
                eloRating: parseInt(results[i + 1], 10),
                rank: Math.floor(i / 2) + 1,
            });
        }

        return entries;
    }

    /**
     * Get players within a specific Elo range (for matchmaking display, etc.)
     */
    async getByEloRange(minElo: number, maxElo: number): Promise<LeaderboardEntry[]> {
        const results = await redis.zrevrangebyscore(
            LEADERBOARD_KEY,
            maxElo,
            minElo,
            'WITHSCORES'
        );

        if (!results || results.length === 0) return [];

        const entries: LeaderboardEntry[] = [];
        for (let i = 0; i < results.length; i += 2) {
            entries.push({
                userId: results[i],
                eloRating: parseInt(results[i + 1], 10),
                rank: 0, // Rank within range isn't meaningful here
            });
        }

        return entries;
    }

    /**
     * Get a specific player's rank (1-indexed, where 1 = highest Elo).
     */
    async getRank(userId: string): Promise<number | null> {
        const rank = await redis.zrevrank(LEADERBOARD_KEY, userId);
        return rank !== null ? rank + 1 : null; // Convert 0-indexed to 1-indexed
    }

    /**
     * Get a specific player's Elo from the leaderboard.
     */
    async getPlayerElo(userId: string): Promise<number | null> {
        const score = await redis.zscore(LEADERBOARD_KEY, userId);
        return score !== null ? parseInt(score, 10) : null;
    }

    /**
     * Get total number of ranked players.
     */
    async getTotalPlayers(): Promise<number> {
        const count = await redis.zcard(LEADERBOARD_KEY);
        return count || 0;
    }
}

export const leaderboard = new Leaderboard();
