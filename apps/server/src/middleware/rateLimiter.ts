import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// Redis integration is optional — falls back to in-memory for local dev.
// In production, wire up a RedisStore here for distributed rate limiting.
// The reason we do NOT init Redis here at module load is to avoid crashing
// the server on startup when Redis is unavailable.

// Strict limit on auth endpoints — prevents brute-force attacks
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 10,                    // 10 attempts per IP per window
    standardHeaders: true,      // Return RateLimit-* headers
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
        message: 'Too many attempts. Try again in 15 minutes.'
    }),
    skipSuccessfulRequests: true,  // Only count failures against the limit
});

// General API limit — prevents abuse / scraping
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000,        // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
