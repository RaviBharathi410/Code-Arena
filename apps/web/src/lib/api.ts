import axios from 'axios';

export const BASE_URL = 'http://127.0.0.1:3001/api';
export const SOCKET_URL = 'http://127.0.0.1:3001';

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
});

api.interceptors.request.use(
    async (config) => {
        // Use dynamic import/getState to avoid circular dependency
        const { useAuthStore } = await import('../store/useAuthStore');
        const token = useAuthStore.getState().token;
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        const isLogoutRequest = originalRequest.url?.includes('/auth/logout');

        if (error.response && error.response.status === 401 && !originalRequest._retry && !isLogoutRequest) {
            originalRequest._retry = true;

            try {
                // Call our custom refresh endpoint
                const response = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
                
                if (!response.data || !response.data.accessToken) {
                    throw new Error('No token returned');
                }

                const accessToken = response.data.accessToken;

                // Update our global state with the new token
                const { useAuthStore } = await import('../store/useAuthStore');
                const store = useAuthStore.getState();
                if (store.user) {
                    store.setAuth(store.user, accessToken);
                }

                // Retry the failed request with the fresh token
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }

                return api(originalRequest);
            } catch (err) {
                console.warn('Silent refresh failed. Session expired.');
                const { useAuthStore } = await import('../store/useAuthStore');
                useAuthStore.getState().logout();
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
