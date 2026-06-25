import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { useNotifications } from '../context/NotificationsContext.jsx';

const ICON = { order: '📦', message: '💬', review: '⭐', dispute: '⚠️' };

export default function Notifications() {
  const navigate = useNavigate();
  const { refreshUnread } = useNotifications();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.notifications);
      // Opening this page marks everything read.
      await api.post('/notifications/read');
      refreshUnread();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [refreshUnread]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="centered"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="section-head">
        <h1 style={{ fontSize: '1.3rem' }}>Notifications</h1>
      </div>
      {error && <p className="error">{error}</p>}
      {items.length === 0 ? (
        <div className="empty">
          <div className="big-icon">🔔</div>
          <p className="muted">You're all caught up.</p>
        </div>
      ) : (
        <div className="order-list">
          {items.map((n) => (
            <button
              key={n._id}
              className="order-item"
              style={{
                textAlign: 'left',
                cursor: n.link ? 'pointer' : 'default',
                opacity: n.readAt ? 0.7 : 1,
              }}
              onClick={() => n.link && navigate(n.link)}
            >
              <span style={{ fontSize: '1.4rem' }}>{ICON[n.type] || '🔔'}</span>
              <div style={{ flex: 1 }}>
                <div>{n.message}</div>
                <div className="muted small">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
              {!n.readAt && <span className="nav-badge" style={{ position: 'static' }}>new</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
