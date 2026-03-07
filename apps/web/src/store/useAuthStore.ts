import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;        // access token – stored in memory only
    isAuthenticated: boolean;
    authLoading: boolean;
    authError: string | null;

    setAuth: (user: User, accessToken: string) => void;
    logout: () => Promise<void>;
    fetchProfile: () => Promise<void>;
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
                } catch (_) { /* ignore network errors on logout */ }
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    authLoading: false,
                    authError: null,
                });
            },

            fetchProfile: async () => {
                const token = get().token;
                if (!token) return;

                set({ authLoading: true, authError: null });
                try {
                    const response = await api.get('/users/me');
                    set({ user: response.data, authLoading: false });
                } catch (error: any) {
                    const message = error.response?.data?.message || error.message || 'Failed to fetch profile';
                    set({ authError: message, authLoading: false });
                    if (error.response?.status === 401) {
                        get().logout();
                    }
                }
            },
        }),
        {
            name: 'arena-auth-storage',
        }
    )
);
