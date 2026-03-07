import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Base URL for the backend server.
 * Uses VITE_API_URL env var in production, falls back to localhost for dev.
 */
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Socket.IO connection URL (same as base URL).
 */
export const SOCKET_URL = BASE_URL;

/**
 * Pre-configured Axios instance with baseURL set to /api
 * and automatic Authorization header injection.
 */
const api = axios.create({
    baseURL: `${BASE_URL}/api`,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Skip refresh loop if it's hitting the refresh endpoint itself or already retried
        if (originalRequest.url === '/auth/refresh') {
            useAuthStore.getState().logout();
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                // Send refresh request using naked axios to bypass interceptors
                const res = await axios.post(`${BASE_URL}/api/auth/refresh`, {}, { withCredentials: true });
                const { accessToken } = res.data;

                // Update AuthStore
                const store = useAuthStore.getState();
                if (store.user) {
                    store.setAuth(store.user, accessToken);
                }

                // Update headers and retry request
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshErr) {
                // If refresh fails, log out
                useAuthStore.getState().logout();
                return Promise.reject(refreshErr);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
