import { Router, Request, Response } from 'express';
import { practiceService } from './practice.service';
import { requireAuth } from '../../middleware/auth.middleware';
import { User } from '../../models/User';
import { logger } from '../../lib/logger';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/practice/session
 * Generates an individualized practice session queue.
 */
router.get('/session', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const mode = (req.query.mode as any) || 'adaptive';

        if (!['speed', 'focus', 'adaptive', 'coach'].includes(mode)) {
            res.status(400).json({ error: 'Invalid practice mode. Must be speed, focus, adaptive, or coach.' });
            return;
        }

        const session = await practiceService.getPracticeSession(mode, userId);
        res.json(session);
    } catch (err: any) {
        logger.error({ error: err.message }, '[PRACTICE_ROUTER] Failed to create practice session');
        res.status(500).json({ error: err.message || 'Failed to initialize practice session' });
    }
});

/**
 * GET /api/practice/calibration
 * Returns the 3-problem diagnostic set for new accounts.
 */
router.get('/calibration', async (req: Request, res: Response) => {
    try {
        const set = await practiceService.getCalibrationSet();
        res.json({
            title: 'Diagnostic Calibration Protocol',
            description: 'Solve these 3 foundational problems across distinct algorithmic domains to calibrate your Skill Radar.',
            problems: set,
        });
    } catch (err: any) {
        logger.error({ error: err.message }, '[PRACTICE_ROUTER] Failed to fetch calibration set');
        res.status(500).json({ error: err.message || 'Failed to fetch calibration set' });
    }
});

/**
 * POST /api/practice/calibration/complete
 * Marks user account as calibrated.
 */
router.post('/calibration/complete', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        await User.updateOne({ _id: userId }, { $set: { isCalibrated: true } });
        res.json({ success: true, message: 'Account calibration recorded' });
    } catch (err: any) {
        logger.error({ error: err.message }, '[PRACTICE_ROUTER] Failed to record calibration completion');
        res.status(500).json({ error: err.message || 'Failed to update calibration status' });
    }
});

export default router;
