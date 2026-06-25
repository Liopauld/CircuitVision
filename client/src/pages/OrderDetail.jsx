import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  peso,
  ORDER_LABELS,
  ORDER_STEPS,
  availableActions,
  canDispute,
  DISPUTE_STATUS_LABELS,
  resolutionLabel,
} from '../constants.js';
import DisputeThread from '../components/DisputeThread.jsx';
import Stars from '../components/Stars.jsx';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [order, setOrder] = useState(null);
  const [dispute, setDispute] = useState(null);
  const [disputeMsgs, setDisputeMsgs] = useState([]);
  const [review, setReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadDispute = useCallback(async () => {
    try {
      const { data } = await api.get(`/disputes/order/${id}`);
      setDispute(data.dispute);
      setDisputeMsgs(data.messages);
    } catch {
      // No dispute / not permitted — leave panel hidden.
    }
  }, [id]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.order);
      if (data.order.status === 'disputed') await loadDispute();
      if (data.order.status === 'completed') {
        try {
          const r = await api.get(`/reviews/order/${id}`);
          setReview(r.data.review);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setError(apiError(err));
    }
  }, [id, loadDispute]);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !order) return <p className="error">{error}</p>;
  if (!order) return <div className="centered"><div className="spinner" /></div>;

  // Resolve viewer's relationship to this order.
  const viewerRole =
    user.role === 'admin'
      ? 'admin'
      : order.buyerId?._id === user.id
      ? 'buyer'
      : 'seller';
  const actions = availableActions(order, viewerRole);

  async function act(action) {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/orders/${id}/actions`, { action });
      setOrder(data.order);
      await refreshUser(); // wallet may have changed
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function raiseDispute() {
    const reason = window.prompt(
      'Describe the problem with this order (the seller and an admin will see this):'
    );
    if (!reason || !reason.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/disputes', { orderId: id, reason: reason.trim() });
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function sendDisputeMessage(body) {
    const { data } = await api.post(`/disputes/${dispute._id}/messages`, { body });
    setDisputeMsgs((prev) => [...prev, data.message]);
  }

  async function submitReview() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/reviews', { orderId: id, rating, comment });
      setReview(data.review);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function messageOther() {
    const otherId =
      viewerRole === 'buyer' ? order.sellerId?._id : order.buyerId?._id;
    if (!otherId) return;
    try {
      const { data } = await api.post('/messages/conversations', {
        userId: otherId,
        listingId: order.listingId,
      });
      navigate(`/messages/${data.conversationId}`);
    } catch (err) {
      setError(apiError(err));
    }
  }

  const currentStep = ORDER_STEPS.indexOf(order.status);
  const isTerminal = ['cancelled', 'disputed'].includes(order.status);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Link to="/orders" className="muted small">
        ← Back to orders
      </Link>

      <div className="panel" style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <img
          className="order-thumb"
          style={{ width: 80, height: 64 }}
          src={order.imageSnapshot || 'https://placehold.co/80x60/0b1120/22d3ee?text=—'}
          alt={order.titleSnapshot}
        />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.2rem', margin: 0 }}>{order.titleSnapshot}</h1>
          <p className="muted small" style={{ margin: '0.3rem 0' }}>
            {order.quantity} × {peso(order.unitPrice)} ·{' '}
            {order.fulfillment === 'shipping' ? 'Shipping' : 'Campus pickup'}
          </p>
          <span
            className={`status-tag ${isTerminal ? 'status-sold' : 'status-reserved'}`}
          >
            {ORDER_LABELS[order.status] || order.status}
          </span>
        </div>
        <div className="price">{peso(order.amountReserved)}</div>
      </div>

      {error && <p className="error" style={{ marginTop: '1rem' }}>{error}</p>}

      {/* Progress */}
      {!isTerminal && (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <ol className="timeline">
            {ORDER_STEPS.map((step, i) => (
              <li
                key={step}
                style={{ opacity: i <= currentStep ? 1 : 0.4 }}
              >
                <div style={{ fontWeight: i === currentStep ? 700 : 500 }}>
                  {ORDER_LABELS[step]}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
          {actions.map((a) => (
            <button
              key={a.action}
              className={a.kind}
              onClick={() => act(a.action)}
              disabled={busy}
              style={{ flex: 1 }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {viewerRole !== 'admin' && (
        <button
          className="btn ghost full"
          onClick={messageOther}
          style={{ marginTop: '0.8rem' }}
        >
          💬 Message {viewerRole === 'buyer' ? 'seller' : 'buyer'}
        </button>
      )}

      {/* Raise dispute — buyer/seller, only while the order is eligible. */}
      {viewerRole !== 'admin' && canDispute(order) && (
        <button
          className="btn ghost full danger"
          onClick={raiseDispute}
          disabled={busy}
          style={{ marginTop: '0.8rem' }}
        >
          ⚠️ Raise a dispute
        </button>
      )}

      {/* Dispute panel — shown once the order is disputed. */}
      {order.status === 'disputed' && dispute && (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2 style={{ fontSize: '1.05rem' }}>Dispute</h2>
            <span
              className={`status-tag ${
                dispute.status === 'resolved'
                  ? 'status-available'
                  : dispute.status === 'rejected'
                  ? 'status-rejected'
                  : 'status-reserved'
              }`}
            >
              {DISPUTE_STATUS_LABELS[dispute.status] || dispute.status}
            </span>
          </div>
          <p className="muted small" style={{ marginTop: 0 }}>
            Opened by {dispute.raisedBy?.name || 'a participant'}
          </p>

          {(dispute.status === 'resolved' || dispute.status === 'rejected') && (
            <div className="callout" style={{ margin: '0.5rem 0' }}>
              <strong>Outcome:</strong> {resolutionLabel(dispute.resolution)}
              {dispute.refundAmount > 0 && ` · ${peso(dispute.refundAmount)} refunded`}
            </div>
          )}

          <DisputeThread
            messages={disputeMsgs}
            selfId={user.id}
            onSend={sendDisputeMessage}
            disabled={dispute.status === 'resolved' || dispute.status === 'rejected'}
          />
        </div>
      )}

      {/* Review — buyer rates the seller after completion */}
      {order.status === 'completed' && viewerRole === 'buyer' && (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <h2 style={{ fontSize: '1.05rem', marginTop: 0 }}>
            {review ? 'Your review' : 'Rate this seller'}
          </h2>
          {review ? (
            <>
              <Stars value={review.rating} />
              {review.comment && (
                <p className="muted" style={{ margin: '0.4rem 0 0' }}>{review.comment}</p>
              )}
            </>
          ) : (
            <>
              <Stars value={rating} onChange={setRating} size="1.4rem" />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share how the transaction went (optional)"
                rows={3}
                style={{ width: '100%', marginTop: '0.6rem' }}
              />
              <button
                className="btn full"
                onClick={submitReview}
                disabled={busy}
                style={{ marginTop: '0.6rem' }}
              >
                Submit review
              </button>
            </>
          )}
        </div>
      )}

      {/* History */}
      <div className="section-head">
        <h2 style={{ fontSize: '1.05rem' }}>Activity</h2>
      </div>
      <ul className="timeline">
        {order.statusHistory
          ?.slice()
          .reverse()
          .map((h, i) => (
            <li key={i}>
              <div>{ORDER_LABELS[h.status] || h.status}</div>
              <div className="ts">
                {h.note} · {new Date(h.at).toLocaleString()}
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}
