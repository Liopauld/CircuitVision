import { useEffect, useRef, useState } from 'react';
import { api, apiError } from '../api/client.js';
import { CATEGORIES } from '../constants.js';

const catLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label || v;
const SAMPLE_MS = 800; // how often the live mode samples a frame

// Turn a /api/scan response into a friendly verdict.
function verdict(result) {
  if (!result) return null;
  if (result.enabled === false) {
    return { title: 'Scanning is off', detail: 'The component scanner isn’t configured.', dim: true };
  }
  const pct = Math.round((result.confidence || 0) * 100);
  if (result.suggestedCategory) {
    return { title: catLabel(result.suggestedCategory), detail: `${pct}% confident`, pct };
  }
  return {
    title: 'Not recognized',
    detail: result.label ? `Closest: ${result.label} (${pct}%)` : 'Not an ESP32 / Pi / Arduino',
    dim: true,
    pct,
  };
}

export default function Scan() {
  const [mode, setMode] = useState('upload'); // 'upload' | 'live'
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fileInput = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const inFlight = useRef(false);

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

  // Live camera: stream to a <video>, sample a frame on an interval, and POST
  // it (skipping while a request is in flight) for a rolling prediction.
  useEffect(() => {
    if (mode !== 'live') return undefined;
    let cancelled = false;
    let timer;
    setResult(null);
    setError('');

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
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.7));
    if (!blob) return;
    inFlight.current = true;
    try {
      setResult(await scanBlob(blob));
    } catch {
      /* transient frame error — ignore */
    } finally {
      inFlight.current = false;
    }
  }

  const v = verdict(result);

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
          {v && (
            <div className={`scan-verdict ${v.dim ? 'dim' : ''}`} style={{ marginTop: '1rem' }}>
              <span className="scan-verdict-title">{v.title}</span>
              <span className="muted small">{v.detail}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="scan-stage">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} className="scan-video" playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {v && (
            <div className={`scan-overlay ${v.dim ? 'dim' : ''}`}>
              <span className="scan-verdict-title">{v.title}</span>
              {v.detail && <span className="scan-overlay-sub">{v.detail}</span>}
            </div>
          )}
          <span className="scan-live-dot" />
        </div>
      )}
    </div>
  );
}
