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

    async getMatchById(req: any, res: Response) {
        try {
            const match = await matchesService.getMatchById(req.params.id);

            // Security: Only active participants can view private match details
            if (match.player1Id !== req.user.id && match.player2Id !== req.user.id) {
                return res.status(403).json({ message: 'Forbidden: Not a participant' });
            }

            res.json(match);
        } catch (err: any) {
            if (err.message === 'Match not found') {
                return res.status(404).json({ message: 'Match not found' });
            }
            res.status(500).json({ message: 'Error fetching match' });
        }
    }

    async forfeit(req: any, res: Response) {
        try {
            const match = await matchesService.forfeitMatch(req.params.id, req.user.id);
            res.json(match);
        } catch (err: any) {
            if (err.message === 'Match not found') return res.status(404).json({ message: err.message });
            if (err.message.includes('Forbidden')) return res.status(403).json({ message: err.message });
            res.status(400).json({ message: err.message });
        }
    }
}

export const matchesController = new MatchesController();
