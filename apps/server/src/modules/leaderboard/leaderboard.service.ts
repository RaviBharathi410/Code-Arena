import { db } from '../../db';
import { users } from '@arena/database';
import { desc, eq, sql } from 'drizzle-orm';
import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';

const LEADERBOARD_CACHE_KEY = 'leaderboard:global';

export class LeaderboardService {
    async getRankings(limit: number = 50, offset: number = 0) {
        const cacheKey = `${LEADERBOARD_CACHE_KEY}:${limit}:${offset}`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (err) {
            logger.error({ err }, 'Redis get error in leaderboard');
        }

        // Standard Rank Query: Order by Elo descending
        const data = await db
            .select({
                username: users.username,
                elo: users.elo,
                wins: users.wins,
                losses: users.losses,
                avatarUrl: users.avatarUrl,
                rank: sql<number>`rank() OVER (ORDER BY ${users.elo} DESC)`
            })
            .from(users)
            .orderBy(desc(users.elo))
            .limit(limit)
            .offset(offset)
            .all();

        try {
            await redis.setex(cacheKey, 60, JSON.stringify(data));
        } catch (err) {
            logger.error({ err }, 'Redis setex error in leaderboard');
        }

        return data;
    }

    async getPersonalRank(userId: string) {
        // Personalized Ranking Query using CTE/Subquery to find specific user rank
        const result = await db.all<{ id: string; username: string; elo: number; wins: number; losses: number; rank: number }>(sql`
            WITH RankedUsers AS (
                SELECT 
                    id, 
                    username, 
                    elo, 
                    wins, 
                    losses, 
                    rank() OVER (ORDER BY elo DESC) as rank
                FROM users
            )
            SELECT * FROM RankedUsers WHERE id = ${userId}
        `);

        if (!result || result.length === 0) throw new Error('User not found');
        return result[0];
    }
}

export const leaderboardService = new LeaderboardService();
