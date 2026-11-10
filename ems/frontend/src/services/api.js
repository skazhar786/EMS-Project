import axios from 'axios';

export const TOKEN_KEY = 'ems_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize errors and handle expired sessions globally.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const hasToken = !!localStorage.getItem(TOKEN_KEY);

    if (status === 401 && hasToken) {
      localStorage.removeItem(TOKEN_KEY);
      // AuthContext (Phase 3) listens for this and redirects to /login.
      window.dispatchEvent(new Event('auth:logout'));
    }

    error.userMessage =
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED' ? 'The request timed out' : null) ||
      (error.request ? 'Cannot reach the server. Check that the backend is running.' : error.message);

    return Promise.reject(error);
  }
);

export default api;
