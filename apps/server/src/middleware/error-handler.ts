import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

/**
 * Global error handling middleware.
 * MUST be registered LAST — after all routes — in app.ts.
 * Maps known error types to appropriate HTTP status codes.
 * In production, never leaks stack traces or internal error messages.
 */
export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction,
) => {
    const isProd = env.NODE_ENV === 'production';

    // Log with enough context for debugging using pino attached to req
    if (req.log) {
        req.log.error({ err }, err.message || 'Unhandled Runtime Error');
    } else {
        console.error({
            message: err.message,
            path: req.path,
            method: req.method,
            ...(isProd ? {} : { stack: err.stack }),
        });
    }

    // -- Known Error Types --

    // Zod validation failures (may be re-thrown from controllers)
    if (err instanceof ZodError) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: err.flatten().fieldErrors,
        });
    }

    // JWT / auth errors surfaced explicitly
    if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // SQLite unique constraint violation (matches PostgreSQL SQLITE_CONSTRAINT_UNIQUE)
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.code === '23505') {
        return res.status(409).json({ message: 'Already exists' });
    }

    // SQLite FK constraint violation (referenced resource missing)
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || err.code === '23503') {
        return res.status(404).json({ message: 'Referenced resource not found' });
    }

    // Generic fallback
    const status = err.status ?? err.statusCode ?? 500;
    res.status(status).json({
        message: isProd ? 'Internal server error' : err.message,
        ...(isProd ? {} : { stack: err.stack }),
    });
};
