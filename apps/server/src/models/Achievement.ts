import mongoose, { Schema, Document } from 'mongoose';

export interface IAchievement extends Document {
    slug: string;
    title: string;
    description: string;
    iconUrl?: string;
    xpReward: number;
    category: 'STREAK' | 'BATTLE' | 'CODE' | 'SPECIAL';
    threshold: number;
}

export interface IUserAchievement extends Document {
    userId: mongoose.Types.ObjectId;
    achievementId: mongoose.Types.ObjectId;
    unlockedAt: Date;
}

const achievementSchema = new Schema<IAchievement>({
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    iconUrl: { type: String },
    xpReward: { type: Number, default: 50 },
    category: { type: String, enum: ['STREAK', 'BATTLE', 'CODE', 'SPECIAL'], default: 'BATTLE' },
    threshold: { type: Number, default: 1 },
}, { timestamps: true });

const userAchievementSchema = new Schema<IUserAchievement>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    achievementId: { type: Schema.Types.ObjectId, ref: 'Achievement', required: true },
    unlockedAt: { type: Date, default: Date.now },
}, { timestamps: true });

userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

export const Achievement = mongoose.model<IAchievement>('Achievement', achievementSchema);
export const UserAchievement = mongoose.model<IUserAchievement>('UserAchievement', userAchievementSchema);
