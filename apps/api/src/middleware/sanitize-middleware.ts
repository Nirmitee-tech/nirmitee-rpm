import { Request, Response, NextFunction } from 'express';
import { sanitizeObject, stripHtml, sanitizeHtml } from '../utils/sanitize';
import logger from '../utils/logger';

/**
 * Sanitization Strategy
 */
export type SanitizationStrategy = 'strip' | 'escape' | 'none';

/**
 * Sanitization Options
 */
export interface SanitizeOptions {
  body?: SanitizationStrategy;
  query?: SanitizationStrategy;
  params?: SanitizationStrategy;
  excludeFields?: string[];
  enabled?: boolean;
}

/**
 * Auto-sanitize middleware
 * Automatically sanitizes request body, query params, and URL params
 *
 * Strategies:
 * - 'strip': Remove all HTML tags (default for most fields)
 * - 'escape': Allow safe HTML tags (for rich text fields)
 * - 'none': Skip sanitization (for specific routes)
 *
 * Usage:
 * ```ts
 * router.post('/users', sanitize({ body: 'strip' }), handler);
 * router.post('/content', sanitize({ body: 'escape' }), handler);
 * ```
 */
export function sanitize(options: SanitizeOptions = {}) {
  const {
    body = 'strip',
    query = 'strip',
    params = 'strip',
    excludeFields = [],
    enabled = true,
  } = options;

  return (req: Request, _res: Response, next: NextFunction): void => {
    // Skip if sanitization is disabled
    if (!enabled || process.env.INPUT_SANITIZATION_ENABLED === 'false') {
      return next();
    }

    try {
      // Sanitize body
      if (req.body && typeof req.body === 'object' && body !== 'none') {
        req.body = sanitizeData(req.body, body, excludeFields);
      }

      // Sanitize query params
      if (req.query && typeof req.query === 'object' && query !== 'none') {
        req.query = sanitizeData(req.query, query, excludeFields);
      }

      // Sanitize URL params
      if (req.params && typeof req.params === 'object' && params !== 'none') {
        req.params = sanitizeData(req.params, params, excludeFields);
      }

      next();
    } catch (error) {
      logger.error('Sanitization error', { error, path: req.path });
      next(error);
    }
  };
}

/**
 * Sanitize data based on strategy
 */
function sanitizeData<T extends Record<string, any>>(
  data: T,
  strategy: SanitizationStrategy,
  excludeFields: string[]
): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip excluded fields
    if (excludeFields.includes(key)) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      sanitized[key] = applySanitization(value, strategy);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeData(item, strategy, excludeFields)
          : typeof item === 'string'
          ? applySanitization(item, strategy)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value, strategy, excludeFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Apply sanitization strategy to a string
 */
function applySanitization(value: string, strategy: SanitizationStrategy): string {
  switch (strategy) {
    case 'strip':
      return stripHtml(value);
    case 'escape':
      return sanitizeHtml(value);
    case 'none':
      return value;
    default:
      return stripHtml(value);
  }
}

/**
 * Strict sanitization for sensitive operations
 * Use for authentication, password reset, etc.
 */
export function strictSanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body, stripHtml);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query, stripHtml);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params, stripHtml);
  }

  next();
}
