import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Express, Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Sentry Configuration for Backend
 *
 * Features:
 * - Error tracking and reporting
 * - Performance monitoring (APM)
 * - Request tracing
 * - Profiling integration
 * - Environment-based configuration
 *
 * Environment Variables:
 * - SENTRY_DSN: Sentry Data Source Name (required for Sentry to work)
 * - SENTRY_ENVIRONMENT: Environment name (development, staging, production)
 * - SENTRY_TRACES_SAMPLE_RATE: Percentage of transactions to trace (0.0 - 1.0)
 * - SENTRY_PROFILES_SAMPLE_RATE: Percentage of transactions to profile (0.0 - 1.0)
 */

interface SentryConfig {
  dsn?: string;
  environment: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  enabled: boolean;
}

/**
 * Get Sentry configuration from environment variables
 */
function getSentryConfig(): SentryConfig {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const tracesSampleRate = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1');
  const profilesSampleRate = parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1');
  const enabled = !!dsn;

  return {
    dsn,
    environment,
    tracesSampleRate: Math.max(0, Math.min(1, tracesSampleRate)),
    profilesSampleRate: Math.max(0, Math.min(1, profilesSampleRate)),
    enabled,
  };
}

/**
 * Initialize Sentry SDK
 *
 * Call this BEFORE importing any other modules
 */
export function initializeSentry(): void {
  const config = getSentryConfig();

  if (!config.enabled) {
    logger.info('Sentry is disabled (no SENTRY_DSN configured)');
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
    profilesSampleRate: config.profilesSampleRate,

    // Integrations
    integrations: [
      // Performance profiling
      nodeProfilingIntegration(),

      // HTTP integration for automatic request tracking
      Sentry.httpIntegration(),

      // Console integration for capturing console logs
      Sentry.consoleIntegration({
        levels: ['error', 'warn'],
      }),

      // Node fetch integration
      Sentry.nativeNodeFetchIntegration(),
    ],

    // Performance monitoring options
    tracesSampler: (samplingContext) => {
      // Sample 100% of errors
      if (samplingContext.transactionContext.op === 'error') {
        return 1.0;
      }

      // Sample auth requests at higher rate
      if (samplingContext.transactionContext.name?.includes('/auth/')) {
        return Math.min(config.tracesSampleRate * 2, 1.0);
      }

      // Default sample rate
      return config.tracesSampleRate;
    },

    // Error filtering
    beforeSend: (event, hint) => {
      // Filter out known non-critical errors
      const error = hint.originalException;

      if (error instanceof Error) {
        // Don't send validation errors (they're expected)
        if (error.message.includes('validation') || error.message.includes('Validation')) {
          return null;
        }

        // Don't send 404 errors
        if (error.message.includes('Not found') || error.message.includes('not found')) {
          return null;
        }
      }

      return event;
    },

    // Add custom tags
    initialScope: {
      tags: {
        service: 'api',
        runtime: 'node',
      },
    },
  });

  logger.info('Sentry initialized successfully', {
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
    profilesSampleRate: config.profilesSampleRate,
  });
}

/**
 * Sentry Request Handler Middleware
 *
 * Add this BEFORE all other middleware and routes
 */
export function sentryRequestHandler() {
  const config = getSentryConfig();
  if (!config.enabled) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  // Return a middleware function that captures request info
  return (req: Request, _res: Response, next: NextFunction) => {
    Sentry.setTag('url', req.url);
    Sentry.setTag('method', req.method);
    next();
  };
}

/**
 * Sentry Tracing Middleware
 *
 * Add this AFTER request handler but BEFORE routes
 */
export function sentryTracingHandler() {
  const config = getSentryConfig();
  if (!config.enabled) {
    return (_req: any, _res: any, next: any) => next();
  }

  return (_req: any, _res: any, next: any) => next();
}

/**
 * Sentry Error Handler Middleware
 *
 * Add this AFTER all routes but BEFORE custom error handler
 */
export function sentryErrorHandler() {
  const config = getSentryConfig();
  if (!config.enabled) {
    return (_err: Error, _req: Request, _res: Response, next: NextFunction) => next(_err);
  }

  // Return error handler middleware
  return (err: Error, _req: Request, _res: Response, next: NextFunction) => {
    Sentry.captureException(err);
    next(err);
  };
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>): string {
  const config = getSentryConfig();
  if (!config.enabled) {
    return '';
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Manually capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): string {
  const config = getSentryConfig();
  if (!config.enabled) {
    return '';
  }

  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: { id: string; email?: string; username?: string }): void {
  const config = getSentryConfig();
  if (!config.enabled) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  const config = getSentryConfig();
  if (!config.enabled) {
    return;
  }

  Sentry.setUser(null);
}

/**
 * Add custom breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
): void {
  const config = getSentryConfig();
  if (!config.enabled) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return getSentryConfig().enabled;
}

// Export Sentry for direct access if needed
export { Sentry };
