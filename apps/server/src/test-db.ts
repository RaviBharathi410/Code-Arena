import { db } from './db';
import { users, problems } from '@arena/database';

async function test() {
    console.log('Testing DB connection with SQLite via Drizzle');
    try {
        const allUsers = await db.select().from(users).all();
        console.log('Connected successfully. User count:', allUsers.length);
        console.log('User Details:');
        allUsers.forEach(u => console.log(`- User: ${u.username}, Email: ${u.email}`));

        const allProblems = await db.select().from(problems).all();
        console.log('Problems found in DB:', allProblems.length);
        allProblems.forEach(p => console.log(`- [${p.difficulty}] ${p.title}`));

    } catch (err: any) {
        console.error('Connection failed:', err.message);
    }
}

test();
