import { ApiError } from './errorHandler.js';

// Lightweight in-memory, fixed-window rate limiter keyed by client IP. Adequate
// for a single-process app to blunt brute-force / abuse on sensitive auth
// routes; it is NOT a substitute for a shared limiter behind a load balancer.
export function rateLimit({
  windowMs,
  max,
  message = 'Too many requests. Please try again in a moment.',
}) {
  const hits = new Map(); // ip -> { count, resetAt }

  // Periodically drop expired buckets so the map can't grow unbounded. unref so
  // the timer never keeps the process alive.
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  timer.unref?.();

  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    let entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(new ApiError(429, message));
    }
    next();
  };
}
