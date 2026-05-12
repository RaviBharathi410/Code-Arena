import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import api from '../lib/api';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    authLoading: boolean;
    authError: string | null;

    setAuth: (user: User, accessToken: string) => void;
    logout: () => Promise<void>;
    fetchProfile: () => Promise<void>;
    updateRating: (newRating: number, change: number) => void;
    updateStats: (patch: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            authLoading: false,
            authError: null,

            setAuth: (user: User, accessToken: string) => set({
                user: { ...user },
                token: accessToken,
                isAuthenticated: true,
                authLoading: false,
                authError: null,
            }),

            logout: async () => {
                try {
                    await api.post('/auth/logout');
                } catch (e) {
                    console.error('Logout error', e);
                } finally {
                    set({
                        user: null,
                        token: null,
                        isAuthenticated: false,
                        authLoading: false,
                        authError: null,
                    });
                }
            },

            fetchProfile: async () => {
                const token = get().token;
                if (!token) return;

                if (token === 'local-token') {
                    get().logout();
                    return;
                }

                set({ authLoading: true, authError: null });
                try {
                    const response = await api.get('/auth/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    set({ user: response.data, authLoading: false });
                } catch (error: any) {
                    const message = error?.response?.data?.message || error?.message || 'Failed to fetch profile';
                    if (error?.response?.status === 401) {
                        set({ user: null, token: null, isAuthenticated: false, authError: 'Session expired', authLoading: false });
                    } else {
                        set({ authError: message, authLoading: false });
                    }
                }
            },

            // Live ELO update — called when a match:eloUpdate socket event arrives
            updateRating: (newRating: number, change: number) => {
                const current = get().user;
                if (!current) return;
                set({ user: { ...current, rankRating: newRating } });
            },

            // Generic patch for wins/losses/xp after a match result
            updateStats: (patch: Partial<User>) => {
                const current = get().user;
                if (!current) return;
                set({ user: { ...current, ...patch } });
            },
        }),
        {
            name: 'arena-auth-storage',
        }
    )
);
