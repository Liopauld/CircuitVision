import { useRef } from 'react';

// Horizontal, snap-scrolling row with prev/next controls. Children are the
// cards (e.g. <ListingCard/>); width per card is set in CSS (.carousel-track).
export default function Carousel({ title, icon, hint, children }) {
  const trackRef = useRef(null);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <section className="carousel">
      <div className="carousel-head">
        <div>
          <h2>
            {icon && <span className="carousel-icon">{icon}</span>}
            {title}
          </h2>
          {hint && <p className="muted small">{hint}</p>}
        </div>
        <div className="carousel-nav">
          <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)}>
            ‹
          </button>
          <button type="button" aria-label="Scroll right" onClick={() => scroll(1)}>
            ›
          </button>
        </div>
      </div>
      <div className="carousel-track" ref={trackRef}>
        {children}
      </div>
    </section>
  );
}
