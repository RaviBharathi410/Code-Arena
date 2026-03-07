import { db } from './db';
import { users, problems } from '@arena/database';

async function test() {
    console.log('--- ARENA DATABASE CONNECTIVITY TEST (SQLITE) ---');
    try {
        console.log('Querying users table...');
        const allUsers = db.select().from(users).all();
        console.log('Connected successfully. User count:', allUsers.length);
        console.log('User Details:');
        allUsers.forEach(u => console.log(`- User: ${u.username}, Email: ${u.email}`));

        console.log('Querying problems table...');
        const allProblems = db.select().from(problems).all();
        console.log('Problems found in DB:', allProblems.length);
        allProblems.forEach(p => console.log(`- [${p.difficulty}] ${p.title}`));

    } catch (err: any) {
        console.error('CRITICAL: Database Uplink Failed.');
        console.error('Error Trace:', err.message);
        console.log('\nDIAGNOSTIC HINTS:');
        console.log('1. Ensure the sqlite.db file exists at the project root.');
        console.log('2. Ensure all tables are created via npm run db:push.');
    } finally {
        process.exit(0);
    }
}

test();
