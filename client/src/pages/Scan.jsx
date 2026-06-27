import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api, apiError } from '../api/client.js';
import ListingCard from '../components/ListingCard.jsx';
import { CATEGORIES } from '../constants.js';

const catLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label || v;
const CAT_ICON = { esp32: '📡', raspi: '🍓', arduino: '🔌' };
// The classifier's "not a board" class — show it as a clear message, not a label.
const NULL_LABELS = ['null', 'none', 'background', 'unknown', 'nothing'];
const isNullClass = (label) => !!label && NULL_LABELS.includes(String(label).toLowerCase());
const SAMPLE_MS = 600; // how often live mode samples a frame
const MAX_DIM = 640; // downscale frames to this max edge before sending (faster)
const SMOOTH_N = 6; // number of recent live predictions to smooth over

export default function Scan() {
  const [mode, setMode] = useState('upload'); // 'upload' | 'live'
  const [result, setResult] = useState(null); // latest raw /api/scan response
  const [smooth, setSmooth] = useState(null); // smoothed live verdict
  const [matches, setMatches] = useState(null); // { category, listings }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fileInput = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const inFlight = useRef(false);
  const historyRef = useRef([]);

  // The currently recognized category drives the "matching listings" row.
  const activeCategory = mode === 'live' ? smooth?.category : result?.suggestedCategory;

  useEffect(() => {
    if (!activeCategory) {
      setMatches(null);
      return undefined;
    }
    let active = true;
    // Pull a popular pool for the category, then rank "best match": highest
    // seller rating first, popularity (views) as the tiebreak. Take the top 6.
    api
      .get('/listings', { params: { category: activeCategory, limit: 24, sort: 'views' } })
      .then(({ data }) => {
        if (!active) return;
        const ranked = [...data.listings]
          .sort((a, b) => (b.sellerId?.ratingAvg || 0) - (a.sellerId?.ratingAvg || 0))
          .slice(0, 6);
        setMatches({ category: activeCategory, listings: ranked });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeCategory]);

  async function scanBlob(blob) {
    const fd = new FormData();
    fd.append('image', blob, 'scan.jpg');
    const { data } = await api.post('/scan', fd);
    return data;
  }

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await scanBlob(file));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  // Majority-vote smoothing so the live verdict doesn't flicker frame to frame.
  function recordPrediction(data) {
    setResult(data);
    const h = historyRef.current;
    h.push(data.suggestedCategory || null);
    if (h.length > SMOOTH_N) h.shift();
    const counts = {};
    for (const c of h) if (c) counts[c] = (counts[c] || 0) + 1;
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    setSmooth(top ? { category: top, votes: counts[top], total: h.length, confidence: data.confidence } : null);
  }

  useEffect(() => {
    if (mode !== 'live') return undefined;
    let cancelled = false;
    let timer;
    setResult(null);
    setSmooth(null);
    setError('');
    historyRef.current = [];

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        timer = setInterval(sampleFrame, SAMPLE_MS);
      } catch {
        setError('Camera unavailable — grant camera permission, or use Upload.');
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode]);

  async function sampleFrame() {
    if (inFlight.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    const scale = Math.min(1, MAX_DIM / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.7));
    if (!blob) return;
    inFlight.current = true;
    try {
      recordPrediction(await scanBlob(blob));
    } catch {
      /* transient frame error — ignore */
    } finally {
      inFlight.current = false;
    }
  }

  const pct = result ? Math.round((result.confidence || 0) * 100) : 0;
  const hitCat = result?.suggestedCategory;

  return (
    <div>
      <header className="scan-hero">
        <span className="kicker">⚡ AR Vision</span>
        <h1>Component scanner</h1>
        <p className="muted">Point at a board or upload a photo — we'll name it and find it on CircuitVision.</p>
      </header>

      <div className="scan-tabs">
        <button className={`tab-btn ${mode === 'upload' ? 'active' : ''}`} onClick={() => setMode('upload')}>
          📷 Upload
        </button>
        <button className={`tab-btn ${mode === 'live' ? 'active' : ''}`} onClick={() => setMode('live')}>
          🎥 Live camera
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {mode === 'upload' ? (
        <div className="scan-panel">
          <div
            className={`dropzone scan-drop ${busy ? 'scanning' : ''}`}
            onClick={() => fileInput.current?.click()}
          >
            <span className="scan-drop-icon">{busy ? '⏳' : '📷'}</span>
            <span>{busy ? 'Scanning…' : 'Tap to choose or take a photo'}</span>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={onPick}
          />
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={hitCat || result.label || 'none'}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`scan-hit ${hitCat ? '' : 'dim'}`}
              >
                <span className="scan-hit-icon">{hitCat ? CAT_ICON[hitCat] : '🤔'}</span>
                <div className="scan-hit-body">
                  <span className="scan-verdict-title">
                    {hitCat
                      ? catLabel(hitCat)
                      : isNullClass(result.label)
                        ? 'No board detected'
                        : 'Not recognized'}
                  </span>
                  <span className="muted small">
                    {hitCat
                      ? `${pct}% match · tap to rescan`
                      : result.error
                        ? result.error
                        : isNullClass(result.label)
                          ? `${pct}% sure it isn't an ESP32 / Pi / Arduino`
                          : result.label
                            ? `Closest: ${result.label} (${pct}%)`
                            : 'Not an ESP32 / Pi / Arduino'}
                  </span>
                </div>
                {hitCat && (
                  <div className="scan-ring" style={{ '--p': pct }}>
                    <span>{pct}%</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {result?.detail && <pre className="scan-debug">{result.detail}</pre>}
        </div>
      ) : (
        <div className="scan-stage">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} className="scan-video" playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className={`scan-reticle ${smooth ? 'locked' : ''}`}>
            <span className="tl" />
            <span className="tr" />
            <span className="bl" />
            <span className="br" />
          </div>
          <div className="scan-line" />
          <span className="scan-live-dot" />
          <div className={`scan-overlay ${smooth ? '' : 'dim'}`}>
            {smooth ? (
              <>
                <span className="scan-verdict-title">
                  {CAT_ICON[smooth.category]} {catLabel(smooth.category)}
                </span>
                <span className="scan-overlay-sub">
                  {pct}% · {smooth.votes}/{smooth.total} frames
                </span>
              </>
            ) : (
              <span className="scan-overlay-sub">
                {result?.error ? result.error : 'Point at a board…'}
              </span>
            )}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {matches?.listings?.length > 0 && (
          <motion.div
            key={matches.category}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ marginTop: '1.6rem' }}
          >
            <div className="section-head">
              <h2 style={{ margin: 0 }}>
                {CAT_ICON[matches.category]} Top {catLabel(matches.category)} matches
              </h2>
              <Link to={`/?category=${matches.category}`} className="btn ghost sm">
                See all →
              </Link>
            </div>
            <div className="grid">
              {matches.listings.map((l, i) => (
                <ListingCard key={l._id} listing={l} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
