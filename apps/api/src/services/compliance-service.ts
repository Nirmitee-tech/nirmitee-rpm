/**
 * Compliance Service
 * Manages BAA agreements, security headers, MFA enforcement, and feature gates
 */

import { prisma } from '../utils/prisma';
import {
  BaaAgreement,
  BaaPartyType,
  BaaStatus,
  SecurityAuditLog,
  SecurityEventType,
  SecuritySeverity,
  MfaEnforcement,
  MfaEnforcementLevel,
  SecurityHeaderConfig,
  FeatureGateConfig,
  RolloutStage,
  Prisma,
} from '@prisma/client';
import { auditService } from './audit-service';
import crypto from 'crypto';

interface CreateBaaInput {
  organizationId: string;
  partyName: string;
  partyType: BaaPartyType;
  contactName?: string;
  contactEmail?: string;
  effectiveDate: Date;
  expirationDate?: Date;
  documentUrl?: string;
}

interface SecurityEventInput {
  organizationId: string;
  userId?: string;
  userEmail?: string;
  eventType: SecurityEventType;
  eventCategory: string;
  action: string;
  result: 'success' | 'failure' | 'blocked';
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
  severity?: SecuritySeverity;
}

interface SecurityHeaderInput {
  corsEnabled?: boolean;
  corsOrigins?: string[];
  corsMethods?: string[];
  corsHeaders?: string[];
  cspEnabled?: boolean;
  cspDirectives?: Record<string, unknown>;
  hstsEnabled?: boolean;
  hstsMaxAge?: number;
  xFrameOptions?: string;
  xContentTypeOptions?: boolean;
  referrerPolicy?: string;
  rateLimitEnabled?: boolean;
  rateLimitWindow?: number;
  rateLimitMax?: number;
}

interface FeatureGateInput {
  organizationId?: string;
  featureKey: string;
  rolloutStage?: RolloutStage;
  rolloutPercentage?: number;
  targetEnvironments?: string[];
  targetRoles?: string[];
  targetUsers?: string[];
  enabledAt?: Date;
  description?: string;
}

class ComplianceService {
  // ==========================================
  // BAA MANAGEMENT
  // ==========================================

  /**
   * Create BAA agreement
   */
  async createBaa(
    input: CreateBaaInput,
    userId: string
  ): Promise<BaaAgreement> {
    const baa = await prisma.baaAgreement.create({
      data: {
        organizationId: input.organizationId,
        partyName: input.partyName,
        partyType: input.partyType,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        status: BaaStatus.PENDING,
        effectiveDate: input.effectiveDate,
        expirationDate: input.expirationDate,
        documentUrl: input.documentUrl,
      },
    });

    await auditService.log({
      action: 'baa.created',
      entity: 'baa',
      entityId: baa.id,
      organizationId: input.organizationId,
      userId,
      newValues: {
        partyName: input.partyName,
        partyType: input.partyType,
      },
    });

    return baa;
  }

  /**
   * Sign/execute BAA
   */
  async executeBaa(
    baaId: string,
    organizationId: string,
    signedById: string,
    userId: string
  ): Promise<BaaAgreement> {
    const baa = await prisma.baaAgreement.findFirst({
      where: { id: baaId, organizationId },
    });

    if (!baa) {
      throw new Error('BAA not found');
    }

    if (baa.status !== BaaStatus.PENDING && baa.status !== BaaStatus.IN_REVIEW) {
      throw new Error('BAA is not in pending or in review status');
    }

    const updated = await prisma.baaAgreement.update({
      where: { id: baaId },
      data: {
        status: BaaStatus.SIGNED,
        signedAt: new Date(),
        signedById,
      },
    });

    await this.logSecurityEvent({
      organizationId,
      userId,
      eventType: SecurityEventType.DATA_ACCESS,
      eventCategory: 'compliance',
      action: 'baa_executed',
      result: 'success',
      resourceType: 'BaaAgreement',
      resourceId: baaId,
      metadata: { partyName: baa.partyName },
      severity: SecuritySeverity.INFO,
    });

    await auditService.log({
      action: 'baa.executed',
      entity: 'baa',
      entityId: baaId,
      organizationId,
      userId,
      oldValues: { status: baa.status },
      newValues: { status: BaaStatus.SIGNED, signedById },
    });

    return updated;
  }

  /**
   * Terminate BAA
   */
  async terminateBaa(
    baaId: string,
    organizationId: string,
    reason: string,
    userId: string
  ): Promise<BaaAgreement> {
    const baa = await prisma.baaAgreement.findFirst({
      where: { id: baaId, organizationId },
    });

    if (!baa) {
      throw new Error('BAA not found');
    }

    const updated = await prisma.baaAgreement.update({
      where: { id: baaId },
      data: {
        status: BaaStatus.TERMINATED,
        reviewNotes: reason,
        lastReviewedAt: new Date(),
        lastReviewedById: userId,
      },
    });

    await this.logSecurityEvent({
      organizationId,
      userId,
      eventType: SecurityEventType.DATA_ACCESS,
      eventCategory: 'compliance',
      action: 'baa_terminated',
      result: 'success',
      resourceType: 'BaaAgreement',
      resourceId: baaId,
      metadata: { reason },
      severity: SecuritySeverity.WARNING,
    });

    await auditService.log({
      action: 'baa.terminated',
      entity: 'baa',
      entityId: baaId,
      organizationId,
      userId,
      oldValues: { status: baa.status },
      newValues: { status: BaaStatus.TERMINATED, reason },
    });

    return updated;
  }

  /**
   * Get BAA agreements
   */
  async getBaaAgreements(
    organizationId: string,
    status?: BaaStatus
  ): Promise<BaaAgreement[]> {
    return prisma.baaAgreement.findMany({
      where: {
        organizationId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check for expiring BAAs
   */
  async getExpiringBaas(
    organizationId: string,
    daysThreshold: number = 30
  ): Promise<BaaAgreement[]> {
    const thresholdDate = new Date(
      Date.now() + daysThreshold * 24 * 60 * 60 * 1000
    );

    return prisma.baaAgreement.findMany({
      where: {
        organizationId,
        status: BaaStatus.SIGNED,
        expirationDate: {
          lte: thresholdDate,
          gte: new Date(),
        },
      },
      orderBy: { expirationDate: 'asc' },
    });
  }

  // ==========================================
  // SECURITY AUDIT LOGGING
  // ==========================================

  /**
   * Log security event
   */
  async logSecurityEvent(input: SecurityEventInput): Promise<SecurityAuditLog> {
    return prisma.securityAuditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        userEmail: input.userEmail,
        eventType: input.eventType,
        eventCategory: input.eventCategory,
        action: input.action,
        result: input.result,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        failureReason: input.failureReason,
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
        severity: input.severity || SecuritySeverity.INFO,
      },
    });
  }

  /**
   * Get security audit logs
   */
  async getSecurityLogs(
    organizationId: string,
    options?: {
      eventType?: SecurityEventType;
      userId?: string;
      severity?: SecuritySeverity;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ logs: SecurityAuditLog[]; total: number }> {
    const where: Prisma.SecurityAuditLogWhereInput = {
      organizationId,
      ...(options?.eventType && { eventType: options.eventType }),
      ...(options?.userId && { userId: options.userId }),
      ...(options?.severity && { severity: options.severity }),
      ...(options?.startDate && { createdAt: { gte: options.startDate } }),
      ...(options?.endDate && { createdAt: { lte: options.endDate } }),
    };

    const [logs, total] = await Promise.all([
      prisma.securityAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 100,
        skip: options?.offset || 0,
      }),
      prisma.securityAuditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get high-risk events
   */
  async getHighRiskEvents(
    organizationId: string,
    hoursBack: number = 24
  ): Promise<SecurityAuditLog[]> {
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    return prisma.securityAuditLog.findMany({
      where: {
        organizationId,
        severity: { in: [SecuritySeverity.HIGH, SecuritySeverity.CRITICAL] },
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================
  // MFA ENFORCEMENT
  // ==========================================

  /**
   * Set MFA enforcement policy
   */
  async setMfaEnforcement(
    organizationId: string,
    enforcementLevel: MfaEnforcementLevel,
    requiredForRoles: string[],
    gracePeriodDays: number,
    userId: string
  ): Promise<MfaEnforcement> {
    const existing = await prisma.mfaEnforcement.findUnique({
      where: { organizationId },
    });

    let enforcement: MfaEnforcement;
    const isRequired = this.isEnforcementRequired(enforcementLevel);
    const gracePeriodStart = isRequired ? new Date() : null;

    if (existing) {
      enforcement = await prisma.mfaEnforcement.update({
        where: { organizationId },
        data: {
          enforcementLevel,
          requiredForRoles,
          gracePeriodDays,
          gracePeriodStart,
        },
      });
    } else {
      enforcement = await prisma.mfaEnforcement.create({
        data: {
          organizationId,
          enforcementLevel,
          requiredForRoles,
          gracePeriodDays,
          gracePeriodStart,
        },
      });
    }

    await this.logSecurityEvent({
      organizationId,
      userId,
      eventType: SecurityEventType.PERMISSION_CHANGE,
      eventCategory: 'security',
      action: 'mfa_policy_changed',
      result: 'success',
      metadata: { enforcementLevel, requiredForRoles, gracePeriodDays },
      severity: SecuritySeverity.WARNING,
    });

    await auditService.log({
      action: 'settings.updated',
      entity: 'settings',
      entityId: enforcement.id,
      organizationId,
      userId,
      newValues: { enforcementLevel, requiredForRoles },
    });

    return enforcement;
  }

  /**
   * Check if enforcement level requires MFA
   */
  private isEnforcementRequired(level: MfaEnforcementLevel): boolean {
    const requiredLevels: MfaEnforcementLevel[] = [
      MfaEnforcementLevel.REQUIRED_ADMIN,
      MfaEnforcementLevel.REQUIRED_PHI,
      MfaEnforcementLevel.REQUIRED_ALL,
    ];
    return requiredLevels.includes(level);
  }

  /**
   * Get MFA enforcement policy
   */
  async getMfaEnforcement(organizationId: string): Promise<MfaEnforcement | null> {
    return prisma.mfaEnforcement.findUnique({
      where: { organizationId },
    });
  }

  /**
   * Check if user needs MFA
   */
  async requiresMfa(
    userId: string,
    organizationId: string,
    userRoles: string[]
  ): Promise<{ required: boolean; gracePeriodRemaining?: number }> {
    const enforcement = await this.getMfaEnforcement(organizationId);

    if (!enforcement) {
      return { required: false };
    }

    switch (enforcement.enforcementLevel) {
      case MfaEnforcementLevel.OPTIONAL:
      case MfaEnforcementLevel.RECOMMENDED:
        return { required: false };

      case MfaEnforcementLevel.REQUIRED_ADMIN:
      case MfaEnforcementLevel.REQUIRED_PHI:
      case MfaEnforcementLevel.REQUIRED_ALL: {
        // Check if user is exempt
        if (enforcement.exemptUsers.includes(userId)) {
          return { required: false };
        }

        // Check if user's role requires MFA
        const roleRequiresMfa = enforcement.requiredForRoles.length === 0 ||
          enforcement.requiredForRoles.some((role) => userRoles.includes(role));

        if (!roleRequiresMfa) {
          return { required: false };
        }

        // Check grace period
        if (enforcement.gracePeriodStart) {
          const gracePeriodEnd = new Date(enforcement.gracePeriodStart);
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + enforcement.gracePeriodDays);

          if (gracePeriodEnd > new Date()) {
            const msRemaining = gracePeriodEnd.getTime() - Date.now();
            return {
              required: false,
              gracePeriodRemaining: Math.ceil(msRemaining / (24 * 60 * 60 * 1000)),
            };
          }
        }

        return { required: true };
      }

      default:
        return { required: false };
    }
  }

  /**
   * Get users without MFA when required
   */
  async getUsersWithoutMfa(organizationId: string): Promise<Array<{
    id: string;
    email: string;
    name: string;
    roles: string[];
  }>> {
    const enforcement = await this.getMfaEnforcement(organizationId);

    if (!enforcement || !this.isEnforcementRequired(enforcement.enforcementLevel)) {
      return [];
    }

    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId,
        user: { mfaEnabled: false },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        role: { select: { name: true } },
      },
    });

    return members
      .filter((m) =>
        enforcement.requiredForRoles.length === 0 ||
        enforcement.requiredForRoles.includes(m.role.name)
      )
      .map((m) => ({
        id: m.user.id,
        email: m.user.email,
        name: `${m.user.firstName} ${m.user.lastName}`,
        roles: [m.role.name],
      }));
  }

  // ==========================================
  // SECURITY HEADERS (Using actual schema)
  // ==========================================

  /**
   * Set security headers configuration
   */
  async setSecurityHeaders(
    organizationId: string,
    input: SecurityHeaderInput,
    userId: string
  ): Promise<SecurityHeaderConfig> {
    const existing = await prisma.securityHeaderConfig.findUnique({
      where: { organizationId },
    });

    let config: SecurityHeaderConfig;

    const data = {
      corsEnabled: input.corsEnabled,
      corsOrigins: input.corsOrigins,
      corsMethods: input.corsMethods,
      corsHeaders: input.corsHeaders,
      cspEnabled: input.cspEnabled,
      cspDirectives: input.cspDirectives as Prisma.InputJsonValue,
      hstsEnabled: input.hstsEnabled,
      hstsMaxAge: input.hstsMaxAge,
      xFrameOptions: input.xFrameOptions,
      xContentTypeOptions: input.xContentTypeOptions,
      referrerPolicy: input.referrerPolicy,
      rateLimitEnabled: input.rateLimitEnabled,
      rateLimitWindow: input.rateLimitWindow,
      rateLimitMax: input.rateLimitMax,
    };

    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    ) as Prisma.SecurityHeaderConfigUpdateInput;

    if (existing) {
      config = await prisma.securityHeaderConfig.update({
        where: { organizationId },
        data: cleanData,
      });
    } else {
      config = await prisma.securityHeaderConfig.create({
        data: {
          organizationId,
          ...(cleanData as Record<string, unknown>),
        } as Prisma.SecurityHeaderConfigCreateInput,
      });
    }

    await auditService.log({
      action: 'security_header.updated',
      entity: 'security_header',
      entityId: config.id,
      organizationId,
      userId,
      newValues: cleanData as Record<string, unknown>,
    });

    return config;
  }

  /**
   * Get security headers for organization
   */
  async getSecurityHeaders(organizationId: string): Promise<SecurityHeaderConfig | null> {
    return prisma.securityHeaderConfig.findUnique({
      where: { organizationId },
    });
  }

  /**
   * Reset to default security headers
   */
  async resetSecurityHeaders(
    organizationId: string,
    userId: string
  ): Promise<SecurityHeaderConfig> {
    const config = await prisma.securityHeaderConfig.upsert({
      where: { organizationId },
      update: {
        corsEnabled: true,
        corsOrigins: ['*'],
        corsMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        corsHeaders: ['Content-Type', 'Authorization'],
        cspEnabled: true,
        hstsEnabled: true,
        hstsMaxAge: 31536000,
        xFrameOptions: 'DENY',
        xContentTypeOptions: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
        rateLimitEnabled: true,
        rateLimitWindow: 60,
        rateLimitMax: 100,
      },
      create: {
        organizationId,
        corsEnabled: true,
        corsOrigins: ['*'],
        corsMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        corsHeaders: ['Content-Type', 'Authorization'],
        cspEnabled: true,
        hstsEnabled: true,
        hstsMaxAge: 31536000,
        xFrameOptions: 'DENY',
        xContentTypeOptions: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
        rateLimitEnabled: true,
        rateLimitWindow: 60,
        rateLimitMax: 100,
      },
    });

    await auditService.log({
      action: 'security_header.updated',
      entity: 'security_header',
      entityId: organizationId,
      organizationId,
      userId,
      newValues: { resetToDefaults: true },
    });

    return config;
  }

  // ==========================================
  // FEATURE GATES (Using actual schema)
  // ==========================================

  /**
   * Create or update feature gate
   */
  async setFeatureGate(
    input: FeatureGateInput,
    userId: string
  ): Promise<FeatureGateConfig> {
    const existing = input.organizationId
      ? await prisma.featureGateConfig.findUnique({
          where: {
            organizationId_featureKey: {
              organizationId: input.organizationId,
              featureKey: input.featureKey,
            },
          },
        })
      : null;

    let gate: FeatureGateConfig;

    if (existing) {
      gate = await prisma.featureGateConfig.update({
        where: { id: existing.id },
        data: {
          rolloutStage: input.rolloutStage,
          rolloutPercentage: input.rolloutPercentage,
          targetEnvironments: input.targetEnvironments,
          targetRoles: input.targetRoles,
          targetUsers: input.targetUsers,
          enabledAt: input.enabledAt,
          description: input.description,
        },
      });
    } else {
      gate = await prisma.featureGateConfig.create({
        data: {
          organizationId: input.organizationId,
          featureKey: input.featureKey,
          rolloutStage: input.rolloutStage || RolloutStage.DISABLED,
          rolloutPercentage: input.rolloutPercentage || 0,
          targetEnvironments: input.targetEnvironments || ['production'],
          targetRoles: input.targetRoles || [],
          targetUsers: input.targetUsers || [],
          enabledAt: input.enabledAt,
          description: input.description,
          createdById: userId,
        },
      });
    }

    await auditService.log({
      action: 'feature_gate.updated',
      entity: 'feature_gate',
      entityId: gate.id,
      organizationId: input.organizationId,
      userId,
      newValues: {
        featureKey: input.featureKey,
        rolloutStage: input.rolloutStage,
      },
    });

    return gate;
  }

  /**
   * Check if feature is enabled for user
   */
  async isFeatureEnabled(
    organizationId: string | null,
    featureKey: string,
    userId?: string,
    userRoles?: string[]
  ): Promise<boolean> {
    // Check organization-specific gate first, then global
    let gate = organizationId
      ? await prisma.featureGateConfig.findUnique({
          where: {
            organizationId_featureKey: {
              organizationId,
              featureKey,
            },
          },
        })
      : null;

    // Fall back to global gate
    if (!gate) {
      gate = await prisma.featureGateConfig.findFirst({
        where: {
          organizationId: null,
          featureKey,
        },
      });
    }

    if (!gate) {
      return false;
    }

    switch (gate.rolloutStage) {
      case RolloutStage.DISABLED:
        return false;

      case RolloutStage.INTERNAL:
        if (userId && gate.targetUsers.includes(userId)) return true;
        if (userRoles && gate.targetRoles.some((role: string) => userRoles.includes(role))) return true;
        return false;

      case RolloutStage.ALPHA:
      case RolloutStage.BETA:
        if (userId && gate.targetUsers.includes(userId)) return true;
        if (userRoles && gate.targetRoles.some((role: string) => userRoles.includes(role))) return true;
        // Percentage-based rollout
        if (userId && gate.rolloutPercentage > 0) {
          const hash = crypto.createHash('md5').update(userId + featureKey).digest('hex');
          const bucket = parseInt(hash.slice(0, 8), 16) % 100;
          return bucket < gate.rolloutPercentage;
        }
        return false;

      case RolloutStage.PERCENTAGE:
        if (userId && gate.rolloutPercentage > 0) {
          const hash = crypto.createHash('md5').update(userId + featureKey).digest('hex');
          const bucket = parseInt(hash.slice(0, 8), 16) % 100;
          return bucket < gate.rolloutPercentage;
        }
        return false;

      case RolloutStage.ENABLED:
        return true;

      default:
        return false;
    }
  }

  /**
   * Get all feature gates for organization
   */
  async getFeatureGates(organizationId?: string): Promise<FeatureGateConfig[]> {
    return prisma.featureGateConfig.findMany({
      where: organizationId ? { organizationId } : {},
      orderBy: { featureKey: 'asc' },
    });
  }

  /**
   * Get enabled features for user
   */
  async getEnabledFeatures(
    organizationId: string | null,
    userId: string,
    userRoles: string[]
  ): Promise<string[]> {
    const gates = await this.getFeatureGates(organizationId || undefined);
    const enabledFeatures: string[] = [];

    for (const gate of gates) {
      const enabled = await this.isFeatureEnabled(
        organizationId,
        gate.featureKey,
        userId,
        userRoles
      );
      if (enabled) {
        enabledFeatures.push(gate.featureKey);
      }
    }

    return enabledFeatures;
  }

  /**
   * Disable feature gate
   */
  async disableFeatureGate(
    organizationId: string | null,
    featureKey: string,
    userId: string
  ): Promise<void> {
    await prisma.featureGateConfig.updateMany({
      where: {
        ...(organizationId ? { organizationId } : { organizationId: null }),
        featureKey,
      },
      data: {
        rolloutStage: RolloutStage.DISABLED,
        disabledAt: new Date(),
      },
    });

    await auditService.log({
      action: 'feature_gate.updated',
      entity: 'feature_gate',
      entityId: featureKey,
      organizationId: organizationId || undefined,
      userId,
      newValues: { featureKey, disabled: true },
    });
  }

  // ==========================================
  // COMPLIANCE DASHBOARD
  // ==========================================

  /**
   * Get compliance overview
   */
  async getComplianceOverview(organizationId: string): Promise<{
    baa: { total: number; active: number; pending: number; expiring: number };
    mfa: { level: string; usersWithoutMfa: number; gracePeriodRemaining?: number };
    securityHeaders: { configured: boolean };
    featureGates: { total: number; enabled: number };
    recentSecurityEvents: { high: number; critical: number };
  }> {
    // BAA stats
    const baaStats = await prisma.baaAgreement.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    });

    const expiringBaas = await this.getExpiringBaas(organizationId, 30);

    // MFA stats
    const mfaEnforcement = await this.getMfaEnforcement(organizationId);
    const usersWithoutMfa = mfaEnforcement
      ? (await this.getUsersWithoutMfa(organizationId)).length
      : 0;

    // Calculate grace period remaining
    let gracePeriodRemaining: number | undefined;
    if (mfaEnforcement?.gracePeriodStart) {
      const gracePeriodEnd = new Date(mfaEnforcement.gracePeriodStart);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + mfaEnforcement.gracePeriodDays);
      if (gracePeriodEnd > new Date()) {
        gracePeriodRemaining = Math.ceil(
          (gracePeriodEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );
      }
    }

    // Security headers
    const securityHeaders = await prisma.securityHeaderConfig.findUnique({
      where: { organizationId },
    });

    // Feature gates
    const featureGates = await prisma.featureGateConfig.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
    });

    // Security events
    const recentEvents = await prisma.securityAuditLog.groupBy({
      by: ['severity'],
      where: {
        organizationId,
        severity: { in: [SecuritySeverity.HIGH, SecuritySeverity.CRITICAL] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      _count: true,
    });

    return {
      baa: {
        total: baaStats.reduce((sum, s) => sum + s._count, 0),
        active: baaStats.find((s) => s.status === BaaStatus.SIGNED)?._count || 0,
        pending: baaStats.find((s) => s.status === BaaStatus.PENDING)?._count || 0,
        expiring: expiringBaas.length,
      },
      mfa: {
        level: mfaEnforcement?.enforcementLevel || 'OPTIONAL',
        usersWithoutMfa,
        gracePeriodRemaining,
      },
      securityHeaders: {
        configured: !!securityHeaders,
      },
      featureGates: {
        total: featureGates.length,
        enabled: featureGates.filter((g) => g.rolloutStage !== RolloutStage.DISABLED).length,
      },
      recentSecurityEvents: {
        high: recentEvents.find((e) => e.severity === SecuritySeverity.HIGH)?._count || 0,
        critical: recentEvents.find((e) => e.severity === SecuritySeverity.CRITICAL)?._count || 0,
      },
    };
  }
}

export const complianceService = new ComplianceService();
