import { CATEGORIES, CONDITIONS } from '../constants.js';

// Controlled filter bar. Category is handled separately via chips in Browse.
// Filters apply live (debounced in Browse) — there is no Apply button; submit
// is suppressed so pressing Enter in the search box doesn't reload the page.
export default function Filters({ value, onChange }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });

  return (
    <form className="filters" onSubmit={(e) => e.preventDefault()}>
      <input
        type="search"
        placeholder="Search boards, modules, sensors…"
        value={value.q}
        onChange={set('q')}
        autoFocus
      />
      <select value={value.condition} onChange={set('condition')}>
        <option value="">Any condition</option>
        {CONDITIONS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Min ₱"
        min="0"
        value={value.minPrice}
        onChange={set('minPrice')}
      />
      <input
        type="number"
        placeholder="Max ₱"
        min="0"
        value={value.maxPrice}
        onChange={set('maxPrice')}
      />
    </form>
  );
}

export { CATEGORIES };
