import { db } from './db/client';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';
import postgres from 'postgres';
import { env } from './config/env';

async function runMigrations() {
    console.log('--- ARENA DATABASE MIGRATION (POSTGRES) ---');
    
    // For migrations, we only need 1 connection
    const migrationClient = postgres(env.DATABASE_URL, { max: 1 });
    
    try {
        console.log('Synchronizing schema with Postgres...');
        await migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });
        console.log('Migrations completed successfully. System integrity: OPTIMAL.');
    } catch (err: any) {
        console.error('Migration failed:', err.message);
    } finally {
        await migrationClient.end();
        process.exit(0);
    }
}

runMigrations();
