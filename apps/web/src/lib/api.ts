import axios from 'axios';

export const BASE_URL = '/api';
export const SOCKET_URL = '/';

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If the error is 401 and we haven't retried yet
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            // Ignore refresh logic if the request itself was for logging in or refreshing
            if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/register')) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                // Important: use a separate axios instance or raw axios 
                // to avoid infinite interceptor loops
                const rs = await axios.post('/api/auth/refresh', {}, {
                    withCredentials: true
                });

                const { accessToken } = rs.data;

                // Update the Zustand store using dynamic import/getState
                // to avoid top-level circular dependencies
                const { useAuthStore } = await import('../store/useAuthStore');
                const store = useAuthStore.getState();
                
                if (store.user) {
                    store.setAuth(store.user, accessToken);
                }

                // Update Authorization header for the original request
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }

                return api(originalRequest);
            } catch (refreshError) {
                console.warn('Silent refresh failed. Session expired.');
                // Wipe user session
                const { useAuthStore } = await import('../store/useAuthStore');
                useAuthStore.getState().logout();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
