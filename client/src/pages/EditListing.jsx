import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { CATEGORIES, CONDITIONS } from '../constants.js';

// Edit an existing listing's fields and manage its photos (remove existing
// ones, add new ones, up to 5 total). Ownership is enforced server-side.
export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInput = useRef(null);

  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState([]); // image URLs as loaded
  const [keptImages, setKeptImages] = useState([]); // existing URLs still kept
  const [newPhotos, setNewPhotos] = useState([]); // [{ file, url }]
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
        setOriginal(l.cloudinaryUrl || []);
        setKeptImages(l.cloudinaryUrl || []);
      } catch (err) {
        if (active) setError(apiError(err));
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const totalImages = keptImages.length + newPhotos.length;

  function addFiles(e) {
    const incoming = Array.from(e.target.files);
    e.target.value = '';
    if (!incoming.length) return;
    const room = 5 - totalImages;
    if (room <= 0) return;
    const added = incoming
      .slice(0, room)
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    setNewPhotos((prev) => [...prev, ...added]);
  }

  function removeNew(index) {
    URL.revokeObjectURL(newPhotos[index].url);
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (totalImages === 0) {
      setError('Keep or add at least one photo.');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      const removeImages = original.filter((url) => !keptImages.includes(url));
      if (removeImages.length) fd.append('removeImages', JSON.stringify(removeImages));
      newPhotos.forEach(({ file }) => fd.append('images', file));
      await api.patch(`/listings/${id}`, fd);
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
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <label>
            Condition
            <select value={form.condition} onChange={update('condition')}>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
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

        <div className="field">
          <span className="field-label">
            Photos <span className="muted small">({totalImages}/5)</span>
          </span>
          <div className="previews">
            {keptImages.map((url) => (
              <div className="preview-thumb" key={url}>
                <img src={url} alt="listing" />
                <button
                  type="button"
                  className="preview-remove"
                  onClick={() => setKeptImages((prev) => prev.filter((u) => u !== url))}
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
            {newPhotos.map((p, i) => (
              <div className="preview-thumb" key={p.url}>
                <img src={p.url} alt="new" />
                <button
                  type="button"
                  className="preview-remove"
                  onClick={() => removeNew(i)}
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {totalImages < 5 && (
            <div
              className="dropzone"
              style={{ marginTop: '0.6rem' }}
              onClick={() => fileInput.current?.click()}
            >
              📷 Add photos
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={addFiles}
            style={{ display: 'none' }}
          />
        </div>

        <button type="submit" className="btn full" disabled={busy} style={{ marginTop: '1rem' }}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
