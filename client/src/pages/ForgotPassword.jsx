import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../api/client.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ busy: false, msg: '', link: '', err: '' });

  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, msg: '', link: '', err: '' });
    try {
      const { data } = await api.post('/auth/password/forgot', { email });
      setState({ busy: false, msg: data.message, link: data.devLink || '', err: '' });
    } catch (err) {
      setState({ busy: false, msg: '', link: '', err: apiError(err) });
    }
  }

  return (
    <div className="card form-card">
      <h1 style={{ marginTop: 0 }}>Forgot password</h1>
      <p className="muted">Enter your email and we'll send a reset link.</p>
      {state.err && <p className="error">{state.err}</p>}

      {state.msg ? (
        <>
          <p>{state.msg}</p>
          {state.link && (
            <a href={state.link} className="btn full" style={{ marginTop: '0.6rem' }}>
              Reset now
            </a>
          )}
        </>
      ) : (
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn full" disabled={state.busy}>
            {state.busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="muted small" style={{ marginTop: '1rem' }}>
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}
