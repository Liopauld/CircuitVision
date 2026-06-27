import { env, roboflowEnabled } from '../config/env.js';

// Categories the create-listing form accepts. Anything else (or low
// confidence) resolves to null → the user picks manually.
const VALID_CATEGORIES = ['esp32', 'raspi', 'arduino'];

// Map a model class label onto one of our categories. The classifier's label
// set isn't guaranteed, so match generously and fall back to null.
function normalizeCategory(label) {
  if (!label) return null;
  const k = String(label).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (VALID_CATEGORIES.includes(k)) return k;
  if (k.includes('esp')) return 'esp32';
  if (k.includes('rasp') || k.includes('raspberry') || k.startsWith('rpi') || k === 'pi') {
    return 'raspi';
  }
  if (k.includes('arduino') || k.includes('uno') || k.includes('nano') || k.includes('mega')) {
    return 'arduino';
  }
  return null; // 'unknown' / 'null' / anything else
}

// Roboflow workflow outputs vary by how the workflow is wired, so walk the
// whole response and pick the highest-confidence prediction we can find —
// supporting classification ({ top, confidence } / { class, confidence }) and
// detection-style ({ predictions: [{ class, confidence }] }) shapes.
function extractTopPrediction(data) {
  let best = { label: null, confidence: 0 };
  const consider = (label, confidence) => {
    if (typeof label === 'string' && typeof confidence === 'number' && confidence >= best.confidence) {
      best = { label, confidence };
    }
  };
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    // Classification block: { top, confidence } or a single { class, confidence }.
    consider(node.top, node.confidence);
    consider(node.class, node.confidence);
    consider(node.predicted_class, node.confidence);
    // Array of predictions: [{ class, confidence }, ...].
    if (Array.isArray(node.predictions)) {
      for (const p of node.predictions) {
        if (p && typeof p === 'object') consider(p.class ?? p.top, p.confidence);
      }
    }
    for (const key of Object.keys(node)) visit(node[key]);
  };
  visit(data?.outputs ?? data);
  return best;
}

/**
 * Classify a component photo via the Roboflow workflow inference server.
 * Returns { enabled, suggestedCategory, confidence, label, raw? }. Never throws
 * — scanning is a best-effort convenience; on any failure it returns a null
 * suggestion so listing creation still works manually.
 *
 * @param {Buffer} buffer  raw image bytes (from multer memory storage)
 */
export async function classifyComponent(buffer) {
  if (!roboflowEnabled) {
    return { enabled: false, suggestedCategory: null, confidence: 0, label: null };
  }

  const { apiUrl, apiKey, workspace, workflowId } = env.roboflow;
  const url = `${apiUrl.replace(/\/$/, '')}/infer/workflows/${workspace}/${workflowId}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        use_cache: true,
        inputs: { image: { type: 'base64', value: buffer.toString('base64') } },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        enabled: true,
        suggestedCategory: null,
        confidence: 0,
        label: null,
        error: `Inference server returned HTTP ${res.status}.`,
        detail: env.isProduction ? undefined : body.slice(0, 600),
      };
    }
    const data = await res.json();
    const { label, confidence } = extractTopPrediction(data);
    return {
      enabled: true,
      suggestedCategory: normalizeCategory(label),
      confidence: Math.round(confidence * 100) / 100,
      label,
      // Flag the case where we got a response but couldn't find a prediction.
      error: label ? undefined : 'No prediction found in the workflow output.',
      // Surface the raw workflow output in dev so the output shape can be
      // confirmed / the parser tuned without guessing.
      raw: env.isProduction ? undefined : data,
    };
  } catch (err) {
    // Network error / inference server down / timeout — report it so the UI
    // can tell the user instead of silently saying "not recognized".
    return {
      enabled: true,
      suggestedCategory: null,
      confidence: 0,
      label: null,
      error: `Could not reach the inference server at ${apiUrl}: ${err.message}`,
    };
  }
}
