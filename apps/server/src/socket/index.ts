import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { socketAuthMiddleware } from '../middleware/socketAuth.middleware';
import { BattleHandler } from './battle.handler';
import { createPubClient, createSubClient } from '../lib/redis';
import { logger } from '../lib/logger';

/**
 * Set up Socket.IO with Redis adapter for horizontal scaling.
 *
 * The Redis adapter lets multiple server instances share room state,
 * so events emitted on one server reach clients connected to another.
 * This is the single most impactful upgrade for real-time reliability.
 */
export const setupSocket = (io: Server) => {
    // ── Redis Adapter ──────────────────────────────────────────────────────
    // Two separate ioredis clients are required (pub + sub).
    try {
        const pubClient = createPubClient();
        const subClient = createSubClient();

        // Wait for both clients to be ready, then attach adapter
        Promise.all([
            new Promise<void>((resolve) => pubClient.once('ready', resolve)),
            new Promise<void>((resolve) => subClient.once('ready', resolve)),
        ]).then(() => {
            io.adapter(createAdapter(pubClient, subClient));
            logger.info('[SOCKET.IO] Redis adapter attached — horizontal scaling enabled');
        }).catch((err) => {
            logger.warn({ err }, '[SOCKET.IO] Redis adapter failed to attach — running in single-instance mode');
        });

        // Set a timeout so we don't wait forever if Redis is down
        setTimeout(() => {
            if (pubClient.status !== 'ready' || subClient.status !== 'ready') {
                logger.warn('[SOCKET.IO] Redis not ready after 5s — continuing without adapter');
            }
        }, 5000);
    } catch (err) {
        logger.warn({ err }, '[SOCKET.IO] Could not create Redis adapter clients — running in single-instance mode');
    }

    // ── Auth Middleware ─────────────────────────────────────────────────────
    io.use(socketAuthMiddleware);

    // ── Connection Handler ──────────────────────────────────────────────────
    const battleHandler = new BattleHandler(io);

    io.on('connection', (socket) => {
        logger.info({ socketId: socket.id }, '[SOCKET.IO] User connected');
        battleHandler.handleConnection(socket);
    });
};
