import { db } from '../index';
import { users } from '@arena/database';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const testUsers = [
    {
        username: 'cypher_striker',
        email: 'cypher@arena.com',
        password: 'password123',
    },
    {
        username: 'neon_glitch',
        email: 'neon@arena.com',
        password: 'password123',
    }
];

export async function seedTestUsers() {
    console.log('Seeding test users...');
    for (const testUser of testUsers) {
        const passwordHash = await bcrypt.hash(testUser.password, 12);
        try {
            db.insert(users)
                .values({
                    id: crypto.randomUUID(),
                    username: testUser.username,
                    email: testUser.email,
                    passwordHash: passwordHash,
                })
                .onConflictDoNothing()
                .run();
        } catch (err) {
            console.error(`Failed to seed user ${testUser.username}:`, err);
        }
    }
    console.log('Test users seeded.');
}
