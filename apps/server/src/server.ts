import './config/env';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app';
import { setupSocket } from './socket';
import { config } from './config';
import { env } from './config/env';
import { logger } from './lib/logger';
import { setCodeQueueIO, setEloQueueIO, codeExecutionWorker, eloWorker, analyticsWorker } from './queues';
import { connectDB } from './config/db';
console.log("===== SERVER.TS LOADED =====");
const startServer = async () => {
    logger.info('[MongoDB] Connecting...');
 
    await connectDB();

    logger.info('[MongoDB] Database ready.');

    const app = createApp();
    const httpServer = createServer(app);

    const io = new Server(httpServer, {
        cors: {
            origin: env.CORS_ORIGIN.split(',').map((o) => o.trim().replace(/\/+$/, '')),
            credentials: true,
            methods: ['GET', 'POST'],
        },
        maxHttpBufferSize: 5e4, // 50 KB max payload size to prevent DoS
    });

    await setupSocket(io);

    // ── BullMQ: Wire Socket.IO into queue workers ─────────────────────────
    // This lets workers emit real-time events after processing jobs.
    setCodeQueueIO(io);
    setEloQueueIO(io);
    logger.info('[ARENA] BullMQ workers wired with Socket.IO');

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
    process.on('SIGTERM', async () => {
        logger.info('[ARENA] SIGTERM received. Closing uplink gracefully...');

        // Close BullMQ workers first (let in-flight jobs finish)
        await Promise.allSettled([
            codeExecutionWorker.close(),
            eloWorker.close(),
            analyticsWorker.close(),
        ]);
        logger.info('[ARENA] BullMQ workers closed.');

        httpServer.close(() => {
            logger.info('[ARENA] HTTP server closed.');
            process.exit(0);
        });
    });

    return httpServer;
};

startServer().catch((err) => {
    logger.fatal({ err }, '[ARENA] Failed to start server');
    process.exit(1);
});
