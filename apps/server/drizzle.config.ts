import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

export default {
    schema: '../../packages/database/schema.ts',
    out: './drizzle',
    // For local SQLite, 'better-sqlite' is generally the driver in 0.19.x
    // but the CLI command was 'push:sqlite' which suggests a generic sqlite driver
    // LibsqlError was thrown, which means it might be using the libsql driver under the hood.
    // Let's try 'better-sqlite' explicitly.
    driver: 'better-sqlite',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'sqlite.db',
    },
} satisfies Config;
