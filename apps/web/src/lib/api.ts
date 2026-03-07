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
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
