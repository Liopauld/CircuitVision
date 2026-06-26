import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const FavoritesContext = createContext(null);

// Tracks the set of listing ids the current user has wishlisted, for the heart
// toggle on cards and the Saved page badge. Seeded from the authenticated
// user's `favorites` (returned by /auth/me); toggles update optimistically.
export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => new Set());

  useEffect(() => {
    setIds(new Set((user?.favorites || []).map(String)));
  }, [user]);

  const isFavorite = useCallback((listingId) => ids.has(String(listingId)), [ids]);

  const toggle = useCallback(
    async (listingId) => {
      if (!user) return;
      const id = String(listingId);
      const adding = !ids.has(id);
      // Optimistic update.
      setIds((prev) => {
        const next = new Set(prev);
        if (adding) next.add(id);
        else next.delete(id);
        return next;
      });
      try {
        if (adding) await api.post(`/users/me/favorites/${id}`);
        else await api.delete(`/users/me/favorites/${id}`);
      } catch {
        // Roll back on failure.
        setIds((prev) => {
          const next = new Set(prev);
          if (adding) next.delete(id);
          else next.add(id);
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
