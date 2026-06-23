import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { peso, ORDER_LABELS } from '../constants.js';

export default function Orders() {
  const { user } = useAuth();
  const canSell = user.role === 'seller' || user.role === 'admin';
  const [view, setView] = useState('buyer');
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (role) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/orders', { params: { role } });
      setOrders(data.orders);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(view);
  }, [view, load]);

  return (
    <div>
      <h1>Orders</h1>

      {canSell && (
        <div className="tabs">
          <button
            className={`tab-btn ${view === 'buyer' ? 'active' : ''}`}
            onClick={() => setView('buyer')}
          >
            Purchases
          </button>
          <button
            className={`tab-btn ${view === 'seller' ? 'active' : ''}`}
            onClick={() => setView('seller')}
          >
            Sales
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="spinner" />
      ) : orders.length === 0 ? (
        <div className="empty">
          <div className="big-icon">📭</div>
          <p className="muted">
            {view === 'seller' ? 'No sales yet.' : 'No purchases yet.'}{' '}
            {view === 'buyer' && <Link to="/">Browse components</Link>}
          </p>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((o) => (
            <Link to={`/orders/${o._id}`} className="order-item" key={o._id}>
              <img
                className="order-thumb"
                src={o.imageSnapshot || 'https://placehold.co/80x60/0b1120/22d3ee?text=—'}
                alt={o.titleSnapshot}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{o.titleSnapshot}</div>
                <div className="muted small">
                  {view === 'seller'
                    ? `Buyer: ${o.buyerId?.name || '—'}`
                    : `Seller: ${o.sellerId?.name || '—'}`}{' '}
                  · {o.quantity} × {peso(o.unitPrice)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="price">{peso(o.amountReserved)}</div>
                <span className="status-tag status-reserved" style={{ marginTop: 4 }}>
                  {ORDER_LABELS[o.status] || o.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
