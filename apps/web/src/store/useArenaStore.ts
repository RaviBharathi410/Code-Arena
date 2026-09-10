import { create } from 'zustand';
import type { Problem, LeaderboardEntry, AsyncStatus } from '../types';

export interface Tournament {
    id: string;
    title: string;
    status: string;
    startTime: string;
    tier: string;
    prizePool: string;
    maxPlayers: number;
}

const OFFLINE_PROBLEMS: Problem[] = [
    {
        id: 'p1',
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'EASY',
        category: 'Algorithms',
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        constraints: 'None',
        examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }],
        testCases: [],
        boilerplate: {},
    },
    {
        id: 'p2',
        title: 'Longest Substring Without Repeating Characters',
        slug: 'longest-substring',
        difficulty: 'MEDIUM',
        category: 'Algorithms',
        description: 'Given a string s, find the length of the longest substring without repeating characters.',
        constraints: 'None',
        examples: [{ input: 's = "abcabcbb"', output: '3' }],
        testCases: [],
        boilerplate: {},
    },
];

const OFFLINE_TOURNAMENTS: Tournament[] = [
    {
        id: 't1',
        title: 'Neon Ladder Weekly',
        status: 'scheduled',
        startTime: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
        tier: 'Silver',
        prizePool: '500 RP',
        maxPlayers: 128,
    },
];

const OFFLINE_LEADERBOARD: LeaderboardEntry[] = [
    { rank: 1, userId: 'm1', username: 'Ghost_Runner_32', rankRating: 4820, wins: 312, winRate: 79.6, tier: 'GRANDMASTER' },
    { rank: 2, userId: 'm2', username: 'NeonShadow_X', rankRating: 4611, wins: 289, winRate: 75.2, tier: 'DIAMOND' },
    { rank: 3, userId: 'm3', username: 'CipherKnight', rankRating: 4430, wins: 261, winRate: 71.3, tier: 'DIAMOND' },
];

interface ArenaState {
    problems: Problem[];
    problemsStatus: AsyncStatus;
    problemsError: string | null;

    tournaments: Tournament[];
    tournamentsStatus: AsyncStatus;
    tournamentsError: string | null;

    leaderboard: LeaderboardEntry[];
    leaderboardStatus: AsyncStatus;
    leaderboardError: string | null;

    fetchProblems: () => Promise<void>;
    fetchTournaments: () => Promise<void>;
    fetchLeaderboard: () => Promise<void>;
}

export const useArenaStore = create<ArenaState>((set) => ({
    problems: [],
    problemsStatus: 'idle',
    problemsError: null,

    tournaments: [],
    tournamentsStatus: 'idle',
    tournamentsError: null,

    leaderboard: [],
    leaderboardStatus: 'idle',
    leaderboardError: null,

    fetchProblems: async () => {
        set({ problemsStatus: 'loading', problemsError: null });
        try {
            set({ problems: OFFLINE_PROBLEMS, problemsStatus: 'success' });
        } catch (error: any) {
            set({ problemsError: error.message, problemsStatus: 'error' });
        }
    },

    fetchTournaments: async () => {
        set({ tournamentsStatus: 'loading', tournamentsError: null });
        try {
            set({ tournaments: OFFLINE_TOURNAMENTS, tournamentsStatus: 'success' });
        } catch (error: any) {
            set({ tournamentsError: error.message, tournamentsStatus: 'error' });
        }
    },

    fetchLeaderboard: async () => {
        set({ leaderboardStatus: 'loading', leaderboardError: null });
        try {
            set({ leaderboard: OFFLINE_LEADERBOARD, leaderboardStatus: 'success' });
        } catch (error: any) {
            set({ leaderboardError: error.message, leaderboardStatus: 'error' });
        }
    },
}));
