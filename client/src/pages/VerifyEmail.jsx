import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying | ok | error
  const [msg, setMsg] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard against StrictMode double-invoke
    ran.current = true;
    if (!token) {
      setStatus('error');
      setMsg('No verification token was provided.');
      return;
    }
    api
      .post('/auth/verify', { token })
      .then(() => {
        setStatus('ok');
        refreshUser(); // updates the banner if this user is logged in
      })
      .catch((err) => {
        setStatus('error');
        setMsg(apiError(err));
      });
  }, [token, refreshUser]);

  return (
    <div className="card form-card" style={{ textAlign: 'center' }}>
      {status === 'verifying' && (
        <>
          <div className="spinner" />
          <p className="muted">Verifying your email…</p>
        </>
      )}
      {status === 'ok' && (
        <>
          <h1>✅ Email verified</h1>
          <p className="muted">Your account is now verified.</p>
          <Link to="/" className="btn">Continue</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <h1>Verification failed</h1>
          <p className="error">{msg}</p>
          <Link to="/" className="btn ghost">Back home</Link>
        </>
      )}
    </div>
  );
}
