import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmission extends Document {
    matchId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    language: string;
    code: string;
    status: string;
    timeMs?: number;
    memoryKb?: number;
    testCasesPass?: number;
    testCasesTotal?: number;
    timeComplexity?: string;
    spaceComplexity?: string;
    qualityScore?: number;
    finalScore?: number;
    submittedAt: Date;
}

const submissionSchema = new Schema<ISubmission>({
    matchId: { type: Schema.Types.ObjectId, ref: 'MatchRoom', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    language: { type: String, required: true },
    code: { type: String, required: true },
    status: { type: String, required: true, default: 'PENDING', index: true },
    timeMs: { type: Number },
    memoryKb: { type: Number },
    testCasesPass: { type: Number },
    testCasesTotal: { type: Number },
    timeComplexity: { type: String },
    spaceComplexity: { type: String },
    qualityScore: { type: Number },
    finalScore: { type: Number },
    submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Submission = mongoose.model<ISubmission>('Submission', submissionSchema);
