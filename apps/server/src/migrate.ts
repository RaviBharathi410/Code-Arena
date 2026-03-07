import { db } from './db';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

async function runMigrations() {
    console.log('--- ARENA DATABASE MIGRATION (SQLITE) ---');
    try {
        console.log('Synchronizing schema with SQLite local storage...');
        // @ts-ignore
        migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
        console.log('Migrations completed successfully. System integrity: OPTIMAL.');
    } catch (err: any) {
        console.error('Migration failed:', err.message);
    } finally {
        process.exit(0);
    }
}

runMigrations();
