/**
 * Sentry Edge Configuration
 *
 * This file configures Sentry for Next.js Edge Runtime (middleware, edge functions).
 * It is automatically loaded by @sentry/nextjs.
 */

import * as Sentry from '@sentry/nextjs';
import { getSentryConfig, getCommonSentryOptions } from './lib/sentry';

const config = getSentryConfig();

if (config.enabled) {
  Sentry.init({
    ...getCommonSentryOptions(),

    // Edge runtime has limited integrations
    integrations: [],

    // Additional edge-specific options
    normalizeDepth: 5, // Lower depth for edge runtime
  });

  console.log('Sentry edge initialized', {
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
  });
} else {
  console.log('Sentry edge is disabled (no NEXT_PUBLIC_SENTRY_DSN configured)');
}
