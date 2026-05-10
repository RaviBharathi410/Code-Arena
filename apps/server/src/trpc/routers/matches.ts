import { z } from 'zod';
import { router, protectedProcedure } from '../index';
import { matchesService } from '../../modules/matches/matches.service';
import { TRPCError } from '@trpc/server';

export const matchesRouter = router({
    /**
     * Get recent matches for the currently authenticated user.
     */
    getMyRecent: protectedProcedure
        .input(z.object({
            limit: z.number().min(1).max(50).optional().default(10),
        }).optional())
        .query(async ({ input, ctx }) => {
            return matchesService.getRecentMatches(ctx.user.id, input?.limit);
        }),

    /**
     * Get details of a specific match.
     */
    getById: protectedProcedure
        .input(z.string().uuid())
        .query(async ({ input }) => {
            try {
                return await matchesService.getMatchById(input);
            } catch (err: any) {
                throw new TRPCError({ code: 'NOT_FOUND', message: err.message });
            }
        }),

    /**
     * Forfeit an active match.
     */
    forfeit: protectedProcedure
        .input(z.string().uuid())
        .mutation(async ({ input, ctx }) => {
            try {
                return await matchesService.forfeitMatch(input, ctx.user.id);
            } catch (err: any) {
                if (err.message.includes('Forbidden')) {
                    throw new TRPCError({ code: 'FORBIDDEN', message: err.message });
                }
                throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
            }
        }),
});
