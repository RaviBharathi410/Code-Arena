import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3001),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().url().optional(), // Making optional if not used yet
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
    JUDGE0_API_URL: z.string().url(),
    JUDGE0_API_KEY: z.string().min(1),
    BCRYPT_ROUNDS: z.coerce.number().default(12),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('FATAL: Invalid environment configuration:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);  // Hard stop. No fallbacks. No defaults for secrets.
}

export const env = parsed.data;
