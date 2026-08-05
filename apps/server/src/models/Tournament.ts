import mongoose, { Schema, Document } from 'mongoose';

export interface ITournament extends Document {
    title: string;
    description?: string;
    status: string;
    format: string;
    maxParticipants: number;
    entryFee: number;
    prizePool: number;
    startsAt: Date;
    endsAt?: Date;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const tournamentSchema = new Schema<ITournament>({
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, required: true, default: 'upcoming', index: true },
    format: { type: String, required: true, default: 'single_elimination' },
    maxParticipants: { type: Number, required: true, default: 16 },
    entryFee: { type: Number, required: true, default: 0 },
    prizePool: { type: Number, required: true, default: 0 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Tournament = mongoose.model<ITournament>('Tournament', tournamentSchema);
