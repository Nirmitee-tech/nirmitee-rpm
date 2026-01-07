import { Router, Request, Response } from 'express';
import { prisma } from '../../utils/prisma';
import { isRedisAvailable, redis } from '../../utils/redis';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

const router = Router();

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unavailable';
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    storage?: ServiceHealth;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu?: {
    usage: number;
  };
}

/**
 * Check database health (deep check)
 */
async function checkDatabaseHealth(): Promise<ServiceHealth> {
  try {
    const dbStartTime = Date.now();

    // Perform actual query
    await prisma.$queryRaw`SELECT 1`;

    // Get pool stats if available
    const poolStats = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM pg_stat_activity WHERE datname = current_database()
    `.catch(() => null);

    const dbResponseTime = Date.now() - dbStartTime;

    return {
      status: dbResponseTime < 100 ? 'healthy' : 'degraded',
      responseTime: dbResponseTime,
      details: poolStats ? { activeConnections: Number(poolStats[0]?.count || 0) } : undefined,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

/**
 * Check Redis health (deep check)
 */
async function checkRedisHealth(): Promise<ServiceHealth> {
  if (!isRedisAvailable() || !redis) {
    return { status: 'unavailable' };
  }

  try {
    const redisStartTime = Date.now();

    // Ping test
    await redis.ping();

    // Get Redis info
    const info = await redis.info('server');
    const redisResponseTime = Date.now() - redisStartTime;

    // Parse version from info
    const versionMatch = info.match(/redis_version:(\S+)/);
    const version = versionMatch ? versionMatch[1] : undefined;

    return {
      status: redisResponseTime < 50 ? 'healthy' : 'degraded',
      responseTime: redisResponseTime,
      details: version ? { version } : undefined,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown Redis error',
    };
  }
}

/**
 * Check S3 storage health (optional)
 */
async function checkStorageHealth(): Promise<ServiceHealth> {
  // Only check if S3 is configured
  if (!process.env.S3_BUCKET) {
    return { status: 'unavailable' };
  }

  try {
    const s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      credentials: process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY ? {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      } : undefined,
      forcePathStyle: process.env.S3_USE_PATH_STYLE === 'true',
    });

    const s3StartTime = Date.now();
    await s3Client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }));
    const s3ResponseTime = Date.now() - s3StartTime;

    return {
      status: s3ResponseTime < 200 ? 'healthy' : 'degraded',
      responseTime: s3ResponseTime,
      details: { bucket: process.env.S3_BUCKET },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown storage error',
    };
  }
}

/**
 * GET /api/health - Comprehensive health check endpoint
 * Returns 200 if all critical services are healthy
 * Returns 503 if any critical service is down
 */
router.get('/', async (_req: Request, res: Response) => {
  const healthCheck: HealthCheckResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0',
    services: {
      database: { status: 'unhealthy' },
      redis: { status: 'unavailable' },
    },
    memory: {
      used: 0,
      total: 0,
      percentage: 0,
    },
  };

  // Run all health checks in parallel
  const [database, redis, storage] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkStorageHealth(),
  ]);

  healthCheck.services.database = database;
  healthCheck.services.redis = redis;
  if (storage.status !== 'unavailable') {
    healthCheck.services.storage = storage;
  }

  // Determine overall status
  if (database.status === 'unhealthy') {
    healthCheck.status = 'error';
  } else if (
    database.status === 'degraded' ||
    redis.status === 'unhealthy' ||
    redis.status === 'degraded' ||
    (storage.status !== 'unavailable' && (storage.status === 'unhealthy' || storage.status === 'degraded'))
  ) {
    healthCheck.status = 'degraded';
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  healthCheck.memory = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
  };

  // CPU usage (simple approximation)
  const cpuUsage = process.cpuUsage();
  healthCheck.cpu = {
    usage: Math.round(((cpuUsage.user + cpuUsage.system) / 1000000) * 100) / 100, // seconds
  };

  // Determine HTTP status code
  const statusCode = healthCheck.status === 'error' ? 503 : 200;

  res.status(statusCode).json(healthCheck);
});

/**
 * GET /api/health/live - Liveness probe
 * Simple check if the server is running
 * Returns 200 if the process is alive
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/health/ready - Readiness probe
 * Check if the server is ready to accept traffic
 * Returns 200 if database is connected
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Database connection failed',
    });
  }
});

export { router as healthRouter };
