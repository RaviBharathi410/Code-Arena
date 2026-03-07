import { Request, Response } from 'express';
import { leaderboardService } from './leaderboard.service';

export class LeaderboardController {
    async getRankings(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const rankings = await leaderboardService.getRankings(limit);
            res.json(rankings);
        } catch (err: any) {
            console.error('Error fetching leaderboard:', err);
            res.status(500).json({ message: 'Error fetching leaderboard' });
        }
    }
}

export const leaderboardController = new LeaderboardController();
