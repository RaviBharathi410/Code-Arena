import { z } from 'zod';

// ── Raw schemas (also used for direct .parse() in controllers) ─────────────

export const registerSchema = z.object({
    username: z.string()
        .min(3).max(30)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username: letters, numbers, underscores, and hyphens only'),
    email: z.string().email().toLowerCase(),
    password: z.string()
        .min(8)
        .regex(/[A-Z]/, 'Must contain uppercase')
        .regex(/[0-9]/, 'Must contain a number'),
});

export const loginSchema = z.object({
    identifier: z.string().min(1),  // Accepts both email or username
    password: z.string().min(1),
});

export const updateProfileSchema = z.object({
    username: z.string().min(3).max(30).optional(),
    email: z.string().email().optional(),
});

// ── Wrapped body schemas for use with validate() middleware ────────────────
// validate() passes { body, query, params } — these schemas expect that shape.

export const registerBodySchema = z.object({ body: registerSchema });
export const loginBodySchema = z.object({ body: loginSchema });
export const updateProfileBodySchema = z.object({ body: updateProfileSchema });
