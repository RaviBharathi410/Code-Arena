import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/error-handler';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import crypto from 'crypto';

import authRoutes from './modules/auth/auth.router';
import userRoutes from './modules/users/users.router';
import problemRoutes from './modules/problems/problems.router';
import matchRoutes from './modules/matches/matches.router';
import leaderboardRoutes from './modules/leaderboard/leaderboard.router';
import tournamentRoutes from './modules/tournaments/tournaments.router';
import submissionRoutes from './modules/submissions/submissions.router';

export const createApp = () => {
    const app = express();

    // ── Step 17: Pino HTTP Logging ────────────────────────────────────────
    app.use(pinoHttp({ logger, genReqId: () => crypto.randomUUID() }));

    // ── Step 13: Security Headers (Helmet) ────────────────────────────────
    // Sets X-Frame-Options, X-Content-Type-Options, HSTS, XSS-Protection, etc.
    app.use(helmet());
    app.use(
        helmet.contentSecurityPolicy({
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                connectSrc: ["'self'", env.CORS_ORIGIN],
            },
        })
    );

    // ── Step 14: Strict CORS ───────────────────────────────────────────────
    // Explicit allowlist — no wildcards; credentials: true for HttpOnly cookies
    const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
    app.use(
        cors({
            origin: (origin, callback) => {
                // Allow requests with no Origin header (e.g. curl, same-origin SSR)
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error(`CORS policy: ${origin} not allowed`));
                }
            },
            credentials: true,   // Required for Set-Cookie (refresh token)
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: ['Authorization', 'Content-Type'],
        })
    );

    // ── Core Middlewares ───────────────────────────────────────────────────
    app.use(express.json({ limit: '10kb' })); // Limit payload size
    app.use(cookieParser());

    // ── Step 12: Rate Limiting ─────────────────────────────────────────────
    app.use('/api', apiLimiter);

    // ── Health Check (no auth, no limiter) ────────────────────────────────
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', message: 'Arena Intelligence Uplink Active' });
    });

    // ── Auth routes with strict limiter on sensitive endpoints ─────────────
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);

    // ── API Routes ─────────────────────────────────────────────────────────
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/problems', problemRoutes);
    app.use('/api/matches', matchRoutes);
    app.use('/api/leaderboard', leaderboardRoutes);
    app.use('/api/tournaments', tournamentRoutes);
    app.use('/api/submissions', submissionRoutes);

    // ── Step 16: Global Error Handler (MUST be last) ──────────────────────
    app.use(errorHandler);

    return app;
};
