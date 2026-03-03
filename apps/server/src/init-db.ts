import { db } from './db';
import { users, tournaments, problems, matches, submissions, leaderboard } from '@arena/database';
// @ts-ignore
import { sql } from 'drizzle-orm';

async function init() {
    console.log('Initializing SQLite database...');

    // SQLite doesn't support traditional migrations in the same way without a tool,
    // but we can just run the CREATE TABLE statements if we want, or use drizzle-orm's migrate.
    // However, since we are using SQLite, we can just use the DB instance to run raw SQL if needed.

    // Actually, Drizzle ORM for SQLite doesn't have a simple "sync" like Sequelize.
    // But we can use drizzle-kit push:sqlite or just run the SQL.

    // I'll try to use a dummy query to see if connection works.
    try {
        const result = await db.select().from(users).all();
        console.log('Database already initialized.');
    } catch (err: any) {
        console.log('Database not initialized or error:', err?.message || err);
        console.log('Please run registration and see if it works. Tables might be created on the fly if using certain drivers, but usually not with better-sqlite3.');
    }
}

init();
