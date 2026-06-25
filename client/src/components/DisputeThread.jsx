import { useState } from 'react';

// Renders a dispute's message thread plus a compose box. Presentational —
// the parent owns the data (messages) and the send handler. `selfId` is the
// current user's id so own messages align right.
export default function DisputeThread({ messages, selfId, onSend, disabled }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      await onSend(text);
      setBody('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="dispute-thread">
        {messages.length === 0 && (
          <p className="muted small">No messages yet.</p>
        )}
        {messages.map((m) => {
          const sender = m.senderId || {};
          const mine = String(sender._id || sender) === selfId;
          return (
            <div
              key={m._id}
              className={`dispute-msg ${mine ? 'mine' : ''}`}
            >
              <div className="muted small">
                {sender.name || 'User'}
                {sender.role === 'admin' && ' · admin'} ·{' '}
                {new Date(m.createdAt).toLocaleString()}
              </div>
              <div>{m.body}</div>
            </div>
          );
        })}
      </div>

      {!disabled && (
        <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message…"
            style={{ flex: 1 }}
          />
          <button className="btn sm" disabled={busy || !body.trim()}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}
