import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { peso, ORDER_LABELS, ORDER_STEPS, availableActions } from '../constants.js';

export default function OrderDetail() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.order);
    } catch (err) {
      setError(apiError(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !order) return <p className="error">{error}</p>;
  if (!order) return <div className="centered"><div className="spinner" /></div>;

  // Resolve viewer's relationship to this order.
  const viewerRole =
    user.role === 'admin'
      ? 'admin'
      : order.buyerId?._id === user.id
      ? 'buyer'
      : 'seller';
  const actions = availableActions(order, viewerRole);

  async function act(action) {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/orders/${id}/actions`, { action });
      setOrder(data.order);
      await refreshUser(); // wallet may have changed
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  const currentStep = ORDER_STEPS.indexOf(order.status);
  const isTerminal = ['cancelled', 'disputed'].includes(order.status);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Link to="/orders" className="muted small">
        ← Back to orders
      </Link>

      <div className="panel" style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <img
          className="order-thumb"
          style={{ width: 80, height: 64 }}
          src={order.imageSnapshot || 'https://placehold.co/80x60/0b1120/22d3ee?text=—'}
          alt={order.titleSnapshot}
        />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.2rem', margin: 0 }}>{order.titleSnapshot}</h1>
          <p className="muted small" style={{ margin: '0.3rem 0' }}>
            {order.quantity} × {peso(order.unitPrice)} ·{' '}
            {order.fulfillment === 'shipping' ? 'Shipping' : 'Campus pickup'}
          </p>
          <span
            className={`status-tag ${isTerminal ? 'status-sold' : 'status-reserved'}`}
          >
            {ORDER_LABELS[order.status] || order.status}
          </span>
        </div>
        <div className="price">{peso(order.amountReserved)}</div>
      </div>

      {error && <p className="error" style={{ marginTop: '1rem' }}>{error}</p>}

      {/* Progress */}
      {!isTerminal && (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <ol className="timeline">
            {ORDER_STEPS.map((step, i) => (
              <li
                key={step}
                style={{ opacity: i <= currentStep ? 1 : 0.4 }}
              >
                <div style={{ fontWeight: i === currentStep ? 700 : 500 }}>
                  {ORDER_LABELS[step]}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
          {actions.map((a) => (
            <button
              key={a.action}
              className={a.kind}
              onClick={() => act(a.action)}
              disabled={busy}
              style={{ flex: 1 }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* History */}
      <div className="section-head">
        <h2 style={{ fontSize: '1.05rem' }}>Activity</h2>
      </div>
      <ul className="timeline">
        {order.statusHistory
          ?.slice()
          .reverse()
          .map((h, i) => (
            <li key={i}>
              <div>{ORDER_LABELS[h.status] || h.status}</div>
              <div className="ts">
                {h.note} · {new Date(h.at).toLocaleString()}
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}
