import { Response } from 'express';
import { usersService } from './users.service';

export class UsersController {
    async getProfile(req: any, res: Response) {
        try {
            const user = await usersService.getById(req.user.id);
            const { passwordHash, ...safeUser } = user;
            res.json(safeUser);
        } catch (err: any) {
            res.status(err.message === 'User not found' ? 404 : 500).json({ message: err.message });
        }
    }

    async updateProfile(req: any, res: Response) {
        try {
            const user = await usersService.updateProfile(req.user.id, req.body);
            const { passwordHash, ...safeUser } = user;
            res.json(safeUser);
        } catch (err: any) {
            if (err?.code === '23505' || err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res.status(409).json({ message: 'Username or email already taken' });
            }
            res.status(err.message === 'User not found' ? 404 : 500).json({ message: err.message });
        }
    }
}

export const usersController = new UsersController();
