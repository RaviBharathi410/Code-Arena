import mongoose, { Schema, Document } from 'mongoose';

export interface ITournamentParticipant extends Document {
    tournamentId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    seed?: number;
    status: string;
    joinedAt: Date;
}

const tournamentParticipantSchema = new Schema<ITournamentParticipant>({
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seed: { type: Number },
    status: { type: String, required: true, default: 'registered' },
    joinedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const TournamentParticipant = mongoose.model<ITournamentParticipant>('TournamentParticipant', tournamentParticipantSchema);
