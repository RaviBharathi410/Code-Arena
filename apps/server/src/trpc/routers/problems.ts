import { z } from 'zod';
import { router, publicProcedure } from '../index';
import { problemsService } from '../../modules/problems/problems.service';
import { TRPCError } from '@trpc/server';

export const problemsRouter = router({
    getAll: publicProcedure
        .input(z.object({
            limit: z.number().optional(),
            offset: z.number().optional(),
            difficulty: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
            return problemsService.findAll(input || {});
        }),

    getById: publicProcedure
        .input(z.string())
        .query(async ({ input }) => {
            try {
                return await problemsService.getProblemById(input);
            } catch (err: any) {
                throw new TRPCError({ 
                    code: 'NOT_FOUND', 
                    message: err.message 
                });
            }
        }),

    getRandom: publicProcedure
        .input(z.object({
            difficulty: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
            try {
                return await problemsService.getRandomProblem(input?.difficulty);
            } catch (err: any) {
                throw new TRPCError({ 
                    code: 'NOT_FOUND', 
                    message: err.message 
                });
            }
        }),
});
