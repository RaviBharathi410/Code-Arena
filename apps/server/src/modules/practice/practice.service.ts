import { Problem, IProblem } from '../../models/Problem';
import { User } from '../../models/User';
import { skillDataService } from '../skills/skill-data.service';
import { logger } from '../../lib/logger';

export interface PracticeSessionResponse {
    mode: 'speed' | 'focus' | 'adaptive' | 'coach';
    title: string;
    description: string;
    timeLimitSeconds?: number;
    problems: {
        id: string;
        title: string;
        slug: string;
        difficulty: string;
        category: string;
        tags: string[];
        description?: string;
        constraints?: any;
        examples?: any[];
        testCases?: any[];
        boilerplate?: any;
    }[];
    isDiagnostic?: boolean;
    targetCategory?: string;
}

function formatProblemSummary(p: any) {
    return {
        id: (p._id as any).toString(),
        title: p.title,
        slug: p.slug,
        difficulty: p.difficulty,
        category: p.category,
        tags: p.tags || [],
        description: p.description || '',
        constraints: p.constraints || '',
        examples: p.examples || [],
        testCases: p.testCases || [],
        boilerplate: p.boilerplate || {},
    };
}

export class PracticeService {
    /**
     * Get diagnostic calibration problem set for cold-start onboarding.
     */
    async getCalibrationSet() {
        // Query 3 problems covering distinct foundational categories
        const problems = await Problem.find({
            $or: [
                { category: 'arrays' },
                { category: 'strings' },
                { category: 'math' },
                { category: 'dp' }
            ],
            difficulty: { $in: ['EASY', 'MEDIUM', 'easy', 'medium'] }
        }).limit(6).lean();

        // Ensure unique categories
        const selected: any[] = [];
        const seenCategories = new Set<string>();

        for (const p of problems) {
            const cat = (p.category || 'arrays').toLowerCase();
            if (!seenCategories.has(cat) && selected.length < 3) {
                seenCategories.add(cat);
                selected.push(p);
            }
        }

        // Fallback to any 3 problems if specific categories are insufficient
        if (selected.length < 3) {
            const anyProblems = await Problem.find().limit(3).lean();
            return anyProblems.map(p => ({
                id: (p._id as any).toString(),
                title: p.title,
                slug: p.slug,
                difficulty: p.difficulty,
                category: p.category,
                tags: p.tags,
            }));
        }

        return selected.map(p => ({
            id: (p._id as any).toString(),
            title: p.title,
            slug: p.slug,
            difficulty: p.difficulty,
            category: p.category,
            tags: p.tags,
        }));
    }

    /**
     * Build an individualized Practice Lab session according to mode.
     */
    async getPracticeSession(mode: 'speed' | 'focus' | 'adaptive' | 'coach', userId: string): Promise<PracticeSessionResponse> {
        if (mode === 'speed') {
            // Speed Run: 3 Easy/Medium problems with a 10-minute cumulative timer
            const candidates = await Problem.find({
                difficulty: { $in: ['EASY', 'MEDIUM', 'easy', 'medium'] }
            }).limit(10).lean();

            const shuffled = candidates.sort(() => 0.5 - Math.random()).slice(0, 3);
            return {
                mode: 'speed',
                title: 'Speed Run Mode',
                description: 'Crush 3 rapid Easy/Medium algorithmic challenges before the countdown expires.',
                timeLimitSeconds: 600, // 10 minutes total
                problems: shuffled.map(formatProblemSummary),
            };
        }

        if (mode === 'focus') {
            // Deep Focus: 1 Hard or complex Medium problem, untimed
            let problem = await Problem.findOne({
                difficulty: { $in: ['HARD', 'hard'] }
            }).lean();

            if (!problem) {
                problem = await Problem.findOne({
                    difficulty: { $in: ['MEDIUM', 'medium'] }
                }).lean();
            }

            if (!problem) {
                problem = await Problem.findOne().lean();
            }

            return {
                mode: 'focus',
                title: 'Deep Focus Mode',
                description: 'Complex logic and algorithmic precision. No countdown timer pressure.',
                problems: problem ? [formatProblemSummary(problem)] : [],
            };
        }

        if (mode === 'adaptive') {
            // Weakness Fix: query skillDataService for real verified weakness or progressive diagnostic category
            const weakness = await skillDataService.getWeakness(userId);

            // Fetch problems matching the weakness category
            const queryRegex = new RegExp(weakness.category, 'i');
            let candidates = await Problem.find({
                $or: [
                    { category: queryRegex },
                    { tags: { $in: [queryRegex] } }
                ]
            }).limit(5).lean();

            if (candidates.length === 0) {
                candidates = await Problem.find().limit(3).lean();
            }

            return {
                mode: 'adaptive',
                title: weakness.isDiagnostic ? 'Diagnostic Drill (Calibration)' : `Weakness Fix: ${weakness.category.toUpperCase()}`,
                description: weakness.isDiagnostic
                    ? `Mapping your uncharted ${weakness.category.toUpperCase()} skills to calibrate your Radar Vector.`
                    : `Targeted drills addressing your historical deficit in ${weakness.category.toUpperCase()}.`,
                isDiagnostic: weakness.isDiagnostic,
                targetCategory: weakness.category,
                problems: candidates.slice(0, 3).map(formatProblemSummary),
            };
        }

        // Default: AI Coach Mode
        const coachCandidate = await Problem.findOne({
            difficulty: { $in: ['MEDIUM', 'medium', 'EASY', 'easy'] }
        }).lean();

        return {
            mode: 'coach',
            title: 'AI Coach Mode',
            description: 'Interactive practice with continuous Socratic hints and Big-O optimization guidance.',
            problems: coachCandidate ? [formatProblemSummary(coachCandidate)] : [],
        };
    }
}

export const practiceService = new PracticeService();
