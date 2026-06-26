import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { CATEGORIES, CONDITIONS } from '../constants.js';

// Edit the text fields of an existing listing. Images are set at creation time
// and are not changed here; ownership is enforced server-side (PATCH /listings/:id).
export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await api.get(`/listings/${id}`);
        if (!active) return;
        const l = data.listing;
        setForm({
          title: l.title || '',
          description: l.description || '',
          category: l.category || 'esp32',
          price: l.price ?? '',
          condition: l.condition || 'used',
          quantity: l.quantity ?? 1,
        });
      } catch (err) {
        if (active) setError(apiError(err));
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.patch(`/listings/${id}`, {
        ...form,
        price: Number(form.price),
        quantity: Number(form.quantity),
      });
      navigate('/profile');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!form) {
    return (
      <div className="card form-card wide">
        {error ? <p className="error">{error}</p> : <div className="spinner" />}
      </div>
    );
  }

  return (
    <div className="card form-card wide">
      <span className="kicker">● Edit listing</span>
      <h1 style={{ margin: '0.6rem 0' }}>Edit component</h1>
      <p className="muted">
        Update the details below. Photos can't be changed here — recreate the
        listing if you need different images.
      </p>
      {error && <p className="error" style={{ margin: '0.8rem 0' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <label>
          Component name
          <input value={form.title} onChange={update('title')} required />
        </label>
        <label>
          Description
          <textarea rows={3} value={form.description} onChange={update('description')} />
        </label>

        <div className="row">
          <label>
            Category
            <select value={form.category} onChange={update('category')}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Condition
            <select value={form.condition} onChange={update('condition')}>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="row">
          <label>
            Price (₱)
            <input type="number" min="0" value={form.price} onChange={update('price')} required />
          </label>
          <label>
            Quantity
            <input type="number" min="1" value={form.quantity} onChange={update('quantity')} required />
          </label>
        </div>

        <button type="submit" className="btn full" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
