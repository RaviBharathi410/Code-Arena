import { MatchRoom } from '../../models/MatchRoom';
import { Problem } from '../../models/Problem';
import { Submission } from '../../models/Submission';
import crypto from 'crypto';
import { logger } from '../../lib/logger';
import { matchesService } from '../matches/matches.service';
import { codeExecutionQueue } from '../../queues';

export const LANGUAGE_MAP: Record<string, number> = {
    js: 63,
    py: 71,
    java: 62,
    cpp: 54,
    go: 60,
    rust: 73,
};

export class SubmissionsService {
    async executeCode(data: {
        matchId: string;
        userId: string;
        code: string;
        language: string;
        mode: 'run' | 'submit';
    }) {
        const languageId = LANGUAGE_MAP[data.language];
        if (!languageId) throw new Error('Unsupported language');

        const match = await MatchRoom.findById(data.matchId).lean();
        if (!match) throw new Error('Match not found');
        // Allow execution even if practice room hasn't transitioned to 'active' yet
        if (match.status === 'completed') throw new Error('Match is already completed');

        const problem = await Problem.findById(match.problemId).lean();
        if (!problem) throw new Error('Problem not found');

        // If 'run' mode, we run up to 25 sample test cases
        // If 'submit' mode, we run ALL test cases including hidden ones
        const testCasesToRun = data.mode === 'run' 
            ? (problem.testCases as any[]).filter(tc => !tc.is_hidden).slice(0, 25)
            : (problem.testCases as any[]);

        const submissionId = crypto.randomUUID();

        // For 'submit' mode, we persist the submission record
        if (data.mode === 'submit') {
            await Submission.create({
                _id: submissionId,
                matchId: data.matchId,
                userId: data.userId,
                code: data.code,
                language: data.language,
                status: 'PENDING',
            });
        }

        // Enqueue execution
        await codeExecutionQueue.add('execute', {
            submissionId,
            code: data.code,
            languageId,
            problemId: match.problemId,
            matchId: data.matchId,
            userId: data.userId,
            testCases: testCasesToRun,
            mode: data.mode,
            matchStartedAt: match.startedAt ? match.startedAt.toISOString() : undefined,
        }, {
            jobId: `exec-${submissionId}`,
        });

        return { submissionId, mode: data.mode, status: 'QUEUED' };
    }

    async getSubmissionById(id: string) {
        const submission = await Submission.findById(id).lean();
        if (!submission) throw new Error('Submission not found');
        return submission;
    }

    async createSubmission(data: {
        matchId: string;
        userId: string;
        code: string;
        languageId: number;
    }) {
        const language = Object.keys(LANGUAGE_MAP).find(key => LANGUAGE_MAP[key] === data.languageId) || 'js';
        return this.executeCode({
            matchId: data.matchId,
            userId: data.userId,
            code: data.code,
            language,
            mode: 'submit'
        });
    }
}

export const submissionsService = new SubmissionsService();
