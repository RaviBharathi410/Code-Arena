import type { ConnectionOptions } from 'bullmq';
import { env } from '../config/env';

/**
 * Shared BullMQ connection config.
 * BullMQ uses ioredis under the hood — this provides the connection options.
 */
export const bullmqConnection: ConnectionOptions = {
    host: new URL(env.REDIS_URL || 'redis://localhost:6379').hostname,
    port: parseInt(new URL(env.REDIS_URL || 'redis://localhost:6379').port || '6379', 10),
    maxRetriesPerRequest: null, // Required by BullMQ (no timeout on blocking commands)
};
