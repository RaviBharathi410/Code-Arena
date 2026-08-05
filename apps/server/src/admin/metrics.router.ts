import { Router, Request, Response } from 'express';
import { monitor } from '../lib/monitor';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/isAdmin';
import { adminService } from '../modules/admin/admin.service';

const router = Router();

// Apply requireAuth and isAdmin to all routes in this router
router.use(requireAuth as any, isAdmin as any);

/**
 * GET /api/admin/metrics or GET /admin/metrics
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

/**
 * GET /api/admin/users
 */
router.get('/users', async (req: Request, res: Response) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
        const result = await adminService.listUsers({ limit, offset });
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/admin/users/:id
 */
router.get('/users/:id', async (req: Request, res: Response) => {
    try {
        const result = await adminService.getUserDetail(req.params.id);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/admin/users/:id/role
 */
router.post('/users/:id/role', async (req: AuthRequest, res: Response) => {
    try {
        const { role } = req.body;
        const adminId = req.user!.id;
        const result = await adminService.updateUserRole(adminId, req.params.id, role);
        res.json(result);
    } catch (err: any) {
        const status = err.status || 400;
        res.status(status).json({ error: err.message });
    }
});

/**
 * POST /api/admin/users/:id/ban
 */
router.post('/users/:id/ban', async (req: AuthRequest, res: Response) => {
    try {
        const { reason } = req.body;
        const adminId = req.user!.id;
        const result = await adminService.banUser(adminId, req.params.id, reason);
        res.json(result);
    } catch (err: any) {
        const status = err.status || 400;
        res.status(status).json({ error: err.message });
    }
});

/**
 * POST /api/admin/users/:id/unban
 */
router.post('/users/:id/unban', async (req: AuthRequest, res: Response) => {
    try {
        const adminId = req.user!.id;
        const result = await adminService.unbanUser(adminId, req.params.id);
        res.json(result);
    } catch (err: any) {
        const status = err.status || 400;
        res.status(status).json({ error: err.message });
    }
});

export default router;
