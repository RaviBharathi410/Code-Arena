import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';

import authRoutes from './modules/auth/auth.router';
import userRoutes from './modules/users/users.router';
import problemRoutes from './modules/problems/problems.router';
import matchRoutes from './modules/matches/matches.router';
import leaderboardRoutes from './modules/leaderboard/leaderboard.router';
import tournamentRoutes from './modules/tournaments/tournaments.router';

export const createApp = () => {
    const app = express();

    // Standard Middlewares
    app.use(cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    }));
    app.use(express.json());
    app.use(cookieParser());

    // Security: Global Rate Limiting
    app.use('/api', apiLimiter);

    // Health check
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', message: 'Arena Intelligence Uplink Active' });
    });

    // Routes
    // Apply strict limiting specifically to auth endpoints
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);

    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/problems', problemRoutes);
    app.use('/api/matches', matchRoutes);
    app.use('/api/leaderboard', leaderboardRoutes);
    app.use('/api/tournaments', tournamentRoutes);

    return app;
};
