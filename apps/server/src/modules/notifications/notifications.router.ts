import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { notificationsService } from './notifications.service';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await notificationsService.getUserNotifications(userId, limit);
        res.json({
            status: 'success',
            data: result.notifications,
            unreadCount: result.unreadCount
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
    }
});

router.post('/mark-read', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { notificationIds } = req.body;
        await notificationsService.markAsRead(userId, notificationIds);
        res.json({ status: 'success' });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to mark notifications as read' });
    }
});

export default router;
