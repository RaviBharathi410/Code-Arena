import { Router, Request, Response } from 'express';
import { gamificationService } from './gamification.service';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/achievements', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const achievements = await gamificationService.getUserAchievements(userId);
        res.json({ achievements });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
