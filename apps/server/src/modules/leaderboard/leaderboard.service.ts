import { db } from '../../db';
import { leaderboard, users } from '@arena/database';
import { desc, eq } from 'drizzle-orm';

export class LeaderboardService {
    async getRankings(limit: number = 50) {
        // Join leaderboard with users to get usernames
        const rankings = await db
            .select({
                userId: leaderboard.userId,
                rating: leaderboard.rating,
                rank: leaderboard.rank,
                username: users.username,
                wins: users.wins,
                losses: users.losses,
                avatarUrl: users.avatarUrl,
            })
            .from(leaderboard)
            .innerJoin(users, eq(leaderboard.userId, users.id))
            .orderBy(desc(leaderboard.rating))
            .limit(limit)
            .all();

        // If leaderboard is empty, fall back to users table sorted by rating
        if (rankings.length === 0) {
            const fallbackRankings = await db
                .select({
                    userId: users.id,
                    username: users.username,
                    rating: users.rating,
                    wins: users.wins,
                    losses: users.losses,
                    avatarUrl: users.avatarUrl,
                })
                .from(users)
                .orderBy(desc(users.rating))
                .limit(limit)
                .all();

            return fallbackRankings.map((u, i) => ({
                ...u,
                rank: i + 1,
            }));
        }

        return rankings;
    }
}

export const leaderboardService = new LeaderboardService();
