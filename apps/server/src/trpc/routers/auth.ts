import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../index';
import { authService } from '../../modules/auth/auth.service';
import { registerSchema, loginSchema } from '../../modules/auth/auth.schema';
import { TRPCError } from '@trpc/server';

export const authRouter = router({
    register: publicProcedure
        .input(registerSchema)
        .mutation(async ({ input, ctx }) => {
            try {
                const { accessToken, refreshToken, user } = await authService.register(input);

                // Set refresh token cookie
                ctx.res.cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                });

                return { accessToken, user };
            } catch (err: any) {
                if (err.message === 'User already exists') {
                    throw new TRPCError({ code: 'CONFLICT', message: err.message });
                }
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error registering user' });
            }
        }),

    login: publicProcedure
        .input(loginSchema)
        .mutation(async ({ input, ctx }) => {
            try {
                const { accessToken, refreshToken, user } = await authService.login(
                    input.identifier,
                    input.password
                );

                ctx.res.cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                });

                return { accessToken, user };
            } catch (err: any) {
                if (err.message === 'Invalid credentials') {
                    throw new TRPCError({ code: 'UNAUTHORIZED', message: err.message });
                }
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error logging in' });
            }
        }),

    refresh: publicProcedure
        .mutation(async ({ ctx }) => {
            const token = ctx.req.cookies.refreshToken;
            if (!token) throw new TRPCError({ code: 'UNAUTHORIZED' });

            try {
                const { accessToken, refreshToken } = await authService.refresh(token);

                ctx.res.cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                });

                return { accessToken };
            } catch (err: any) {
                throw new TRPCError({ code: 'UNAUTHORIZED' });
            }
        }),

    logout: publicProcedure
        .mutation(async ({ ctx }) => {
            const token = ctx.req.cookies.refreshToken;
            if (token) {
                await authService.revokeRefreshToken(token);
            }
            ctx.res.clearCookie('refreshToken');
            return { success: true };
        }),

    getProfile: protectedProcedure
        .query(async ({ ctx }) => {
            try {
                const profile = await authService.getProfile(ctx.user.id);
                return profile;
            } catch (err: any) {
                throw new TRPCError({ 
                    code: err.message === 'User not found' ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR', 
                    message: err.message 
                });
            }
        }),

    updateProfile: protectedProcedure
        .input(z.any()) // Adjust schema as needed
        .mutation(async ({ input, ctx }) => {
            try {
                const profile = await authService.updateProfile(ctx.user.id, input);
                return profile;
            } catch (err: any) {
                throw new TRPCError({ 
                    code: err.message === 'User not found' ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR', 
                    message: err.message 
                });
            }
        }),
});
