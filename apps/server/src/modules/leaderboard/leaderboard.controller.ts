import { Request, Response } from 'express';
import { leaderboardService } from './leaderboard.service';

export class LeaderboardController {
    async getRankings(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;
            const rankings = await leaderboardService.getRankings(limit, offset);
            res.json(rankings);
        } catch (err: any) {
            res.status(500).json({ message: 'Error fetching leaderboard' });
        }
    }

    async getMe(req: any, res: Response) {
        try {
            const rank = await leaderboardService.getPersonalRank(req.user.id);
            res.json(rank);
        } catch (err: any) {
            res.status(err.message === 'User not found' ? 404 : 500).json({ message: err.message });
        }
    }
}

export const leaderboardController = new LeaderboardController();
