import axios from 'axios';
import Constants from 'expo-constants';
import { getItem, setItem, deleteItem } from '@/lib/storage';

// Resolve the API origin. A real device can't reach the laptop's "localhost",
// so we derive the dev machine's LAN IP from the Expo/Metro host URI (the same
// IP that serves the JS bundle) and assume the API runs there on port 4000.
// Override with EXPO_PUBLIC_API_URL when the API lives elsewhere.
function resolveBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.developer?.host ||
    '';
  const host = hostUri.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:4000`;
  }

  const extra = (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl;
  return extra || 'http://localhost:4000';
}

const baseURL = resolveBaseUrl();

export const api = axios.create({ baseURL: `${baseURL}/api` });

const TOKEN_KEY = 'cv_token';

export async function getToken() {
  return getItem(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token) await setItem(TOKEN_KEY, token);
  else await deleteItem(TOKEN_KEY);
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
