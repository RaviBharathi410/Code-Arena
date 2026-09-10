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

    async googleLogin(credential: string) {
        // 1. Verify Google ID token using Google tokeninfo endpoint
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        
        if (!response.ok) {
            const errText = await response.text();
            logger.warn({ errText }, 'Failed Google tokeninfo verification');
            throw new Error('Invalid or expired Google credential');
        }

        const payload = await response.json() as {
            sub?: string;
            email?: string;
            email_verified?: string | boolean;
            name?: string;
            picture?: string;
            aud?: string;
        };

        if (!payload.sub || !payload.email) {
            throw new Error('Incomplete Google user profile data');
        }

        // Verify audience if GOOGLE_CLIENT_ID is configured
        if (env.GOOGLE_CLIENT_ID && payload.aud !== env.GOOGLE_CLIENT_ID) {
            logger.warn({ tokenAud: payload.aud, configuredId: env.GOOGLE_CLIENT_ID }, 'Google token audience mismatch');
            throw new Error('Google client ID mismatch');
        }

        const googleId = payload.sub;
        const email = payload.email.toLowerCase();
        const avatarUrl = payload.picture;
        const displayName = payload.name;

        // 2. Find existing user by googleId or email
        let user = await User.findOne({
            $or: [
                { googleId },
                { email }
            ]
        });

        if (user) {
            let needsSave = false;
            // Link googleId if existing user signed in with email
            if (!user.googleId) {
                user.googleId = googleId;
                needsSave = true;
            }
            // Update avatar if user doesn't have one
            if (!user.avatarUrl && avatarUrl) {
                user.avatarUrl = avatarUrl;
                needsSave = true;
            }
            user.lastActive = new Date();
            needsSave = true;

            if (needsSave) {
                await user.save();
            }
        } else {
            // 3. Register new user from Google profile
            let baseUsername = (displayName || email.split('@')[0])
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, 20);

            if (baseUsername.length < 3) {
                baseUsername = `pilot_${Math.random().toString(36).substring(2, 6)}`;
            }

            let candidateUsername = baseUsername;
            let counter = 1;
            while (await User.exists({ username: candidateUsername })) {
                const suffix = `_${Math.floor(1000 + Math.random() * 9000)}`;
                candidateUsername = `${baseUsername.slice(0, 30 - suffix.length)}${suffix}`;
                counter++;
                if (counter > 10) {
                    candidateUsername = `pilot_${Date.now().toString(36)}`;
                    break;
                }
            }

            user = await User.create({
                username: candidateUsername,
                email,
                googleId,
                alias: displayName || candidateUsername,
                avatarUrl,
                rankRating: 1200,
                tier: 'PLACEMENT',
                placementMatchesRemaining: 5,
                isCalibrated: false,
                role: 'user',
                lastActive: new Date(),
            });
        }

        // 4. Generate tokens
        const accessToken = this.generateAccessToken(user);
        const { refreshToken } = await this.generateRefreshToken(user.id as string);

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

    async createDemoUser() {
        const randId = Math.floor(1000 + Math.random() * 9000);
        const username = `demo_recruiter_${randId}`;
        const email = `demo_${randId}@demo.codearena.internal`;

        const demoUser = await User.create({
            username,
            email,
            alias: 'Recruiter Demo Operator',
            isDemo: true,
            rankRating: 1350,
            eloRating: 1350,
            tier: 'SILVER_II',
            wins: 14,
            losses: 6,
            totalBattles: 20,
            winRate: 70,
            isCalibrated: true,
            placementMatchesRemaining: 0,
            matchesPlayed: 20,
            matchesWon: 14,
            skillVector: {
                arrays: 75,
                strings: 68,
                trees: 60,
                graphs: 52,
                dp: 48,
                math: 70,
                sorting: 82,
                hashing: 78
            }
        });

        const accessToken = this.generateAccessToken(demoUser);
        const { refreshToken } = await this.generateRefreshToken(demoUser.id as string);

        const { passwordHash, ...safeUser } = demoUser.toObject();
        return { accessToken, refreshToken, user: safeUser };
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
        const existing = await User.findById(userId);
        if (!existing) throw new Error('User not found');
        if (existing.isDemo) {
            throw new Error('Account modifications are restricted in Demo mode. Register an account to persist custom credentials.');
        }

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

    private generateAccessToken(user: { _id?: any; id?: string; username: string; rankRating?: number; role?: string; isDemo?: boolean }) {
        return jwt.sign(
            {
                sub: user.id || user._id,
                username: user.username,
                elo: user.rankRating ?? 1200,
                role: user.role || 'user',
                isDemo: Boolean(user.isDemo),
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
