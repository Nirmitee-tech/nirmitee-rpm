/**
 * Sentry Client Configuration
 *
 * This file configures Sentry for the browser/client side.
 * It is automatically loaded by @sentry/nextjs.
 */

import * as Sentry from '@sentry/nextjs';
import { getSentryConfig, getCommonSentryOptions } from './lib/sentry';

const config = getSentryConfig();

if (config.enabled) {
  Sentry.init({
    ...getCommonSentryOptions(),

    // Session Replay for error debugging
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.browserTracingIntegration(),
    ],

    // Session Replay sampling rates
    replaysSessionSampleRate: config.replaysSessionSampleRate,
    replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,

    // Additional client-specific options
    normalizeDepth: 10,
  });

  console.log('Sentry client initialized', {
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
  });
} else {
  console.log('Sentry client is disabled (no NEXT_PUBLIC_SENTRY_DSN configured)');
}
