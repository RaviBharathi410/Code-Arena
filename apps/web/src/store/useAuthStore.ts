import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface User {
    id: string;
    username: string;
    email?: string;
    rating?: number;
    level?: number;
    experience?: number;
    wins?: number;
    losses?: number;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
    fetchProfile: () => Promise<void>;
}

const API_URL = 'http://localhost:3001';

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user: User, token: string) => set({ user: { ...user }, token, isAuthenticated: true }),
            logout: () => set({ user: null, token: null, isAuthenticated: false }),
            fetchProfile: async () => {
                const token = get().token;
                if (!token) return;

                try {
                    const response = await axios.get(`${API_URL}/api/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    set({ user: response.data });
                } catch (error) {
                    console.error('Failed to fetch profile:', error);
                    if (axios.isAxiosError(error) && error.response?.status === 401) {
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
