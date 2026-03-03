import { db } from './db';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

async function runMigrations() {
    console.log('Running migrations...');
    try {
        // Assuming the migration folder is 'drizzle' in apps/server
        await migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
        console.log('Migrations completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

runMigrations();
