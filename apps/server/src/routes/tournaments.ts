import { Router } from 'express';
import { db } from '../db';
import { tournaments } from '@arena/database';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/tournaments — list all tournaments
router.get('/', authMiddleware, async (req: any, res) => {
    try {
        const allTournaments = await db
            .select()
            .from(tournaments)
            .orderBy(desc(tournaments.createdAt))
            .all();
        res.json(allTournaments);
    } catch (err) {
        console.error('Error fetching tournaments:', err);
        res.status(500).json({ message: 'Error fetching tournaments' });
    }
});

// GET /api/tournaments/:id — get a single tournament
router.get('/:id', authMiddleware, async (req: any, res) => {
    try {
        const tournament = await db.select().from(tournaments).where(eq(tournaments.id, req.params.id)).get();
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.json(tournament);
    } catch (err) {
        console.error('Error fetching tournament:', err);
        res.status(500).json({ message: 'Error fetching tournament' });
    }
});

export default router;
