import { useEffect, useRef, useState } from 'react';
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
  // Each entry is { file, url }; the object URL backs the preview thumbnail.
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Revoke any outstanding object URLs only when leaving the page (a ref keeps
  // the cleanup pointed at the latest list without re-running on every change).
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(
    () => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)),
    []
  );

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  function addFiles(e) {
    const incoming = Array.from(e.target.files);
    // Reset so picking the same file again (after removing it) still fires onChange.
    e.target.value = '';
    if (incoming.length === 0) return; // dialog cancelled — keep current selection
    const room = 5 - photos.length;
    if (room <= 0) return;
    const added = incoming
      .slice(0, room)
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...added]);
  }

  function removePhoto(index) {
    URL.revokeObjectURL(photos[index].url);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (photos.length === 0) {
      setError('Please add at least one image.');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      photos.forEach(({ file }) => fd.append('images', file));
      // Let axios/the browser set Content-Type so the multipart boundary is
      // included — hardcoding 'multipart/form-data' drops the boundary and
      // multer can't parse the upload (req.files ends up empty).
      await api.post('/listings', fd);
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

        {/* The file input lives OUTSIDE any <label>: a label wrapping the
            control would forward clicks to it and open the picker twice. */}
        <div className="field">
          <span className="field-label">
            Images <span className="muted small">(up to 5)</span>
          </span>
          <div className="dropzone" onClick={() => fileInput.current?.click()}>
            {photos.length
              ? `${photos.length} image(s) selected — tap to add more`
              : '📷 Tap to add photos'}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={addFiles}
            style={{ display: 'none' }}
          />
        </div>

        {photos.length > 0 && (
          <div className="previews">
            {photos.map((p, i) => (
              <div className="preview-thumb" key={p.url}>
                <img src={p.url} alt={`preview ${i + 1}`} />
                <button
                  type="button"
                  className="preview-remove"
                  onClick={() => removePhoto(i)}
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
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
