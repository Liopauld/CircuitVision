import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { gsap, useGSAP } from '../lib/gsap.js';
import Filters from '../components/Filters.jsx';
import ListingCard from '../components/ListingCard.jsx';
import Carousel from '../components/Carousel.jsx';
import Spotlight from '../components/Spotlight.jsx';
import ActivityTicker from '../components/ActivityTicker.jsx';
import { CATEGORIES } from '../constants.js';

// Build a deduped set of up to 5 featured listings for the hero showcase,
// preferring best sellers, then trending, then new arrivals.
function featuredFrom(h) {
  if (!h) return [];
  const seen = new Set();
  const out = [];
  for (const l of [...h.bestSellers, ...h.trending, ...h.newArrivals]) {
    if (seen.has(l._id)) continue;
    seen.add(l._id);
    out.push(l);
    if (out.length === 5) break;
  }
  return out;
}

const EMPTY = { q: '', condition: '', minPrice: '', maxPrice: '' };

export default function Browse() {
  const heroRef = useRef(null);
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(EMPTY);
  // Allow deep-linking a category (e.g. the scanner's "See all ESP32 →").
  const [category, setCategory] = useState(() => {
    const c = searchParams.get('category');
    return CATEGORIES.some((x) => x.value === c) ? c : '';
  });
  const [sort, setSort] = useState('newest');
  const [listings, setListings] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [highlights, setHighlights] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Curated rows (best sellers / trending) only make sense on the untouched
  // catalog view; once the user searches or filters we show plain results.
  const isDefaultView =
    !category && !Object.values(filters).some((v) => v !== '');
  const featured = featuredFrom(highlights);

  // Load a page of results. page 1 replaces the grid; later pages append
  // (the "Load more" button). Filters/category/sort come from the closure.
  const loadListings = useCallback(
    async (targetPage, append) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');
      try {
        const params = Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== '')
        );
        if (category) params.category = category;
        if (sort) params.sort = sort;
        params.page = targetPage;
        const { data } = await api.get('/listings', { params });
        setPage(data.page);
        setPages(data.pages);
        setListings((prev) => (append ? [...prev, ...data.listings] : data.listings));
      } catch (err) {
        setError(apiError(err));
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [filters, category, sort]
  );

  // Active search: reload page 1 shortly after the user stops typing or changes
  // a filter/category/sort (also runs the initial load on mount). The debounce
  // keeps us from firing a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => loadListings(1, false), 300);
    return () => clearTimeout(t);
  }, [loadListings]);

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

      <ActivityTicker />

      {isDefaultView && featured.length > 0 && <Spotlight items={featured} />}

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

      <Filters value={filters} onChange={setFilters} sort={sort} onSortChange={setSort} />

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
        <>
          <div className="grid">
            {listings.map((l, i) => (
              <ListingCard key={l._id} listing={l} index={i} />
            ))}
          </div>
          {page < pages && (
            <div style={{ textAlign: 'center', marginTop: '1.4rem' }}>
              <button
                className="btn ghost"
                onClick={() => loadListings(page + 1, true)}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
