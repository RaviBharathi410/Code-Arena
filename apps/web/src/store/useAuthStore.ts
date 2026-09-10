import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types';
import api from '../lib/api';
import SafeSessionStorage from '../lib/storage';

// Multi-tab storage engine:
// Isolates active user session per-tab in sessionStorage so two browser tabs can be
// logged in as two DIFFERENT users simultaneously, while falling back to localStorage
// for initial hydration of new tabs.
const multiTabStorage = {
    getItem: (name: string): string | null => {
        try {
            const sVal = sessionStorage.getItem(name);
            if (sVal) return sVal;
            return localStorage.getItem(name);
        } catch {
            return null;
        }
    },
    setItem: (name: string, value: string): void => {
        try {
            sessionStorage.setItem(name, value);
            localStorage.setItem(name, value);
        } catch {}
    },
    removeItem: (name: string): void => {
        try {
            sessionStorage.removeItem(name);
            localStorage.removeItem(name);
        } catch {}
    }
};

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    authLoading: boolean;
    authError: string | null;

    setAuth: (user: User, accessToken: string) => void;
    loginWithGoogle: (credential: string) => Promise<void>;
    loginAsDemo: () => Promise<void>;
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
            authLoading: true,
            authError: null,

            setAuth: (user: User, accessToken: string) => set({
                user: { ...user },
                token: accessToken,
                isAuthenticated: true,
                authLoading: false,
                authError: null,
            }),

            loginWithGoogle: async (credential: string) => {
                set({ authLoading: true, authError: null });
                try {
                    const response = await api.post('/auth/google', { credential });
                    const { accessToken, user } = response.data;
                    set({
                        user: { ...user },
                        token: accessToken,
                        isAuthenticated: true,
                        authLoading: false,
                        authError: null,
                    });
                } catch (error: any) {
                    const message = error?.response?.data?.message || error?.message || 'Google authentication failed';
                    set({ authError: message, authLoading: false });
                    throw new Error(message);
                }
            },

            loginAsDemo: async () => {
                set({ authLoading: true, authError: null });
                try {
                    const response = await api.post('/auth/demo');
                    const { accessToken, user } = response.data;
                    set({
                        user: { ...user },
                        token: accessToken,
                        isAuthenticated: true,
                        authLoading: false,
                        authError: null,
                    });
                } catch (error: any) {
                    const message = error?.response?.data?.message || error?.message || 'Failed to initialize demo session';
                    set({ authError: message, authLoading: false });
                    throw new Error(message);
                }
            },


            logout: async () => {
                try {
                    await api.post('/auth/logout');
                } catch (e) {
                    console.error('Logout error', e);
                } finally {
                    SafeSessionStorage.removeItem('arena_logo_shown_fixed');
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
                if (!token) {
                    set({ user: null, isAuthenticated: false, authError: null, authLoading: false });
                    return;
                }

                if (token === 'local-token') {
                    get().logout();
                    return;
                }

                // If no user or not yet authenticated, show loading indicator; otherwise sync silently
                if (!get().isAuthenticated || !get().user) {
                    set({ authLoading: true, authError: null });
                }

                try {
                    const response = await api.get('/auth/me');
                    set({ 
                        user: response.data, 
                        isAuthenticated: true, 
                        authLoading: false, 
                        authError: null 
                    });
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
            storage: createJSONStorage(() => multiTabStorage),
            version: 2,
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.authLoading = false;
                    if (state.token && state.user) {
                        state.isAuthenticated = true;
                    }
                }
            },
            migrate: (persistedState: any, version: number) => {
                if (version < 2) {
                    console.log('[AUTH] Migrated to JWT Auth V2: Invalidating stale local sessions.');
                    return {
                        user: null,
                        token: null,
                        isAuthenticated: false,
                        authLoading: false,
                        authError: null,
                    };
                }
                return persistedState as any;
            }
        }
    )
);
