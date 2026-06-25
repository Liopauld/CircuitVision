import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken, onUnauthorized } from '@/lib/api';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'seller' | 'admin';
  walletBalance: number;
  reservedBalance: number;
};

type AuthValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: Record<string, unknown>) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await setToken(null);
    setUser(null);
  }, []);

  // Bootstrap: if a token is already stored, fetch the current user.
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getToken();
      if (!token) {
        if (active) setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        if (active) setUser(data.user);
      } catch {
        await logout();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [logout]);

  // React to global 401s surfaced by the axios interceptor.
  useEffect(() => onUnauthorized(() => setUser(null)), []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    await setToken(data.token);
    setUser(data.user);
    return data.user as User;
  }, []);

  const register = useCallback(async (payload: Record<string, unknown>) => {
    const { data } = await api.post('/auth/register', payload);
    await setToken(data.token);
    setUser(data.user);
    return data.user as User;
  }, []);

  const refreshUser = useCallback(async () => {
    if (!(await getToken())) return;
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      /* interceptor handles 401 */
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
