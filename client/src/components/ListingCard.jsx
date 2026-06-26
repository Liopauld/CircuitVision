import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { categoryLabel, peso } from '../constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

const PLACEHOLDER = 'https://placehold.co/600x450/0a1a13/e8b765?text=No+Image';

// Reference-designator prefix per category, like a real schematic: dev boards
// are ICs (U), the rest get plausible passives so the board reads varied.
const REFDES_PREFIX = { esp32: 'U', raspi: 'U', arduino: 'U' };

export default function ListingCard({ listing, index = 0 }) {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const img = listing.cloudinaryUrl?.[0] || PLACEHOLDER;
  const refdes = `${REFDES_PREFIX[listing.category] || 'U'}${index + 1}`;
  const faved = isFavorite(listing._id);

  function onHeart(e) {
    // The card is a link — don't navigate when toggling the wishlist.
    e.preventDefault();
    e.stopPropagation();
    toggle(listing._id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link to={`/listings/${listing._id}`} className="listing-card">
        <span className="refdes">{refdes}</span>
        <span className="pad bl" />
        <span className="pad br" />
        <div className="img-wrap">
          <span className={`badge cat-${listing.category}`}>
            {categoryLabel(listing.category)}
          </span>
          {listing.soldCount > 0 && (
            <span className="badge sold-badge">🔥 {listing.soldCount} sold</span>
          )}
          {user && (
            <button
              type="button"
              className={`fav-btn ${faved ? 'on' : ''}`}
              onClick={onHeart}
              aria-label={faved ? 'Remove from wishlist' : 'Save to wishlist'}
              aria-pressed={faved}
            >
              {faved ? '♥' : '♡'}
            </button>
          )}
          <img src={img} alt={listing.title} loading="lazy" />
        </div>
        <div className="listing-card-body">
          <h3>{listing.title}</h3>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span className="price">{peso(listing.price)}</span>
            <span className={`status-tag status-${listing.status}`}>
              {listing.status}
            </span>
          </div>
          <p className="muted small" style={{ marginTop: '0.35rem' }}>
            {listing.condition} · {listing.quantity} in stock
            {listing.sellerId?.ratingCount > 0 && (
              <> · ⭐ {listing.sellerId.ratingAvg}</>
            )}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
