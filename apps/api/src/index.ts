// Initialize Sentry FIRST before any other imports
import { initializeSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './config/sentry';
initializeSentry();

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import routes from './routes';
import { swaggerSpec } from './config/swagger';
import { healthRouter } from './routes/v1/health-routes';
import { webhookRouter } from './routes/v1/webhook-routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { requestTracing } from './middleware/request-tracing';
import { metricsMiddleware } from './middleware/metrics-middleware';
import { authRateLimiter, apiRateLimiter } from './middleware/rate-limit-middleware';
import { csrfTokenProvider } from './middleware/csrf-middleware';
import { cspMiddleware } from './middleware/csp-middleware';
import { wsService } from './services/websocket-service';
import { metricsService } from './services/metrics-service';
import { connectRedis } from './utils/redis';
import logger from './utils/logger';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;

// Initialize Redis connection (optional)
connectRedis().catch((err) => {
  logger.warn('Redis connection failed. Continuing without cache', { error: err });
});

// Initialize WebSocket
wsService.initialize(httpServer);

// Sentry request and tracing handlers - MUST be before all other middleware
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// Security middleware - Enhanced Helmet configuration
app.use(helmet({
  // Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // Prevent MIME type sniffing
  noSniff: true,
  // Prevent clickjacking
  frameguard: {
    action: 'deny',
  },
  // XSS Protection (legacy browsers)
  xssFilter: true,
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  // Content Security Policy (handled by separate middleware)
  contentSecurityPolicy: false, // We use custom CSP middleware
  // Permissions Policy - Disable unnecessary browser features
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none',
  },
  // Hide X-Powered-By header
  hidePoweredBy: true,
  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },
  // Download Options (IE8+)
  ieNoOpen: true,
}));

// CORS - allow all localhost for development
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow all localhost/127.0.0.1 origins
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // Allow configured frontend URL
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    callback(null, false);
  },
  credentials: true,
}));

// Stripe webhook - MUST be before body parser to get raw body
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRouter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Security middleware
app.use(cspMiddleware()); // Content Security Policy
app.use(csrfTokenProvider); // CSRF token generation helper

// Monitoring and observability
app.use(requestTracing);  // Must be before requestLogger to provide requestId
app.use(metricsMiddleware);  // Collect Prometheus metrics
app.use(requestLogger);  // Logs with requestId context

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'NirmiteeRPM API Documentation',
}));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// Prometheus metrics endpoint (no rate limiting, no auth)
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metricsService.registry.contentType);
    const metrics = await metricsService.getMetrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end('Error collecting metrics');
  }
});

// Health check routes (no rate limiting) - direct access for backwards compatibility
app.use('/api/health', healthRouter);

// Mount versioned API routes with rate limiting
app.use('/api', apiRateLimiter, routes);

// Sentry error handler - MUST be after routes but BEFORE custom error handler
app.use(sentryErrorHandler());

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_, res) => {
  res.status(404).json({ error: 'Not found' });
});

httpServer.listen(PORT, () => {
  const startupMessage = `
╔═══════════════════════════════════════════════════════╗
║              NirmiteeRPM API Server                   ║
║                                                       ║
║  Status: Running                                      ║
║  Port: ${PORT}                                           ║
║  Environment: ${process.env.NODE_ENV || 'development'}                          ║
║  WebSocket: Enabled                                   ║
║  Rate Limiting: Enabled                               ║
║  Request Tracing: Enabled (X-Request-ID)              ║
║  Metrics: Enabled (Prometheus)                        ║
║  Error Tracking: ${process.env.SENTRY_DSN ? 'Enabled (Sentry)' : 'Disabled'}                   ║
║                                                       ║
║  Documentation:                                       ║
║  - GET  /api/docs             (Swagger UI)            ║
║  - GET  /api/docs.json        (OpenAPI Spec)          ║
║                                                       ║
║  API Endpoints:                                       ║
║  - /api/v1/*                  (Version 1)             ║
║  - /api/*                     (defaults to v1)        ║
║                                                       ║
║  Monitoring:                                          ║
║  - GET  /metrics              (Prometheus metrics)    ║
║  - GET  /api/health           (Health check)          ║
║  - GET  /api/health/live      (Liveness probe)        ║
║  - GET  /api/health/ready     (Readiness probe)       ║
║                                                       ║
║  Authentication:                                      ║
║  - POST /api/auth/login                               ║
║  - POST /api/auth/signup                              ║
║  - POST /api/auth/refresh                             ║
║  - POST /api/auth/logout                              ║
╚═══════════════════════════════════════════════════════╝
  `;
  logger.info(startupMessage);
});

export default app;
