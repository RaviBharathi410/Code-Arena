import type { Config } from 'drizzle-kit';

export default {
    schema: '../../packages/database/schema.ts',
    out: './drizzle',
    driver: 'libsql', // Drizzle uses libsql driver for sqlite
    dbCredentials: {
        url: 'file:../../sqlite.db',
    },
} satisfies Config;
