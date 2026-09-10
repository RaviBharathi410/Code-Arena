import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { socketAuthMiddleware } from '../middleware/socketAuth.middleware';
import { BattleHandler } from './battle.handler';
import { RoomHandler } from './room.handler';
import { createPubClient, createSubClient, redis } from '../lib/redis';
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


        // Wait until both are ready and verify they can execute commands
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

        await pubClient.ping();
        io.adapter(createAdapter(pubClient, subClient));
        logger.info("[SOCKET.IO] Redis adapter attached — horizontal scaling enabled");
    } catch (err: any) {
        logger.warn({ err: err?.message }, '[SOCKET.IO] Redis adapter unavailable or quota exceeded — running with local in-memory adapter');
    }
    // ── Auth Middleware ─────────────────────────────────────────────────────

    io.use(socketAuthMiddleware);

    // ── Rate Limiting (per user or socket IP) ───────────────────────────────────
    const { RateLimiterMemory } = require('rate-limiter-flexible');
    const socketLimiter = new RateLimiterMemory({
        points: 50,       // 50 events
        duration: 1,      // per 1 second
    });

    // ── Connection Handler ──────────────────────────────────────────────────
    const battleHandler = new BattleHandler(io);
    const roomHandler = new RoomHandler(io);

    io.on('connection', (socket: any) => {
        logger.info({ socketId: socket.id }, '[SOCKET.IO] User connected');
        
        socket.use(async (packet: any, next: any) => {
            if (!socketLimiter) return next();
            try {
                const clientKey = socket.user?.id ? `u:${socket.user.id}` : (socket.handshake.address || socket.request?.connection?.remoteAddress || 'unknown');
                // Higher cost for run_code / submit, standard cost for others
                const eventName = packet[0];
                const pointsToConsume = (eventName === 'battle:run_code' || eventName === 'battle:submit' || eventName === 'room:run_code' || eventName === 'room:submit_code') ? 5 : 1;
                
                await socketLimiter.consume(clientKey, pointsToConsume);
                next();
            } catch (err: any) {
                if (err && typeof err.remainingPoints === 'number') {
                    logger.warn({ user: socket.user?.id, event: packet[0] }, '[SOCKET] Rate limit exceeded on socket');
                    socket.emit('socket:error', { message: 'Rate limit exceeded. Please slow down.' });
                    return next(new Error('Rate limit exceeded'));
                }
                // Redis error / quota exceeded -> fail open so users are not blocked
                logger.warn({ user: socket.user?.id, event: packet[0], err: err?.message }, '[SOCKET] Rate limiter degraded — bypassing check');
                next();
            }
        });

        battleHandler.handleConnection(socket);
        roomHandler.handleConnection(socket);
    });
};
