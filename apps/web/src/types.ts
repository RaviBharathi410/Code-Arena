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

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

// ── User & Auth ──────────────────────────────────────────────────────────

export interface User {
    id: string;
    username: string;
    email?: string;
    rating?: number;
    level?: number;
    experience?: number;
    wins?: number;
    losses?: number;
    badges?: string[];
}

export interface AuthResponse {
    user: User;
    token: string;
}

// ── Problem ──────────────────────────────────────────────────────────────

export interface Example {
    input: string;
    output: string;
    explanation?: string;
}

export interface TestCase {
    input: any;
    expected: any;
}

export interface Problem {
    id: string;
    title: string;
    difficulty: Difficulty;
    description: string;
    examples?: Example[];
    constraints?: string[];
    baseCode?: string;
    testCases?: TestCase[];
}

// ── Match & Battle ───────────────────────────────────────────────────────

export type MatchStatus = 'waiting' | 'active' | 'completed' | 'cancelled';

export interface Match {
    id: string;
    problemId: string;
    player1Id: string;
    player2Id: string;
    winnerId?: string;
    status: MatchStatus;
    createdAt?: string;
}

export type SubmissionStatus = 'pending' | 'running' | 'passed' | 'failed';

export interface Submission {
    id: string;
    matchId: string;
    userId: string;
    code: string;
    language: string;
    status: SubmissionStatus;
    executionTimeMs?: number;
}

// ── Tournament ───────────────────────────────────────────────────────────

export interface Tournament {
    id: string;
    title: string;
    status: string;
    startTime: string;
    bracketData?: any;
    tier?: string;
    prizePool?: string;
    maxPlayers?: number;
}

// ── Leaderboard ──────────────────────────────────────────────────────────

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    rating: number;
    wins: number;
    winRate?: number;
}
