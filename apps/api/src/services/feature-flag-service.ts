import { FeatureFlag, FeatureFlagTarget, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { redis } from '../utils/redis';
import { log } from '../utils/logger';

/**
 * Feature Flag Service
 * Manages feature flags with support for targeting and gradual rollout
 * Includes Redis caching for performance
 */

export interface FlagContext {
  userId?: string;
  organizationId?: string;
}

export interface CreateFlagData {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  targetType?: FeatureFlagTarget;
  targetIds?: string[];
  percentage?: number;
  metadata?: Prisma.JsonValue;
}

export interface UpdateFlagData {
  name?: string;
  description?: string;
  enabled?: boolean;
  targetType?: FeatureFlagTarget;
  targetIds?: string[];
  percentage?: number;
  metadata?: Prisma.JsonValue;
}

class FeatureFlagService {
  private readonly CACHE_PREFIX = 'feature_flag:';
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Check if a feature flag is enabled for the given context
   */
  async isEnabled(key: string, context?: FlagContext): Promise<boolean> {
    try {
      const flag = await this.getFlag(key);

      if (!flag) {
        return false; // Flag doesn't exist, default to disabled
      }

      if (!flag.enabled) {
        return false; // Flag is globally disabled
      }

      // GLOBAL: enabled for everyone
      if (flag.targetType === 'GLOBAL') {
        return true;
      }

      // ORGANIZATION: enabled for specific organizations
      if (flag.targetType === 'ORGANIZATION' && context?.organizationId) {
        return flag.targetIds.includes(context.organizationId);
      }

      // USER: enabled for specific users
      if (flag.targetType === 'USER' && context?.userId) {
        return flag.targetIds.includes(context.userId);
      }

      // PERCENTAGE: gradual rollout based on percentage
      if (flag.targetType === 'PERCENTAGE' && flag.percentage !== null) {
        const identifier = context?.userId || context?.organizationId;
        if (!identifier) {
          return false;
        }
        return this.isInPercentage(identifier, flag.percentage);
      }

      return false;
    } catch (error) {
      log.error(`Error checking feature flag ${key}:`, error);
      return false; // Fail closed - if error, feature is disabled
    }
  }

  /**
   * Get a feature flag by key (with caching)
   */
  async getFlag(key: string): Promise<FeatureFlag | null> {
    const cacheKey = `${this.CACHE_PREFIX}${key}`;

    // Try to get from cache first
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        log.error('Redis cache error:', error);
      }
    }

    // Get from database
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
    });

    // Cache the result
    if (flag && redis) {
      try {
        await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(flag));
      } catch (error) {
        log.error('Redis cache error:', error);
      }
    }

    return flag;
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    return await prisma.featureFlag.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new feature flag
   */
  async createFlag(data: CreateFlagData): Promise<FeatureFlag> {
    const flag = await prisma.featureFlag.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description,
        enabled: data.enabled ?? false,
        targetType: data.targetType ?? 'GLOBAL',
        targetIds: data.targetIds ?? [],
        percentage: data.percentage,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    await this.invalidateCache(flag.key);
    return flag;
  }

  /**
   * Update a feature flag
   */
  async updateFlag(key: string, data: UpdateFlagData): Promise<FeatureFlag> {
    const flag = await prisma.featureFlag.update({
      where: { key },
      data: {
        name: data.name,
        description: data.description,
        enabled: data.enabled,
        targetType: data.targetType,
        targetIds: data.targetIds,
        percentage: data.percentage,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    await this.invalidateCache(key);
    return flag;
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(key: string): Promise<void> {
    await prisma.featureFlag.delete({
      where: { key },
    });

    await this.invalidateCache(key);
  }

  /**
   * Enable a feature flag for a specific organization
   */
  async enableForOrg(key: string, orgId: string): Promise<void> {
    const flag = await this.getFlag(key);
    if (!flag) {
      throw new Error(`Feature flag ${key} not found`);
    }

    const targetIds = flag.targetIds.includes(orgId)
      ? flag.targetIds
      : [...flag.targetIds, orgId];

    await this.updateFlag(key, {
      targetType: 'ORGANIZATION',
      targetIds,
      enabled: true,
    });
  }

  /**
   * Disable a feature flag for a specific organization
   */
  async disableForOrg(key: string, orgId: string): Promise<void> {
    const flag = await this.getFlag(key);
    if (!flag) {
      throw new Error(`Feature flag ${key} not found`);
    }

    const targetIds = flag.targetIds.filter(id => id !== orgId);

    await this.updateFlag(key, {
      targetIds,
    });
  }

  /**
   * Enable a feature flag for a specific user
   */
  async enableForUser(key: string, userId: string): Promise<void> {
    const flag = await this.getFlag(key);
    if (!flag) {
      throw new Error(`Feature flag ${key} not found`);
    }

    const targetIds = flag.targetIds.includes(userId)
      ? flag.targetIds
      : [...flag.targetIds, userId];

    await this.updateFlag(key, {
      targetType: 'USER',
      targetIds,
      enabled: true,
    });
  }

  /**
   * Disable a feature flag for a specific user
   */
  async disableForUser(key: string, userId: string): Promise<void> {
    const flag = await this.getFlag(key);
    if (!flag) {
      throw new Error(`Feature flag ${key} not found`);
    }

    const targetIds = flag.targetIds.filter(id => id !== userId);

    await this.updateFlag(key, {
      targetIds,
    });
  }

  /**
   * Set percentage rollout for gradual feature release
   */
  async setPercentage(key: string, percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    await this.updateFlag(key, {
      targetType: 'PERCENTAGE',
      percentage,
      enabled: true,
    });
  }

  /**
   * Get all flags enabled for a specific context
   */
  async getEnabledFlags(context?: FlagContext): Promise<string[]> {
    const flags = await this.getAllFlags();
    const enabledFlags: string[] = [];

    for (const flag of flags) {
      const isEnabled = await this.isEnabled(flag.key, context);
      if (isEnabled) {
        enabledFlags.push(flag.key);
      }
    }

    return enabledFlags;
  }

  /**
   * Invalidate cache for a feature flag
   */
  private async invalidateCache(key: string): Promise<void> {
    if (redis) {
      try {
        await redis.del(`${this.CACHE_PREFIX}${key}`);
      } catch (error) {
        log.error('Redis cache invalidation error:', error);
      }
    }
  }

  /**
   * Determine if an identifier falls within a percentage rollout
   * Uses consistent hashing to ensure same identifier always gets same result
   */
  private isInPercentage(identifier: string, percentage: number): boolean {
    // Simple hash function for consistent distribution
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    const normalizedHash = Math.abs(hash % 100);
    return normalizedHash < percentage;
  }
}

export const featureFlagService = new FeatureFlagService();
