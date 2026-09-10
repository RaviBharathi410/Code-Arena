import { Submission } from '../../models/Submission';
import { User } from '../../models/User';
import { MatchRoom } from '../../models/MatchRoom';

export class UserAnalyticsService {
    async getUserDashboardTelemetry(userId: string) {
        const user = await User.findById(userId).lean();
        if (!user) throw new Error('User not found');

        // 1. Fetch 365-day submission activity heatmap
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        const submissions = await Submission.find({
            userId,
            createdAt: { $gte: oneYearAgo }
        }).select('createdAt status').lean();

        const heatmapMap: Record<string, number> = {};
        submissions.forEach(sub => {
            const dateStr = new Date((sub as any).createdAt).toISOString().split('T')[0];
            heatmapMap[dateStr] = (heatmapMap[dateStr] || 0) + 1;
        });

        const heatmap = Object.entries(heatmapMap).map(([date, count]) => ({ date, count }));

        // 2. Fetch match statistics
        const totalMatches = user.matchesPlayed || user.totalBattles || 0;
        const totalWins = user.matchesWon || user.wins || 0;
        const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

        return {
            userId,
            username: user.username,
            rankRating: user.rankRating || 1200,
            tier: user.tier || 'IRON',
            skillVector: user.skillVector || {},
            totalSubmissions: submissions.length,
            totalMatches,
            totalWins,
            winRate: Math.round(winRate * 10) / 10,
            heatmap,
        };
    }
}

export const userAnalyticsService = new UserAnalyticsService();
