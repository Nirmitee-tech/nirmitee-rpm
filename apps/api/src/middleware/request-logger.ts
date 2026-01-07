import { Request, Response, NextFunction } from 'express';
import { createRequestLogger } from '../utils/logger';

/**
 * Request Logger Middleware
 *
 * Logs HTTP requests with request ID context from request-tracing middleware
 * Should be placed after request-tracing middleware in the stack
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Use request ID from request-tracing middleware
  const requestId = req.requestId || 'unknown';
  const logger = createRequestLogger(requestId);

  // Log request start
  logger.info(`--> ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response
  res.on('finish', () => {
    const duration = req.requestStartTime
      ? Number(process.hrtime.bigint() - req.requestStartTime) / 1e6
      : 0;

    logger.info(`<-- ${req.method} ${req.path} ${res.statusCode}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
    });
  });

  next();
}
