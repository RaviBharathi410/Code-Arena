import { Router, Request, Response } from 'express';
import { skillDataService } from './skill-data.service';
import { requireAuth } from '../../middleware/auth.middleware';
import { logger } from '../../lib/logger';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/skills/radar
 * Fetches 8-axis radar metrics, category statuses, and mastery scores.
 */
router.get('/radar', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const skillVector = await skillDataService.getUserSkillVector(userId);
        res.json(skillVector);
    } catch (err: any) {
        logger.error({ error: err.message }, '[SKILLS_ROUTER] Failed to fetch radar data');
        res.status(500).json({ error: err.message || 'Failed to fetch skill radar data' });
    }
});

/**
 * GET /api/skills/weakness
 * Computes the verified or progressive diagnostic weakness for Weakness Fix mode.
 */
router.get('/weakness', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const weakness = await skillDataService.getWeakness(userId);
        res.json(weakness);
    } catch (err: any) {
        logger.error({ error: err.message }, '[SKILLS_ROUTER] Failed to fetch weakness data');
        res.status(500).json({ error: err.message || 'Failed to compute weakness data' });
    }
});

export default router;
