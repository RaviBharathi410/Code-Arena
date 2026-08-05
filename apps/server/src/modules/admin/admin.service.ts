import { User } from '../../models/User';
import { MatchRoom } from '../../models/MatchRoom';
import { Submission } from '../../models/Submission';
import { AdminAuditLog } from '../../models/AdminAuditLog';
import { logger } from '../../lib/logger';
import { ioInstance } from '../../socket';

/**
 * AdminService — Administrative operations for user and system management.
 * All methods here require admin authentication at the router/middleware level.
 */
export class AdminService {
    /**
     * List all users with pagination, including role and stats.
     */
    async listUsers(options: { limit?: number; offset?: number }) {
        const limit = Math.min(options.limit || 50, 200);
        const offset = options.offset || 0;

        const totalCount = await User.countDocuments();
        
        const data = await User.find()
            .select('username email rankRating wins losses createdAt')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(offset)
            .lean();

        return {
            total: totalCount,
            limit,
            offset,
            data,
        };
    }

    /**
     * Get detailed admin view of a user (includes email, role, full stats).
     */
    async getUserDetail(userId: string) {
        const user = await User.findById(userId).lean();
        if (!user) throw new Error('User not found');

        const { passwordHash, ...safeUser } = user;

        const totalMatches = await MatchRoom.countDocuments({
            $or: [{ player1Id: userId }, { player2Id: userId }]
        });

        const totalSubmissions = await Submission.countDocuments({ userId });

        return {
            ...safeUser,
            totalMatches,
            totalSubmissions,
        };
    }

    /**
     * Reset a user's Rank rating back to default (1200).
     */
    async resetUserElo(userId: string) {
        const updated = await User.findByIdAndUpdate(userId, { $set: { rankRating: 1200 } }, { new: true });
        if (!updated) throw new Error('User not found');

        logger.info({ userId }, '[ADMIN] User Rank reset to 1200');
        return { success: true, userId, newElo: 1200 };
    }

    /**
     * Get system-wide statistics for the admin dashboard.
     */
    async getSystemStats() {
        const totalUsers = await User.countDocuments();
        const totalMatches = await MatchRoom.countDocuments();
        const totalSubmissions = await Submission.countDocuments();

        const activeMatches = await MatchRoom.countDocuments({ status: 'active' });
        const completedMatches = await MatchRoom.countDocuments({ status: 'completed' });

        const recentSignups24h = await User.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        return {
            totalUsers,
            totalMatches,
            totalSubmissions,
            activeMatches,
            completedMatches,
            recentSignups24h,
        };
    }

    /**
     * Update a user's role (promote/demote)
     */
    async updateUserRole(adminId: string, userId: string, role: string) {
        const admin = await User.findById(adminId).lean();
        if (!admin) throw new Error('Admin not found');
        if (['admin', 'superadmin'].includes(role) && admin.role !== 'superadmin') {
            throw new Error('Only superadmin can grant admin roles');
        }

        const user = await User.findById(userId).lean();
        if (!user) throw new Error('Target user not found');

        const updated = await User.findByIdAndUpdate(userId, { $set: { role } }, { new: true }).select('username role email');

        await AdminAuditLog.create({
            adminId,
            action: 'UPDATE_ROLE',
            targetUserId: userId,
            metadata: { previousRole: user.role, newRole: role }
        });

        logger.info({ adminId, userId, role }, '[ADMIN] User role updated');
        return updated;
    }

    /**
     * Ban a user
     */
    async banUser(adminId: string, userId: string, reason: string) {
        if (!reason || reason.trim() === '') {
            throw new Error('Ban reason is required');
        }

        const admin = await User.findById(adminId).lean();
        const user = await User.findById(userId).lean();
        
        if (!admin || !user) throw new Error('User not found');

        if (['admin', 'superadmin'].includes(user.role) && admin.role !== 'superadmin') {
            throw new Error('Only superadmin can ban other admins');
        }

        if (user.isBanned) {
            const error: any = new Error('User is already banned');
            error.status = 409;
            throw error;
        }

        const updated = await User.findByIdAndUpdate(userId, {
            $set: {
                isBanned: true,
                banReason: reason,
                bannedAt: new Date(),
                bannedBy: adminId
            }
        }, { new: true });

        await AdminAuditLog.create({
            adminId,
            action: 'BAN_USER',
            targetUserId: userId,
            metadata: { reason }
        });

        logger.info({ adminId, userId, reason }, '[ADMIN] User banned');

        if (ioInstance) {
            ioInstance.to(`user:${userId}`).emit('auth:banned', { reason });
            ioInstance.in(`user:${userId}`).disconnectSockets(true);
        }

        return updated;
    }

    /**
     * Unban a user
     */
    async unbanUser(adminId: string, userId: string) {
        const user = await User.findById(userId).lean();
        if (!user) throw new Error('User not found');

        if (!user.isBanned) {
            const error: any = new Error('User is not currently banned');
            error.status = 409;
            throw error;
        }

        const updated = await User.findByIdAndUpdate(userId, {
            $set: {
                isBanned: false,
                banReason: null,
                bannedAt: null,
                bannedBy: null
            }
        }, { new: true });

        await AdminAuditLog.create({
            adminId,
            action: 'UNBAN_USER',
            targetUserId: userId,
            metadata: {}
        });

        logger.info({ adminId, userId }, '[ADMIN] User unbanned');
        return updated;
    }
}

export const adminService = new AdminService();
