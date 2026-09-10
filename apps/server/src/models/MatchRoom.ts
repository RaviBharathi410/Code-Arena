import mongoose, { Schema, Document } from 'mongoose';

export interface IMatchRoom extends Document {
    roomCode: string;
    mode: string;
    status: string;
    problemId: mongoose.Types.ObjectId;
    player1Id: mongoose.Types.ObjectId;
    player2Id?: mongoose.Types.ObjectId;
    player1Lang?: string;
    player2Lang?: string;
    player1DoneAt?: Date;
    player2DoneAt?: Date;
    startedAt?: Date;
    endedAt?: Date;
    winnerId?: mongoose.Types.ObjectId;
    deltaP1?: number;
    deltaP2?: number;
    createdAt: Date;
}

const matchRoomSchema = new Schema<IMatchRoom>({
    roomCode: { type: String, required: true, unique: true, index: true },
    mode: { type: String, required: true },
    status: { type: String, required: true, default: 'waiting', index: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true },
    player1Id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    player2Id: { type: Schema.Types.ObjectId, ref: 'User' },
    player1Lang: { type: String },
    player2Lang: { type: String },
    player1DoneAt: { type: Date },
    player2DoneAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    winnerId: { type: Schema.Types.ObjectId, ref: 'User' },
    deltaP1: { type: Number, default: 0 },
    deltaP2: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const MatchRoom = mongoose.model<IMatchRoom>('MatchRoom', matchRoomSchema);
