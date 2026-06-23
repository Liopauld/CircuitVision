import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const MessagesContext = createContext(null);

// Tracks the total unread-message count for the badge in the nav/tab bar.
// Polls lightly while logged in; `refreshUnread` lets pages force a refresh
// (e.g. right after opening a thread marks it read).
export function MessagesProvider({ children }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnread(0);
      return;
    }
    try {
      const { data } = await api.get('/messages/unread-count');
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
    <MessagesContext.Provider value={{ unread, refreshUnread }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider');
  return ctx;
}
