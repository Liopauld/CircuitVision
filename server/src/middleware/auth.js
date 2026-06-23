import { verifyToken } from '../utils/token.js';
import { ApiError } from './errorHandler.js';

// Verifies a Bearer token and attaches { id, role } to req.user.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Missing or malformed Authorization header.'));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token.'));
  }
}

// Restricts a route to one or more roles. Must run after requireAuth.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, `This action requires role: ${roles.join(' or ')}.`)
      );
    }
    next();
  };
}
