import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: string;
    };
}

/**
 * Middleware: Require a valid JWT access token.
 * Attaches decoded user payload to `req.user`.
 */
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
            username: payload.username,
            role: payload.role || 'player',
        };
        next();
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

/**
 * Middleware: Require admin role.
 * Must be used AFTER requireAuth.
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

/**
 * Middleware factory: Require one of the specified roles.
 * Must be used AFTER requireAuth.
 *
 * Usage: requireRole('admin', 'moderator')
 */
export const requireRole = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` });
        }
        next();
    };
};

// Aliasing for compatibility if needed
export const authMiddleware = requireAuth;
