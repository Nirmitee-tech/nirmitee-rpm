/**
 * Sentry Server Configuration
 *
 * This file configures Sentry for the Next.js server side (API routes, SSR, etc.).
 * It is automatically loaded by @sentry/nextjs.
 */

import * as Sentry from '@sentry/nextjs';
import { getSentryConfig, getCommonSentryOptions } from './lib/sentry';

const config = getSentryConfig();

if (config.enabled) {
  Sentry.init({
    ...getCommonSentryOptions(),

    // Server-specific integrations
    integrations: [
      Sentry.httpIntegration(),
    ],

    // Additional server-specific options
    normalizeDepth: 10,
  });

  console.log('Sentry server initialized', {
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
  });
} else {
  console.log('Sentry server is disabled (no NEXT_PUBLIC_SENTRY_DSN configured)');
}
