import { db } from './src/db';
import { users } from '@arena/database';

async function check() {
    try {
        const allUsers = await db.select().from(users).limit(10);
        console.log('USERS IN DB:', allUsers.map(u => ({ id: u.id, username: u.username, email: u.email })));
        process.exit(0);
    } catch (err) {
        console.error('ERROR CHECKING USERS:', err);
        process.exit(1);
    }
}

check();
