import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { categoryLabel, peso } from '../constants.js';

const PLACEHOLDER = 'https://placehold.co/600x450/0b1120/22d3ee?text=No+Image';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [listing, setListing] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [fulfillment, setFulfillment] = useState('pickup');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setError('');
      try {
        const { data } = await api.get(`/listings/${id}`);
        if (!active) return;
        setListing(data.listing);
        const rel = await api.get('/listings', {
          params: { category: data.listing.category },
        });
        if (active) {
          setRelated(rel.data.listings.filter((l) => l._id !== id).slice(0, 4));
        }
      } catch (err) {
        if (active) setError(apiError(err));
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  async function buy() {
    if (!user) return navigate('/login', { state: { from: `/listings/${id}` } });
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/orders', {
        listingId: id,
        quantity: qty,
        fulfillment,
      });
      await refreshUser();
      navigate(`/orders/${data.order._id}`);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !listing) return <p className="error">{error}</p>;
  if (!listing) return <div className="centered"><div className="spinner" /></div>;

  const isOwner = user && listing.sellerId?._id === user.id;
  const isAdmin = user?.role === 'admin';
  const canBuy = listing.status === 'available' && !isOwner && !isAdmin;
  const total = listing.price * qty;

  return (
    <div className="detail">
      <div className="detail-gallery">
        {(listing.cloudinaryUrl?.length ? listing.cloudinaryUrl : [PLACEHOLDER]).map(
          (url, i) => (
            <img key={i} src={url} alt={`${listing.title} ${i + 1}`} />
          )
        )}
      </div>

      <div className="detail-info">
        <span className={`badge cat-${listing.category}`} style={{ position: 'static' }}>
          {categoryLabel(listing.category)}
        </span>
        <h1 style={{ margin: '0.7rem 0' }}>{listing.title}</h1>
        <p className="price big">{peso(listing.price)}</p>
        <p className="muted" style={{ marginTop: '0.4rem' }}>
          <span className={`status-tag status-${listing.status}`}>
            {listing.status}
          </span>{' '}
          · {listing.condition} · {listing.quantity} in stock
          {listing.sellerId?.name && <> · Sold by {listing.sellerId.name}</>}
        </p>

        {listing.description && (
          <p className="description" style={{ marginTop: '1rem' }}>
            {listing.description}
          </p>
        )}

        {listing.specs && Object.keys(listing.specs).length > 0 && (
          <ul className="specs">
            {Object.entries(listing.specs).map(([k, v]) => (
              <li key={k}>
                <span>{k}</span>
                <span>{String(v)}</span>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="error" style={{ marginTop: '1rem' }}>{error}</p>}

        {canBuy ? (
          <div className="panel" style={{ marginTop: '1.4rem' }}>
            <div className="row">
              <label style={{ flex: '0 0 90px' }}>
                Qty
                <input
                  type="number"
                  min="1"
                  max={listing.quantity}
                  value={qty}
                  onChange={(e) =>
                    setQty(Math.max(1, Math.min(listing.quantity, Number(e.target.value))))
                  }
                />
              </label>
              <label style={{ flex: 1 }}>
                Fulfillment
                <select value={fulfillment} onChange={(e) => setFulfillment(e.target.value)}>
                  <option value="pickup">Campus pickup</option>
                  <option value="shipping">Shipping</option>
                </select>
              </label>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '0.5rem 0 0.9rem',
              }}
            >
              <span className="muted">Total (held from wallet)</span>
              <span className="price">{peso(total)}</span>
            </div>
            <button className="btn full" onClick={buy} disabled={busy}>
              {busy ? 'Placing order…' : 'Buy now'}
            </button>
            {user && (
              <p className="muted small" style={{ marginTop: '0.6rem', textAlign: 'center' }}>
                Wallet balance: {peso(user.walletBalance)} ·{' '}
                <Link to="/wallet">Top up</Link>
              </p>
            )}
          </div>
        ) : (
          <p className="muted" style={{ marginTop: '1.4rem' }}>
            {isOwner
              ? 'This is your listing.'
              : isAdmin
              ? 'Admins manage listings rather than purchase them.'
              : 'This item is not currently available.'}
          </p>
        )}
      </div>

      {related.length > 0 && (
        <div className="related">
          <div className="section-head">
            <h2>More in {categoryLabel(listing.category)}</h2>
          </div>
          <div className="grid">
            {related.map((l, i) => (
              <ListingMini key={l._id} listing={l} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ListingMini({ listing }) {
  return (
    <Link to={`/listings/${listing._id}`} className="listing-card">
      <div className="img-wrap">
        <img
          src={listing.cloudinaryUrl?.[0] || PLACEHOLDER}
          alt={listing.title}
          loading="lazy"
        />
      </div>
      <div className="listing-card-body">
        <h3>{listing.title}</h3>
        <span className="price">{peso(listing.price)}</span>
      </div>
    </Link>
  );
}
