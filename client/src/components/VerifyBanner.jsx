import { useState } from 'react';
import { api, apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

// Shown app-wide while the logged-in user hasn't verified their email. Lets
// them re-send the link; in dev (no SMTP) the API returns the link directly so
// the flow is completable without an inbox.
export default function VerifyBanner() {
  const { user } = useAuth();
  const [state, setState] = useState({ busy: false, msg: '', link: '' });

  if (!user || user.isVerified) return null;

  async function resend() {
    setState({ busy: true, msg: '', link: '' });
    try {
      const { data } = await api.post('/auth/verify/request');
      setState({ busy: false, msg: data.message || 'Verification email sent.', link: data.devLink || '' });
    } catch (err) {
      setState({ busy: false, msg: apiError(err), link: '' });
    }
  }

  return (
    <div className="verify-banner">
      <span>📧 Verify your email to secure your account.</span>
      <button className="btn ghost sm" onClick={resend} disabled={state.busy}>
        {state.busy ? 'Sending…' : 'Resend link'}
      </button>
      {state.msg && <span className="muted small">{state.msg}</span>}
      {state.link && (
        <a href={state.link} className="seller-link">
          Verify now
        </a>
      )}
    </div>
  );
}
