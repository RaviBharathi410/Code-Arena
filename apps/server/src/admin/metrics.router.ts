import { Router, Request, Response } from 'express';
import { monitor } from '../lib/monitor';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// TODO: Replace requireAuth with an explicit isAdmin middleware 
// once the full Role-Based Access Control is built in Phase 7.
router.use(requireAuth);

/**
 * GET /admin/metrics
 * 
 * Returns the current snapshot of security and system metrics 
 * tracked by the Monitor class in Redis.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const metrics = await monitor.getMetrics();
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            metrics,
        });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
});

export default router;
