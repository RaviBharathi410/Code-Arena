import { Router, Request, Response } from 'express';
import { userAnalyticsService } from './analytics.service';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const telemetry = await userAnalyticsService.getUserDashboardTelemetry(userId);
        res.json(telemetry);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
