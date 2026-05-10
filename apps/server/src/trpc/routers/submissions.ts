import { z } from 'zod';
import { router, protectedProcedure } from '../index';
import { submissionsService } from '../../modules/submissions/submissions.service';
import { TRPCError } from '@trpc/server';

export const submissionsRouter = router({
    /**
     * Submit code to a match.
     * Enqueues the execution job in BullMQ and returns immediately.
     */
    submitCode: protectedProcedure
        .input(z.object({
            matchId: z.string().uuid(),
            code: z.string().min(1),
            languageId: z.number().int().positive(),
        }))
        .mutation(async ({ input, ctx }) => {
            try {
                return await submissionsService.createSubmission({
                    ...input,
                    userId: ctx.user.id,
                });
            } catch (err: any) {
                if (err.message.includes('Forbidden') || err.message.includes('already solved')) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
                }
                throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
            }
        }),

    /**
     * Get details of a specific submission.
     */
    getById: protectedProcedure
        .input(z.string().uuid())
        .query(async ({ input }) => {
            try {
                return await submissionsService.getSubmissionById(input);
            } catch (err: any) {
                throw new TRPCError({ code: 'NOT_FOUND', message: err.message });
            }
        }),
});
