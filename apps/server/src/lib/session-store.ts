import crypto from 'crypto';
import { redis } from './redis';
import { logger } from './logger';

const SESSION_PREFIX = 'session:refresh:';
const USER_SESSIONS_PREFIX = 'session:user:';
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * SessionStore — Redis-backed refresh token storage with rotation and reuse detection.
 *
 * Stores hashed refresh tokens in Redis with a 7-day TTL.
 * On refresh: verify → rotate (delete old, insert new) → return new pair.
 * On reuse detection: invalidate ALL tokens for the userId.
 */
export class SessionStore {
    /**
     * Hash a token for secure storage (never store raw tokens).
     */
    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Store a refresh token in Redis.
     * Links the token hash to the userId and tracks it in the user's session set.
     */
    async storeToken(tokenId: string, userId: string, token: string): Promise<void> {
        const tokenHash = this.hashToken(token);
        const key = `${SESSION_PREFIX}${tokenId}`;
        const userKey = `${USER_SESSIONS_PREFIX}${userId}`;

        // Store token data with TTL
        await redis.setex(key, REFRESH_TOKEN_TTL, JSON.stringify({
            tokenHash,
            userId,
            createdAt: Date.now(),
        }));

        // Track this token in the user's active sessions set
        await redis.sadd(userKey, tokenId);
        await redis.expire(userKey, REFRESH_TOKEN_TTL);

        logger.debug({ tokenId, userId }, '[SESSION] Refresh token stored');
    }

    /**
     * Verify a refresh token and return the associated data.
     * Returns null if token is invalid, expired, or already used.
     */
    async verifyToken(tokenId: string, token: string): Promise<{ userId: string } | null> {
        const key = `${SESSION_PREFIX}${tokenId}`;
        const data = await redis.get(key);

        if (!data) {
            // Token not found — could be expired or already rotated.
            // This is a potential reuse attack if the token was previously valid.
            logger.warn({ tokenId }, '[SESSION] Token not found — possible reuse attack');
            return null;
        }

        const parsed = JSON.parse(data);
        const tokenHash = this.hashToken(token);

        if (parsed.tokenHash !== tokenHash) {
            logger.warn({ tokenId }, '[SESSION] Token hash mismatch');
            return null;
        }

        return { userId: parsed.userId };
    }

    /**
     * Rotate a refresh token: delete the old one, issue tracking for the new one.
     * This is called during the refresh flow.
     */
    async rotateToken(oldTokenId: string, newTokenId: string, userId: string, newToken: string): Promise<void> {
        const oldKey = `${SESSION_PREFIX}${oldTokenId}`;
        const userKey = `${USER_SESSIONS_PREFIX}${userId}`;

        // Delete old token
        await redis.del(oldKey);
        await redis.srem(userKey, oldTokenId);

        // Store new token
        await this.storeToken(newTokenId, userId, newToken);

        logger.debug({ oldTokenId, newTokenId, userId }, '[SESSION] Token rotated');
    }

    /**
     * Invalidate ALL refresh tokens for a user.
     * Called on suspicious reuse detection or explicit logout-all.
     */
    async invalidateAllUserTokens(userId: string): Promise<void> {
        const userKey = `${USER_SESSIONS_PREFIX}${userId}`;
        const tokenIds = await redis.smembers(userKey);

        if (tokenIds && tokenIds.length > 0) {
            const pipeline = redis.pipeline();
            for (const tokenId of tokenIds) {
                pipeline.del(`${SESSION_PREFIX}${tokenId}`);
            }
            pipeline.del(userKey);
            await pipeline.exec();

            logger.warn({ userId, tokenCount: tokenIds.length }, '[SESSION] All tokens invalidated (security event)');
        }
    }

    /**
     * Invalidate a single token (standard logout).
     */
    async invalidateToken(tokenId: string, userId: string): Promise<void> {
        const key = `${SESSION_PREFIX}${tokenId}`;
        const userKey = `${USER_SESSIONS_PREFIX}${userId}`;

        await redis.del(key);
        await redis.srem(userKey, tokenId);

        logger.debug({ tokenId, userId }, '[SESSION] Token invalidated');
    }
}

export const sessionStore = new SessionStore();
