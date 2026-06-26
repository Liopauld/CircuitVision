import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { peso } from '../constants.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/orders/seller/dashboard')
      .then(({ data }) => setData(data))
      .catch((err) => setError(apiError(err)));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <div className="spinner" />;

  const peak = Math.max(1, ...data.trend.map((d) => d.revenue));

  const cards = [
    { label: 'Revenue (paid out)', value: peso(data.revenue), accent: 'copper' },
    { label: 'In escrow', value: peso(data.pendingPayout), sub: `${data.pendingCount} order(s) in progress` },
    { label: 'Units sold', value: data.unitsSold, sub: `${data.salesCount} completed order(s)` },
    { label: 'Active listings', value: data.activeListings, sub: `${data.totalListings} total` },
    { label: 'Total views', value: data.totalViews },
  ];

  return (
    <div>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>Seller dashboard</h1>
        <Link to="/create" className="btn sm">
          + New listing
        </Link>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card ${c.accent ? `accent-${c.accent}` : ''}`}>
            <span className="stat-label">{c.label}</span>
            <span className="stat-value">{c.value}</span>
            {c.sub && <span className="muted small">{c.sub}</span>}
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: '1.2rem' }}>
        <h2 style={{ marginTop: 0 }}>Revenue · last 7 days</h2>
        {data.revenue === 0 ? (
          <p className="muted">No completed sales yet — your earnings will chart here.</p>
        ) : (
          <div className="bar-chart">
            {data.trend.map((d) => (
              <div className="bar-col" key={d.date} title={`${d.date}: ${peso(d.revenue)}`}>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ height: `${Math.round((d.revenue / peak) * 100)}%` }}
                  />
                </div>
                <span className="bar-label">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section-head" style={{ marginTop: '1.4rem' }}>
        <h2 style={{ margin: 0 }}>Best-selling listings</h2>
      </div>
      {data.topListings.length === 0 ? (
        <div className="empty">
          <div className="big-icon">📊</div>
          <p className="muted">No sales yet. Once orders complete, your top items appear here.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Listing</th>
                <th>Units sold</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topListings.map((t) => (
                <tr key={t.listingId}>
                  <td>
                    <img
                      className="thumb"
                      src={t.image || 'https://placehold.co/80x60/0b1120/22d3ee?text=—'}
                      alt={t.title}
                    />
                  </td>
                  <td>
                    <Link to={`/listings/${t.listingId}`}>{t.title}</Link>
                  </td>
                  <td className="mono">{t.units}</td>
                  <td className="mono">{peso(t.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
