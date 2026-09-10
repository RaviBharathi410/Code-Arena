import { Submission } from '../../models/Submission';
import { MatchRoom } from '../../models/MatchRoom';
import { Problem } from '../../models/Problem';
import mongoose from 'mongoose';

export const CANONICAL_CATEGORIES = [
    'arrays',
    'strings',
    'trees',
    'graphs',
    'dp',
    'math',
    'sorting',
    'hashing',
] as const;

export type CanonicalCategory = typeof CANONICAL_CATEGORIES[number];

export type CategoryStatus = 'NO_DATA' | 'CALIBRATING' | 'CALIBRATED';

export interface CategorySkillData {
    category: CanonicalCategory;
    attempts: number;
    passed: number;
    passRate: number; // 0 to 100
    avgTimeToAcceptMs: number;
    recentTrend: number; // +1, 0, -1
    score: number; // 0 to 100 normalized mastery
    status: CategoryStatus;
    hasData: boolean;
}

export interface UserSkillVector {
    userId: string;
    hasData: boolean;
    isCalibrated: boolean;
    totalSubmissions: number;
    calibratedCategoriesCount: number;
    overallMastery: number;
    categories: Record<CanonicalCategory, CategorySkillData>;
    radarPoints: { name: string; value: number; status: CategoryStatus; hasData: boolean }[];
}

export interface WeaknessResult {
    category: CanonicalCategory;
    attempts: number;
    passRate: number;
    score: number;
    isCalibrated: boolean;
    isDiagnostic: boolean;
    reason: 'VERIFIED_WEAKNESS' | 'MAPPING_UNTRACKED_CATEGORY';
}

export class SkillDataService {
    /**
     * Map arbitrary problem tags / category to one or more canonical categories
     */
    private mapToCanonicalCategories(category: string = '', tags: string[] = []): CanonicalCategory[] {
        const canonicalMatches = new Set<CanonicalCategory>();
        const allTokens = [category, ...tags].map(t => (t || '').toLowerCase().trim());

        for (const token of allTokens) {
            if (token.includes('array')) canonicalMatches.add('arrays');
            if (token.includes('string')) canonicalMatches.add('strings');
            if (token.includes('tree') || token.includes('bst')) canonicalMatches.add('trees');
            if (token.includes('graph') || token.includes('dfs') || token.includes('bfs')) canonicalMatches.add('graphs');
            if (token.includes('dp') || token.includes('dynamic')) canonicalMatches.add('dp');
            if (token.includes('math') || token.includes('number') || token.includes('geometry')) canonicalMatches.add('math');
            if (token.includes('sort') || token.includes('two-pointer') || token.includes('pointer')) canonicalMatches.add('sorting');
            if (token.includes('hash') || token.includes('map') || token.includes('set')) canonicalMatches.add('hashing');
        }

        // Default fallback if no keyword matches
        if (canonicalMatches.size === 0) {
            canonicalMatches.add('arrays');
        }

        return Array.from(canonicalMatches);
    }

    /**
     * Alias for getUserSkillVector
     */
    async getSkillVector(userId: string): Promise<UserSkillVector> {
        return this.getUserSkillVector(userId);
    }

    /**
     * Generate complete skill vector aggregating both practice and ranked submissions.
     */
    async getUserSkillVector(userId: string): Promise<UserSkillVector> {
        const objectUserId = new mongoose.Types.ObjectId(userId);

        // Fetch user's submissions with populated match and problem details
        const submissions = await Submission.find({ userId: objectUserId })
            .populate({
                path: 'matchId',
                select: 'mode status problemId',
                populate: {
                    path: 'problemId',
                    select: 'title category tags difficulty'
                }
            })
            .sort({ submittedAt: 1 }) // Chronological order for trend calculation
            .lean();

        // Initialize category accumulator
        const accumulator: Record<CanonicalCategory, {
            attempts: number;
            passed: number;
            acceptedTimes: number[];
            verdicts: boolean[]; // true = accepted, false = failed
        }> = {} as any;

        for (const cat of CANONICAL_CATEGORIES) {
            accumulator[cat] = { attempts: 0, passed: 0, acceptedTimes: [], verdicts: [] };
        }

        let totalValidSubmissions = 0;

        for (const sub of submissions) {
            const match = sub.matchId as any;
            let problem = match?.problemId;
            if (!problem && (sub as any).problemId) {
                problem = await Problem.findById((sub as any).problemId).select('title category tags difficulty').lean();
            }
            if (!problem) continue;

            const targetCategories = this.mapToCanonicalCategories(problem.category, problem.tags);
            const isAccepted = sub.status === 'ACCEPTED';
            const timeMs = sub.timeMs || (sub as any).executionTimeMs || 0;

            totalValidSubmissions++;

            for (const cat of targetCategories) {
                accumulator[cat].attempts++;
                accumulator[cat].verdicts.push(isAccepted);
                if (isAccepted) {
                    accumulator[cat].passed++;
                    if (timeMs > 0) {
                        accumulator[cat].acceptedTimes.push(timeMs);
                    }
                }
            }
        }

        const categoriesData: Partial<Record<CanonicalCategory, CategorySkillData>> = {};
        let calibratedCount = 0;
        let cumulativeScore = 0;
        let activeScoreCount = 0;

        for (const cat of CANONICAL_CATEGORIES) {
            const acc = accumulator[cat];
            const hasData = acc.attempts > 0;
            const passRate = hasData ? Math.round((acc.passed / acc.attempts) * 100) : 0;

            const avgTime = acc.acceptedTimes.length > 0
                ? Math.round(acc.acceptedTimes.reduce((a, b) => a + b, 0) / acc.acceptedTimes.length)
                : 0;

            // Trend calculation from last 5 submissions
            let recentTrend = 0;
            if (acc.verdicts.length >= 2) {
                const recent = acc.verdicts.slice(-5);
                const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
                const secondHalf = recent.slice(Math.floor(recent.length / 2));
                const firstPassRate = firstHalf.filter(Boolean).length / firstHalf.length;
                const secondPassRate = secondHalf.filter(Boolean).length / secondHalf.length;
                if (secondPassRate > firstPassRate) recentTrend = 1;
                else if (secondPassRate < firstPassRate) recentTrend = -1;
            }

            // Status designation
            let status: CategoryStatus = 'NO_DATA';
            if (acc.attempts >= 3) {
                status = 'CALIBRATED';
                calibratedCount++;
            } else if (acc.attempts >= 1) {
                status = 'CALIBRATING';
            }

            // Score: 0 if no data; otherwise weighted combination of pass rate (70%) and execution efficiency (30%)
            let score = 0;
            if (hasData) {
                const speedBonus = avgTime > 0 ? Math.max(0, Math.min(30, Math.round(30 - (avgTime / 200)))) : 15;
                score = Math.min(100, Math.max(10, Math.round(passRate * 0.7 + speedBonus)));
                cumulativeScore += score;
                activeScoreCount++;
            }

            categoriesData[cat] = {
                category: cat,
                attempts: acc.attempts,
                passed: acc.passed,
                passRate,
                avgTimeToAcceptMs: avgTime,
                recentTrend,
                score,
                status,
                hasData,
            };
        }

        const overallMastery = activeScoreCount > 0 ? Math.round(cumulativeScore / activeScoreCount) : 0;
        const hasAnyData = totalValidSubmissions > 0;

        const radarPoints = CANONICAL_CATEGORIES.map(cat => {
            const data = categoriesData[cat]!;
            return {
                name: cat.charAt(0).toUpperCase() + cat.slice(1),
                value: data.hasData ? data.score : 0,
                status: data.status,
                hasData: data.hasData,
            };
        });

        return {
            userId,
            hasData: hasAnyData,
            isCalibrated: calibratedCount > 0,
            totalSubmissions: totalValidSubmissions,
            calibratedCategoriesCount: calibratedCount,
            overallMastery,
            categories: categoriesData as Record<CanonicalCategory, CategorySkillData>,
            radarPoints,
        };
    }

    /**
     * Identify weakness for Weakness Fix mode.
     * Falls back progressively if insufficient calibrated data exists.
     */
    async getWeakness(userId: string): Promise<WeaknessResult> {
        const skillVector = await this.getUserSkillVector(userId);

        // 1. If we have calibrated categories (>= 3 attempts), pick the one with lowest score/pass rate
        const calibrated = Object.values(skillVector.categories).filter(c => c.status === 'CALIBRATED');

        if (calibrated.length > 0) {
            // Sort by score ascending, tie-break by pass rate ascending
            calibrated.sort((a, b) => a.score - b.score || a.passRate - b.passRate);
            const weakest = calibrated[0];
            return {
                category: weakest.category,
                attempts: weakest.attempts,
                passRate: weakest.passRate,
                score: weakest.score,
                isCalibrated: true,
                isDiagnostic: false,
                reason: 'VERIFIED_WEAKNESS',
            };
        }

        // 2. If no category has >= 3 attempts, select highest priority uncalibrated category to map skill vector
        const uncalibrated = Object.values(skillVector.categories).filter(c => c.status !== 'CALIBRATED');

        // Prefer categories with 0 attempts (completely uncharted) first
        const zeroDataCats = uncalibrated.filter(c => c.status === 'NO_DATA');
        const target = zeroDataCats.length > 0 ? zeroDataCats[0] : uncalibrated[0];

        return {
            category: target.category,
            attempts: target.attempts,
            passRate: target.passRate,
            score: target.score,
            isCalibrated: false,
            isDiagnostic: true,
            reason: 'MAPPING_UNTRACKED_CATEGORY',
        };
    }
}

export const skillDataService = new SkillDataService();
