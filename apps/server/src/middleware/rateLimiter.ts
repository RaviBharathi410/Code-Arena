import rateLimit from 'express-rate-limit';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { redis, isRedisReady } from '../lib/redis';
import { logger } from '../lib/logger';
import { monitor } from '../lib/monitor';
import type { Request, Response, NextFunction } from 'express';

// ── express-rate-limit: General API limiter ────────────────────────────────
// Prevents abuse / scraping on all API endpoints.

export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,        // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

// ── express-rate-limit: Auth endpoint limiter ──────────────────────────────
// Strict limit on auth endpoints — prevents brute-force attacks.

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,                    // Increased for development
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        monitor.trackRateLimitStrike(ip, req.originalUrl);
        res.status(429).json({
            message: 'Too many attempts. Try again in 15 minutes.'
        });
    },
    skipSuccessfulRequests: true,
});

// ── express-rate-limit: Abuse-prone endpoint limiter ───────────────────────
// Very strict limit on password reset, email resend, etc.

export const abuseLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 5,                    // 5 requests per hour
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        logger.warn({ ip, path: req.originalUrl }, '[SECURITY] Abuse limiter triggered');
        monitor.trackRateLimitStrike(ip, req.originalUrl);
        res.status(429).json({
            message: 'Too many requests. Try again in an hour.'
        });
    },
});

// ── express-rate-limit: AI endpoints limiter ──────────────────────────────
// Protects free-tier AI tokens and enforces debouncing / quota budgeting.

export const aiLimiter = rateLimit({
    windowMs: 60 * 1000,        // 1 minute
    max: 20,                   // Max 20 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn({ ip: req.ip, path: req.originalUrl }, '[SECURITY] AI rate limit exceeded');
        res.status(429).json({
            error: 'AI request limit reached. Please pause briefly before sending more AI requests.'
        });
    },
});

/**
 * Initialize rate limiter with fallback logic.
 * Note: RateLimiterRedis is preferred for distributed state, 
 * while RateLimiterMemory is used for single-instance resilience.
 */
let authRateLimiter: RateLimiterRedis | RateLimiterMemory;

const initRateLimiter = () => {
    if (isRedisReady()) {
        authRateLimiter = new RateLimiterRedis({
            storeClient: redis,
            keyPrefix: 'rl:auth',
            points: 100,
            duration: 15 * 60,
            blockDuration: 15 * 60,
        });
        logger.info('[RATE-LIMITER] Using Redis-backed sliding window for auth');
    } else {
        authRateLimiter = new RateLimiterMemory({
            keyPrefix: 'rl:auth',
            points: 100,
            duration: 15 * 60,
            blockDuration: 15 * 60,
        });
        logger.warn('[RATE-LIMITER] Redis offline — falling back to local memory rate limiting');
    }
};

// Initial setup
initRateLimiter();

/**
 * Middleware: IP-based sliding window rate limiter for auth endpoints.
 * Uses rate-limiter-flexible for precise sliding window counters.
 */
export const authSlidingWindowLimiter = async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    try {
        await authRateLimiter.consume(ip);
        next();
    } catch (rateLimiterRes: any) {
        monitor.trackRateLimitStrike(ip, req.originalUrl);

        const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000) || 900;
        res.set('Retry-After', String(retryAfter));
        res.status(429).json({
            message: 'Too many authentication attempts. Try again later.',
            retryAfterSeconds: retryAfter,
        });
    }
};
