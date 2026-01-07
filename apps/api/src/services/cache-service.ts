import { redis, isRedisAvailable } from '../utils/redis';
import { log } from '../utils/logger';

export class CacheService {
  /**
   * Get cached value by key
   * @param key Cache key
   * @returns Cached value or null if not found or Redis unavailable
   */
  async get<T>(key: string): Promise<T | null> {
    if (!isRedisAvailable() || !redis) {
      return null;
    }

    try {
      const value = await redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      log.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cache value with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds
   * @returns true if successful, false otherwise
   */
  async set(key: string, value: unknown, ttl: number): Promise<boolean> {
    if (!isRedisAvailable() || !redis) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      log.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cache entry by key
   * @param key Cache key to delete
   * @returns Number of keys deleted
   */
  async del(key: string): Promise<number> {
    if (!isRedisAvailable() || !redis) {
      return 0;
    }

    try {
      return await redis.del(key);
    } catch (error) {
      log.error(`Cache delete error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate cache entries by pattern
   * @param pattern Pattern to match (e.g., "user:*")
   * @returns Number of keys deleted
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!isRedisAvailable() || !redis) {
      return 0;
    }

    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      return await redis.del(...keys);
    } catch (error) {
      log.error(`Cache invalidate pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Cache wrapper function - get from cache or execute function and cache result
   * @param key Cache key
   * @param fn Function to execute if cache miss
   * @param ttl Time to live in seconds
   * @returns Cached or freshly computed value
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttl: number): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  /**
   * Check if a key exists in cache
   * @param key Cache key
   * @returns true if key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    if (!isRedisAvailable() || !redis) {
      return false;
    }

    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      log.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set TTL on existing key
   * @param key Cache key
   * @param ttl Time to live in seconds
   * @returns true if successful, false otherwise
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!isRedisAvailable() || !redis) {
      return false;
    }

    try {
      const result = await redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      log.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment counter
   * @param key Cache key
   * @param increment Value to increment by (default: 1)
   * @returns New value after increment
   */
  async increment(key: string, increment = 1): Promise<number> {
    if (!isRedisAvailable() || !redis) {
      return 0;
    }

    try {
      return await redis.incrby(key, increment);
    } catch (error) {
      log.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }
}

export const cacheService = new CacheService();
