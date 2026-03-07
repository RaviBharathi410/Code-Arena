import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure that the authenticated user is the owner of the resource.
 * Expects req.user to be populated by authMiddleware and the target ID to be in req.params.id.
 */
export const requireOwnership = (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.id !== req.params.id) {
        return res.status(403).json({ message: 'Forbidden: You do not own this resource' });
    }

    next();
};
