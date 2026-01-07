import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request to include tracing context
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      requestStartTime: bigint;
      traceId: string;
      spanId: string;
      traceFlags: string;
    }
  }
}

/**
 * Request Tracing Middleware
 *
 * Features:
 * - Generates unique request ID (or uses existing X-Request-ID header)
 * - Implements W3C Trace Context propagation (traceparent, tracestate)
 * - Adds tracing headers to response for distributed tracing
 * - Stores trace context in req for use in other middleware/routes
 * - Records request start time for timing calculations
 *
 * W3C Trace Context Format:
 * traceparent: 00-<trace-id>-<span-id>-<trace-flags>
 * - version: 00 (fixed)
 * - trace-id: 32-character hex string (128 bits)
 * - span-id: 16-character hex string (64 bits)
 * - trace-flags: 2-character hex string (8 bits)
 *
 * Reference: https://www.w3.org/TR/trace-context/
 */

/**
 * Generate random trace ID (128 bits / 32 hex chars)
 */
function generateTraceId(): string {
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').substring(0, 16);
}

/**
 * Generate random span ID (64 bits / 16 hex chars)
 */
function generateSpanId(): string {
  return randomUUID().replace(/-/g, '').substring(0, 16);
}

/**
 * Parse W3C traceparent header
 * Format: 00-<trace-id>-<span-id>-<trace-flags>
 */
function parseTraceparent(traceparent: string): {
  version: string;
  traceId: string;
  parentSpanId: string;
  traceFlags: string;
} | null {
  const parts = traceparent.split('-');
  if (parts.length !== 4) {
    return null;
  }

  const [version, traceId, parentSpanId, traceFlags] = parts;

  // Validate format
  if (
    version.length !== 2 ||
    traceId.length !== 32 ||
    parentSpanId.length !== 16 ||
    traceFlags.length !== 2
  ) {
    return null;
  }

  // Validate trace ID is not all zeros
  if (traceId === '00000000000000000000000000000000') {
    return null;
  }

  // Validate span ID is not all zeros
  if (parentSpanId === '0000000000000000') {
    return null;
  }

  return {
    version,
    traceId,
    parentSpanId,
    traceFlags,
  };
}

/**
 * Request Tracing Middleware
 */
export function requestTracing(req: Request, res: Response, next: NextFunction): void {
  // Generate or extract request ID
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = requestId;
  req.requestStartTime = process.hrtime.bigint();

  // Parse W3C Trace Context from incoming request
  const incomingTraceparent = req.headers['traceparent'] as string;
  let traceId: string;
  let parentSpanId: string | undefined;
  let traceFlags: string;

  if (incomingTraceparent) {
    const parsed = parseTraceparent(incomingTraceparent);
    if (parsed) {
      // Continue existing trace
      traceId = parsed.traceId;
      parentSpanId = parsed.parentSpanId;
      traceFlags = parsed.traceFlags;
    } else {
      // Invalid traceparent, start new trace
      traceId = generateTraceId();
      traceFlags = '01'; // Sampled
    }
  } else {
    // Start new trace
    traceId = generateTraceId();
    traceFlags = '01'; // Sampled
  }

  // Generate new span ID for this request
  const spanId = generateSpanId();

  // Store trace context in request
  req.traceId = traceId;
  req.spanId = spanId;
  req.traceFlags = traceFlags;

  // Build traceparent header for this request
  const traceparent = `00-${traceId}-${spanId}-${traceFlags}`;

  // Add tracing headers to response
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('traceparent', traceparent);
  res.setHeader('X-Trace-ID', traceId);
  res.setHeader('X-Span-ID', spanId);

  // Propagate tracestate if present (key-value pairs for vendor-specific data)
  const tracestate = req.headers['tracestate'] as string;
  if (tracestate) {
    res.setHeader('tracestate', tracestate);
  }

  next();
}
