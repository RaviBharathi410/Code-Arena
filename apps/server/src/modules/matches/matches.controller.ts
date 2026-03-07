import { Request, Response } from 'express';
import { matchesService } from './matches.service';

export class MatchesController {
    async getUserMatches(req: any, res: Response) {
        try {
            const matches = await matchesService.getUserMatches(req.user.id);
            res.json(matches);
        } catch (err: any) {
            console.error('Error fetching matches:', err);
            res.status(500).json({ message: 'Error fetching matches' });
        }
    }

    async getRecentMatches(req: any, res: Response) {
        try {
            const userId = (req.query.userId as string) || req.user.id;
            const matches = await matchesService.getRecentMatches(userId);
            res.json(matches);
        } catch (err: any) {
            console.error('Error fetching recent matches:', err);
            res.status(500).json({ message: 'Error fetching recent matches' });
        }
    }

    async getMatchById(req: Request, res: Response) {
        try {
            const match = await matchesService.getMatchById(req.params.id);
            res.json(match);
        } catch (err: any) {
            console.error('Error fetching match:', err);
            if (err.message === 'Match not found') {
                return res.status(404).json({ message: 'Match not found' });
            }
            res.status(500).json({ message: 'Error fetching match' });
        }
    }
}

export const matchesController = new MatchesController();
