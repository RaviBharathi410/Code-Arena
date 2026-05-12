import { db } from '../../db';
import { submissions, matchRooms, problems } from '@arena/database';
import { eq, and } from 'drizzle-orm';
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

        const match = await db.query.matchRooms.findFirst({
            where: eq(matchRooms.id, data.matchId),
        });

        if (!match) throw new Error('Match not found');
        // Allow execution even if practice room hasn't transitioned to 'active' yet
        if (match.status === 'completed') throw new Error('Match is already completed');

        const problem = await db.query.problems.findFirst({
            where: eq(problems.id, match.problemId),
        });

        if (!problem) throw new Error('Problem not found');

        // If 'run' mode, we run up to 25 sample test cases
        // If 'submit' mode, we run ALL test cases including hidden ones
        const testCasesToRun = data.mode === 'run' 
            ? (problem.testCases as any[]).filter(tc => !tc.is_hidden).slice(0, 25)
            : (problem.testCases as any[]);

        const submissionId = crypto.randomUUID();

        // For 'submit' mode, we persist the submission record
        if (data.mode === 'submit') {
            await db.insert(submissions).values({
                id: submissionId,
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
            matchStartedAt: match.startedAt?.toISOString(),
        }, {
            jobId: `exec-${submissionId}`,
        });

        return { submissionId, mode: data.mode, status: 'QUEUED' };
    }

    async getSubmissionById(id: string) {
        const submission = await db.query.submissions.findFirst({
            where: eq(submissions.id, id),
        });
        if (!submission) throw new Error('Submission not found');
        return submission;
    }
}

export const submissionsService = new SubmissionsService();
