import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3001),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().default('redis://localhost:6379'), // Required for BullMQ + Socket.IO adapter
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
    EXECUTION_ENGINE_URL: z.string().url().default('http://localhost:3005'),
    EXECUTION_ENGINE_TOKEN: z.string().optional().default(''),
    JUDGE0_API_URL: z.string().url().optional().default('http://localhost:2358'),
    JUDGE0_API_KEY: z.string().optional().default(''),
    USE_JUDGE0_MOCK: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
    BCRYPT_ROUNDS: z.coerce.number().default(12),
    AI_PRIMARY_PROVIDER: z.enum(['gemini', 'groq', 'openrouter', 'cerebras']).default('gemini'),
    GEMINI_MODEL: z.string().optional().default('gemini-1.5-flash'),
    GEMINI_API_KEY: z.preprocess((val) => typeof val === 'string' ? val.trim().replace(/^["']|["']$/g, '').trim() : '', z.string().optional().default('')),
    GROQ_API_KEY: z.preprocess((val) => typeof val === 'string' ? val.trim().replace(/^["']|["']$/g, '').trim() : '', z.string().optional().default('')),
    OPENROUTER_API_KEY: z.preprocess((val) => typeof val === 'string' ? val.trim().replace(/^["']|["']$/g, '').trim() : '', z.string().optional().default('')),
    CEREBRAS_API_KEY: z.preprocess((val) => typeof val === 'string' ? val.trim().replace(/^["']|["']$/g, '').trim() : '', z.string().optional().default('')),
    GOOGLE_CLIENT_ID: z.preprocess((val) => typeof val === 'string' ? val.trim().replace(/^["']|["']$/g, '').trim() : '', z.string().optional().default('')),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('FATAL: Invalid environment configuration:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);  // Hard stop. No fallbacks. No defaults for secrets.
}

export const env = parsed.data;
