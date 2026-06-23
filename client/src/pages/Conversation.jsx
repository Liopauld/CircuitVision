import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMessages } from '../context/MessagesContext.jsx';

export default function Conversation() {
  const { id } = useParams();
  const { user } = useAuth();
  const { refreshUnread } = useMessages();
  const [thread, setThread] = useState(null); // { conversation, messages }
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/messages/conversations/${id}`);
      setThread(data);
      refreshUnread(); // opening the thread marked it read on the server
    } catch (err) {
      setError(apiError(err));
    }
  }, [id, refreshUnread]);

  // Initial load + light polling so a reply shows up without a manual refresh.
  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  // Keep the latest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  async function send(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      await api.post(`/messages/conversations/${id}`, { body: text });
      setBody('');
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSending(false);
    }
  }

  if (error && !thread) return <p className="error">{error}</p>;
  if (!thread)
    return (
      <div className="centered">
        <div className="spinner" />
      </div>
    );

  const { conversation, messages } = thread;

  return (
    <div className="thread">
      <div className="thread-head">
        <Link to="/messages" className="muted small">
          ←
        </Link>
        <span className="conv-avatar sm">
          {(conversation.other?.name || '?').charAt(0).toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="conv-name">{conversation.other?.name || 'Unknown'}</div>
          {conversation.listingId && (
            <Link
              to={`/listings/${conversation.listingId}`}
              className="muted small"
            >
              {conversation.listingTitle || 'View listing'}
            </Link>
          )}
        </div>
      </div>

      <div className="bubbles">
        {messages.length === 0 ? (
          <p className="muted small" style={{ textAlign: 'center', padding: '2rem 0' }}>
            Say hello 👋
          </p>
        ) : (
          messages.map((m) => {
            const mine = String(m.senderId) === user.id;
            return (
              <div key={m._id} className={`bubble ${mine ? 'mine' : 'theirs'}`}>
                <div className="bubble-body">{m.body}</div>
                <div className="bubble-ts">
                  {new Date(m.createdAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="error">{error}</p>}

      <form className="composer" onSubmit={send}>
        <input
          type="text"
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
        />
        <button className="btn" type="submit" disabled={sending || !body.trim()}>
          {sending ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
