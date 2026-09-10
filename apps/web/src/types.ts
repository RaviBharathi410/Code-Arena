// ── Async State Helper ────────────────────────────────────────────────────

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
    data: T;
    status: AsyncStatus;
    error: string | null;
}

export function createAsyncState<T>(initial: T): AsyncState<T> {
    return { data: initial, status: 'idle', error: null };
}

// ── Difficulty ────────────────────────────────────────────────────────────

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

// ── User & Auth ──────────────────────────────────────────────────────────

export interface User {
    id: string;
    username: string;
    email?: string;
    rankRating: number;
    wins: number;
    losses: number;
    totalBattles: number;
    winRate: number;
    tier: 'PLACEMENT' | 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'GRANDMASTER';
    placementMatchesRemaining?: number;
    isCalibrated?: boolean;
    isDemo?: boolean;
    avatarUrl?: string;
    lastActive?: string;
}

// ── Problem ──────────────────────────────────────────────────────────────

export interface Example {
    input: string;
    output: string;
    explanation?: string;
}

export interface TestCase {
    input: any;
    expected_output: any;
    is_hidden: boolean;
}

export interface Problem {
    id: string;
    slug: string;
    title: string;
    difficulty: Difficulty;
    category: string;
    description: string;
    constraints: string;
    examples: Example[];
    testCases: TestCase[];
    boilerplate: Record<string, string>;
    problemType?: 'function' | 'stdin-stdout';
    functionName?: string;
    returnType?: string;
    parameters?: any[];
    driverTemplates?: Record<string, string>;
    cfRating?: number;
    optimalTimeComplexity?: string;
    optimalSpaceComplexity?: string;
    tags?: string[];
}

// ── Match & Battle ───────────────────────────────────────────────────────

export type MatchStatus = 'waiting' | 'active' | 'completed' | 'abandoned';

export interface MatchRoom {
    id: string;
    roomCode: string;
    mode: '1v1' | 'practice' | 'ranked';
    status: MatchStatus;
    problemId: string;
    player1Id: string;
    player2Id?: string;
    player1Lang?: string;
    player2Lang?: string;
    startedAt?: string;
    endedAt?: string;
    winnerId?: string;
    problem?: Problem;
    player1?: User;
    player2?: User;
    createdAt?: string;
}

export type SubmissionStatus = 'PENDING' | 'ACCEPTED' | 'WRONG' | 'TLE' | 'MLE' | 'ERROR' | 'PROCESSING';

export interface Submission {
    id: string;
    matchId: string;
    userId: string;
    code: string;
    language: string;
    status: SubmissionStatus;
    timeMs?: number;
    memoryKb?: number;
    testCasesPass?: number;
    testCasesTotal?: number;
    timeComplexity?: string;
    spaceComplexity?: string;
    qualityScore?: number;
    finalScore?: number;
    submittedAt: string;
}

export interface MatchResult {
    winnerId: string | null;
    p1Score: number;
    p2Score: number;
    p1Sub: Submission | null;
    p2Sub: Submission | null;
    rankDeltaP1?: number;
    rankDeltaP2?: number;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    rankRating: number;
    wins: number;
    winRate: number;
    tier: User['tier'];
}
