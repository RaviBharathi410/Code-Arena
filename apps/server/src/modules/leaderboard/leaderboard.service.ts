import { db } from '../../db';
import { users } from '@arena/database';
import { desc, eq, sql } from 'drizzle-orm';
import { redis } from '../../lib/redis';
import { leaderboard as redisLeaderboard } from '../../lib/leaderboard';
import { logger } from '../../lib/logger';

const LEADERBOARD_CACHE_KEY = 'leaderboard:global';

/**
 * LeaderboardService — Dual-layer leaderboard using Redis sorted sets + PostgreSQL.
 *
 * Hot path: Redis sorted set for real-time rankings (sub-ms reads).
 * Cold path: PostgreSQL with window functions as fallback / source of truth.
 */
export class LeaderboardService {
    async getRankings(limit: number = 50, offset: number = 0) {
        // Try Redis leaderboard first (sub-ms, no DB load)
        try {
            const redisEntries = await redisLeaderboard.getTop(limit);
            if (redisEntries && redisEntries.length > 0) {
                logger.debug({ count: redisEntries.length }, '[LEADERBOARD] Served from Redis');
                return redisEntries;
            }
        } catch (err) {
            logger.warn({ err }, '[LEADERBOARD] Redis read failed, falling back to PostgreSQL');
        }

        // Fallback: query PostgreSQL with rank window function
        // Note: uses eloRating (renamed from elo in Phase 1 schema migration)
        const data = await db
            .select({
                id: users.id,
                username: users.username,
                rankRating: users.rankRating,
                wins: users.wins,
                losses: users.losses,
                avatarUrl: users.avatarUrl,
                rank: sql<number>`rank() OVER (ORDER BY ${users.rankRating} DESC)`
            })
            .from(users)
            .orderBy(desc(users.rankRating))
            .limit(limit)
            .offset(offset);

        // Backfill the Redis leaderboard from DB results
        try {
            for (const entry of data) {
                await redisLeaderboard.updateRating(entry.id, entry.rankRating);
            }
            logger.debug({ count: data.length }, '[LEADERBOARD] Redis backfilled from PostgreSQL');
        } catch (err) {
            logger.warn({ err }, '[LEADERBOARD] Redis backfill failed');
        }

        return data;
    }

    async getPersonalRank(userId: string) {
        // Try Redis first for instant rank lookup
        try {
            const rank = await redisLeaderboard.getRank(userId);
            const elo = await redisLeaderboard.getPlayerElo(userId);
            if (rank !== null && elo !== null) {
                // Still need username/wins/losses from DB
                const user = await db.query.users.findFirst({
                    where: eq(users.id, userId),
                    columns: { id: true, username: true, rankRating: true, wins: true, losses: true },
                });
                if (user) {
                    return { ...user, rank };
                }
            }
        } catch (err) {
            logger.warn({ err }, '[LEADERBOARD] Redis rank lookup failed, falling back to PostgreSQL');
        }

        // Fallback: CTE-based rank query in PostgreSQL
        const result = await db.execute(sql`
            WITH RankedUsers AS (
                SELECT 
                    id, 
                    username, 
                    rank_rating, 
                    wins, 
                    losses, 
                    rank() OVER (ORDER BY rank_rating DESC) as rank
                FROM users
            )
            SELECT * FROM RankedUsers WHERE id = ${userId}
        `);

        if (!result || result.length === 0) throw new Error('User not found');
        return result[0];
    }

    /**
     * Update a player's Elo in the Redis leaderboard.
     * Called after Elo recalculation (from matches service or future BullMQ worker).
     */
    async updatePlayerRating(userId: string, newElo: number) {
        await redisLeaderboard.updateRating(userId, newElo);
    }
}

export const leaderboardService = new LeaderboardService();
