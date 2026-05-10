import { db } from './db/client';
import { users } from '@arena/database';

async function checkUsers() {
    try {
        const allUsers = await db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            passwordHash: users.passwordHash
        }).from(users);
        
        console.log('--- Database Users ---');
        console.table(allUsers);
        process.exit(0);
    } catch (err) {
        console.error('Error checking users:', err);
        process.exit(1);
    }
}

checkUsers();
