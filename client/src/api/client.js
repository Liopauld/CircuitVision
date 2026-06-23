import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({ baseURL });

const TOKEN_KEY = 'cv_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Attach the JWT to every request when present.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear the token and bounce to login. A custom event lets the
// AuthContext react without a hard dependency cycle.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event('cv:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// Normalize API error messages for display.
export function apiError(err) {
  return err.response?.data?.error || err.message || 'Something went wrong.';
}
