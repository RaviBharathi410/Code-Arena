export interface ScoringInput {
    status: 'ACCEPTED' | 'WRONG' | 'TLE' | 'MLE' | 'ERROR';
    timeSeconds: number;
    detectedComplexity: string; // e.g. "O(n^2)"
    optimalComplexity: string;  // e.g. "O(n)"
    qualityScore: number;       // 0-10
}

export class ScoringEngine {
    private complexityTiers: Record<string, number> = {
        'O(1)': 0,
        'O(log n)': 1,
        'O(n)': 2,
        'O(n log n)': 3,
        'O(n^2)': 4,
        'O(n^3)': 5,
        'O(2^n)': 6,
        'O(n!)': 7
    };

    calculateScore(input: ScoringInput): number {
        if (input.status !== 'ACCEPTED') return 0;

        let totalScore = 1000; // Base points for ACCEPTED

        // 1. Speed Bonus
        // max(0, 500 - floor(time_seconds / 10) * 5)
        const speedBonus = Math.max(0, 500 - Math.floor(input.timeSeconds / 10) * 5);
        totalScore += speedBonus;

        // 2. Complexity Bonus
        // Exact match = +200, one tier worse = +100, two or more tiers worse = +0
        const detectedTier = this.complexityTiers[input.detectedComplexity] ?? 5;
        const optimalTier = this.complexityTiers[input.optimalComplexity] ?? 5;
        
        const tierDiff = detectedTier - optimalTier;
        if (tierDiff <= 0) {
            totalScore += 200;
        } else if (tierDiff === 1) {
            totalScore += 100;
        }

        // 3. Quality Bonus
        // quality_score * 30 (max 300 points)
        const qualityBonus = input.qualityScore * 30;
        totalScore += qualityBonus;

        return totalScore;
    }

    /**
     * Heuristic for complexity detection based on execution time and constraints.
     * In a real system, this would use more advanced profiling.
     */
    detectComplexity(timeMs: number, n: number): string {
        if (timeMs < 10) return 'O(1)';
        if (timeMs < 50) return 'O(n)';
        if (timeMs < 200) return 'O(n log n)';
        if (timeMs < 1000) return 'O(n^2)';
        return 'O(n^3)';
    }
}

export const scoringEngine = new ScoringEngine();
