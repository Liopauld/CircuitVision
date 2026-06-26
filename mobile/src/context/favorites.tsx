import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth';

type FavoritesValue = {
  ids: Set<string>;
  count: number;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

// Tracks the set of wishlisted listing ids. Seeded from the authenticated
// user's `favorites` (returned by /auth/me); toggles update optimistically and
// roll back on error.
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setIds(new Set((user?.favorites || []).map(String)));
  }, [user]);

  const isFavorite = useCallback((id: string) => ids.has(String(id)), [ids]);

  const toggle = useCallback(
    async (id: string) => {
      if (!user) return;
      const key = String(id);
      const adding = !ids.has(key);
      setIds((prev) => {
        const next = new Set(prev);
        if (adding) next.add(key);
        else next.delete(key);
        return next;
      });
      try {
        if (adding) await api.post(`/users/me/favorites/${key}`);
        else await api.delete(`/users/me/favorites/${key}`);
      } catch {
        setIds((prev) => {
          const next = new Set(prev);
          if (adding) next.delete(key);
          else next.add(key);
          return next;
        });
      }
    },
    [ids, user]
  );

  return (
    <FavoritesContext.Provider value={{ ids, count: ids.size, isFavorite, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
