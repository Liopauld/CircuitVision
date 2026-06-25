import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Point this at your machine's LAN IP for a real device, e.g.
// EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 — a phone can't reach localhost.
const baseURL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ||
  'http://localhost:4000';

export const api = axios.create({ baseURL: `${baseURL}/api` });

const TOKEN_KEY = 'cv_token';

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Attach the JWT to every request when present (token read is async on native).
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Notify listeners (AuthContext) of a global 401 without a dependency cycle.
type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
export function onUnauthorized(fn: Listener) {
  unauthorizedListeners.add(fn);
  return () => {
    unauthorizedListeners.delete(fn);
  };
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await setToken(null);
      unauthorizedListeners.forEach((fn) => fn());
    }
    return Promise.reject(error);
  }
);

// Normalize API error messages for display.
export function apiError(err: any) {
  return err?.response?.data?.error || err?.message || 'Something went wrong.';
}
