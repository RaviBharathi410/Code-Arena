import { Router, Request, Response } from 'express';
import { recommendationService } from '../../lib/recommendations/RecommendationService';
import { aiService } from '../../lib/ai/AIService';
import { requireAuth } from '../../middleware/auth.middleware';
import { Submission } from '../../models/Submission';
import { User } from '../../models/User';
import { logger } from '../../lib/logger';

const router = Router();

router.use(requireAuth);

// ── GET /api/problems/recommendations ────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const userDoc = await User.findById(userId);

        if (!userDoc) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Get user solved & failed submission history via MatchRoom
        const userSubmissions = await Submission.find({ userId }).select('matchId status').populate('matchId').lean();
        const solvedIds = userSubmissions.filter(s => s.status === 'ACCEPTED').map(s => (s.matchId as any)?.problemId?.toString()).filter(Boolean);
        const failedIds = userSubmissions.filter(s => s.status !== 'ACCEPTED').map(s => (s.matchId as any)?.problemId?.toString()).filter(Boolean);

        const recommendations = await recommendationService.getRecommendations({
            user: userDoc,
            userSolvedProblemIds: solvedIds,
            userFailedProblemIds: failedIds,
            limit: 5,
        });

        res.json({
            recommendations: recommendations.map(r => ({
                problemId: r.problem._id,
                title: r.problem.title,
                slug: r.problem.slug,
                difficulty: r.problem.difficulty,
                category: r.problem.category,
                matchedSkills: r.matchedSkills,
                score: r.score,
            }))
        });
    } catch (err: any) {
        logger.error({ error: err.message }, '[RECOMMENDATION_ROUTER] Failed to calculate recommendations');
        res.status(500).json({ error: err.message || 'Recommendation calculation failed' });
    }
});

// ── POST /api/problems/recommendations/explain ───────────────────────────
router.post('/explain', async (req: Request, res: Response) => {
    try {
        const { problemTitle, problemDifficulty, matchedSkills } = req.body;

        if (!problemTitle) {
            res.status(400).json({ error: 'Missing problemTitle' });
            return;
        }

        const prompt = `Explain in 2 short, encouraging sentences why the problem "${problemTitle}" (${problemDifficulty}) was recommended for this user based on their skill deficit areas: ${Array.isArray(matchedSkills) ? matchedSkills.join(', ') : 'general improvement'}.`;

        const result = await aiService.explain(prompt, 'markdown');

        res.json({
            provider: result.providerName,
            explanation: result.data,
        });
    } catch (err: any) {
        logger.error({ error: err.message }, '[RECOMMENDATION_ROUTER] Failed to generate recommendation explanation');
        res.status(500).json({ error: err.message || 'AI explanation failed' });
    }
});

export default router;
