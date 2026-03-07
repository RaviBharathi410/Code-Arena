import { db } from '../../db';
import { submissions, matches, users } from '@arena/database';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from '../../lib/logger';
import { matchesService } from '../matches/matches.service';

export class SubmissionsService {
    async createSubmission(data: {
        matchId: string;
        userId: string;
        code: string;
        languageId: number;
    }) {
        // 1. Verify match exists and is active
        const match = await db.select().from(matches).where(eq(matches.id, data.matchId)).get();
        if (!match) throw new Error('Match not found');
        if (match.status !== 'active') throw new Error('Match is not active');

        // 2. Verify participation
        if (match.player1Id !== data.userId && match.player2Id !== data.userId) {
            throw new Error('Forbidden: Not a participant');
        }

        // 3. Verify user hasn't already won or match isn't over
        const existingAccepted = await db.select()
            .from(submissions)
            .where(
                and(
                    eq(submissions.matchId, data.matchId),
                    eq(submissions.userId, data.userId),
                    eq(submissions.status, 'accepted')
                )
            )
            .get();

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

        return newSubmission;
    }

    async getSubmissionById(id: string) {
        const submission = await db.select().from(submissions).where(eq(submissions.id, id)).get();
        if (!submission) throw new Error('Submission not found');
        return submission;
    }

    async handleSubmissionResult(matchId: string, userId: string, judgeResult: any) {
        const match = await db.select().from(matches).where(eq(matches.id, matchId)).get();
        if (!match || match.status !== 'active') return;

        // Only accepted solutions can win
        if (judgeResult.status !== 'accepted') {
            return;
        }

        // Use consolidated winner logic
        await matchesService.setWinner(matchId, userId);
    }
}

export const submissionsService = new SubmissionsService();
