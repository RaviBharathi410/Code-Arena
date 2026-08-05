import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    email: string;
    passwordHash: string;
    rankRating: number;
    wins: number;
    losses: number;
    totalBattles: number;
    winRate: number;
    tier: string;
    avatarUrl?: string;
    createdAt: Date;
    lastActive: Date;
    skillVector: {
        arrays: number;
        strings: number;
        trees: number;
        graphs: number;
        dp: number;
        math: number;
        sorting: number;
        hashing: number;
    };
    eloRating: number;
    matchesPlayed: number;
    matchesWon: number;
    role: string;
    isBanned: boolean;
    banReason?: string;
    bannedAt?: Date;
    bannedBy?: mongoose.Types.ObjectId;
}

const DEFAULT_SKILL_VECTOR = {
    arrays: 1000,
    strings: 1000,
    trees: 1000,
    graphs: 1000,
    dp: 1000,
    math: 1000,
    sorting: 1000,
    hashing: 1000,
};

const userSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    rankRating: { type: Number, default: 1200, index: true },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    totalBattles: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    tier: { type: String, default: 'IRON' },
    avatarUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    skillVector: {
        arrays: { type: Number, default: 1000 },
        strings: { type: Number, default: 1000 },
        trees: { type: Number, default: 1000 },
        graphs: { type: Number, default: 1000 },
        dp: { type: Number, default: 1000 },
        math: { type: Number, default: 1000 },
        sorting: { type: Number, default: 1000 },
        hashing: { type: Number, default: 1000 },
    },
    eloRating: { type: Number, default: 1200 },
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    role: { type: String, default: 'user', index: true },
    isBanned: { type: Boolean, default: false, index: true },
    banReason: { type: String },
    bannedAt: { type: Date },
    bannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', userSchema);
