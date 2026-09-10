import { Router, Request, Response } from 'express';
import { socialService } from './social.service';
import { requireAuth } from '../../middleware/auth.middleware';
import { logger } from '../../lib/logger';

const router = Router();
router.use(requireAuth);

router.post('/request', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { recipientId } = req.body;
        const result = await socialService.sendFriendRequest(userId, recipientId);
        res.status(201).json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/respond', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { requestId, accept } = req.body;
        const result = await socialService.respondToFriendRequest(userId, requestId, Boolean(accept));
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/friends', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const friends = await socialService.listFriends(userId);
        res.json({ friends });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/pending', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const pending = await socialService.listPendingRequests(userId);
        res.json({ pending });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
