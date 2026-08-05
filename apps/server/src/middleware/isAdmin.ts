import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthRequest } from './auth.middleware';

/**
 * Middleware: Require admin or superadmin role.
 * Must be used AFTER requireAuth.
 * Also ensures the user is not banned.
 */
export const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const user = await User.findById(req.user.id).select('role isBanned').lean();

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (user.isBanned) {
            return res.status(403).json({ error: 'Account is banned' });
        }

        if (user.role !== 'admin' && user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (err: any) {
        res.status(500).json({ error: 'Internal server error during authorization' });
    }
};
