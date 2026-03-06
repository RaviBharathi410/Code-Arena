import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './useAuthStore';

interface Problem {
    id: string;
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    baseCode: string;
    testCases: any[];
}

interface Tournament {
    id: string;
    title: string;
    status: string;
    startTime: string;
    bracketData: any;
}

interface LeaderboardEntry {
    userId: string;
    username: string;
    rating: number;
    rank: number;
    wins: number;
}

interface ArenaState {
    problems: Problem[];
    tournaments: Tournament[];
    leaderboard: LeaderboardEntry[];
    isLoading: boolean;
    error: string | null;

    fetchProblems: () => Promise<void>;
    fetchTournaments: () => Promise<void>;
    fetchLeaderboard: () => Promise<void>;
}

const API_URL = 'http://localhost:3001/api';

export const useArenaStore = create<ArenaState>((set) => ({
    problems: [],
    tournaments: [],
    leaderboard: [],
    isLoading: false,
    error: null,

    fetchProblems: async () => {
        set({ isLoading: true });
        try {
            const token = useAuthStore.getState().token;
            const response = await axios.get(`${API_URL}/problems`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ problems: response.data, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchTournaments: async () => {
        set({ isLoading: true });
        try {
            const token = useAuthStore.getState().token;
            const response = await axios.get(`${API_URL}/tournaments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ tournaments: response.data, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchLeaderboard: async () => {
        set({ isLoading: true });
        try {
            const token = useAuthStore.getState().token;
            const response = await axios.get(`${API_URL}/leaderboard`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ leaderboard: response.data, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    }
}));
