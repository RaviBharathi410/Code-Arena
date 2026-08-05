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
export let ioInstance: Server | null = null;

export const setupSocket = async (io: Server) => {
    ioInstance = io;
    // ── Redis Adapter ──────────────────────────────────────────────────────
    // Two separate ioredis clients are required (pub + sub).
    try {
        const pubClient = createPubClient();
        const subClient = createSubClient();


        // Wait until both are ready
        await Promise.all([
            new Promise<void>((resolve, reject) => {
                pubClient.once("ready", resolve);
                pubClient.once("error", reject);
            }),
            new Promise<void>((resolve, reject) => {
                subClient.once("ready", resolve);
                subClient.once("error", reject);
            })
        ]);

        io.adapter(createAdapter(pubClient, subClient));
        logger.info("[SOCKET.IO] Redis adapter attached — horizontal scaling enabled");
    } catch (err) {
        logger.warn({ err }, 'Redis unavailable');
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
