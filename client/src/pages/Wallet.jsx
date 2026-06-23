import { useCallback, useEffect, useState } from 'react';
import { api, apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { peso, TX_META } from '../constants.js';
import AnimatedNumber from '../components/AnimatedNumber.jsx';

const QUICK = [100, 500, 1000];

export default function Wallet() {
  const { refreshUser } = useAuth();
  const [wallet, setWallet] = useState({ walletBalance: 0, reservedBalance: 0 });
  const [txs, setTxs] = useState([]);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [w, t] = await Promise.all([
        api.get('/wallet'),
        api.get('/wallet/transactions'),
      ]);
      setWallet(w.data);
      setTxs(t.data.transactions);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function topUp(value) {
    const amt = Number(value);
    if (!amt || amt <= 0) return setError('Enter a valid amount.');
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const { data } = await api.post('/wallet/topup', { amount: amt });
      setWallet(data);
      setAmount('');
      setMsg(`Added ${peso(amt)} to your wallet.`);
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="centered"><div className="spinner" /></div>;

  return (
    <div>
      <div className="wallet-hero">
        <span className="label">Wallet balance</span>
        <div className="bal">
          <AnimatedNumber value={wallet.walletBalance} format={peso} />
        </div>
        <div className="stat-row">
          <div className="stat">
            <div className="k">Available</div>
            <div className="n">{peso(wallet.walletBalance)}</div>
          </div>
          <div className="stat">
            <div className="k">Reserved (held)</div>
            <div className="n">{peso(wallet.reservedBalance)}</div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1.2rem' }}>
        <h2 style={{ marginTop: 0 }}>Top up</h2>
        <p className="muted small">Simulated — no real payment is processed.</p>
        {error && <p className="error" style={{ margin: '0.7rem 0' }}>{error}</p>}
        {msg && <p className="success" style={{ margin: '0.7rem 0' }}>{msg}</p>}
        <div className="cat-chips" style={{ marginTop: '0.8rem' }}>
          {QUICK.map((q) => (
            <button key={q} className="chip" onClick={() => topUp(q)} disabled={busy}>
              +{peso(q)}
            </button>
          ))}
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label style={{ flex: 1, marginBottom: 0 }}>
            Custom amount (₱)
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 250"
            />
          </label>
          <button className="btn" onClick={() => topUp(amount)} disabled={busy}>
            {busy ? '…' : 'Top up'}
          </button>
        </div>
      </div>

      <div className="section-head">
        <h2>Transaction history</h2>
      </div>
      {txs.length === 0 ? (
        <div className="empty">
          <div className="big-icon">🧾</div>
          <p className="muted">No transactions yet.</p>
        </div>
      ) : (
        <div className="tx-list">
          {txs.map((tx) => {
            const meta = TX_META[tx.type] || { sign: '', label: tx.type, glyph: '•' };
            const positive = meta.sign === '+';
            return (
              <div className="tx-item" key={tx._id}>
                <div
                  className="tx-icon"
                  style={{
                    background: positive ? 'rgba(52,211,153,0.14)' : 'rgba(229,57,107,0.14)',
                    color: positive ? 'var(--green)' : 'var(--magenta)',
                  }}
                >
                  {meta.glyph}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{meta.label}</div>
                  <div className="muted small">
                    {tx.description} · {new Date(tx.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={`tx-amt ${positive ? 'pos' : 'neg'}`}>
                  {meta.sign}
                  {peso(tx.amount)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
