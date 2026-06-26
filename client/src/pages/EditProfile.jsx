import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const ACCENTS = ['', '#c98a3a', '#e8b765', '#3aa0c9', '#4caf7d', '#8a6bd6', '#d6455b'];

export default function EditProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef(null);

  const [name, setName] = useState(user.name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [accentColor, setAccentColor] = useState(user.accentColor || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(user.avatarUrl || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Revoke the local preview URL on unmount / replacement to avoid leaks.
  useEffect(() => {
    if (!avatarFile) return undefined;
    const url = URL.createObjectURL(avatarFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('bio', bio);
      fd.append('accentColor', accentColor);
      if (avatarFile) fd.append('avatar', avatarFile);
      const { data } = await api.patch('/auth/me', fd);
      setUser(data.user);
      navigate('/profile');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card form-card wide">
      <span className="kicker">● Profile</span>
      <h1 style={{ margin: '0.6rem 0' }}>Customize your profile</h1>
      {error && <p className="error" style={{ margin: '0.8rem 0' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <span
            className="avatar avatar-lg"
            style={{
              backgroundImage: preview ? `url(${preview})` : undefined,
              borderColor: accentColor || undefined,
            }}
          >
            {!preview && name.charAt(0).toUpperCase()}
          </span>
          <div>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => fileInput.current?.click()}
            >
              {preview ? 'Change photo' : 'Upload photo'}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <label>
          Display name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label>
          Bio <span className="muted small">({bio.length}/280)</span>
          <textarea
            rows={3}
            maxLength={280}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell buyers about yourself, your course, what you sell…"
          />
        </label>

        <label>Accent colour</label>
        <div className="swatches">
          {ACCENTS.map((c) => (
            <button
              type="button"
              key={c || 'default'}
              className={`swatch ${accentColor === c ? 'active' : ''}`}
              onClick={() => setAccentColor(c)}
              style={{ background: c || 'var(--surface-hi)' }}
              title={c || 'Theme default'}
              aria-label={c || 'Theme default'}
            >
              {c ? '' : 'A'}
            </button>
          ))}
        </div>

        <button type="submit" className="btn full" disabled={busy} style={{ marginTop: '1.2rem' }}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
