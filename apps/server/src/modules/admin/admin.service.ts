import { db } from '../../db';
import { users, matchRooms, submissions } from '@arena/database';
import { eq, desc, sql, and } from 'drizzle-orm';
import { logger } from '../../lib/logger';

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

        const whereClause = undefined;

        const [totalCount] = await db.select({ value: sql<number>`count(*)` })
            .from(users)
            .where(whereClause);

        const data = await db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            rankRating: users.rankRating,
            wins: users.wins,
            losses: users.losses,
            createdAt: users.createdAt,
        })
            .from(users)
            .where(whereClause)
            .orderBy(desc(users.createdAt))
            .limit(limit)
            .offset(offset);

        return {
            total: Number(totalCount?.value || 0),
            limit,
            offset,
            data,
        };
    }

    /**
     * Get detailed admin view of a user (includes email, role, full stats).
     */
    async getUserDetail(userId: string) {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) throw new Error('User not found');

        const { passwordHash, ...safeUser } = user;

        // Count total matches and submissions
        const [matchCount] = await db.select({ value: sql<number>`count(*)` })
            .from(matchRooms)
            .where(
                sql`${matchRooms.player1Id} = ${userId} OR ${matchRooms.player2Id} = ${userId}`
            );

        const [submissionCount] = await db.select({ value: sql<number>`count(*)` })
            .from(submissions)
            .where(eq(submissions.userId, userId));

        return {
            ...safeUser,
            totalMatches: Number(matchCount?.value || 0),
            totalSubmissions: Number(submissionCount?.value || 0),
        };
    }

    /**
     * Reset a user's Rank rating back to default (1200).
     */
    async resetUserElo(userId: string) {
        const [updated] = await db.update(users)
            .set({ rankRating: 1200 })
            .where(eq(users.id, userId))
            .returning();

        if (!updated) throw new Error('User not found');

        logger.info({ userId }, '[ADMIN] User Rank reset to 1200');
        return { success: true, userId, newElo: 1200 };
    }

    /**
     * Get system-wide statistics for the admin dashboard.
     */
    async getSystemStats() {
        const [userCount] = await db.select({ value: sql<number>`count(*)` }).from(users);
        const [matchCount] = await db.select({ value: sql<number>`count(*)` }).from(matchRooms);
        const [submissionCount] = await db.select({ value: sql<number>`count(*)` }).from(submissions);

        const [activeMatches] = await db.select({ value: sql<number>`count(*)` })
            .from(matchRooms)
            .where(eq(matchRooms.status, 'active'));

        const [completedMatches] = await db.select({ value: sql<number>`count(*)` })
            .from(matchRooms)
            .where(eq(matchRooms.status, 'completed'));

        // Recent registrations (last 24h)
        const [recentSignups] = await db.select({ value: sql<number>`count(*)` })
            .from(users)
            .where(sql`${users.createdAt} > now() - interval '24 hours'`);

        return {
            totalUsers: Number(userCount?.value || 0),
            totalMatches: Number(matchCount?.value || 0),
            totalSubmissions: Number(submissionCount?.value || 0),
            activeMatches: Number(activeMatches?.value || 0),
            completedMatches: Number(completedMatches?.value || 0),
            recentSignups24h: Number(recentSignups?.value || 0),
        };
    }
}

export const adminService = new AdminService();
