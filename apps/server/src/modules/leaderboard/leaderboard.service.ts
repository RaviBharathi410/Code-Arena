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
    async getLeaderboard(limit: number = 50, offset: number = 0) {
        return this.getRankings(limit, offset);
    }
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

        // Exclude unranked / placement accounts from the global competitive leaderboard
        const filter = {
            $or: [
                { placementMatchesRemaining: { $lte: 0 } },
                { placementMatchesRemaining: { $exists: false }, totalBattles: { $gte: 5 } },
            ],
            tier: { $ne: 'PLACEMENT' }
        };

        const users = await User.find(filter)
            .select('username rankRating wins losses tier avatarUrl')
            .sort({ rankRating: -1 })
            .limit(limit)
            .skip(offset)
            .lean();

        // Calculate rank in JS
        let rankCounter = offset + 1;
        const data = users.map(u => {
            const total = (u.wins || 0) + (u.losses || 0);
            const winRate = total > 0 ? Math.round(((u.wins || 0) / total) * 100) : 0;
            return {
                id: u._id,
                username: u.username,
                rankRating: u.rankRating,
                tier: u.tier || 'SILVER',
                wins: u.wins || 0,
                losses: u.losses || 0,
                winRate,
                avatarUrl: (u as any).avatarUrl,
                rank: rankCounter++
            };
        });

        // Backfill the Redis leaderboard from DB results
        try {
            for (const entry of data) {
                await redisLeaderboard.updateRating(entry.id.toString(), entry.rankRating);
            }
            logger.debug({ count: data.length }, '[LEADERBOARD] Redis backfilled');
        } catch (err) {
            logger.warn({ err }, '[LEADERBOARD] Redis backfill failed');
        }

        return data;
    }

    async getPersonalRank(userId: string) {
        const user = await User.findById(userId).lean();
        if (!user) throw new Error('User not found');

        const placementsRemaining = user.placementMatchesRemaining ?? (user.totalBattles < 5 ? 5 - user.totalBattles : 0);
        const isPlacement = placementsRemaining > 0 || user.tier === 'PLACEMENT';

        if (isPlacement) {
            return {
                id: user._id,
                username: user.username,
                rankRating: user.rankRating,
                tier: 'PLACEMENT',
                wins: user.wins || 0,
                losses: user.losses || 0,
                rank: null,
                isPlacement: true,
                placementsRemaining,
            };
        }

        // Try Redis first for instant rank lookup
        try {
            const rank = await redisLeaderboard.getRank(userId);
            if (rank !== null) {
                return {
                    id: user._id,
                    username: user.username,
                    rankRating: user.rankRating,
                    tier: user.tier,
                    wins: user.wins,
                    losses: user.losses,
                    rank,
                    isPlacement: false,
                };
            }
        } catch (err) {
            logger.warn({ err }, '[LEADERBOARD] Redis rank lookup failed, falling back to MongoDB');
        }

        // Fallback: count ranked users with a higher rankRating
        const higherRankCount = await User.countDocuments({
            placementMatchesRemaining: { $lte: 0 },
            tier: { $ne: 'PLACEMENT' },
            rankRating: { $gt: user.rankRating }
        });

        return {
            id: user._id,
            username: user.username,
            rankRating: user.rankRating,
            tier: user.tier,
            wins: user.wins,
            losses: user.losses,
            rank: higherRankCount + 1,
            isPlacement: false,
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
