import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Request } from 'express';
import { redis, isRedisAvailable } from '../utils/redis';
import { log } from '../utils/logger';
import { securityLogger } from '../utils/security-logger';

/**
 * Create rate limiter with Redis store if available, otherwise use memory store
 */
function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}): RateLimitRequestHandler {
  const baseConfig = {
    windowMs: options.windowMs,
    max: options.max,
    message: { error: options.message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: options.keyGenerator,
    handler: (req: Request, res: any) => {
      // Log rate limit exceeded
      securityLogger.logRateLimitExceeded({
        userId: (req as any).user?.userId,
        organizationId: (req as any).user?.organizationId,
        apiKeyId: (req as any).apiKey?.apiKeyId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method,
      });

      res.status(429).json({ error: options.message });
    },
  };

  // Use Redis store if available for distributed rate limiting
  if (isRedisAvailable() && redis) {
    return rateLimit({
      ...baseConfig,
      store: new RedisStore({
        // @ts-expect-error - RedisStore expects different type but ioredis works
        sendCommand: (...args: string[]) => redis.call(...args),
      }),
    });
  }

  // Fallback to memory store
  log.warn('Redis not available. Using memory-based rate limiting (not suitable for multi-instance deployments).');
  return rateLimit(baseConfig);
}

/**
 * Generate rate limit key based on user, API key, or IP
 */
function generateRateLimitKey(req: Request): string {
  // Prioritize user ID if authenticated
  if ((req as any).user?.userId) {
    return `user:${(req as any).user.userId}`;
  }

  // Use API key if present
  if ((req as any).apiKey?.apiKeyId) {
    return `apikey:${(req as any).apiKey.apiKeyId}`;
  }

  // Fallback to IP address
  return `ip:${req.ip}`;
}

/**
 * Rate limiter for authentication endpoints (login, signup)
 * Stricter limits to prevent brute force attacks
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many authentication attempts. Please try again later.',
  skipSuccessfulRequests: false,
});

/**
 * Rate limiter for general API endpoints
 * Per user/API key/IP
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per user/API key
  message: 'Too many requests. Please try again later.',
  skipSuccessfulRequests: false,
  keyGenerator: generateRateLimitKey,
});

/**
 * Rate limiter for public endpoints
 * Per IP address
 */
export const publicRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: 'Too many requests. Please try again later.',
  skipSuccessfulRequests: false,
});

/**
 * Strict rate limiter for sensitive operations
 * Used for password reset, MFA, etc.
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute
  message: 'Too many attempts. Please try again later.',
  skipSuccessfulRequests: false,
});
