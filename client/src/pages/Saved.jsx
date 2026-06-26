import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import ListingCard from '../components/ListingCard.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

export default function Saved() {
  const { ids } = useFavorites();
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Re-fetch whenever the favourite set changes (e.g. unhearting from this page).
  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get('/users/me/favorites')
      .then(({ data }) => active && setListings(data.listings || []))
      .catch((err) => active && setError(apiError(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ids]);

  return (
    <div>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>Saved items</h1>
      </div>
      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="empty">
          <div className="big-icon">♡</div>
          <h2>No saved items yet</h2>
          <p className="muted">
            Tap the heart on any listing to save it here.{' '}
            <Link to="/">Browse components</Link>.
          </p>
        </div>
      ) : (
        <div className="grid">
          {listings.map((l, i) => (
            <ListingCard key={l._id} listing={l} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
