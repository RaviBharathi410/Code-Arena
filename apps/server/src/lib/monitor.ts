import { logger } from './logger';
import { redis } from './redis';

/**
 * System Monitor Class
 * 
 * Tracks real-time metrics, failed attempts, and rate limit strikes.
 * Designed to integrate with Prometheus or Datadog in the future.
 */
export class Monitor {
    private readonly METRICS_KEY = 'arena:metrics';

    /**
     * Track a specific event (e.g., 'auth_failed', 'rate_limit_hit')
     */
    async trackEvent(eventName: string, metadata?: Record<string, any>) {
        try {
            // Increment the counter in Redis
            await redis.hincrby(this.METRICS_KEY, eventName, 1);
            
            // Log the event for immediate visibility
            if (metadata) {
                logger.warn({ eventName, ...metadata }, `[MONITOR] Security/System event triggered`);
            } else {
                logger.info(`[MONITOR] Event tracked: ${eventName}`);
            }
        } catch (err) {
            // Failsafe: don't crash if Redis is unavailable
            logger.error({ err, eventName }, '[MONITOR] Failed to track event in Redis');
        }
    }

    /**
     * Get current metrics snapshot
     */
    async getMetrics() {
        try {
            const metrics = await redis.hgetall(this.METRICS_KEY);
            return metrics;
        } catch (err) {
            logger.error({ err }, '[MONITOR] Failed to fetch metrics');
            return {};
        }
    }

    /**
     * Track an IP that has hit a rate limit
     */
    async trackRateLimitStrike(ip: string, endpoint: string) {
        await this.trackEvent('rate_limit_hit', { ip, endpoint });
        
        // Could optionally add the IP to a temporary blocklist here
        // await redis.setex(`blocklist:${ip}`, 3600, '1');
    }

    /**
     * Track an unexpected internal error
     */
    async trackInternalError(errorName: string, path: string) {
        await this.trackEvent('internal_error', { errorName, path });
    }
}

export const monitor = new Monitor();
