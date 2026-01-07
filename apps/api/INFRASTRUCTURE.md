# Infrastructure Features

## Overview

This document describes the infrastructure features added to the Express API for improved reliability, security, and observability.

## Features

### 1. Rate Limiting Middleware

Location: `src/middleware/rate-limit-middleware.ts`

Implements distributed rate limiting with Redis support and memory fallback.

#### Rate Limiters

- **authRateLimiter**: 5 requests/min for auth endpoints (login, signup)
- **apiRateLimiter**: 100 requests/min for general API endpoints
- **publicRateLimiter**: 30 requests/min for public endpoints
- **strictRateLimiter**: 3 requests/min for sensitive operations

#### Configuration

Uses Redis when available for distributed rate limiting across multiple instances. Falls back to memory-based limiting for single-instance deployments.

#### Usage

```typescript
import { authRateLimiter, apiRateLimiter } from './middleware/rate-limit-middleware';

// Apply to auth routes
app.use('/api/auth', authRateLimiter, authRouter);

// Apply to API routes
app.use('/api/users', apiRateLimiter, userRouter);
```

### 2. Health Check Endpoints

Location: `src/routes/health-routes.ts`

Provides comprehensive health monitoring endpoints for orchestration platforms.

#### Endpoints

**GET /api/health**
- Comprehensive health check
- Returns database and Redis connectivity status
- Memory usage statistics
- System uptime
- Returns 200 (OK) or 503 (Service Unavailable)

Example response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-07T12:00:00.000Z",
  "uptime": 3600.5,
  "version": "0.1.0",
  "services": {
    "database": {
      "status": "connected",
      "responseTime": 12
    },
    "redis": {
      "status": "connected",
      "responseTime": 5
    }
  },
  "memory": {
    "used": 256,
    "total": 512,
    "percentage": 50
  }
}
```

**GET /api/health/live**
- Liveness probe for Kubernetes/Docker
- Simple check if process is running
- Always returns 200 if server is alive

**GET /api/health/ready**
- Readiness probe for Kubernetes/Docker
- Checks if database is connected
- Returns 200 (ready) or 503 (not ready)

### 3. Redis Cache Layer

#### Redis Client

Location: `src/utils/redis.ts`

Singleton Redis client with connection management:
- Auto-reconnect with exponential backoff
- Graceful degradation if Redis unavailable
- Connection event logging
- Environment variable configuration

Configuration:
```bash
REDIS_URL=redis://localhost:6379
```

Functions:
- `connectRedis()`: Establishes Redis connection
- `disconnectRedis()`: Closes connection gracefully
- `isRedisAvailable()`: Checks if Redis is ready

#### Cache Service

Location: `src/services/cache-service.ts`

High-level caching API with graceful fallback:

```typescript
import { cacheService } from './services/cache-service';

// Get cached value
const user = await cacheService.get<User>('user:123');

// Set with TTL (in seconds)
await cacheService.set('user:123', userData, 3600);

// Delete key
await cacheService.del('user:123');

// Invalidate by pattern
await cacheService.invalidatePattern('user:*');

// Cache wrapper (get from cache or execute function)
const data = await cacheService.wrap(
  'expensive:data',
  async () => await fetchExpensiveData(),
  3600
);

// Increment counter
await cacheService.increment('api:calls', 1);
```

Methods:
- `get<T>(key)`: Get cached value
- `set(key, value, ttl)`: Set with TTL
- `del(key)`: Delete key
- `invalidatePattern(pattern)`: Delete matching keys
- `wrap(key, fn, ttl)`: Cache wrapper
- `exists(key)`: Check if key exists
- `expire(key, ttl)`: Update TTL
- `increment(key, value)`: Increment counter

## Environment Variables

```bash
# Redis configuration (optional)
REDIS_URL=redis://localhost:6379

# If Redis unavailable, features gracefully degrade
```

## Testing

### Health Check
```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/health/live
curl http://localhost:4000/api/health/ready
```

### Rate Limiting
```bash
# Test auth rate limit (5 req/min)
for i in {1..10}; do
  curl -X POST http://localhost:4000/api/auth/login
done
```

### Cache Service
```typescript
// Example usage in service
import { cacheService } from '../services/cache-service';

async function getUser(userId: string) {
  return cacheService.wrap(
    `user:${userId}`,
    async () => {
      return await prisma.user.findUnique({ where: { id: userId } });
    },
    300 // 5 minutes
  );
}
```

## Production Considerations

### Redis
- Use managed Redis service (AWS ElastiCache, Redis Cloud)
- Enable persistence for critical data
- Configure eviction policy (allkeys-lru recommended)
- Monitor memory usage

### Rate Limiting
- Adjust limits based on traffic patterns
- Use Redis store for multi-instance deployments
- Monitor rate limit hits in production

### Health Checks
- Configure orchestrator (Kubernetes, Docker Swarm) to use:
  - Liveness: `/api/health/live`
  - Readiness: `/api/health/ready`
- Set appropriate timeout and interval values
- Monitor health endpoint for degraded states

## Dependencies

- `express-rate-limit`: Rate limiting middleware
- `rate-limit-redis`: Redis store for rate limiting
- `ioredis`: Redis client for Node.js
