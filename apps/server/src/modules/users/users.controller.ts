import { Response } from 'express';
import { usersService } from './users.service';
import { matchesService } from '../matches/matches.service';

export class UsersController {
    async getProfile(req: any, res: Response) {
        try {
            const user = await usersService.getById(req.params.id);
            const { passwordHash, ...safeUser } = user;
            res.json(safeUser);
        } catch (err: any) {
            res.status(err.message === 'User not found' ? 404 : 500).json({ message: err.message });
        }
    }

    async updateProfile(req: any, res: Response) {
        try {
            const user = await usersService.updateProfile(req.params.id, req.body);
            const { passwordHash, ...safeUser } = user;
            res.json(safeUser);
        } catch (err: any) {
            if (err?.code === '23505' || err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res.status(409).json({ message: 'Username or email already taken' });
            }
            res.status(err.message === 'User not found' ? 404 : 500).json({ message: err.message });
        }
    }

    async getMatches(req: any, res: Response) {
        try {
            const matches = await matchesService.getUserMatches(req.params.id);
            res.json(matches);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async getStats(req: any, res: Response) {
        try {
            const user = await usersService.getById(req.params.id);
            const matches = await matchesService.getUserMatches(req.params.id);

            const totalMatches = matches.length;
            const wins = matches.filter(m => m.winnerId === req.params.id).length;
            const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

            res.json({
                totalMatches,
                wins,
                winRate,
                elo: user.elo,
                level: user.level,
            });
        } catch (err: any) {
            res.status(err.message === 'User not found' ? 404 : 500).json({ message: err.message });
        }
    }
}

export const usersController = new UsersController();
