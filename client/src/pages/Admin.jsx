import { useCallback, useEffect, useState } from 'react';
import { api, apiError } from '../api/client.js';
import { categoryLabel, peso, ORDER_LABELS, TX_META } from '../constants.js';

const TABS = ['Overview', 'Moderation', 'Users', 'Orders', 'Activity'];

export default function Admin() {
  const [tab, setTab] = useState('Overview');
  return (
    <div>
      <h1>Admin console</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Overview' && <Overview />}
      {tab === 'Moderation' && <Moderation />}
      {tab === 'Users' && <Users />}
      {tab === 'Orders' && <AdminOrders />}
      {tab === 'Activity' && <Activity />}
    </div>
  );
}

function useFetch(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      setError(apiError(err));
    }
  }, [url]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, reload };
}

function Overview() {
  const { data, error } = useFetch('/admin/stats');
  if (error) return <p className="error">{error}</p>;
  if (!data) return <div className="spinner" />;
  return (
    <div className="stat-row">
      <div className="stat">
        <div className="k">Sales volume</div>
        <div className="n">{peso(data.salesVolume)}</div>
      </div>
      <div className="stat">
        <div className="k">Completed sales</div>
        <div className="n">{data.completedSales}</div>
      </div>
      <div className="stat">
        <div className="k">Active users</div>
        <div className="n">{data.activeUsers}</div>
      </div>
      <div className="stat">
        <div className="k">Pending listings</div>
        <div className="n">{data.pendingListings}</div>
      </div>
      <div className="stat" style={{ flexBasis: '100%' }}>
        <div className="k">Listings by category</div>
        <div className="n" style={{ fontSize: '1rem' }}>
          {Object.entries(data.listingsByCategory || {})
            .map(([c, n]) => `${categoryLabel(c)}: ${n}`)
            .join('  ·  ') || '—'}
        </div>
      </div>
    </div>
  );
}

function Moderation() {
  const { data, error, reload } = useFetch('/admin/listings?status=pending');
  async function decide(id, action) {
    await api.post(`/admin/listings/${id}/${action}`);
    reload();
  }
  if (error) return <p className="error">{error}</p>;
  if (!data) return <div className="spinner" />;
  if (data.listings.length === 0)
    return (
      <div className="empty">
        <div className="big-icon">✅</div>
        <p className="muted">Nothing pending. The queue is clear.</p>
      </div>
    );
  return (
    <div className="order-list">
      {data.listings.map((l) => (
        <div className="order-item" key={l._id}>
          <img
            className="order-thumb"
            src={l.cloudinaryUrl?.[0] || 'https://placehold.co/80x60/0b1120/22d3ee?text=—'}
            alt={l.title}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{l.title}</div>
            <div className="muted small">
              {categoryLabel(l.category)} · {peso(l.price)} · by {l.sellerId?.name}
            </div>
          </div>
          <button className="btn sm" onClick={() => decide(l._id, 'approve')}>
            Approve
          </button>
          <button className="btn sm ghost" onClick={() => decide(l._id, 'reject')}>
            Reject
          </button>
        </div>
      ))}
    </div>
  );
}

function Users() {
  const { data, error, reload } = useFetch('/admin/users');
  async function toggleBan(u) {
    await api.post(`/admin/users/${u.id}/ban`, { banned: !u.isBanned });
    reload();
  }
  if (error) return <p className="error">{error}</p>;
  if (!data) return <div className="spinner" />;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Wallet</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.users.map((u) => (
            <tr key={u.id}>
              <td>
                {u.name}
                <div className="muted small">{u.email}</div>
              </td>
              <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
              <td className="mono">{peso(u.walletBalance)}</td>
              <td>
                {u.isBanned ? (
                  <span className="status-tag status-rejected">banned</span>
                ) : (
                  <span className="status-tag status-available">active</span>
                )}
              </td>
              <td>
                {u.role !== 'admin' && (
                  <button
                    className={`btn sm ${u.isBanned ? '' : 'danger'}`}
                    onClick={() => toggleBan(u)}
                  >
                    {u.isBanned ? 'Unban' : 'Ban'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminOrders() {
  const { data, error } = useFetch('/admin/orders');
  if (error) return <p className="error">{error}</p>;
  if (!data) return <div className="spinner" />;
  if (data.orders.length === 0)
    return <div className="empty"><p className="muted">No orders yet.</p></div>;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Buyer</th>
            <th>Seller</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.orders.map((o) => (
            <tr key={o._id}>
              <td>{o.titleSnapshot}</td>
              <td>{o.buyerId?.name}</td>
              <td>{o.sellerId?.name}</td>
              <td className="mono">{peso(o.amountReserved)}</td>
              <td>
                <span className="status-tag status-reserved">
                  {ORDER_LABELS[o.status] || o.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Activity() {
  const { data, error } = useFetch('/admin/transactions');
  if (error) return <p className="error">{error}</p>;
  if (!data) return <div className="spinner" />;
  if (data.transactions.length === 0)
    return <div className="empty"><p className="muted">No wallet activity yet.</p></div>;
  return (
    <div className="tx-list">
      {data.transactions.map((tx) => {
        const meta = TX_META[tx.type] || { sign: '', label: tx.type };
        const positive = meta.sign === '+';
        return (
          <div className="tx-item" key={tx._id}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>
                {meta.label} · <span className="muted">{tx.userId?.name}</span>
              </div>
              <div className="muted small">
                {tx.description} · {new Date(tx.createdAt).toLocaleString()}
              </div>
            </div>
            <div className={`tx-amt ${positive ? 'pos' : 'neg'}`}>
              {meta.sign}
              {peso(tx.amount)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
