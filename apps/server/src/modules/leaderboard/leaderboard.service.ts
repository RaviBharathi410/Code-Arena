import { User } from '../../models/User';
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

        // Note: uses rankRating (renamed from elo in Phase 1 schema migration)
        const users = await User.find()
            .select('username rankRating wins losses avatarUrl')
            .sort({ rankRating: -1 })
            .limit(limit)
            .skip(offset)
            .lean();

        // Calculate rank in JS since Mongoose doesn't have an exact window function
        let rankCounter = offset + 1;
        const data = users.map(u => ({
            id: u._id,
            username: u.username,
            rankRating: u.rankRating,
            wins: u.wins,
            losses: u.losses,
            avatarUrl: (u as any).avatarUrl,
            rank: rankCounter++
        }));

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
                const user = await User.findById(userId).select('username rankRating wins losses').lean();
                if (user) {
                    return { id: user._id, username: user.username, rankRating: user.rankRating, wins: user.wins, losses: user.losses, rank };
                }
            }
        } catch (err) {
            logger.warn({ err }, '[LEADERBOARD] Redis rank lookup failed, falling back to MongoDB');
        }

        // Fallback: count users with a higher rankRating
        const user = await User.findById(userId).lean();
        if (!user) throw new Error('User not found');

        const higherRankCount = await User.countDocuments({ rankRating: { $gt: user.rankRating } });
        
        return {
            id: user._id,
            username: user.username,
            rankRating: user.rankRating,
            wins: user.wins,
            losses: user.losses,
            rank: higherRankCount + 1
        };
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
