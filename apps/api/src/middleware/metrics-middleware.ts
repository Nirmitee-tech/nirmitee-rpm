import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metrics-service';

/**
 * Metrics Middleware - Records Prometheus metrics for each HTTP request
 *
 * Tracks:
 * - Request count by method/route/status
 * - Request duration in seconds
 * - Active connections
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime.bigint();

  // Increment active connections
  metricsService.incrementActiveConnections();

  // Normalize route path for metrics (remove IDs)
  const normalizeRoute = (path: string): string => {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUID
      .replace(/\/[0-9a-f]{24,}/gi, '/:id') // MongoDB ObjectId or long IDs
      .replace(/\/\d+/g, '/:id'); // Numeric IDs
  };

  // Record metrics on response finish
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationNs = endTime - startTime;
    const durationSeconds = Number(durationNs) / 1e9;

    const route = normalizeRoute(req.path);

    metricsService.recordHttpRequest(
      req.method,
      route,
      res.statusCode,
      durationSeconds
    );

    // Decrement active connections
    metricsService.decrementActiveConnections();
  });

  // Handle aborted requests
  res.on('close', () => {
    if (!res.writableEnded) {
      metricsService.decrementActiveConnections();
    }
  });

  next();
}
