// Central error handler. Controllers throw `ApiError` (or any error) and this
// converts it into a consistent JSON shape: { error: message }.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (status >= 500) {
    console.error('[error]', err);
  }

  // Surface Mongoose validation errors clearly.
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join('; ') });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }

  res.status(status).json({ error: message });
}
