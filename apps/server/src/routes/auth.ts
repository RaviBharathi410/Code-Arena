import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '@arena/database';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [newUser] = await db.insert(users).values({
            username,
            email,
            passwordHash: hashedPassword,
        }).returning();

        const token = jwt.sign({ id: newUser.id, username: newUser.username }, process.env.JWT_SECRET || 'secret');
        res.json({ token, user: { id: newUser.id, username: newUser.username } });
    } catch (err: any) {
        console.error('Registration Error:', err);
        if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            const msg = err.message?.includes('email')
                ? 'An account with this email already exists. Try signing in.'
                : 'An account with this username already exists. Please choose another.';
            return res.status(409).json({ message: msg });
        }
        res.status(500).json({ message: 'Error registering user' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'secret');
        res.json({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: 'Error logging in' });
    }
});

router.get('/me', authMiddleware, async (req: any, res) => {
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, req.user.id),
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { passwordHash, ...safeUser } = user;
        res.json(safeUser);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

export default router;
