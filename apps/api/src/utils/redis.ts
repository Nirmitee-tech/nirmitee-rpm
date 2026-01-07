import Redis from 'ioredis';
import { log } from './logger';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

let redisClient: Redis | null = null;

function createRedisClient(): Redis | null {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          log.warn('Redis connection failed after 3 retries. Running without cache.');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    client.on('error', (err) => {
      log.error('Redis client error:', err);
    });

    client.on('connect', () => {
      log.info('Redis client connected');
    });

    client.on('ready', () => {
      log.info('Redis client ready');
    });

    client.on('close', () => {
      log.info('Redis client disconnected');
    });

    return client;
  } catch (error) {
    log.error('Failed to create Redis client:', error);
    return null;
  }
}

export const redis = globalForRedis.redis ?? createRedisClient() ?? undefined;

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export async function connectRedis(): Promise<boolean> {
  if (!redis) {
    log.warn('Redis client not available. Running without cache.');
    return false;
  }

  try {
    await redis.connect();
    return true;
  } catch (error) {
    log.error('Failed to connect to Redis:', error);
    return false;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
  }
}

export function isRedisAvailable(): boolean {
  return redis !== undefined && redis.status === 'ready';
}
