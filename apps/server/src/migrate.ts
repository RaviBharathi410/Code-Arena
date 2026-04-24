import { db } from './db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';

async function runMigrations() {
    console.log('--- ARENA DATABASE MIGRATION (POSTGRES/NEON) ---');
    try {
        console.log('Synchronizing schema with Neon Postgres...');
        await migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
        console.log('Migrations completed successfully. System integrity: OPTIMAL.');
    } catch (err: any) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit(0);
    }
}

runMigrations();
