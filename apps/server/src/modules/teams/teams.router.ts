import { Router, Request, Response } from 'express';
import { teamService } from './teams.service';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.post('/', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { name, tag, description } = req.body;
        const team = await teamService.createTeam(userId, name, tag, description);
        res.status(201).json(team);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:teamId/members', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { memberId } = req.body;
        const team = await teamService.addMember(req.params.teamId, userId, memberId);
        res.json(team);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/leaderboard', async (_req: Request, res: Response) => {
    try {
        const leaderboard = await teamService.getLeaderboard();
        res.json({ leaderboard });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:teamId', async (req: Request, res: Response) => {
    try {
        const team = await teamService.getTeamDetails(req.params.teamId);
        res.json(team);
    } catch (err: any) {
        res.status(404).json({ error: err.message });
    }
});

export default router;
