import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../../db';
import { users, refreshTokens } from '@arena/database';
import { eq, or } from 'drizzle-orm';
import { env } from '../../config/env';

export class AuthService {
    async register(userData: { username: string; email: string; password: string }) {
        // 1. Check if user already exists
        const existingUser = await db.query.users.findFirst({
            where: or(
                eq(users.email, userData.email),
                eq(users.username, userData.username)
            ),
        });

        if (existingUser) {
            // Do not reveal which field is duplicate for security
            throw new Error('User already exists');
        }

        // 2. Hash password with bcrypt
        const passwordHash = await bcrypt.hash(userData.password, env.BCRYPT_ROUNDS);

        // 3. Insert user record
        const id = crypto.randomUUID();
        const [newUser] = await db.insert(users).values({
            id,
            username: userData.username,
            email: userData.email,
            passwordHash,
        }).returning();

        // 4. Generate tokens
        const accessToken = this.generateAccessToken(newUser);
        const { refreshToken, tokenId } = await this.generateRefreshToken(newUser.id);

        return { accessToken, refreshToken, user: { id: newUser.id, username: newUser.username } };
    }

    async login(identifier: string, passwordAttempt: string) {
        // Query user by email OR username
        const user = await db.query.users.findFirst({
            where: or(
                eq(users.email, identifier),
                eq(users.username, identifier)
            ),
        });

        // Prevention against timing attacks
        const dummyHash = '$2b$12$L8CidmSWSXqCqQEqmXfLqeGq6RkYyYyYyYyYyYyYyYyYyYyYyYyYy';
        const isPasswordCorrect = await bcrypt.compare(
            passwordAttempt,
            user?.passwordHash || dummyHash
        );

        if (!user || !isPasswordCorrect) {
            throw new Error('Invalid credentials');
        }

        // Generate tokens
        const accessToken = this.generateAccessToken(user);
        const { refreshToken, tokenId } = await this.generateRefreshToken(user.id);

        return { accessToken, refreshToken, user: { id: user.id, username: user.username } };
    }

    async refresh(oldRefreshToken: string) {
        try {
            const payload = jwt.verify(oldRefreshToken, env.JWT_SECRET) as any;
            if (payload.type !== 'refresh') throw new Error('Invalid token type');

            const tokenRecord = await db.query.refreshTokens.findFirst({
                where: eq(refreshTokens.id, payload.tokenId),
            });

            // Token rotation: check if found and not revoked
            if (!tokenRecord || tokenRecord.revokedAt) {
                // If found but revoked, it's a potential reuse attack
                if (tokenRecord) {
                    await db.update(refreshTokens)
                        .set({ revokedAt: new Date().toISOString() })
                        .where(eq(refreshTokens.userId, tokenRecord.userId));
                }
                throw new Error('Unauthorized');
            }

            // Mark old token as revoked
            await db.update(refreshTokens)
                .set({ revokedAt: new Date().toISOString() })
                .where(eq(refreshTokens.id, tokenRecord.id));

            // Issue new tokens
            const user = await db.query.users.findFirst({
                where: eq(users.id, tokenRecord.userId),
            });

            if (!user) throw new Error('User not found');

            const accessToken = this.generateAccessToken(user);
            const { refreshToken } = await this.generateRefreshToken(user.id);

            return { accessToken, refreshToken };
        } catch (err) {
            throw new Error('Unauthorized');
        }
    }

    async revokeRefreshToken(token: string) {
        try {
            const payload = jwt.verify(token, env.JWT_SECRET) as any;
            if (payload.type === 'refresh') {
                await db.update(refreshTokens)
                    .set({ revokedAt: new Date().toISOString() })
                    .where(eq(refreshTokens.id, payload.tokenId));
            }
        } catch (err) {
            // Ignore token errors on logout
        }
    }

    async getProfile(userId: string) {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) {
            throw new Error('User not found');
        }

        const { passwordHash, ...safeUser } = user;
        return safeUser;
    }

    async updateProfile(userId: string, data: { username?: string; email?: string }) {
        const [updatedUser] = await db.update(users)
            .set(data)
            .where(eq(users.id, userId))
            .returning();

        if (!updatedUser) {
            throw new Error('User not found');
        }

        const { passwordHash, ...safeUser } = updatedUser;
        return safeUser;
    }

    private generateAccessToken(user: { id: string; username: string; elo: number }) {
        return jwt.sign(
            {
                sub: user.id,
                username: user.username,
                elo: user.elo,
                type: 'access'
            },
            env.JWT_SECRET,
            { expiresIn: env.JWT_EXPIRES_IN }
        );
    }

    private async generateRefreshToken(userId: string) {
        const tokenId = crypto.randomUUID();
        const refreshToken = jwt.sign(
            { sub: userId, tokenId, type: 'refresh' },
            env.JWT_SECRET,
            { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
        );

        // Store hashed token for rotation/revocation
        const tokenHash = await bcrypt.hash(refreshToken, 10);
        await db.insert(refreshTokens).values({
            id: tokenId,
            userId,
            tokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

        return { refreshToken, tokenId };
    }
}

export const authService = new AuthService();
