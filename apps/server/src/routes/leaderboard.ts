import { Router } from 'express';
import { db } from '../db';
import { leaderboard, users } from '@arena/database';
import { desc } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/leaderboard — get global leaderboard sorted by rating
router.get('/', authMiddleware, async (req: any, res) => {
    try {
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
                .limit(50)
                .all();

            return res.json(fallbackRankings.map((u, i) => ({
                ...u,
                rank: i + 1,
            })));
        }

        res.json(rankings);
    } catch (err) {
        console.error('Error fetching leaderboard:', err);
        res.status(500).json({ message: 'Error fetching leaderboard' });
    }
});

export default router;
