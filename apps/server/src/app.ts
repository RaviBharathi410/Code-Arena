import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env';
import { apiLimiter, authLimiter, authSlidingWindowLimiter, abuseLimiter } from './middleware/rateLimiter';
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
import webhookRoutes from './modules/internal/webhook.router';
import { createQueueDashboard } from './admin/queue-dashboard';
import metricsRoutes from './admin/metrics.router';
import adminRoutes from './modules/admin/admin.router';
import aiRoutes from './modules/ai/ai.router';
import recommendationsRouter from './modules/problems/recommendations.router';
import socialRoutes from './modules/social/social.router';
import teamRoutes from './modules/teams/teams.router';
import gamificationRoutes from './modules/gamification/gamification.router';
import analyticsRoutes from './modules/analytics/analytics.router';
import skillsRoutes from './modules/skills/skills.router';
import practiceRoutes from './modules/practice/practice.router';
import roomRoutes from './modules/rooms/rooms.router';
import notificationsRoutes from './modules/notifications/notifications.router';
import { aiProviderManager } from './lib/ai/AIProviderManager';
import { requireAdmin, requireAuth } from './middleware/auth.middleware';
import mongoose from 'mongoose';
import { redis } from './lib/redis';

export const createApp = () => {
    const app = express();
    logger.info('[ARENA] Initializing Application...');

    // ── Step 17: Pino HTTP Logging ────────────────────────────────────────
    app.use(pinoHttp({ logger, genReqId: () => crypto.randomUUID() }));

    // ── Step 13: Security Headers (Helmet) ────────────────────────────────
    // Sets X-Frame-Options, X-Content-Type-Options, HSTS, XSS-Protection, etc.
    app.use(
        helmet({
            crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
            crossOriginEmbedderPolicy: false,
        })
    );
    app.use(
        helmet.contentSecurityPolicy({
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "'unsafe-eval'",
                    "https://cdn.jsdelivr.net",
                    "https://accounts.google.com",
                    "https://accounts.google.com/gsi/client",
                ],
                frameSrc: ["'self'", "https://accounts.google.com"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
                connectSrc: [
                    "'self'",
                    ...env.CORS_ORIGIN.split(',').map((o) => o.trim()),
                    "https://accounts.google.com",
                    "https://oauth2.googleapis.com",
                    "ws://localhost:5173",
                    "wss://localhost:5173",
                    "ws://localhost:3001",
                    "wss://localhost:3001",
                    "ws://127.0.0.1:3001",
                    "wss://127.0.0.1:3001",
                ],
                imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https:", "https://lh3.googleusercontent.com"],
                workerSrc: ["'self'", "blob:"],
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
                if (
                    !origin ||
                    allowedOrigins.includes(origin) ||
                    (env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
                ) {
                    callback(null, true);
                } else {
                    callback(new Error(`CORS policy: ${origin} not allowed`));
                }
            },
            credentials: true,   // Required for Set-Cookie (refresh token)
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Requested-With', 'Origin'],
        })
    );

    // ── Core Middlewares ───────────────────────────────────────────────────
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({
        extended: false,
        limit: '10mb'
    }));
    // Limit payload size to prevent DoS
    app.use(cookieParser());

    // ── Security Hardening: HPP & NoSQL Sanitization ───────────────────────
    app.use(hpp()); // Prevent HTTP Parameter Pollution
    app.use(
        mongoSanitize({
            replaceWith: "_",
        })
    );

    // ── Step 12: Rate Limiting ─────────────────────────────────────────────
    app.use('/api', apiLimiter);

    // ── Health Check (no auth, no limiter) ────────────────────────────────
    app.get('/health', (req, res) => {
        const aiAvailable = aiProviderManager.isAvailable();
        const dbConnected = mongoose.connection.readyState === 1;
        const redisConnected = redis.status === 'ready' || redis.status === 'connect';

        const isHealthy = dbConnected;
        const statusCode = isHealthy ? 200 : 503;

        res.status(statusCode).json({
            status: isHealthy ? 'ok' : 'degraded',
            database: dbConnected ? 'connected' : 'disconnected',
            redis: redisConnected ? 'connected' : redis.status,
            ai: aiAvailable ? 'healthy' : 'degraded',
            uptimeSeconds: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
            message: 'Arena Intelligence Uplink Active',
        });
    });

    // ── Auth routes with strict limiter on sensitive endpoints ─────────────
    // Two layers: express-rate-limit (fixed window) + rate-limiter-flexible (sliding window via Redis)
    app.use('/api/auth/login', authLimiter, authSlidingWindowLimiter);
    app.use('/api/auth/register', authLimiter, authSlidingWindowLimiter);

    // ── API Routes ─────────────────────────────────────────────────────────
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/problems/recommendations', recommendationsRouter);
    app.use('/api/problems', problemRoutes);
    app.use('/api/matches', matchRoutes);
    app.use('/api/leaderboard', leaderboardRoutes);
    app.use('/api/tournaments', tournamentRoutes);
    app.use('/api/submissions', submissionRoutes);
    app.use('/api/ai', aiRoutes);
    app.use('/api/social', socialRoutes);
    app.use('/api/teams', teamRoutes);
    app.use('/api/gamification', gamificationRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/skills', skillsRoutes);
    app.use('/api/practice', practiceRoutes);
    app.use('/api/rooms', roomRoutes);
    app.use('/api/notifications', notificationsRoutes);

    // ── Internal Routes (not behind API rate limiter) ──────────────────────
    // Judge0 webhook callback — no auth, but will be secured by signature in Phase 5
    app.use('/internal', webhookRoutes);

    // ── Admin Dashboard ────────────────────────────────────────────────────
    // Bull Board queue dashboard — protected by admin JWT middleware
    app.use('/admin/queues', requireAuth, requireAdmin, createQueueDashboard());
    app.use(
        '/admin/metrics',
        requireAuth,
        requireAdmin,
        metricsRoutes
    );
    app.use('/api/admin', adminRoutes);

    // ── Step 16: Global Error Handler (MUST be last) ──────────────────────
    app.use(errorHandler);

    return app;
};
