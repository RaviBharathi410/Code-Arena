import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
    };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token' });
    }

    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, env.JWT_SECRET) as any;

        if (payload.type !== 'access') {
            throw new Error('Wrong token type');
        }

        req.user = {
            id: payload.sub,
            username: payload.username
        };
        next();
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Aliasing for compatibility if needed
export const authMiddleware = requireAuth;
