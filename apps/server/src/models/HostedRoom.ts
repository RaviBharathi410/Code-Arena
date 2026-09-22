import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipant {
    userId: mongoose.Types.ObjectId;
    username: string;
    avatar?: string;
    tier?: string;
    rankRating?: number;
    joinedAt: Date;
    connectionStatus: 'connected' | 'disconnected';
    isReady: boolean;
    currentProblemIndex: number;
    solvedProblems: string[];
    testCasesPassed: number;
    totalTestCases: number;
    currentCode?: string;
    language?: string;
    lastSubmittedAt?: Date;
    finishedAt?: Date;
    totalScore: number;
    toObject?: () => any;
}

export interface IRoomProblem {
    problemId?: mongoose.Types.ObjectId;
    slug: string;
    title: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    category: string;
    description: string;
    constraints?: string;
    examples?: any[];
    testCases: any[];
    boilerplate: any;
    problemType: 'function' | 'stdin-stdout';
    functionName?: string;
    returnType?: string;
    parameters?: any[];
    driverTemplates?: any;
    isCustom: boolean;
}

export interface IRoomResult {
    userId: mongoose.Types.ObjectId;
    username: string;
    rank: number;
    solvedCount: number;
    totalTimeSec: number;
    score: number;
    finishedAt?: Date;
}

export interface IHostedRoom extends Document {
    roomCode: string;
    title: string;
    hostId: mongoose.Types.ObjectId;
    status: 'lobby' | 'in-progress' | 'completed' | 'cancelled';
    capacity: number;
    config: {
        sessionFormat: 'race';
        durationMinutes: number;
    };
    problemSet: IRoomProblem[];
    participants: IParticipant[];
    results: IRoomResult[];
    startedAt?: Date;
    endedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const participantSchema = new Schema<IParticipant>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    avatar: { type: String },
    tier: { type: String, default: 'BRONZE' },
    rankRating: { type: Number, default: 1200 },
    joinedAt: { type: Date, default: Date.now },
    connectionStatus: { type: String, enum: ['connected', 'disconnected'], default: 'connected' },
    isReady: { type: Boolean, default: false },
    currentProblemIndex: { type: Number, default: 0 },
    solvedProblems: { type: [String], default: [] },
    testCasesPassed: { type: Number, default: 0 },
    totalTestCases: { type: Number, default: 0 },
    currentCode: { type: String, default: '' },
    language: { type: String, default: 'js' },
    lastSubmittedAt: { type: Date },
    finishedAt: { type: Date },
    totalScore: { type: Number, default: 0 },
}, { _id: false });

const roomProblemSchema = new Schema<IRoomProblem>({
    problemId: { type: Schema.Types.ObjectId, ref: 'Problem' },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' },
    category: { type: String, default: 'Algorithms' },
    description: { type: String, required: true },
    constraints: { type: String, default: '' },
    examples: { type: [Schema.Types.Mixed] as any, default: [] },
    testCases: { type: [Schema.Types.Mixed] as any, default: [] },
    boilerplate: { type: Schema.Types.Mixed, default: () => ({}) },
    problemType: { type: String, enum: ['function', 'stdin-stdout'], default: 'function' },
    functionName: { type: String },
    returnType: { type: String },
    parameters: { type: [Schema.Types.Mixed] as any, default: [] },
    driverTemplates: { type: Schema.Types.Mixed },
    isCustom: { type: Boolean, default: false },
}, { _id: false });

const roomResultSchema = new Schema<IRoomResult>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    rank: { type: Number, required: true },
    solvedCount: { type: Number, default: 0 },
    totalTimeSec: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    finishedAt: { type: Date },
}, { _id: false });

const hostedRoomSchema = new Schema<IHostedRoom>({
    roomCode: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
    title: { type: String, required: true, default: 'Combat Uplink' },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { 
        type: String, 
        enum: ['lobby', 'in-progress', 'completed', 'cancelled'], 
        default: 'lobby', 
        index: true 
    },
    capacity: { type: Number, default: 8, min: 2, max: 8 },
    config: {
        sessionFormat: { type: String, enum: ['race'], default: 'race' },
        durationMinutes: { type: Number, default: 30, min: 5, max: 120 },
    },
    problemSet: { type: [roomProblemSchema], required: true },
    participants: { type: [participantSchema], default: [] },
    results: { type: [roomResultSchema], default: [] },
    startedAt: { type: Date },
    endedAt: { type: Date },
}, { timestamps: true });

export const HostedRoom = mongoose.model<IHostedRoom>('HostedRoom', hostedRoomSchema);
