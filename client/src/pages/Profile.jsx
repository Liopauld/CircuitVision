import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { categoryLabel, peso, LISTING_STATUSES } from '../constants.js';

export default function Profile() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const canSell = user.role === 'seller' || user.role === 'admin';

  const load = useCallback(async () => {
    if (!canSell) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/listings/mine');
      setListings(data.listings);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [canSell]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id, status) {
    try {
      await api.patch(`/listings/${id}`, { status });
      setListings((prev) => prev.map((l) => (l._id === id ? { ...l, status } : l)));
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function repost(id) {
    try {
      const { data } = await api.post(`/listings/${id}/repost`);
      setListings((prev) => prev.map((l) => (l._id === id ? data.listing : l)));
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this listing? It will be hidden from buyers and removed from your listings.')) {
      return;
    }
    try {
      await api.delete(`/listings/${id}`);
      setListings((prev) => prev.filter((l) => l._id !== id));
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div>
      <div className="panel" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span
          className="avatar"
          style={{
            width: 56,
            height: 56,
            fontSize: '1.4rem',
            backgroundImage: user.avatarUrl ? `url(${user.avatarUrl})` : undefined,
            borderColor: user.accentColor || undefined,
          }}
        >
          {!user.avatarUrl && user.name.charAt(0).toUpperCase()}
        </span>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>{user.name}</h1>
          <p className="muted" style={{ margin: '0.2rem 0' }}>
            {user.email} ·{' '}
            <span className="status-tag status-available" style={{ textTransform: 'capitalize' }}>
              {user.role}
            </span>
            {user.ratingCount > 0 && (
              <> · ⭐ {user.ratingAvg} ({user.ratingCount})</>
            )}
          </p>
          {user.bio && <p style={{ margin: '0.3rem 0 0' }}>{user.bio}</p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <Link to="/profile/edit" className="btn ghost sm">
            ✎ Edit
          </Link>
          <Link to="/wallet" className="btn ghost sm">
            {peso(user.walletBalance)}
          </Link>
        </div>
      </div>

      {canSell ? (
        <>
          <div className="section-head">
            <h2>My listings</h2>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <Link to="/dashboard" className="btn ghost sm">
                📊 Dashboard
              </Link>
              <Link to="/create" className="btn sm">
                + New
              </Link>
            </div>
          </div>
          {error && <p className="error">{error}</p>}
          {loading ? (
            <div className="spinner" />
          ) : listings.length === 0 ? (
            <div className="empty">
              <div className="big-icon">📦</div>
              <p className="muted">
                No listings yet. <Link to="/create">Create your first</Link>.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l._id}>
                      <td>
                        <img
                          className="thumb"
                          src={l.cloudinaryUrl?.[0] || 'https://placehold.co/80x60/0b1120/22d3ee?text=—'}
                          alt={l.title}
                        />
                      </td>
                      <td>
                        <Link to={`/listings/${l._id}`}>{l.title}</Link>
                      </td>
                      <td>{categoryLabel(l.category)}</td>
                      <td className="mono">{peso(l.price)}</td>
                      <td>
                        <select
                          value={l.status}
                          onChange={(e) => changeStatus(l._id, e.target.value)}
                          style={{ width: 'auto', marginTop: 0 }}
                        >
                          {LISTING_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {l.status === 'available' &&
                          l.expiresAt &&
                          new Date(l.expiresAt) < new Date() && (
                            <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <span className="status-tag status-rejected">expired</span>
                              <button className="btn sm" onClick={() => repost(l._id)}>
                                Repost
                              </button>
                            </div>
                          )}
                      </td>
                      <td className="mono">{l.viewCount}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <Link to={`/listings/${l._id}/edit`} className="btn ghost sm">
                            Edit
                          </Link>
                          <button
                            className="btn ghost sm danger"
                            onClick={() => remove(l._id)}
                            disabled={l.status === 'reserved'}
                            title={
                              l.status === 'reserved'
                                ? 'An order is in progress on this listing.'
                                : 'Delete listing'
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="empty">
          <div className="big-icon">🛍️</div>
          <h2>You're a customer</h2>
          <p className="muted">
            Browse components and track purchases in <Link to="/orders">Orders</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
