/**
 * Sentry Configuration for Frontend (Next.js)
 *
 * This file exports common configuration used by both client and server Sentry configs.
 *
 * Environment Variables:
 * - NEXT_PUBLIC_SENTRY_DSN: Sentry Data Source Name (required for Sentry to work)
 * - NEXT_PUBLIC_SENTRY_ENVIRONMENT: Environment name (development, staging, production)
 * - NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: Percentage of transactions to trace (0.0 - 1.0)
 */

export interface SentryConfig {
  dsn?: string;
  environment: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  enabled: boolean;
}

/**
 * Get Sentry configuration from environment variables
 */
export function getSentryConfig(): SentryConfig {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const environment =
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const tracesSampleRate = parseFloat(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1'
  );
  const enabled = !!dsn;

  return {
    dsn,
    environment,
    tracesSampleRate: Math.max(0, Math.min(1, tracesSampleRate)),
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,
    enabled,
  };
}

/**
 * Common Sentry options for both client and server
 */
export function getCommonSentryOptions() {
  const config = getSentryConfig();

  return {
    dsn: config.dsn,
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,

    // Performance monitoring options
    tracesSampler: (samplingContext: any) => {
      // Sample 100% of errors
      if (samplingContext.transactionContext.op === 'error') {
        return 1.0;
      }

      // Sample auth pages at higher rate
      if (
        samplingContext.transactionContext.name?.includes('/login') ||
        samplingContext.transactionContext.name?.includes('/signup')
      ) {
        return Math.min(config.tracesSampleRate * 2, 1.0);
      }

      // Default sample rate
      return config.tracesSampleRate;
    },

    // Error filtering
    beforeSend: (event: any, hint: any) => {
      // Filter out known non-critical errors
      const error = hint?.originalException;

      if (error instanceof Error) {
        // Don't send validation errors (they're expected)
        if (error.message.includes('validation') || error.message.includes('Validation')) {
          return null;
        }

        // Don't send 404 errors
        if (error.message.includes('Not found') || error.message.includes('not found')) {
          return null;
        }

        // Don't send network errors from development
        if (config.environment === 'development' && error.message.includes('fetch')) {
          return null;
        }
      }

      return event;
    },

    // Add custom tags
    initialScope: {
      tags: {
        service: 'web',
        runtime: 'nextjs',
      },
    },

    // Ignore specific URLs
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // Network errors
      'NetworkError',
      'Network request failed',
    ],
  };
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return getSentryConfig().enabled;
}
