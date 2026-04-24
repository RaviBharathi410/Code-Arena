import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import api from '../lib/api';

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

                // Force clear legacy mock tokens immediately
                if (token === 'local-token') {
                    get().logout();
                    return;
                }

                set({ authLoading: true, authError: null });
                try {
                    const response = await api.get('/auth/profile', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    set({
                        user: response.data,
                        authLoading: false
                    });
                } catch (error: any) {
                    const message = error?.response?.data?.message || error?.message || 'Failed to fetch profile';
                    // If 401, token might be invalid or expired without refresh
                    if (error?.response?.status === 401) {
                         set({ user: null, token: null, isAuthenticated: false, authError: 'Session expired', authLoading: false });
                    } else {
                         set({ authError: message, authLoading: false });
                    }
                }
            },
        }),
        {
            name: 'arena-auth-storage',
        }
    )
);
