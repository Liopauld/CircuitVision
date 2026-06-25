// Star rating display, or an input when `onChange` is provided.
export default function Stars({ value = 0, onChange, size = '1rem' }) {
  const rounded = Math.round(value);
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = s <= (onChange ? value : rounded);
        const star = (
          <span
            style={{
              color: filled ? 'var(--amber)' : 'var(--text-dim)',
              fontSize: size,
              lineHeight: 1,
            }}
          >
            ★
          </span>
        );
        return onChange ? (
          <button
            key={s}
            type="button"
            className="link-btn"
            onClick={() => onChange(s)}
            aria-label={`${s} star${s > 1 ? 's' : ''}`}
            style={{ padding: 0, cursor: 'pointer' }}
          >
            {star}
          </button>
        ) : (
          <span key={s}>{star}</span>
        );
      })}
    </span>
  );
}
