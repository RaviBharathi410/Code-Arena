import bcrypt from 'bcrypt';
import { db } from './db/client';
import { users } from '@arena/database';
import { eq } from 'drizzle-orm';
import { env } from './config/env';

async function resetPassword() {
    const username = 'Ravibharathi';
    const newPassword = 'password123';
    
    console.log(`--- Resetting password for ${username} ---`);
    try {
        const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
        
        const result = await db.update(users)
            .set({ passwordHash })
            .where(eq(users.username, username))
            .returning();
        
        if (result.length > 0) {
            console.log(`Success! Password reset to "${newPassword}" for user ${username}.`);
        } else {
            console.log(`User ${username} not found.`);
        }
        process.exit(0);
    } catch (err) {
        console.error('Failed to reset password:', err);
        process.exit(1);
    }
}

resetPassword();
