import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiError } from '../utils/api-error';
import logger from '../utils/logger';

const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_SECRET_LENGTH = 32;

// Safe HTTP methods that don't require CSRF protection
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Generate CSRF token pair (token + signed token)
 * Uses double-submit cookie pattern for stateless CSRF protection
 */
export function generateCsrfToken(): { token: string; signedToken: string } {
  const token = crypto.randomBytes(CSRF_SECRET_LENGTH).toString('hex');

  // Sign token with app secret to prevent tampering
  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  const signedToken = crypto
    .createHmac('sha256', secret)
    .update(token)
    .digest('hex');

  return { token, signedToken };
}

/**
 * Verify CSRF token matches signed token
 */
function verifyCsrfToken(token: string, signedToken: string): boolean {
  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  const expectedSignedToken = crypto
    .createHmac('sha256', secret)
    .update(token)
    .digest('hex');

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signedToken, 'hex'),
      Buffer.from(expectedSignedToken, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern
 *
 * How it works:
 * 1. Client requests CSRF token via GET /api/v1/auth/csrf-token
 * 2. Server generates token pair and sets signed token as httpOnly cookie
 * 3. Client includes token in X-CSRF-Token header for state-changing requests
 * 4. Server validates token matches cookie
 *
 * @param options - Configuration options
 */
export function csrfProtection(options: {
  excludePaths?: string[];
  enabled?: boolean;
} = {}) {
  const { excludePaths = [], enabled = true } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip if CSRF protection is disabled
    if (!enabled || process.env.CSRF_PROTECTION_ENABLED === 'false') {
      return next();
    }

    // Skip safe methods (GET, HEAD, OPTIONS)
    if (SAFE_METHODS.includes(req.method)) {
      return next();
    }

    // Skip excluded paths (e.g., webhooks, OAuth callbacks)
    if (excludePaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Get token from header
    const token = req.headers[CSRF_TOKEN_HEADER] as string;
    if (!token) {
      logger.warn('CSRF token missing in request', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      throw new ApiError(403, 'CSRF token missing', 'CSRF_TOKEN_MISSING');
    }

    // Get signed token from cookie
    const signedToken = req.cookies[CSRF_COOKIE_NAME];
    if (!signedToken) {
      logger.warn('CSRF cookie missing', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      throw new ApiError(403, 'CSRF cookie missing', 'CSRF_COOKIE_MISSING');
    }

    // Verify token
    if (!verifyCsrfToken(token, signedToken)) {
      logger.warn('CSRF token validation failed', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: (req as any).user?.id,
      });
      throw new ApiError(403, 'Invalid CSRF token', 'CSRF_TOKEN_INVALID');
    }

    next();
  };
}

/**
 * Middleware to attach CSRF token generation helper to response
 */
export function csrfTokenProvider(req: Request, res: Response, next: NextFunction): void {
  // Add helper method to generate and set CSRF token
  (res as any).generateCsrfToken = (): string => {
    const { token, signedToken } = generateCsrfToken();

    // Set signed token as httpOnly cookie (cannot be read by JavaScript)
    res.cookie(CSRF_COOKIE_NAME, signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Return token to client (to be sent in X-CSRF-Token header)
    return token;
  };

  next();
}
