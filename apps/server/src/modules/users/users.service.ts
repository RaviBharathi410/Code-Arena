import { db } from '../../db';
import { users } from '@arena/database';
import { eq } from 'drizzle-orm';

export class UsersService {
    async getById(id: string) {
        const user = db.query.users.findFirst({
            where: eq(users.id, id),
        });
        if (!user) throw new Error('User not found');
        return user;
    }

    async updateProfile(id: string, data: { username?: string; email?: string; avatarUrl?: string }) {
        const [updatedUser] = db.update(users)
            .set(data)
            .where(eq(users.id, id))
            .returning().all();

        if (!updatedUser) throw new Error('User not found');
        return updatedUser;
    }
}

export const usersService = new UsersService();
