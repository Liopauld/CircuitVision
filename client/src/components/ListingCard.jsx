import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { categoryLabel, peso } from '../constants.js';

const PLACEHOLDER = 'https://placehold.co/600x450/0b1120/22d3ee?text=No+Image';

export default function ListingCard({ listing, index = 0 }) {
  const img = listing.cloudinaryUrl?.[0] || PLACEHOLDER;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link to={`/listings/${listing._id}`} className="listing-card">
        <div className="img-wrap">
          <span className={`badge cat-${listing.category}`}>
            {categoryLabel(listing.category)}
          </span>
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
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
