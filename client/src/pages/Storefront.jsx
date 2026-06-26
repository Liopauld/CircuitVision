import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import ListingCard from '../components/ListingCard.jsx';

export default function Storefront() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    api
      .get(`/users/${id}/storefront`)
      .then(({ data }) => active && setData(data))
      .catch((err) => active && setError(apiError(err)));
    api
      .get(`/reviews/seller/${id}`)
      .then(({ data }) => active && setReviews(data.reviews || []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <div className="spinner" />;

  const { seller, listings } = data;
  const memberSince = new Date(seller.createdAt).toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div>
      <div
        className="panel storefront-hero"
        style={seller.accentColor ? { borderColor: seller.accentColor } : undefined}
      >
        <span
          className="avatar avatar-lg"
          style={{
            backgroundImage: seller.avatarUrl ? `url(${seller.avatarUrl})` : undefined,
            borderColor: seller.accentColor || undefined,
          }}
        >
          {!seller.avatarUrl && seller.name.charAt(0).toUpperCase()}
        </span>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>{seller.name}</h1>
          <p className="muted" style={{ margin: '0.25rem 0' }}>
            {seller.ratingCount > 0 ? (
              <>⭐ {seller.ratingAvg} · {seller.ratingCount} review(s)</>
            ) : (
              'No reviews yet'
            )}{' '}
            · Member since {memberSince}
          </p>
          {seller.bio && <p style={{ margin: '0.4rem 0 0' }}>{seller.bio}</p>}
        </div>
      </div>

      <div className="section-head">
        <h2>Available listings ({listings.length})</h2>
      </div>
      {listings.length === 0 ? (
        <div className="empty">
          <div className="big-icon">📦</div>
          <p className="muted">This seller has no available listings right now.</p>
        </div>
      ) : (
        <div className="grid">
          {listings.map((l, i) => (
            <ListingCard key={l._id} listing={l} index={i} />
          ))}
        </div>
      )}

      {reviews.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: '1.4rem' }}>
            <h2>Recent reviews</h2>
          </div>
          {reviews.slice(0, 8).map((r) => (
            <div className="panel" key={r._id} style={{ marginBottom: '0.6rem' }}>
              <strong>{'★'.repeat(r.rating)}</strong>
              <span className="muted small"> · {r.buyerId?.name || 'Buyer'}</span>
              {r.comment && <p style={{ margin: '0.3rem 0 0' }}>{r.comment}</p>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
