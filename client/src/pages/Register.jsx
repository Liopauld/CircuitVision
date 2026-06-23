import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiError } from '../api/client.js';

const ROLES = [
  { value: 'customer', title: 'Customer', desc: 'Browse & buy components' },
  { value: 'seller', title: 'Seller', desc: 'List items & also buy' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    studentId: '',
    role: 'customer',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card form-card">
      <span className="kicker">● Join CircuitVision</span>
      <h1 style={{ marginTop: '0.6rem' }}>Create your account</h1>
      {error && <p className="error" style={{ margin: '0.8rem 0' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <label>
          I want to…
          <div className="segmented">
            {ROLES.map((r) => (
              <div
                key={r.value}
                className={`seg ${form.role === r.value ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: r.value })}
              >
                <span className="t">{r.title}</span>
                <span className="d">{r.desc}</span>
              </div>
            ))}
          </div>
        </label>

        <label>
          Name
          <input value={form.name} onChange={update('name')} required />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={update('email')}
            required
          />
        </label>
        <label>
          Student ID <span className="muted small">(optional)</span>
          <input value={form.studentId} onChange={update('studentId')} />
        </label>
        <label>
          Password <span className="muted small">(min 6 characters)</span>
          <input
            type="password"
            value={form.password}
            onChange={update('password')}
            minLength={6}
            required
          />
        </label>
        <button type="submit" className="btn full" disabled={busy}>
          {busy ? 'Creating…' : `Sign up as ${form.role}`}
        </button>
      </form>
      <p className="muted" style={{ marginTop: '1rem', textAlign: 'center' }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
