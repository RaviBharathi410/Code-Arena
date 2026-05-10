import type { ConnectionOptions } from 'bullmq';
import { env } from '../config/env';

/**
 * Shared BullMQ connection config.
 * By default uses 127.0.0.1 to avoid AggregateError (IPv6 resolution issues).
 */
const getRedisUrl = () => {
    const url = new URL(env.REDIS_URL || 'redis://127.0.0.1:6379');
    // If hostname is localhost, force 127.0.0.1 for stability
    if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
    return url;
};

export const bullmqConnection: ConnectionOptions = {
    host: getRedisUrl().hostname,
    port: parseInt(getRedisUrl().port || '6379', 10),
    maxRetriesPerRequest: null, // Required by BullMQ
};
