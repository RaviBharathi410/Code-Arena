import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../../models/User';
import { RefreshToken } from '../../models/RefreshToken';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import mongoose from "mongoose";

export class AuthService {
    async register(userData: { username: string; email: string; password: string }) {
        // 1. Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { email: userData.email },
                { username: userData.username }
            ]
        });

        console.log("================================");
        console.log("DB:", User.db.name);
        console.log("Collection:", User.collection.collectionName);
        console.log("Searching email:", userData.email);
        console.log("Searching username:", userData.username);
        console.log("Existing user:", existingUser);
        console.log("================================");

        if (existingUser) {
            throw new Error("User already exists");
        }

        // 2. Hash password with bcrypt
        const passwordHash = await bcrypt.hash(userData.password, env.BCRYPT_ROUNDS);

        // 3. Insert user record
        const newUser = await User.create({
            username: userData.username,
            email: userData.email,
            passwordHash,
        });

        // 4. Generate tokens
        const accessToken = this.generateAccessToken(newUser);
        const { refreshToken, tokenId } = await this.generateRefreshToken(newUser.id as string);

        return { accessToken, refreshToken, user: { id: newUser.id, username: newUser.username } };
    }

    async login(identifier: string, passwordAttempt: string) {
        // Query user by email OR username
        const user = await User.findOne({
            $or: [
                { email: identifier },
                { username: identifier }
            ]
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
        const { refreshToken, tokenId } = await this.generateRefreshToken(user.id as string);

        return { accessToken, refreshToken, user: { id: user.id, username: user.username } };
    }

    async refresh(oldRefreshToken: string) {
        try {
            const payload = jwt.verify(oldRefreshToken, env.JWT_SECRET) as any;
            if (payload.type !== 'refresh') throw new Error('Invalid token type');

            const tokenRecord = await RefreshToken.findById(payload.tokenId);

            // Token rotation: check if found and not revoked
            if (!tokenRecord || tokenRecord.revokedAt) {
                // If found but revoked, it's a potential reuse attack
                if (tokenRecord) {
                    await RefreshToken.updateMany(
                        { userId: tokenRecord.userId },
                        { $set: { revokedAt: new Date() } }
                    );
                }
                throw new Error('Unauthorized');
            }

            // Mark old token as revoked
            await RefreshToken.updateOne(
                { _id: tokenRecord._id },
                { $set: { revokedAt: new Date() } }
            );

            // Issue new tokens
            const user = await User.findById(tokenRecord.userId);

            if (!user) throw new Error('User not found');

            const accessToken = this.generateAccessToken(user);
            const { refreshToken } = await this.generateRefreshToken(user.id as string);

            return { accessToken, refreshToken };
        } catch (err: any) {
            logger.error({ err: err.message, stack: err.stack }, 'Refresh token verification failed');
            throw new Error('Unauthorized');
        }
    }

    async revokeRefreshToken(token: string) {
        try {
            const payload = jwt.verify(token, env.JWT_SECRET) as any;
            if (payload.type === 'refresh') {
                await RefreshToken.updateOne(
                    { _id: payload.tokenId },
                    { $set: { revokedAt: new Date() } }
                );
            }
        } catch (err) {
            // Ignore token errors on logout
        }
    }

    async getProfile(userId: string) {
        const user = await User.findById(userId).lean();

        if (!user) {
            throw new Error('User not found');
        }

        const { passwordHash, ...safeUser } = user;
        return safeUser;
    }

    async updateProfile(userId: string, data: { username?: string; email?: string }) {
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: data },
            { new: true }
        ).lean();

        if (!updatedUser) {
            throw new Error('User not found');
        }

        const { passwordHash, ...safeUser } = updatedUser;
        return safeUser;
    }

    private generateAccessToken(user: { _id?: any; id?: string; username: string; rankRating?: number }) {
        return jwt.sign(
            {
                sub: user.id,
                username: user.username,
                elo: user.rankRating ?? 1200,
                type: 'access'
            },
            env.JWT_SECRET,
            { expiresIn: env.JWT_EXPIRES_IN as any }
        );
    }

    private async generateRefreshToken(userId: string) {
        // Generate an ObjectId first
        const tokenId = new mongoose.Types.ObjectId();

        // Generate JWT using that ObjectId
        const refreshToken = jwt.sign(
            {
                sub: userId,
                tokenId: tokenId.toString(),
                type: "refresh",
            },
            env.JWT_SECRET,
            {
                expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
            }
        );

        // Hash the JWT
        const tokenHash = await bcrypt.hash(refreshToken, 10);

        // Save the document
        await RefreshToken.create({
            _id: tokenId,
            userId,
            tokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        return {
            refreshToken,
            tokenId: tokenId.toString(),
        };
    }
}
export const authService = new AuthService();
