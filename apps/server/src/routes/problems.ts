import { Router } from 'express';
import { db } from '../db';
import { problems } from '@arena/database';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/problems — list all problems (optionally filter by difficulty)
router.get('/', authMiddleware, async (req: any, res) => {
    try {
        const allProblems = await db.select().from(problems).all();
        res.json(allProblems);
    } catch (err) {
        console.error('Error fetching problems:', err);
        res.status(500).json({ message: 'Error fetching problems' });
    }
});

// GET /api/problems/:id — get a single problem by id
router.get('/:id', authMiddleware, async (req: any, res) => {
    try {
        const problem = await db.select().from(problems).where(eq(problems.id, req.params.id)).get();
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }
        res.json(problem);
    } catch (err) {
        console.error('Error fetching problem:', err);
        res.status(500).json({ message: 'Error fetching problem' });
    }
});

export default router;
