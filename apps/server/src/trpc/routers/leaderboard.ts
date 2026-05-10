import { z } from 'zod';
import { router, publicProcedure } from '../index';
import { leaderboardService } from '../../modules/leaderboard/leaderboard.service';
import { TRPCError } from '@trpc/server';

export const leaderboardRouter = router({
    getGlobal: publicProcedure
        .input(z.object({
            limit: z.number().optional(),
            offset: z.number().optional(),
        }).optional())
        .query(async ({ input }) => {
            return leaderboardService.getRankings(input?.limit, input?.offset);
        }),

    getPersonal: publicProcedure
        .input(z.string())
        .query(async ({ input }) => {
            try {
                return await leaderboardService.getPersonalRank(input);
            } catch (err: any) {
                throw new TRPCError({ 
                    code: 'NOT_FOUND', 
                    message: err.message 
                });
            }
        }),
});
