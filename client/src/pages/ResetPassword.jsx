import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, apiError } from '../api/client.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [state, setState] = useState({ busy: false, err: '', done: false });

  async function submit(e) {
    e.preventDefault();
    if (password.length < 6) {
      setState((s) => ({ ...s, err: 'Password must be at least 6 characters.' }));
      return;
    }
    setState({ busy: true, err: '', done: false });
    try {
      await api.post('/auth/password/reset', { token, password });
      setState({ busy: false, err: '', done: true });
    } catch (err) {
      setState({ busy: false, err: apiError(err), done: false });
    }
  }

  if (!token) {
    return (
      <div className="card form-card">
        <p className="error">This reset link is missing its token.</p>
        <Link to="/forgot" className="btn ghost">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="card form-card">
      <h1 style={{ marginTop: 0 }}>Reset password</h1>
      {state.done ? (
        <>
          <p>✅ Your password has been reset.</p>
          <Link to="/login" className="btn full">Go to login</Link>
        </>
      ) : (
        <form onSubmit={submit}>
          {state.err && <p className="error">{state.err}</p>}
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn full" disabled={state.busy}>
            {state.busy ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      )}
    </div>
  );
}
