import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    email: string;
    passwordHash?: string;
    googleId?: string;
    alias?: string;
    rankRating: number;
    wins: number;
    losses: number;
    totalBattles: number;
    winRate: number;
    tier: string;
    placementMatchesRemaining: number;
    isCalibrated: boolean;
    avatarUrl?: string;
    createdAt: Date;
    lastActive: Date;
    skillVector?: {
        arrays?: number | null;
        strings?: number | null;
        trees?: number | null;
        graphs?: number | null;
        dp?: number | null;
        math?: number | null;
        sorting?: number | null;
        hashing?: number | null;
    };
    eloRating: number;
    matchesPlayed: number;
    matchesWon: number;
    role: string;
    isDemo?: boolean;
    isBanned: boolean;
    banReason?: string;
    bannedAt?: Date;
    bannedBy?: mongoose.Types.ObjectId;
}

const userSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: false },
    googleId: { type: String, unique: true, sparse: true },
    alias: { type: String },
    rankRating: { type: Number, default: 1200, index: true },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    totalBattles: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    tier: { type: String, default: 'PLACEMENT' },
    placementMatchesRemaining: { type: Number, default: 5 },
    isCalibrated: { type: Boolean, default: false },
    avatarUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    skillVector: {
        arrays: { type: Number, default: null },
        strings: { type: Number, default: null },
        trees: { type: Number, default: null },
        graphs: { type: Number, default: null },
        dp: { type: Number, default: null },
        math: { type: Number, default: null },
        sorting: { type: Number, default: null },
        hashing: { type: Number, default: null },
    },
    eloRating: { type: Number, default: 1200 },
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    role: { type: String, default: 'user', index: true },
    isDemo: { type: Boolean, default: false, index: true },
    isBanned: { type: Boolean, default: false, index: true },
    banReason: { type: String },
    bannedAt: { type: Date },
    bannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', userSchema);
