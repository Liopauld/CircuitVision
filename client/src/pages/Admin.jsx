import { useCallback, useEffect, useState } from 'react';
import { api, apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  categoryLabel,
  peso,
  ORDER_LABELS,
  TX_META,
  DISPUTE_STATUS_LABELS,
  DISPUTE_RESOLUTIONS,
  resolutionLabel,
} from '../constants.js';
import DisputeThread from '../components/DisputeThread.jsx';

const TABS = ['Overview', 'Moderation', 'Users', 'Orders', 'Disputes', 'Activity'];

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
      {tab === 'Disputes' && <Disputes />}
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

      <div className="panel" style={{ flexBasis: '100%', marginTop: '0.6rem' }}>
        <h3 style={{ marginTop: 0 }}>Revenue · last 7 days</h3>
        <PlatformTrend trend={data.revenueTrend || []} />
      </div>

      {data.topSellers?.length > 0 && (
        <div className="panel" style={{ flexBasis: '100%' }}>
          <h3 style={{ marginTop: 0 }}>Top sellers</h3>
          {data.topSellers.map((s, i) => (
            <div
              key={s.sellerId}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}
            >
              <span>
                {i + 1}. {s.name} <span className="muted small">· {s.units} sold</span>
              </span>
              <span className="mono">{peso(s.revenue)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlatformTrend({ trend }) {
  const peak = Math.max(1, ...trend.map((d) => d.revenue));
  if (!trend.some((d) => d.revenue > 0)) {
    return <p className="muted">No completed sales in the last 7 days.</p>;
  }
  return (
    <div className="bar-chart">
      {trend.map((d) => (
        <div className="bar-col" key={d.date} title={`${d.date}: ${peso(d.revenue)}`}>
          <div className="bar-track">
            <div className="bar-fill" style={{ height: `${Math.round((d.revenue / peak) * 100)}%` }} />
          </div>
          <span className="bar-label">{d.date.slice(5)}</span>
        </div>
      ))}
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
  async function changeRole(u, role) {
    if (role === u.role) return;
    await api.post(`/admin/users/${u.id}/role`, { role });
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
              <td>
                {u.role === 'admin' ? (
                  <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
                ) : (
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u, e.target.value)}
                    style={{ width: 'auto', marginTop: 0 }}
                  >
                    <option value="customer">customer</option>
                    <option value="seller">seller</option>
                  </select>
                )}
              </td>
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

function Disputes() {
  const { data, error, reload } = useFetch('/disputes');
  if (error) return <p className="error">{error}</p>;
  if (!data) return <div className="spinner" />;
  if (data.disputes.length === 0)
    return (
      <div className="empty">
        <div className="big-icon">🤝</div>
        <p className="muted">No disputes. Everyone's getting along.</p>
      </div>
    );
  return (
    <div className="order-list">
      {data.disputes.map((d) => (
        <DisputeCard key={d._id} dispute={d} onResolved={reload} />
      ))}
    </div>
  );
}

function DisputeCard({ dispute, onResolved }) {
  const { user } = useAuth();
  const order = dispute.orderId || {};
  const closed = dispute.status === 'resolved' || dispute.status === 'rejected';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [resolution, setResolution] = useState('refund');
  const [refundAmount, setRefundAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadThread = useCallback(async () => {
    if (!order._id) return;
    try {
      const { data } = await api.get(`/disputes/order/${order._id}`);
      setMessages(data.messages);
    } catch (err) {
      setError(apiError(err));
    }
  }, [order._id]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) loadThread();
  }

  async function sendMessage(body) {
    const { data } = await api.post(`/disputes/${dispute._id}/messages`, { body });
    setMessages((prev) => [...prev, data.message]);
  }

  async function resolve() {
    setBusy(true);
    setError('');
    try {
      await api.post(`/disputes/${dispute._id}/resolve`, {
        resolution,
        refundAmount: resolution === 'partial' ? Number(refundAmount) : undefined,
        note: note.trim() || undefined,
      });
      onResolved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ display: 'block' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{order.titleSnapshot || 'Order'}</div>
          <div className="muted small">
            {order.buyerId?.name} → {order.sellerId?.name} ·{' '}
            {peso(order.amountReserved)} · raised by {dispute.raisedBy?.name}
          </div>
        </div>
        <span
          className={`status-tag ${
            dispute.status === 'resolved'
              ? 'status-available'
              : dispute.status === 'rejected'
              ? 'status-rejected'
              : 'status-reserved'
          }`}
        >
          {DISPUTE_STATUS_LABELS[dispute.status] || dispute.status}
        </span>
        <button className="btn sm ghost" onClick={toggle}>
          {open ? 'Hide' : 'Review'}
        </button>
      </div>

      <p className="muted small" style={{ margin: '0.5rem 0 0' }}>
        “{dispute.reason}”
      </p>

      {closed && (
        <div className="callout" style={{ marginTop: '0.5rem' }}>
          <strong>Outcome:</strong> {resolutionLabel(dispute.resolution)}
          {dispute.refundAmount > 0 && ` · ${peso(dispute.refundAmount)} refunded`}
        </div>
      )}

      {open && (
        <div style={{ marginTop: '0.8rem' }}>
          {error && <p className="error">{error}</p>}
          <DisputeThread
            messages={messages}
            selfId={user.id}
            onSend={sendMessage}
            disabled={false}
          />

          {!closed && (
            <div className="panel" style={{ display: 'block', marginTop: '0.8rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Resolve</div>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                style={{ width: '100%' }}
              >
                {DISPUTE_RESOLUTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {resolution === 'partial' && (
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`Refund amount (max ${order.amountReserved - 1})`}
                  style={{ width: '100%', marginTop: '0.5rem' }}
                />
              )}
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Closing note (optional)"
                style={{ width: '100%', marginTop: '0.5rem' }}
              />
              <button
                className="btn full"
                onClick={resolve}
                disabled={busy}
                style={{ marginTop: '0.6rem' }}
              >
                Apply resolution
              </button>
            </div>
          )}
        </div>
      )}
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
