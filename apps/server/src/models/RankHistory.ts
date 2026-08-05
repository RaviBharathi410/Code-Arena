import mongoose, { Schema, Document } from 'mongoose';

export interface IRankHistory extends Document {
    userId: mongoose.Types.ObjectId;
    matchId?: mongoose.Types.ObjectId;
    delta: number;
    newRating: number;
    reason: string;
    createdAt: Date;
}

const rankHistorySchema = new Schema<IRankHistory>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    matchId: { type: Schema.Types.ObjectId, ref: 'MatchRoom' },
    delta: { type: Number, required: true },
    newRating: { type: Number, required: true },
    reason: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const RankHistory = mongoose.model<IRankHistory>('RankHistory', rankHistorySchema);
