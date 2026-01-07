import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/api-error';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';

/**
 * API Key Service
 * Manages programmatic API access for organizations
 *
 * Security Features:
 * - API keys are hashed before storage (never stored in plain text)
 * - Only shown once during generation
 * - Prefix-based identification for user convenience
 * - Expiration and revocation support
 * - Permission scoping
 * - Usage tracking
 */

const KEY_PREFIX = 'sk_'; // Secret key prefix
const KEY_LENGTH = 32; // 32 bytes = 256 bits

export interface CreateApiKeyInput {
  organizationId: string;
  createdBy: string;
  name: string;
  permissions?: string[];
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface CreateApiKeyResponse extends ApiKeyResponse {
  apiKey: string; // Only returned on creation
}

class ApiKeyService {
  /**
   * Generate API Key
   * Creates a new API key with cryptographically secure random string
   */
  async generateApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResponse> {
    const { organizationId, createdBy, name, permissions = [], expiresAt, metadata } = input;

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw ApiError.notFound('Organization not found');
    }

    // Generate random API key
    const randomBytes = crypto.randomBytes(KEY_LENGTH);
    const apiKey = `${KEY_PREFIX}${randomBytes.toString('hex')}`;

    // Create prefix for identification (first 12 chars)
    const keyPrefix = apiKey.substring(0, 12);

    // Hash the API key for storage
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Create API key record
    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        organizationId,
        createdBy,
        name,
        keyHash,
        keyPrefix,
        permissions,
        expiresAt,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    logger.info('API key generated', {
      apiKeyId: apiKeyRecord.id,
      organizationId,
      createdBy,
      name,
    });

    return {
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      keyPrefix: apiKeyRecord.keyPrefix,
      permissions: apiKeyRecord.permissions,
      expiresAt: apiKeyRecord.expiresAt,
      lastUsedAt: apiKeyRecord.lastUsedAt,
      isActive: apiKeyRecord.isActive,
      createdAt: apiKeyRecord.createdAt,
      createdBy: apiKeyRecord.createdBy,
      apiKey, // Only returned once
    };
  }

  /**
   * Validate API Key
   * Verifies API key and returns associated organization + permissions
   */
  async validateApiKey(apiKey: string): Promise<{
    organizationId: string;
    permissions: string[];
    apiKeyId: string;
  } | null> {
    if (!apiKey || !apiKey.startsWith(KEY_PREFIX)) {
      return null;
    }

    // Get prefix for faster lookup
    const keyPrefix = apiKey.substring(0, 12);

    // Find all API keys with matching prefix
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        keyPrefix,
        isActive: true,
      },
    });

    // Check each key with matching prefix
    for (const record of apiKeys) {
      const isValid = await bcrypt.compare(apiKey, record.keyHash);

      if (isValid) {
        // Check expiration
        if (record.expiresAt && record.expiresAt < new Date()) {
          logger.warn('Expired API key used', {
            apiKeyId: record.id,
            organizationId: record.organizationId,
          });
          return null;
        }

        // Update last used timestamp (async, don't block)
        this.updateLastUsed(record.id).catch((err) => {
          logger.error('Failed to update API key last used timestamp', { error: err });
        });

        return {
          organizationId: record.organizationId,
          permissions: record.permissions,
          apiKeyId: record.id,
        };
      }
    }

    return null;
  }

  /**
   * List API Keys
   * Get all API keys for an organization (without secrets)
   */
  async listApiKeys(organizationId: string): Promise<ApiKeyResponse[]> {
    const apiKeys = await prisma.apiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      isActive: key.isActive,
      createdAt: key.createdAt,
      createdBy: key.createdBy,
    }));
  }

  /**
   * Revoke API Key
   * Disable an API key (soft delete)
   */
  async revokeApiKey(apiKeyId: string, organizationId: string): Promise<void> {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, organizationId },
    });

    if (!apiKey) {
      throw ApiError.notFound('API key not found');
    }

    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { isActive: false },
    });

    logger.info('API key revoked', {
      apiKeyId,
      organizationId,
    });
  }

  /**
   * Rotate API Key
   * Generate new key and revoke old one
   */
  async rotateApiKey(
    apiKeyId: string,
    organizationId: string,
    userId: string
  ): Promise<CreateApiKeyResponse> {
    const oldKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, organizationId },
    });

    if (!oldKey) {
      throw ApiError.notFound('API key not found');
    }

    // Create new key with same permissions
    const newKey = await this.generateApiKey({
      organizationId,
      createdBy: userId,
      name: `${oldKey.name} (Rotated)`,
      permissions: oldKey.permissions,
      expiresAt: oldKey.expiresAt || undefined,
    });

    // Revoke old key
    await this.revokeApiKey(apiKeyId, organizationId);

    logger.info('API key rotated', {
      oldKeyId: apiKeyId,
      newKeyId: newKey.id,
      organizationId,
    });

    return newKey;
  }

  /**
   * Check if API key has permission
   */
  hasPermission(apiKeyPermissions: string[], requiredPermission: string): boolean {
    // Wildcard permission grants all access
    if (apiKeyPermissions.includes('*')) {
      return true;
    }

    // Check exact match
    if (apiKeyPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check wildcard match (e.g., "read:*" matches "read:users")
    const [resource, action] = requiredPermission.split(':');
    if (apiKeyPermissions.includes(`${resource}:*`)) {
      return true;
    }
    if (apiKeyPermissions.includes(`*:${action}`)) {
      return true;
    }

    return false;
  }

  /**
   * Update last used timestamp
   * Called after successful authentication
   */
  private async updateLastUsed(apiKeyId: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * Delete API Key
   * Permanently delete an API key (hard delete)
   */
  async deleteApiKey(apiKeyId: string, organizationId: string): Promise<void> {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, organizationId },
    });

    if (!apiKey) {
      throw ApiError.notFound('API key not found');
    }

    await prisma.apiKey.delete({
      where: { id: apiKeyId },
    });

    logger.info('API key deleted', {
      apiKeyId,
      organizationId,
    });
  }
}

export const apiKeyService = new ApiKeyService();
