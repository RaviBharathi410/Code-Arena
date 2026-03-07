import { create } from 'zustand';
import api from '../lib/api';
import type { Problem, Tournament, LeaderboardEntry, AsyncStatus } from '../types';

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
            const response = await api.get('/problems');
            set({ problems: response.data, problemsStatus: 'success' });
        } catch (error: any) {
            set({ problemsError: error.message, problemsStatus: 'error' });
        }
    },

    fetchTournaments: async () => {
        set({ tournamentsStatus: 'loading', tournamentsError: null });
        try {
            const response = await api.get('/tournaments');
            set({ tournaments: response.data, tournamentsStatus: 'success' });
        } catch (error: any) {
            set({ tournamentsError: error.message, tournamentsStatus: 'error' });
        }
    },

    fetchLeaderboard: async () => {
        set({ leaderboardStatus: 'loading', leaderboardError: null });
        try {
            const response = await api.get('/leaderboard');
            set({ leaderboard: response.data, leaderboardStatus: 'success' });
        } catch (error: any) {
            set({ leaderboardError: error.message, leaderboardStatus: 'error' });
        }
    },
}));
