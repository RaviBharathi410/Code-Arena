import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
    name: string;
    tag: string;
    description?: string;
    leaderId: mongoose.Types.ObjectId;
    members: mongoose.Types.ObjectId[];
    logoUrl?: string;
    eloRating: number;
    wins: number;
    losses: number;
    createdAt: Date;
    updatedAt: Date;
}

const teamSchema = new Schema<ITeam>({
    name: { type: String, required: true, unique: true, trim: true },
    tag: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 5 },
    description: { type: String, default: '' },
    leaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    logoUrl: { type: String },
    eloRating: { type: Number, default: 1200, index: true },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
}, { timestamps: true });

export const Team = mongoose.model<ITeam>('Team', teamSchema);
