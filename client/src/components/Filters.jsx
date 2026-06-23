import { CATEGORIES, CONDITIONS } from '../constants.js';

// Controlled filter bar. Category is handled separately via chips in Browse.
export default function Filters({ value, onChange, onApply }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });

  return (
    <form
      className="filters"
      onSubmit={(e) => {
        e.preventDefault();
        onApply();
      }}
    >
      <input
        type="search"
        placeholder="Search boards, modules, sensors…"
        value={value.q}
        onChange={set('q')}
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
      <button type="submit" className="btn">
        Apply
      </button>
    </form>
  );
}

export { CATEGORIES };
