import { db } from '../../db';
import { submissions, matches, problems } from '@arena/database';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from '../../lib/logger';
import { matchesService } from '../matches/matches.service';
import { codeExecutionQueue } from '../../queues';

export class SubmissionsService {
    async createSubmission(data: {
        matchId: string;
        userId: string;
        code: string;
        languageId: number;
    }) {
        // 1. Verify match exists and is active
        const match = await db.query.matches.findFirst({
            where: eq(matches.id, data.matchId),
        });
        if (!match) throw new Error('Match not found');
        if (match.status !== 'active') throw new Error('Match is not active');

        // 2. Verify participation
        if (match.player1Id !== data.userId && match.player2Id !== data.userId) {
            throw new Error('Forbidden: Not a participant');
        }

        // 3. Verify user hasn't already won or match isn't over
        const existingAccepted = await db.query.submissions.findFirst({
            where: and(
                eq(submissions.matchId, data.matchId),
                eq(submissions.userId, data.userId),
                eq(submissions.status, 'accepted')
            ),
        });

        if (existingAccepted) {
            throw new Error('You have already solved this problem');
        }

        // 4. Create pending submission
        const submissionId = crypto.randomUUID();
        const [newSubmission] = await db.insert(submissions).values({
            id: submissionId,
            matchId: data.matchId,
            userId: data.userId,
            code: data.code,
            languageId: data.languageId,
            status: 'pending',
        }).returning();

        // 5. Fetch problem test cases for the execution job
        const problem = await db.query.problems.findFirst({
            where: eq(problems.id, match.problemId),
            columns: { testCases: true },
        });

        // 6. Enqueue the code execution job (async — never blocks the request)
        await codeExecutionQueue.add('execute', {
            submissionId,
            code: data.code,
            languageId: data.languageId,
            problemId: match.problemId,
            matchId: data.matchId,
            userId: data.userId,
            testCases: problem?.testCases || null,
        }, {
            jobId: `exec-${submissionId}`, // Idempotent
        });

        logger.info({
            submissionId,
            matchId: data.matchId,
            userId: data.userId,
        }, '[SUBMISSIONS] Code execution job enqueued');

        return newSubmission;
    }

    async getSubmissionById(id: string) {
        const submission = await db.query.submissions.findFirst({
            where: eq(submissions.id, id),
        });
        if (!submission) throw new Error('Submission not found');
        return submission;
    }

    async handleSubmissionResult(matchId: string, userId: string, judgeResult: any) {
        const match = await db.query.matches.findFirst({
            where: eq(matches.id, matchId),
        });
        if (!match || match.status !== 'active') return;

        // Only accepted solutions can win
        if (judgeResult.status !== 'accepted') {
            return;
        }

        // Use consolidated winner logic (which now enqueues Elo + analytics jobs)
        await matchesService.setWinner(matchId, userId);
    }
}

export const submissionsService = new SubmissionsService();
