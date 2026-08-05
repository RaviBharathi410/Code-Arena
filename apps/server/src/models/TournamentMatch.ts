import mongoose, { Schema, Document } from 'mongoose';

export interface ITournamentMatch extends Document {
    tournamentId: mongoose.Types.ObjectId;
    round: number;
    matchNumber: number;
    participant1Id?: mongoose.Types.ObjectId;
    participant2Id?: mongoose.Types.ObjectId;
    winnerId?: mongoose.Types.ObjectId;
    problemSlug?: string;
    status: string;
    startedAt?: Date;
    completedAt?: Date;
}

const tournamentMatchSchema = new Schema<ITournamentMatch>({
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    round: { type: Number, required: true },
    matchNumber: { type: Number, required: true },
    participant1Id: { type: Schema.Types.ObjectId, ref: 'TournamentParticipant' },
    participant2Id: { type: Schema.Types.ObjectId, ref: 'TournamentParticipant' },
    winnerId: { type: Schema.Types.ObjectId, ref: 'TournamentParticipant' },
    problemSlug: { type: String },
    status: { type: String, required: true, default: 'pending' },
    startedAt: { type: Date },
    completedAt: { type: Date },
}, { timestamps: true });

export const TournamentMatch = mongoose.model<ITournamentMatch>('TournamentMatch', tournamentMatchSchema);
