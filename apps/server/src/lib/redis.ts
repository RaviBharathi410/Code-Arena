import Redis, { RedisOptions } from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

const redisUrl = env.REDIS_URL || 'redis://localhost:6379';

/**
 * Shared Redis connection options with retry strategy and error handling.
 */
const baseOptions: RedisOptions = {
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
    showFriendlyErrorStack: true,
    retryStrategy: (times: number) => {
        if (times > 5) {
            logger.warn('[REDIS] Max retries reached, giving up reconnect.');
            return null;
        }
        return Math.min(times * 500, 3000);
    },
    lazyConnect: true, // Don't crash if Redis is down on startup
};

// ── Primary Client ─────────────────────────────────────────────────────────
// Used for general commands: GET, SET, ZADD, etc.
const realRedis = new Redis(redisUrl, baseOptions);

realRedis.on('connect', () => {
    logger.info('[REDIS] Primary client connected');
});

realRedis.on('error', (err: any) => {
    if (err.code === 'ECONNREFUSED' && (realRedis.status === 'reconnecting' || realRedis.status === 'connecting')) {
        logger.debug({ port: err.port, host: err.address }, '[REDIS] Connection refused, retrying...');
        return;
    }
    if (realRedis.status !== 'end') {
        logger.error({ err }, '[REDIS] Primary client error');
    }
});

realRedis.on('end', () => {
    logger.warn('[REDIS] Primary connection closed. Redis features are disabled.');
});

// ── Pub/Sub Clients for Socket.IO Redis Adapter ────────────────────────────
// Socket.IO Redis adapter requires two dedicated clients (pub + sub).
// These MUST be separate instances — never reuse the primary client.

export function createPubClient(): Redis {
    const pub = new Redis(redisUrl, { ...baseOptions, enableOfflineQueue: true });
    pub.on('connect', () => logger.info('[REDIS] Pub client connected'));
    pub.on('error', (err: any) => {
        if (err.code !== 'ECONNREFUSED') logger.error({ err }, '[REDIS] Pub client error');
    });
    return pub;
}

export function createSubClient(): Redis {
    const sub = new Redis(redisUrl, { ...baseOptions, enableOfflineQueue: true });
    sub.on('connect', () => logger.info('[REDIS] Sub client connected'));
    sub.on('error', (err: any) => {
        if (err.code !== 'ECONNREFUSED') logger.error({ err }, '[REDIS] Sub client error');
    });
    return sub;
}

// ── Safe Proxy Wrapper ─────────────────────────────────────────────────────
// Intercepts method calls to provide safe fallbacks when Redis is unavailable.
// This prevents app crashes during local dev when Redis isn't running.

const isArrayCommand = (cmd: string) =>
    ['zrange', 'zrangebyscore', 'zrevrange', 'zrevrangebyscore', 'lrange', 'smembers', 'keys'].includes(cmd);

const isChainCommand = (cmd: string) =>
    ['multi', 'pipeline'].includes(cmd);

const loggedCommands = new Set<string>();

export const redis = new Proxy(realRedis, {
    get(target, prop: string | symbol) {
        const originalValue = target[prop as keyof Redis];

        if (typeof originalValue === 'function') {
            return (...args: any[]) => {
                const cmd = String(prop);

                if (target.status !== 'ready') {
                    // Log only once per command type to avoid spamming
                    if (!loggedCommands.has(cmd)) {
                        logger.debug({ cmd }, '[REDIS] Command intercepted — Redis unavailable, returning fallback');
                        loggedCommands.add(cmd);
                    }

                    if (isChainCommand(cmd)) {
                        const mockChain = {
                            exec: () => Promise.resolve([[null, 0], [null, 0]]),
                        } as any;
                        return new Proxy(mockChain, {
                            get(t, p) {
                                if (p === 'exec') return t.exec;
                                return () => mockChain;
                            }
                        });
                    }

                    if (isArrayCommand(cmd)) {
                        return Promise.resolve([]);
                    }

                    return Promise.resolve(null);
                }

                try {
                    return (originalValue as Function).apply(target, args);
                } catch (err) {
                    logger.error({ err, cmd }, '[REDIS] Runtime command error');
                    return Promise.resolve(null);
                }
            };
        }

        return originalValue;
    }
}) as Redis;

/**
 * Check if Redis is currently connected and ready for commands.
 */
export function isRedisReady(): boolean {
    return realRedis.status === 'ready';
}
