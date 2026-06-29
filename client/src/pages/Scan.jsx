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
  const [allComponents, setAllComponents] = useState([]); // full reference catalog
  const [query, setQuery] = useState(''); // catalog search box
  const [catFilter, setCatFilter] = useState(null); // null = all categories
  const [picked, setPicked] = useState(null); // the exact board the user selected
  const [preview, setPreview] = useState(null); // object URL of the uploaded image
  const [dragging, setDragging] = useState(false); // drag-and-drop hover state
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

  // Pull the whole reference catalog once so the user can browse + search every
  // board and read its specs — independent of a scan. Free, no inference.
  useEffect(() => {
    let active = true;
    api
      .get('/catalog')
      .then(({ data }) => {
        if (active) setAllComponents(data.components || []);
      })
      .catch(() => {
        if (active) setAllComponents([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // When a scan recognizes a category, focus the reference browser on it.
  useEffect(() => {
    if (activeCategory) {
      setCatFilter(activeCategory);
      setPicked(null);
    }
  }, [activeCategory]);

  // Components shown in the reference browser: filtered by the active category
  // chip and the search box (matches name, summary, or printed aliases).
  const q = query.trim().toLowerCase();
  const browseComponents = allComponents.filter((c) => {
    if (catFilter && c.category !== catFilter) return false;
    if (!q) return true;
    const hay = `${c.name} ${c.summary || ''} ${(c.aliases || []).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });

  // Free the object URL behind the upload preview when it changes or unmounts.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  async function scanBlob(blob) {
    const fd = new FormData();
    fd.append('image', blob, 'scan.jpg');
    const { data } = await api.post('/scan', fd);
    return data;
  }

  // Shared by the file picker and drag-and-drop: show the image immediately,
  // then send it to the scanner.
  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('That doesn’t look like an image — try a JPG or PNG.');
      return;
    }
    setError('');
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setBusy(true);
    try {
      setResult(await scanBlob(file));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    handleFile(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
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
    setPreview(null);
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
        <p className="muted">Snap or upload a board — we'll identify it, show its specs, and find it on CircuitVision.</p>
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
          {preview ? (
            <div className="scan-stage scan-shot-stage">
              <img className="scan-shot" src={preview} alt="Component being scanned" />
              <div className={`scan-reticle ${hitCat ? 'locked' : ''}`}>
                <span className="tl" />
                <span className="tr" />
                <span className="bl" />
                <span className="br" />
              </div>
              {busy && <div className="scan-line" />}
              <button type="button" className="scan-redo" onClick={() => fileInput.current?.click()}>
                ↻ New photo
              </button>
              <div className={`scan-overlay ${busy || !hitCat ? 'dim' : ''}`}>
                {busy ? (
                  <div className="scan-analyzing">
                    <span className="scan-spinner" />
                    <span className="scan-overlay-sub">Analyzing the board…</span>
                  </div>
                ) : (
                  <div className="scan-verdict-row">
                    <span className="scan-hit-icon">{hitCat ? CAT_ICON[hitCat] : '🤔'}</span>
                    <div className="scan-hit-body">
                      <span className="scan-verdict-title">
                        {hitCat
                          ? catLabel(hitCat)
                          : isNullClass(result?.label)
                            ? 'No board detected'
                            : 'Not recognized'}
                      </span>
                      <span className="scan-overlay-sub">
                        {hitCat
                          ? `${pct}% match`
                          : result?.error
                            ? result.error
                            : isNullClass(result?.label)
                              ? "Doesn't look like an ESP32 / Pi / Arduino"
                              : result?.label
                                ? `Closest: ${result.label} (${pct}%)`
                                : 'Not an ESP32 / Pi / Arduino'}
                      </span>
                    </div>
                    {hitCat && (
                      <div className="scan-ring" style={{ '--p': pct }}>
                        <span>{pct}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className={`dropzone scan-drop ${dragging ? 'dragover' : ''}`}
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <span className="scan-drop-icon">📷</span>
              <span>Tap to choose or take a photo</span>
              <span className="muted small">or drag &amp; drop an image here</span>
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={onPick}
          />
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

      {allComponents.length > 0 && (
        <div style={{ marginTop: '1.6rem' }}>
          <div className="section-head">
            <h2 style={{ margin: 0 }}>📖 Component reference</h2>
          </div>
          <p className="muted small" style={{ marginTop: '-0.4rem' }}>
            {activeCategory
              ? `Recognized as ${catLabel(activeCategory)} — search or tap a board for its specs.`
              : 'Search the catalog or filter by family, then tap a board to see its specs.'}
          </p>

          <input
            type="search"
            className="scan-search"
            placeholder="Search boards — e.g. ESP32-CAM, Pico, Mega…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="cat-chips" style={{ marginTop: '0.8rem' }}>
            <button
              className={`chip ${!catFilter ? 'active' : ''}`}
              onClick={() => setCatFilter(null)}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                className={`chip ${catFilter === c.value ? 'active' : ''}`}
                onClick={() => setCatFilter(c.value)}
              >
                {CAT_ICON[c.value]} {c.label}
              </button>
            ))}
          </div>

          {browseComponents.length === 0 ? (
            <p className="muted small">No boards match “{query}”.</p>
          ) : (
            <div className="cat-chips">
              {browseComponents.map((c) => (
                <button
                  key={c.key}
                  className={`chip ${picked?.key === c.key ? 'active' : ''}`}
                  onClick={() => setPicked(picked?.key === c.key ? null : c)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {picked && (
              <motion.div
                key={picked.key}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="scan-hit"
                style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.3rem' }}
              >
                <span className="scan-verdict-title">{picked.name}</span>
                {picked.summary && <span className="muted small">{picked.summary}</span>}
                <ul className="specs" style={{ marginTop: '0.6rem' }}>
                  {Object.entries(picked.specs).map(([k, v]) => (
                    <li key={k}>
                      <span>{k}</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
                <a
                  className="btn ghost sm"
                  href={`https://www.google.com/search?q=${encodeURIComponent(`${picked.name} datasheet`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginTop: '0.7rem', alignSelf: 'flex-start' }}
                >
                  Find datasheet ↗
                </a>
              </motion.div>
            )}
          </AnimatePresence>
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
