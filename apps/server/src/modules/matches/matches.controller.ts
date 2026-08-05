import { Request, Response } from 'express';
import { matchesService } from './matches.service';

export class MatchesController {
    async create(req: Request, res: Response) {
        try {
            const { mode, problemId } = req.body;
            const room = await matchesService.createMatchRoom({
                mode,
                player1Id: (req as any).user.id,
                problemId
            });
            res.status(201).json(room);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async join(req: Request, res: Response) {
        try {
            const { roomCode } = req.body;
            const room = await matchesService.joinMatchRoom(roomCode, (req as any).user.id);
            res.json(room);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const room = await matchesService.getMatchById(req.params.id);
            res.json(room);
        } catch (err: any) {
            res.status(404).json({ message: err.message });
        }
    }

    async getMyMatches(req: Request, res: Response) {
        try {
            const matches = await matchesService.getUserMatches((req as any).user.id);
            res.json(matches);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async getUserMatches(req: Request, res: Response) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
            const matches = await matchesService.getUserMatches(req.params.userId, limit);
            res.json(matches);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }
}

export const matchesController = new MatchesController();
