import { useEffect, useRef, useState } from 'react';
import { api, apiError } from '../api/client.js';
import { CATEGORIES } from '../constants.js';

const catLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label || v;
const SAMPLE_MS = 600; // how often live mode samples a frame
const MAX_DIM = 640; // downscale frames to this max edge before sending (faster)
const SMOOTH_N = 6; // number of recent live predictions to smooth over

export default function Scan() {
  const [mode, setMode] = useState('upload'); // 'upload' | 'live'
  const [result, setResult] = useState(null); // latest raw /api/scan response
  const [smooth, setSmooth] = useState(null); // smoothed live verdict
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fileInput = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const inFlight = useRef(false);
  const historyRef = useRef([]);

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
    if (!top) {
      setSmooth(null);
      return;
    }
    setSmooth({ category: top, votes: counts[top], total: h.length, confidence: data.confidence });
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
    // Downscale so each frame is small/fast to send + infer.
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

  return (
    <div>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>🔍 Component scanner</h1>
      </div>
      <p className="muted">Identify a board — ESP32, Raspberry Pi, or Arduino — from a photo or live camera.</p>

      <div className="scan-tabs">
        <button className={`tab-btn ${mode === 'upload' ? 'active' : ''}`} onClick={() => setMode('upload')}>
          Upload photo
        </button>
        <button className={`tab-btn ${mode === 'live' ? 'active' : ''}`} onClick={() => setMode('live')}>
          Live camera
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {mode === 'upload' ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="dropzone" onClick={() => fileInput.current?.click()}>
            {busy ? 'Scanning…' : '📷 Tap to choose or take a photo'}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={onPick}
          />
          {result && (
            <div className="scan-result" style={{ marginTop: '1rem' }}>
              {result.suggestedCategory ? (
                <div className="scan-verdict">
                  <span className="scan-verdict-title">{catLabel(result.suggestedCategory)}</span>
                  <span className="muted small">{pct}% confident</span>
                  <div className="scan-bar">
                    <div className="scan-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ) : (
                <div className="scan-verdict dim">
                  <span className="scan-verdict-title">Not recognized</span>
                  <span className="muted small">
                    {result.error ||
                      (result.label ? `Closest: ${result.label} (${pct}%)` : 'Not an ESP32 / Pi / Arduino')}
                  </span>
                </div>
              )}
              {result.detail && (
                <pre className="scan-debug">{result.detail}</pre>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="scan-stage">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} className="scan-video" playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="scan-guide" />
          <span className="scan-live-dot" />
          <div className={`scan-overlay ${smooth ? '' : 'dim'}`}>
            {smooth ? (
              <>
                <span className="scan-verdict-title">{catLabel(smooth.category)}</span>
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
    </div>
  );
}
