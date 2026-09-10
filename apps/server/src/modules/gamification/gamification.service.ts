import { User } from '../../models/User';
import { Achievement, UserAchievement } from '../../models/Achievement';
import { logger } from '../../lib/logger';

export class GamificationService {
    async recordActivity(userId: string, xpEarned: number, activityType: 'battle_win' | 'submission_accept' | 'daily_login') {
        const user = await User.findById(userId);
        if (!user) return null;

        // 1. Update Streaks
        const now = new Date();
        const lastActive = user.lastActive ? new Date(user.lastActive) : new Date(0);
        const hoursDiff = (now.getTime() - lastActive.getTime()) / (1000 * 3600);

        let streak = (user as any).currentStreak || 0;
        if (hoursDiff >= 24 && hoursDiff <= 48) {
            streak += 1;
        } else if (hoursDiff > 48) {
            streak = 1; // Reset streak
        } else if (streak === 0) {
            streak = 1;
        }

        const maxStreak = Math.max((user as any).maxStreak || 0, streak);

        // 2. Update XP and stats
        const currentXp = ((user as any).xp || 0) + xpEarned;
        const level = Math.floor(Math.sqrt(currentXp / 50)) + 1;

        await User.findByIdAndUpdate(userId, {
            $set: {
                xp: currentXp,
                level,
                currentStreak: streak,
                maxStreak,
                lastActive: now,
            }
        });

        logger.info({ userId, xpEarned, level, streak }, '[GAMIFICATION] Activity recorded');

        // 3. Evaluate Achievements
        await this.evaluateAchievements(userId, streak, user.wins);

        return { xp: currentXp, level, streak };
    }

    async evaluateAchievements(userId: string, streak: number, wins: number) {
        const achievements = await Achievement.find();

        for (const ach of achievements) {
            let unlocked = false;

            if (ach.category === 'STREAK' && streak >= ach.threshold) {
                unlocked = true;
            } else if (ach.category === 'BATTLE' && wins >= ach.threshold) {
                unlocked = true;
            }

            if (unlocked) {
                await UserAchievement.updateOne(
                    { userId, achievementId: ach._id },
                    { $setOnInsert: { userId, achievementId: ach._id, unlockedAt: new Date() } },
                    { upsert: true }
                ).catch(() => {});
            }
        }
    }

    async getUserAchievements(userId: string) {
        const unlocked = await UserAchievement.find({ userId }).populate('achievementId').lean();
        return unlocked.map(u => u.achievementId);
    }
}

export const gamificationService = new GamificationService();
