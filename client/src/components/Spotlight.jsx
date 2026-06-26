import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { categoryLabel, peso } from '../constants.js';

const PLACEHOLDER = 'https://placehold.co/800x600/0a1a13/e8b765?text=CircuitVision';
const ROTATE_MS = 5000;

// Big, auto-advancing hero showcase of featured products. Pauses on hover and
// respects prefers-reduced-motion (no auto-rotation, no slide animation).
export default function Spotlight({ items = [] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ).current;

  const count = items.length;
  const go = useCallback((next) => setIndex((i) => (next + count) % count), [count]);

  useEffect(() => {
    if (paused || reduceMotion || count <= 1) return undefined;
    const t = setTimeout(() => go(index + 1), ROTATE_MS);
    return () => clearTimeout(t);
  }, [index, paused, reduceMotion, count, go]);

  if (count === 0) return null;
  const item = items[index];
  const img = item.cloudinaryUrl?.[0] || PLACEHOLDER;
  const tag = item.soldCount > 0 ? `🔥 ${item.soldCount} sold` : '✨ Featured';

  return (
    <section
      className="spotlight"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={item._id}
          className="spotlight-slide"
          initial={reduceMotion ? false : { opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="spotlight-media">
            <img src={img} alt={item.title} />
            <span className="spotlight-tag">{tag}</span>
          </div>
          <div className="spotlight-body">
            <span className={`badge cat-${item.category}`} style={{ position: 'static' }}>
              {categoryLabel(item.category)}
            </span>
            <h2>{item.title}</h2>
            {item.sellerId?.name && (
              <p className="muted small">Sold by {item.sellerId.name}</p>
            )}
            <div className="spotlight-price">{peso(item.price)}</div>
            <Link to={`/listings/${item._id}`} className="btn">
              View component →
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <>
          <button
            className="spotlight-arrow left"
            aria-label="Previous"
            onClick={() => go(index - 1)}
          >
            ‹
          </button>
          <button
            className="spotlight-arrow right"
            aria-label="Next"
            onClick={() => go(index + 1)}
          >
            ›
          </button>
          <div className="spotlight-dots">
            {items.map((it, i) => (
              <button
                key={it._id}
                className={`spotlight-dot ${i === index ? 'active' : ''}`}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
