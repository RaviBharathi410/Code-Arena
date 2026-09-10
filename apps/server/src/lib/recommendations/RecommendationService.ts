import { Problem, IProblem } from '../../models/Problem';
import { IUser } from '../../models/User';
import { skillDataService } from '../../modules/skills/skill-data.service';

export interface RecommendationRequest {
    user: IUser;
    userSolvedProblemIds: string[];
    userFailedProblemIds: string[];
    limit?: number;
}

export interface RecommendedProblemResult {
    problem: IProblem;
    score: number;
    matchedSkills: string[];
    difficultyMatch: boolean;
    isDiagnostic?: boolean;
}

export class RecommendationService {
    async getRecommendations(req: RecommendationRequest): Promise<RecommendedProblemResult[]> {
        const limit = req.limit || 5;
        const excludedIds = new Set([...req.userSolvedProblemIds, ...req.userFailedProblemIds]);

        // 1. Determine user target difficulty based on rankRating / eloRating
        const userRating = req.user.rankRating || req.user.eloRating || 1200;
        let targetDifficulty = 'EASY';
        if (userRating >= 1600) targetDifficulty = 'HARD';
        else if (userRating >= 1300) targetDifficulty = 'MEDIUM';

        // 2. Identify real skill weakness or progressive diagnostic category
        const weakness = await skillDataService.getWeakness(req.user._id.toString());
        const deficitSkills = [weakness.category];

        // 3. Fetch candidate problems from MongoDB (both seed and community problems)
        const candidates = await Problem.find().limit(200).lean();

        // 4. Calculate deterministic mathematical score for each candidate
        const scored: RecommendedProblemResult[] = [];

        for (const candidate of candidates) {
            const problemIdStr = (candidate._id as any).toString();
            if (excludedIds.has(problemIdStr)) continue;

            let score = 0;
            const matchedSkills: string[] = [];

            // Skill deficit match (+30 points per matching tag)
            const tags = (candidate.tags || []).map(t => t.toLowerCase());
            for (const deficit of deficitSkills) {
                if (tags.some(t => t.includes(deficit))) {
                    score += 30;
                    matchedSkills.push(deficit);
                }
            }

            // Difficulty match (+40 points)
            const isDiffMatch = candidate.difficulty === targetDifficulty;
            if (isDiffMatch) {
                score += 40;
            }

            // Extraction confidence boost (+10 points)
            if (candidate.extractionConfidence === 'high') {
                score += 10;
            }

            scored.push({
                problem: candidate as unknown as IProblem,
                score,
                matchedSkills,
                difficultyMatch: isDiffMatch,
            });
        }

        // 5. Sort by deterministic score descending
        scored.sort((a, b) => b.score - a.score);

        return scored.slice(0, limit);
    }
}

export const recommendationService = new RecommendationService();
