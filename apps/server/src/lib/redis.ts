import Redis, { RedisOptions } from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

const redisUrl = env.REDIS_URL || 'redis://127.0.0.1:6379';
logger.info(`[REDIS] URL: ${redisUrl}`);
/**
 * Shared Redis connection options with retry strategy and error handling.
 */
const baseOptions: RedisOptions = {
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
    showFriendlyErrorStack: true,
    retryStrategy: (times: number) => {
        const delay = Math.min(times * 500, 10000);
        if (times % 20 === 0) {
            logger.debug({ times }, '[REDIS] Persistent uplink attempt in progress...');
        }
        return delay;
    },

    // Required for Upstash/rediss:// connections
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
};
const realRedis = new Redis(redisUrl, baseOptions);
logger.info(`[REDIS] Initial Status: ${realRedis.status}`);
// ── Primary Client ─────────────────────────────────────────────────────────
// Used for general commands: GET, SET, ZADD, etc.


realRedis.on('connect', () => {
    logger.info('[REDIS] Primary client connected');
});

const isConnRefused = (err: any) => {
    return err.code === 'ECONNREFUSED' ||
        err.message?.includes('ECONNREFUSED') ||
        (err.name === 'AggregateError' && err.errors?.some((e: any) => e.code === 'ECONNREFUSED'));
};

realRedis.on('error', (err: any) => {
    if (env.NODE_ENV === 'production') {
        logger.fatal({ err }, '[REDIS] Connection error in production. Shutting down.');
        process.exit(1);
    }
    if (isConnRefused(err) && (realRedis.status === 'reconnecting' || realRedis.status === 'connecting')) {
        return; // Silent during reconnection
    }
    if (realRedis.status !== 'end') {
        logger.error({ err }, '[REDIS] Primary client error');
    }
});

realRedis.on('end', () => {
    if (env.NODE_ENV === 'production') {
        logger.fatal('[REDIS] Connection ended in production. Shutting down.');
        process.exit(1);
    }
    logger.warn('[REDIS] Primary connection closed. Redis features are disabled.');
});

// ── Pub/Sub Clients for Socket.IO Redis Adapter ────────────────────────────

export function createPubClient(): Redis {
    const pub = new Redis(redisUrl, { ...baseOptions, enableOfflineQueue: true });
    pub.on('connect', () => logger.info('[REDIS] Pub client connected'));
    pub.on('error', (err: any) => {
        if (env.NODE_ENV === 'production') {
            logger.fatal({ err }, '[REDIS] Pub client connection error in production. Shutting down.');
            process.exit(1);
        }
        if (!isConnRefused(err)) logger.error({ err }, '[REDIS] Pub client error');
    });
    return pub;
}

export function createSubClient(): Redis {
    const sub = new Redis(redisUrl, { ...baseOptions, enableOfflineQueue: true });
    sub.on('connect', () => logger.info('[REDIS] Sub client connected'));
    sub.on('error', (err: any) => {
        if (env.NODE_ENV === 'production') {
            logger.fatal({ err }, '[REDIS] Sub client connection error in production. Shutting down.');
            process.exit(1);
        }
        if (!isConnRefused(err)) logger.error({ err }, '[REDIS] Sub client error');
    });
    return sub;
}

export function createBullMQRedisClient(): Redis {
    const client = new Redis(redisUrl, {
        ...baseOptions,
        maxRetriesPerRequest: null,
        enableOfflineQueue: true,
    });
    client.on('error', (err: any) => {
        if (env.NODE_ENV === 'production') {
            logger.fatal({ err }, '[REDIS] BullMQ client connection error in production. Shutting down.');
            process.exit(1);
        }
        if (!isConnRefused(err)) logger.error({ err }, '[REDIS] BullMQ client error');
    });
    return client;
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
                    if (env.NODE_ENV === 'production') {
                        throw new Error(`Redis command '${cmd}' failed: Redis client is not in ready state (${target.status})`);
                    }

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
