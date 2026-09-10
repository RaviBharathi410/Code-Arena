import mongoose, { Schema, Document } from 'mongoose';

export interface IProblem extends Document {
    slug: string;
    title: string;
    difficulty: string;
    category: string;
    description: string;
    constraints: string;
    examples: any[];
    testCases: any[];
    boilerplate: any;
    problemType: 'function' | 'stdin-stdout';
    functionName?: string;
    returnType?: string;
    parameters?: any[];
    driverTemplates?: any;
    source?: string;
    sourceUrl?: string;
    cfRating?: number;
    extractionConfidence?: 'high' | 'low';
    optimalTimeComplexity?: string;
    optimalSpaceComplexity?: string;
    tags: string[];
    isSeedData: boolean;
    createdAt: Date;
}

const problemSchema = new Schema<IProblem>({
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    difficulty: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    constraints: { type: String, required: true },
    examples: { type: Array, default: [] } as any,
    testCases: { type: Array, default: [] } as any,
    boilerplate: { type: Schema.Types.Mixed, required: true },
    problemType: { type: String, enum: ['function', 'stdin-stdout'], default: 'function' },
    functionName: { type: String },
    returnType: { type: String },
    parameters: { type: Array },
    driverTemplates: { type: Schema.Types.Mixed },
    source: { type: String },
    sourceUrl: { type: String },
    cfRating: { type: Number },
    extractionConfidence: { type: String, enum: ['high', 'low'], default: 'high' },
    optimalTimeComplexity: { type: String },
    optimalSpaceComplexity: { type: String },
    tags: { type: [String], default: [] },
    isSeedData: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const Problem = mongoose.model<IProblem>('Problem', problemSchema);
