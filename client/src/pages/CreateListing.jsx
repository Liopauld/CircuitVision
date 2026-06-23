import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { CATEGORIES, CONDITIONS } from '../constants.js';

export default function CreateListing() {
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'esp32',
    price: '',
    condition: 'used',
    quantity: 1,
  });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  function handleFiles(e) {
    const selected = Array.from(e.target.files).slice(0, 5);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (files.length === 0) {
      setError('Please add at least one image.');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((file) => fd.append('images', file));
      await api.post('/listings', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate('/profile');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card form-card wide">
      <span className="kicker">● New listing</span>
      <h1 style={{ margin: '0.6rem 0' }}>List a component</h1>
      <p className="muted">
        Listings start as <strong>Pending</strong> until an admin approves them.
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

        <label>
          Images <span className="muted small">(up to 5)</span>
          <div className="dropzone" onClick={() => fileInput.current?.click()}>
            {files.length ? `${files.length} image(s) selected` : '📷 Tap to add photos'}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            style={{ display: 'none' }}
          />
        </label>

        {previews.length > 0 && (
          <div className="previews">
            {previews.map((src, i) => (
              <img key={i} src={src} alt={`preview ${i + 1}`} />
            ))}
          </div>
        )}

        <button type="submit" className="btn full" disabled={busy}>
          {busy ? 'Publishing…' : 'Publish listing'}
        </button>
      </form>
    </div>
  );
}
