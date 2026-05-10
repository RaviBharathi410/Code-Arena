import { z } from 'zod';
import { router, adminProcedure } from '../index';
import { adminService } from '../../modules/admin/admin.service';
import { monitor } from '../../lib/monitor';
import { TRPCError } from '@trpc/server';

export const adminRouter = router({
    /**
     * List all users with optional role filter and pagination.
     */
    listUsers: adminProcedure
        .input(z.object({
            limit: z.number().min(1).max(200).optional(),
            offset: z.number().min(0).optional(),
            role: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
            return adminService.listUsers(input || {});
        }),

    /**
     * Get detailed admin view of a specific user.
     */
    getUserDetail: adminProcedure
        .input(z.string().uuid())
        .query(async ({ input }) => {
            try {
                return await adminService.getUserDetail(input);
            } catch (err: any) {
                throw new TRPCError({ code: 'NOT_FOUND', message: err.message });
            }
        }),

    /**
     * Update a user's role (promote/demote).
     */
    updateUserRole: adminProcedure
        .input(z.object({
            userId: z.string().uuid(),
            role: z.enum(['player', 'moderator', 'admin']),
        }))
        .mutation(async ({ input }) => {
            try {
                return await adminService.updateUserRole(input.userId, input.role);
            } catch (err: any) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
            }
        }),

    /**
     * Ban a user.
     */
    banUser: adminProcedure
        .input(z.object({
            userId: z.string().uuid(),
            reason: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
            try {
                return await adminService.banUser(input.userId, input.reason);
            } catch (err: any) {
                throw new TRPCError({ code: 'NOT_FOUND', message: err.message });
            }
        }),

    /**
     * Unban a user (restore to 'player').
     */
    unbanUser: adminProcedure
        .input(z.string().uuid())
        .mutation(async ({ input }) => {
            try {
                return await adminService.unbanUser(input);
            } catch (err: any) {
                throw new TRPCError({ code: 'NOT_FOUND', message: err.message });
            }
        }),

    /**
     * Reset a user's Elo rating to 1200.
     */
    resetUserElo: adminProcedure
        .input(z.string().uuid())
        .mutation(async ({ input }) => {
            try {
                return await adminService.resetUserElo(input);
            } catch (err: any) {
                throw new TRPCError({ code: 'NOT_FOUND', message: err.message });
            }
        }),

    /**
     * Get system-wide statistics (user count, match count, etc).
     */
    getSystemStats: adminProcedure
        .query(async () => {
            return adminService.getSystemStats();
        }),

    /**
     * Get security/system metrics from the Monitor class.
     */
    getMetrics: adminProcedure
        .query(async () => {
            return monitor.getMetrics();
        }),
});
