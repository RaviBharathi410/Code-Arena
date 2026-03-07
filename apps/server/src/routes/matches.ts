import { Router } from 'express';
import { db } from '../db';
import { matches, users } from '@arena/database';
import { eq, desc, or } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/matches — get match history for the authenticated user
router.get('/', authMiddleware, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const userMatches = await db
            .select()
            .from(matches)
            .where(
                or(
                    eq(matches.player1Id, userId),
                    eq(matches.player2Id, userId)
                )
            )
            .orderBy(desc(matches.createdAt))
            .all();

        res.json(userMatches);
    } catch (err) {
        console.error('Error fetching matches:', err);
        res.status(500).json({ message: 'Error fetching matches' });
    }
});

router.get('/recent', authMiddleware, async (req: any, res) => {
    try {
        const userId = (req.query.userId as string) || req.user.id;
        const recentMatches = await db
            .select()
            .from(matches)
            .where(
                or(
                    eq(matches.player1Id, userId),
                    eq(matches.player2Id, userId)
                )
            )
            .orderBy(desc(matches.createdAt))
            .limit(10) // reasonable limit
            .all();

        res.json(recentMatches);
    } catch (err) {
        console.error('Error fetching recent matches:', err);
        res.status(500).json({ message: 'Error fetching recent matches' });
    }
});

// GET /api/matches/:id — get a single match by id
router.get('/:id', authMiddleware, async (req: any, res) => {
    try {
        const match = await db.select().from(matches).where(eq(matches.id, req.params.id)).get();
        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }
        res.json(match);
    } catch (err) {
        console.error('Error fetching match:', err);
        res.status(500).json({ message: 'Error fetching match' });
    }
});

export default router;
