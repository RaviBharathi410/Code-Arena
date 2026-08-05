import { User } from '../../models/User';

export class UsersService {
    async getById(id: string) {
        const user = await User.findById(id).lean();
        if (!user) throw new Error('User not found');
        return user;
    }

    async updateProfile(id: string, data: { username?: string; email?: string; avatarUrl?: string }) {
        const updatedUser = await User.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
        if (!updatedUser) throw new Error('User not found');
        return updatedUser;
    }
}

export const usersService = new UsersService();
