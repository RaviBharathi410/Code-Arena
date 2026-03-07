import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

const redisUrl = env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false, // Don't buffer commands if Redis is down
    retryStrategy: (times) => {
        if (times > 3) {
            logger.error('Redis connection failed after 3 attempts. Proceeding without Redis features.');
            return null; // Stop retrying
        }
        return Math.min(times * 500, 2000);
    }
});

redis.on('connect', () => logger.info('Redis connection established'));
redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));
