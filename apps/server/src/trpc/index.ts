import { initTRPC, TRPCError } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../lib/logger';

/**
 * tRPC Context
 * Extract user from JWT in the Authorization header.
 */
export const createContext = ({ req, res }: CreateExpressContextOptions) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
            const decoded = jwt.verify(token, env.JWT_SECRET) as any;
            return {
                user: {
                    id: decoded.sub,
                    username: decoded.username,
                    role: decoded.role || 'player',
                },
                req,
                res,
            };
        } catch (err) {
            // Invalid token, context will have user: null
        }
    }

    return {
        user: null,
        req,
        res,
    };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

/**
 * Middleware: requireAuth
 */
const isAuthed = t.middleware(({ next, ctx }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }
    return next({
        ctx: {
            user: ctx.user,
        },
    });
});

/**
 * Middleware: isAdmin
 */
const isAdmin = t.middleware(({ next, ctx }) => {
    if (!ctx.user || ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
    }
    return next({
        ctx: {
            user: ctx.user,
        },
    });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
export const adminProcedure = t.procedure.use(isAdmin);
export const middleware = t.middleware;
