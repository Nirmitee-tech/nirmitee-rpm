import logger from './logger';
import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

/**
 * Security Audit Logger
 * Specialized logging for security-sensitive events
 *
 * Events logged:
 * - Authentication attempts (success/failure)
 * - Permission denials
 * - API key usage
 * - Suspicious activities
 * - Security configuration changes
 */

export interface SecurityLogContext {
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  apiKeyId?: string;
  path?: string;
  method?: string;
  resource?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class SecurityLogger {
  /**
   * Log successful authentication
   */
  async logAuthSuccess(context: SecurityLogContext): Promise<void> {
    logger.info('Authentication successful', {
      event: 'auth.success',
      ...context,
    });

    await this.createAuditLog('auth.success', context);
  }

  /**
   * Log failed authentication attempt
   */
  async logAuthFailure(
    reason: string,
    context: SecurityLogContext
  ): Promise<void> {
    logger.warn('Authentication failed', {
      event: 'auth.failure',
      reason,
      ...context,
    });

    await this.createAuditLog('auth.failure', {
      ...context,
      metadata: { ...context.metadata, reason },
    });
  }

  /**
   * Log MFA verification
   */
  async logMfaVerification(
    success: boolean,
    context: SecurityLogContext
  ): Promise<void> {
    const event = success ? 'mfa.success' : 'mfa.failure';

    logger.info('MFA verification', {
      event,
      success,
      ...context,
    });

    await this.createAuditLog(event, context);
  }

  /**
   * Log permission denial
   */
  async logPermissionDenied(
    requiredPermission: string,
    context: SecurityLogContext
  ): Promise<void> {
    logger.warn('Permission denied', {
      event: 'permission.denied',
      requiredPermission,
      ...context,
    });

    await this.createAuditLog('permission.denied', {
      ...context,
      metadata: { ...context.metadata, requiredPermission },
    });
  }

  /**
   * Log API key usage
   */
  async logApiKeyUsage(context: SecurityLogContext): Promise<void> {
    logger.info('API key used', {
      event: 'apikey.used',
      ...context,
    });

    // Don't create audit log for every API key usage (too noisy)
    // Only log first use and suspicious patterns
  }

  /**
   * Log API key creation
   */
  async logApiKeyCreated(context: SecurityLogContext): Promise<void> {
    logger.info('API key created', {
      event: 'apikey.created',
      ...context,
    });

    await this.createAuditLog('apikey.created', context);
  }

  /**
   * Log API key revocation
   */
  async logApiKeyRevoked(context: SecurityLogContext): Promise<void> {
    logger.info('API key revoked', {
      event: 'apikey.revoked',
      ...context,
    });

    await this.createAuditLog('apikey.revoked', context);
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    description: string,
    context: SecurityLogContext
  ): Promise<void> {
    logger.error('Suspicious activity detected', {
      event: 'security.suspicious',
      description,
      ...context,
    });

    await this.createAuditLog('security.suspicious', {
      ...context,
      metadata: { ...context.metadata, description },
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimitExceeded(context: SecurityLogContext): Promise<void> {
    logger.warn('Rate limit exceeded', {
      event: 'ratelimit.exceeded',
      ...context,
    });

    // Track potential abuse
    await this.createAuditLog('ratelimit.exceeded', context);
  }

  /**
   * Log CSRF token validation failure
   */
  async logCsrfFailure(context: SecurityLogContext): Promise<void> {
    logger.warn('CSRF token validation failed', {
      event: 'csrf.failure',
      ...context,
    });

    await this.createAuditLog('csrf.failure', context);
  }

  /**
   * Log password change
   */
  async logPasswordChange(context: SecurityLogContext): Promise<void> {
    logger.info('Password changed', {
      event: 'password.changed',
      ...context,
    });

    await this.createAuditLog('password.changed', context);
  }

  /**
   * Log password reset request
   */
  async logPasswordResetRequest(context: SecurityLogContext): Promise<void> {
    logger.info('Password reset requested', {
      event: 'password.reset_requested',
      ...context,
    });

    await this.createAuditLog('password.reset_requested', context);
  }

  /**
   * Log password reset completion
   */
  async logPasswordReset(context: SecurityLogContext): Promise<void> {
    logger.info('Password reset completed', {
      event: 'password.reset_completed',
      ...context,
    });

    await this.createAuditLog('password.reset_completed', context);
  }

  /**
   * Log session creation
   */
  async logSessionCreated(context: SecurityLogContext): Promise<void> {
    logger.info('Session created', {
      event: 'session.created',
      ...context,
    });

    await this.createAuditLog('session.created', context);
  }

  /**
   * Log session revocation
   */
  async logSessionRevoked(context: SecurityLogContext): Promise<void> {
    logger.info('Session revoked', {
      event: 'session.revoked',
      ...context,
    });

    await this.createAuditLog('session.revoked', context);
  }

  /**
   * Create audit log entry in database
   */
  private async createAuditLog(
    action: string,
    context: SecurityLogContext
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: context.userId,
          organizationId: context.organizationId,
          action,
          entity: 'security',
          entityId: context.userId || context.apiKeyId,
          metadata: (context.metadata || {}) as Prisma.InputJsonValue,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    } catch (error) {
      // Don't fail request if audit logging fails
      logger.error('Failed to create security audit log', { error, action });
    }
  }
}

export const securityLogger = new SecurityLogger();
