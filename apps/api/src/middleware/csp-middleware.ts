import { Request, Response, NextFunction } from 'express';
import { generateNonce } from '../utils/sanitize';

/**
 * Content Security Policy (CSP) Middleware
 * Implements strict CSP headers to prevent XSS attacks
 *
 * Features:
 * - Nonce-based script/style allowlisting
 * - Strict directives for production security
 * - Report-URI for violation monitoring
 * - Configurable based on environment
 */

export interface CspOptions {
  enabled?: boolean;
  reportUri?: string;
  reportOnly?: boolean;
}

/**
 * CSP Middleware
 * Adds Content-Security-Policy headers with nonce support
 */
export function cspMiddleware(options: CspOptions = {}) {
  const {
    enabled = true,
    reportUri = '/api/v1/csp-report',
    reportOnly = process.env.NODE_ENV !== 'production',
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip if CSP is disabled
    if (!enabled || process.env.CSP_ENABLED === 'false') {
      return next();
    }

    // Generate nonce for this request
    const nonce = generateNonce();

    // Attach nonce to request for use in templates
    (req as any).nonce = nonce;

    // Build CSP directives
    const directives = buildCspDirectives(nonce, reportUri);

    // Set CSP header (report-only in development, enforced in production)
    const headerName = reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';

    res.setHeader(headerName, directives);

    next();
  };
}

/**
 * Build CSP directives string
 */
function buildCspDirectives(nonce: string, reportUri: string): string {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const apiUrl = process.env.API_URL || 'http://localhost:4000';

  const directives = {
    // Default: Block everything not explicitly allowed
    'default-src': ["'self'"],

    // Scripts: Only nonce-based and self
    'script-src': [`'self'`, `'nonce-${nonce}'`, `'strict-dynamic'`],

    // Styles: Only nonce-based and self
    'style-src': [`'self'`, `'nonce-${nonce}'`, "'unsafe-inline'"], // unsafe-inline fallback for older browsers

    // Images: Self, data URIs, and HTTPS
    'img-src': ["'self'", 'data:', 'https:'],

    // Fonts: Self and data URIs
    'font-src': ["'self'", 'data:'],

    // Connect: API and WebSocket endpoints
    'connect-src': [
      "'self'",
      apiUrl,
      frontendUrl,
      'ws://localhost:*',
      'wss://*',
    ],

    // Frame: Disallow embedding (prevent clickjacking)
    'frame-ancestors': ["'none'"],

    // Forms: Only submit to self
    'form-action': ["'self'"],

    // Base URI: Restrict base tag
    'base-uri': ["'self'"],

    // Object/Embed: Block Flash and Java applets
    'object-src': ["'none'"],

    // Media: Self only
    'media-src': ["'self'"],

    // Workers: Self only
    'worker-src': ["'self'", 'blob:'],

    // Manifest: Self only
    'manifest-src': ["'self'"],

    // Upgrade insecure requests in production
    ...(process.env.NODE_ENV === 'production' && {
      'upgrade-insecure-requests': [],
    }),

    // Report violations
    'report-uri': [reportUri],
  };

  // Convert to CSP header format
  return Object.entries(directives)
    .map(([key, values]) =>
      values.length > 0 ? `${key} ${values.join(' ')}` : key
    )
    .join('; ');
}

/**
 * CSP Report Handler
 * Endpoint to receive CSP violation reports
 */
export async function cspReportHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const report = req.body;

    // Log CSP violation
    const logger = (await import('../utils/logger')).default;
    logger.warn('CSP Violation Report', {
      documentUri: report['csp-report']?.['document-uri'],
      violatedDirective: report['csp-report']?.['violated-directive'],
      blockedUri: report['csp-report']?.['blocked-uri'],
      sourceFile: report['csp-report']?.['source-file'],
      lineNumber: report['csp-report']?.['line-number'],
      columnNumber: report['csp-report']?.['column-number'],
      originalPolicy: report['csp-report']?.['original-policy'],
    });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
