import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const NotificationsContext = createContext(null);

// Tracks the unread in-app notification count for the nav badge. Polls lightly
// while logged in; `refreshUnread` lets pages force a refresh (e.g. after the
// notifications page marks everything read).
export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnread(0);
      return;
    }
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnread(data.count || 0);
    } catch {
      /* non-critical; interceptor handles 401 */
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    refreshUnread();
    const id = setInterval(refreshUnread, 25000);
    return () => clearInterval(id);
  }, [user, refreshUnread]);

  return (
    <NotificationsContext.Provider value={{ unread, refreshUnread }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
