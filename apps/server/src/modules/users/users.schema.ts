import { z } from 'zod';

export const updateUserSchema = z.object({
    body: z.object({
        username: z.string().min(3).max(30).optional(),
        avatarUrl: z.string().url().optional(),
    }).strict(),
});
