import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

// Earned-achievement chips for a user (profile / storefront). Silent if none.
export default function Badges({ userId }) {
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    api
      .get(`/users/${userId}/badges`)
      .then(({ data }) => active && setBadges(data.badges || []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId]);

  if (badges.length === 0) return null;

  return (
    <div className="badges">
      {badges.map((b) => (
        <span className="badge-chip" key={b.id} title={b.desc}>
          <span aria-hidden="true">{b.icon}</span> {b.label}
        </span>
      ))}
    </div>
  );
}
