import { useCallback, useEffect, useRef, useState } from 'react';
import { api, apiError } from '../api/client.js';
import { gsap, useGSAP } from '../lib/gsap.js';
import Filters from '../components/Filters.jsx';
import ListingCard from '../components/ListingCard.jsx';
import Carousel from '../components/Carousel.jsx';
import { CATEGORIES } from '../constants.js';

const EMPTY = { q: '', condition: '', minPrice: '', maxPrice: '' };

export default function Browse() {
  const heroRef = useRef(null);
  const [filters, setFilters] = useState(EMPTY);
  const [category, setCategory] = useState('');
  const [listings, setListings] = useState([]);
  const [highlights, setHighlights] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Curated rows (best sellers / trending) only make sense on the untouched
  // catalog view; once the user searches or filters we show plain results.
  const isDefaultView =
    !category && !Object.values(filters).some((v) => v !== '');

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      );
      if (category) params.category = category;
      const { data } = await api.get('/listings', { params });
      setListings(data.listings);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [filters, category]);

  // Active search: refetch shortly after the user stops typing or changes a
  // filter/category (also runs the initial load on mount). The debounce keeps
  // us from firing a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(fetchListings, 300);
    return () => clearTimeout(t);
  }, [fetchListings]);

  // Catalog highlights — fetched once; failures are non-fatal (just hide the
  // rows) so the main grid still works.
  useEffect(() => {
    api
      .get('/listings/highlights')
      .then(({ data }) => setHighlights(data))
      .catch(() => setHighlights(null));
  }, []);

  // Hero entrance — staggered reveal of the headline + category chips on mount.
  // matchMedia disables motion for users who prefer reduced motion.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // matchMedia owns its own context, so revert it explicitly on unmount.
      // eslint-disable-next-line consistent-return
      mm.add(
        {
          animate: '(prefers-reduced-motion: no-preference)',
          reduce: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          if (ctx.conditions.reduce) return; // leave everything at its natural state
          gsap
            .timeline()
            .from('.hero .kicker', { autoAlpha: 0, y: 12 })
            .from('.hero h1', { autoAlpha: 0, y: 20 }, '-=0.35')
            .from('.hero p', { autoAlpha: 0, y: 16 }, '-=0.4')
            .from(
              '.cat-chips .chip',
              { autoAlpha: 0, y: 12, stagger: 0.06 },
              '-=0.3'
            );
        },
        heroRef
      );
      return () => mm.revert();
    },
    { scope: heroRef }
  );

  function pickCategory(cat) {
    // The debounced effect picks up the change and refetches.
    setCategory((prev) => (prev === cat ? '' : cat));
  }

  return (
    <div ref={heroRef}>
      <header className="hero">
        <span className="kicker">⚡ ESP32 · Raspberry Pi · Arduino</span>
        <h1>
          Buy & sell components,
          <br />
          <span className="grad">student to student.</span>
        </h1>
        <p>
          A campus marketplace for microcontrollers, dev boards, and modules —
          scan-free listings, mock-wallet checkout, and verified sellers.
        </p>
      </header>

      <div className="cat-chips">
        <button
          className={`chip ${category === '' ? 'active' : ''}`}
          onClick={() => pickCategory('')}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            className={`chip ${category === c.value ? 'active' : ''}`}
            onClick={() => pickCategory(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <Filters value={filters} onChange={setFilters} />

      {error && <p className="error">{error}</p>}

      {isDefaultView && highlights?.bestSellers?.length > 0 && (
        <Carousel title="Best sellers" icon="🏆" hint="Most-bought components on campus">
          {highlights.bestSellers.map((l, i) => (
            <ListingCard key={l._id} listing={l} index={i} />
          ))}
        </Carousel>
      )}

      {isDefaultView && highlights?.trending?.length > 0 && (
        <Carousel title="Trending now" icon="📈" hint="Catching the most eyes right now">
          {highlights.trending.map((l, i) => (
            <ListingCard key={l._id} listing={l} index={i} />
          ))}
        </Carousel>
      )}

      {isDefaultView && (
        <h2 className="section-title">All components</h2>
      )}

      {loading ? (
        <div className="grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="empty">
          <div className="big-icon">🔌</div>
          <h2>No components found</h2>
          <p className="muted">Try a different category or widen your filters.</p>
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
