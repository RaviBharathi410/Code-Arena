import './config/env';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { setupSocket } from './socket';
import { config } from './config';
import { env } from './config/env';
import { logger } from './lib/logger';

const startServer = () => {
    const app = createApp();
    const httpServer = createServer(app);

    const io = new Server(httpServer, {
        cors: {
            origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
            credentials: true,
            methods: ['GET', 'POST'],
        },
    });

    setupSocket(io);

    httpServer.listen(config.port, '0.0.0.0', () => {
        logger.info(`[ARENA] Intelligence Uplink established on port ${config.port}`);
        logger.info(`[ARENA] Mode: ${config.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    });

    // ── Step 16: Process-level crash guards ────────────────────────────────
    // Gracefully shut down instead of continuing in a broken state.

    process.on('unhandledRejection', (reason) => {
        logger.fatal({ err: reason }, '[FATAL] Unhandled promise rejection');
        httpServer.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
        logger.fatal({ err }, '[FATAL] Uncaught exception');
        httpServer.close(() => process.exit(1));
    });

    // Graceful SIGTERM shutdown (e.g. from Docker / PM2)
    process.on('SIGTERM', () => {
        logger.info('[ARENA] SIGTERM received. Closing uplink gracefully...');
        httpServer.close(() => {
            logger.info('[ARENA] HTTP server closed.');
            process.exit(0);
        });
    });

    return httpServer;
};

startServer();
