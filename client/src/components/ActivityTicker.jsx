import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const ICON = { sale: '🛒', listing: '✨', review: '⭐' };

// A continuously scrolling "live" feed of recent marketplace activity — conveys
// that the site is busy. Pauses on hover; silently hides if there's nothing.
export default function ActivityTicker() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let active = true;
    api
      .get('/activity')
      .then(({ data }) => active && setEvents(data.events || []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (events.length === 0) return null;
  // Duplicate the list so the marquee can loop seamlessly.
  const items = [...events, ...events];

  return (
    <div className="ticker">
      <span className="ticker-tag">● LIVE</span>
      <div className="ticker-viewport">
        <div className="ticker-track">
          {items.map((e, i) => (
            <span className="ticker-item" key={i}>
              <span aria-hidden="true">{ICON[e.type] || '•'}</span> {e.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
