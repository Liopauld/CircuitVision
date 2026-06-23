import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../api/client.js';

// Compact relative timestamp for the conversation list.
function when(date) {
  if (!date) return '';
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString();
}

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await api.get('/messages/conversations');
        if (active) setConversations(data.conversations);
      } catch (err) {
        if (active) setError(apiError(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1>Messages</h1>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="spinner" />
      ) : conversations.length === 0 ? (
        <div className="empty">
          <div className="big-icon">💬</div>
          <p className="muted">
            No conversations yet. Message a seller from any listing to start one.
          </p>
        </div>
      ) : (
        <div className="conv-list">
          {conversations.map((c) => (
            <Link to={`/messages/${c.id}`} className="conv-item" key={c.id}>
              <span className="conv-avatar">
                {(c.other?.name || '?').charAt(0).toUpperCase()}
              </span>
              <div className="conv-main">
                <div className="conv-top">
                  <span className="conv-name">{c.other?.name || 'Unknown'}</span>
                  <span className="conv-time">{when(c.lastMessageAt)}</span>
                </div>
                {c.listingTitle && (
                  <div className="conv-listing">re: {c.listingTitle}</div>
                )}
                <div className="conv-preview">
                  {c.lastMessage || 'No messages yet.'}
                </div>
              </div>
              {c.unread > 0 && <span className="conv-unread">{c.unread}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
