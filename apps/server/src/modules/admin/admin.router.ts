import { Router } from 'express';
import { adminController } from './admin.controller';
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware';

const router = Router();

// Apply admin auth to all routes in this module
router.use(requireAuth);
router.use(requireAdmin);

router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserDetail);
router.patch('/users/role', adminController.updateUserRole);
router.post('/users/ban', adminController.banUser);
router.post('/users/:id/unban', adminController.unbanUser);
router.post('/users/:id/reset-elo', adminController.resetUserElo);

router.get('/stats', adminController.getSystemStats);
router.get('/metrics', adminController.getMetrics);

export default router;
