import type { Config } from 'drizzle-kit';

export default {
    schema: '../../packages/database/schema.ts',
    out: './drizzle',
    driver: 'better-sqlite3',
    dbCredentials: {
        connectionString: 'sqlite.db',
    },
};
