export interface ScoringInput {
    status: 'ACCEPTED' | 'WRONG' | 'TLE' | 'MLE' | 'ERROR' | string;
    timeSeconds: number;         // Execution time
    detectedComplexity: string;
    optimalComplexity: string;
    qualityScore: number;        // 0-10, from static analysis
    testCasesPass: number;
    testCasesTotal: number;
    timeToSolveMs?: number;      // Wall-clock time from match start to submit
}

export class ScoringEngine {
    private complexityTiers: Record<string, number> = {
        'O(1)': 0, 'O(log n)': 1, 'O(n)': 2, 'O(n log n)': 3,
        'O(n^2)': 4, 'O(n^3)': 5, 'O(2^n)': 6, 'O(n!)': 7
    };

    /**
     * Calculate a composite score (0–2000) for a submission.
     * Components:
     *   - Test cases pass rate  : up to  600 pts  (most important)
     *   - Speed to solve        : up to  500 pts  (wall-clock from match start)
     *   - Complexity vs optimal : up to  400 pts
     *   - Code quality          : up to  300 pts
     *   - Execution speed bonus : up to  200 pts  (sub-100ms execution)
     */
    calculateScore(input: ScoringInput): number {
        const total = input.testCasesTotal || 1;
        const passed = Math.min(input.testCasesPass || 0, total);
        const passRate = passed / total;

        // 1. Test-case pass rate (600 pts max)
        const tcScore = Math.round(passRate * 600);

        // Bail early with partial score if not all tests pass
        if (input.status !== 'ACCEPTED' || passed < total) {
            return tcScore;
        }

        let score = tcScore;

        // 2. Speed to solve (500 pts) – linear decay over 60 minutes
        if (input.timeToSolveMs != null && input.timeToSolveMs > 0) {
            const minutes = input.timeToSolveMs / 60000;
            const speedScore = Math.max(0, Math.round(500 - (minutes / 60) * 500));
            score += speedScore;
        }

        // 3. Complexity bonus (400 pts)
        const detectedTier = this.complexityTiers[input.detectedComplexity] ?? 4;
        const optimalTier  = this.complexityTiers[input.optimalComplexity]  ?? 4;
        const tierDiff = detectedTier - optimalTier;
        if (tierDiff <= 0)      score += 400; // optimal or better
        else if (tierDiff === 1) score += 250;
        else if (tierDiff === 2) score += 100;

        // 4. Code quality (300 pts)
        score += Math.round((input.qualityScore / 10) * 300);

        // 5. Fast execution bonus (200 pts, decays exponentially)
        if (input.timeSeconds < 0.1) score += 200;
        else if (input.timeSeconds < 0.5) score += 150;
        else if (input.timeSeconds < 1.0) score += 80;
        else if (input.timeSeconds < 2.0) score += 30;

        return Math.min(score, 2000);
    }

    /**
     * Detect time complexity from actual execution time + problem size.
     * Simple heuristic — a real system would profile with multiple N values.
     */
    detectComplexity(timeMs: number, n: number): string {
        if (timeMs < 5)    return 'O(1)';
        if (timeMs < 30)   return 'O(log n)';
        if (timeMs < 150)  return 'O(n)';
        if (timeMs < 500)  return 'O(n log n)';
        if (timeMs < 2000) return 'O(n^2)';
        return 'O(n^3)';
    }

    /**
     * Static code quality analysis (0–10 score).
     * Factors: length discipline, meaningful names, no excessive nesting.
     */
    analyzeCodeQuality(code: string): number {
        let score = 5; // baseline
        const lines = code.split('\n').filter(l => l.trim().length > 0);
        const avgLen = lines.reduce((s, l) => s + l.length, 0) / Math.max(lines.length, 1);

        // Good length (not too terse, not too bloated)
        if (lines.length >= 5 && lines.length <= 40) score += 1;
        if (avgLen < 80) score += 1;

        // Has comments / docstrings
        if (/\/\/|\/\*|#|"""/.test(code)) score += 1;

        // Avoids deeply nested code
        const maxIndent = Math.max(...lines.map(l => (l.match(/^\s*/)?.[0]?.length || 0)));
        if (maxIndent <= 12) score += 1; // ≤3 indent levels
        if (maxIndent <= 8)  score += 1; // ≤2 indent levels

        // Penalise magic numbers, eval, etc.
        if (/\beval\b/.test(code)) score -= 2;

        return Math.max(0, Math.min(10, score));
    }
}

export const scoringEngine = new ScoringEngine();
