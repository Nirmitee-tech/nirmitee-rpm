/**
 * Caregiver Consent Service
 * Manages patient consent for caregiver access and delegated actions
 */

import { prisma } from '../utils/prisma';
import {
  CaregiverConsent,
  CaregiverConsentType,
  CaregiverDelegation,
  DelegatedActionType,
  DelegationStatus,
  CaregiverLink,
  CaregiverLinkStatus,
  Prisma,
} from '@prisma/client';
import { auditService } from './audit-service';

interface GrantConsentInput {
  caregiverLinkId: string;
  consentType: CaregiverConsentType;
  accessScope: string[];
  canDelegate?: boolean;
  canCommunicate?: boolean;
  canSchedule?: boolean;
  expiresAt?: Date;
  documentUrl?: string;
}

interface DelegateActionInput {
  caregiverLinkId: string;
  actionType: DelegatedActionType;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

interface ExecuteDelegationInput {
  delegationId: string;
  executedByUserId: string;
  result?: string;
}

// Default access scopes based on consent type
const DEFAULT_ACCESS_SCOPES: Record<CaregiverConsentType, string[]> = {
  [CaregiverConsentType.VIEW_ONLY]: ['vitals', 'alerts'],
  [CaregiverConsentType.FULL_ACCESS]: ['vitals', 'alerts', 'medications', 'appointments', 'messaging', 'care_plan'],
  [CaregiverConsentType.MEDICAL_PROXY]: ['vitals', 'alerts', 'medications', 'appointments', 'messaging', 'care_plan', 'decisions'],
  [CaregiverConsentType.HEALTHCARE_POWER_OF_ATTORNEY]: ['vitals', 'alerts', 'medications', 'appointments', 'messaging', 'care_plan', 'decisions', 'legal'],
  [CaregiverConsentType.EMERGENCY_CONTACT]: ['emergency_contacts', 'critical_alerts'],
};

class CaregiverConsentService {
  /**
   * Grant consent to a caregiver
   */
  async grantConsent(
    input: GrantConsentInput,
    organizationId: string,
    grantedByUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CaregiverConsent> {
    // Verify caregiver link exists and is active
    const caregiverLink = await prisma.caregiverLink.findFirst({
      where: {
        id: input.caregiverLinkId,
        organizationId,
        status: { in: [CaregiverLinkStatus.ACTIVE, CaregiverLinkStatus.PENDING] },
      },
      include: {
        patient: { include: { user: true } },
        caregiver: { include: { user: true } },
      },
    });

    if (!caregiverLink) {
      throw new Error('Caregiver link not found or inactive');
    }

    // Check if active consent of this type already exists (not revoked)
    const existingConsent = await prisma.caregiverConsent.findFirst({
      where: {
        caregiverLinkId: input.caregiverLinkId,
        consentType: input.consentType,
        revokedAt: null,
      },
    });

    if (existingConsent) {
      throw new Error('Active consent of this type already exists');
    }

    // Set access scope based on consent type if not provided
    const accessScope =
      input.accessScope.length > 0
        ? input.accessScope
        : DEFAULT_ACCESS_SCOPES[input.consentType] || [];

    const consent = await prisma.caregiverConsent.create({
      data: {
        caregiverLinkId: input.caregiverLinkId,
        organizationId,
        consentType: input.consentType,
        accessScope,
        canDelegate: input.canDelegate ?? false,
        canCommunicate: input.canCommunicate ?? true,
        canSchedule: input.canSchedule ?? false,
        grantedAt: new Date(),
        expiresAt: input.expiresAt,
        grantedById: grantedByUserId,
        documentUrl: input.documentUrl,
        ipAddress,
        userAgent,
      },
    });

    // Activate caregiver link if pending
    if (caregiverLink.status === CaregiverLinkStatus.PENDING) {
      await prisma.caregiverLink.update({
        where: { id: input.caregiverLinkId },
        data: {
          status: CaregiverLinkStatus.ACTIVE,
          consentGrantedAt: new Date(),
        },
      });
    }

    await auditService.log({
      action: 'caregiver_consent.created',
      entity: 'caregiver_consent',
      entityId: consent.id,
      organizationId,
      userId: grantedByUserId,
      newValues: {
        consentType: input.consentType,
        accessScope,
        caregiverId: caregiverLink.caregiverId,
        patientId: caregiverLink.patientId,
      },
    });

    return consent;
  }

  /**
   * Revoke consent
   */
  async revokeConsent(
    consentId: string,
    organizationId: string,
    revokedByUserId: string,
    reason?: string
  ): Promise<CaregiverConsent> {
    const consent = await prisma.caregiverConsent.findFirst({
      where: { id: consentId, organizationId },
    });

    if (!consent) {
      throw new Error('Consent not found');
    }

    if (consent.revokedAt) {
      throw new Error('Consent already revoked');
    }

    const updated = await prisma.caregiverConsent.update({
      where: { id: consentId },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    // Also cancel any pending delegations
    await prisma.caregiverDelegation.updateMany({
      where: {
        caregiverLinkId: consent.caregiverLinkId,
        status: DelegationStatus.PENDING,
      },
      data: {
        status: DelegationStatus.CANCELLED,
      },
    });

    await auditService.log({
      action: 'caregiver_consent.revoked',
      entity: 'caregiver_consent',
      entityId: consentId,
      organizationId,
      userId: revokedByUserId,
      oldValues: { consentType: consent.consentType },
      newValues: { revokedAt: new Date(), reason },
    });

    return updated;
  }

  /**
   * Get active consents for a caregiver link
   */
  async getConsents(
    caregiverLinkId: string,
    organizationId: string
  ): Promise<CaregiverConsent[]> {
    return prisma.caregiverConsent.findMany({
      where: {
        caregiverLinkId,
        organizationId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get active (non-revoked, non-expired) consents for a patient
   */
  async getPatientConsents(
    patientId: string,
    organizationId: string
  ): Promise<(CaregiverConsent & { caregiverLink: CaregiverLink })[]> {
    const caregiverLinks = await prisma.caregiverLink.findMany({
      where: { patientId, organizationId },
      select: { id: true },
    });

    const linkIds = caregiverLinks.map((l) => l.id);

    return prisma.caregiverConsent.findMany({
      where: {
        caregiverLinkId: { in: linkIds },
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: { caregiverLink: true },
      orderBy: { createdAt: 'desc' },
    }) as Promise<(CaregiverConsent & { caregiverLink: CaregiverLink })[]>;
  }

  /**
   * Check if caregiver has specific access
   */
  async hasAccess(
    caregiverLinkId: string,
    accessType: string
  ): Promise<boolean> {
    const consents = await prisma.caregiverConsent.findMany({
      where: {
        caregiverLinkId,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return consents.some((consent) => consent.accessScope.includes(accessType));
  }

  /**
   * Check if consent is valid (not revoked and not expired)
   */
  isConsentValid(consent: CaregiverConsent): boolean {
    if (consent.revokedAt) return false;
    if (consent.expiresAt && consent.expiresAt < new Date()) return false;
    return true;
  }

  // ==========================================
  // DELEGATED ACTIONS
  // ==========================================

  /**
   * Create a delegation for an action
   */
  async createDelegation(
    input: DelegateActionInput,
    organizationId: string,
    requestedByUserId: string
  ): Promise<CaregiverDelegation> {
    // Verify caregiver link and consent
    const caregiverLink = await prisma.caregiverLink.findFirst({
      where: {
        id: input.caregiverLinkId,
        organizationId,
        status: CaregiverLinkStatus.ACTIVE,
      },
    });

    if (!caregiverLink) {
      throw new Error('Caregiver link not found or inactive');
    }

    // Check if delegation is allowed by any active consent
    const consent = await prisma.caregiverConsent.findFirst({
      where: {
        caregiverLinkId: input.caregiverLinkId,
        revokedAt: null,
        canDelegate: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!consent) {
      throw new Error('No active consent with delegation rights');
    }

    const delegation = await prisma.caregiverDelegation.create({
      data: {
        caregiverLinkId: input.caregiverLinkId,
        organizationId,
        actionType: input.actionType,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
        status: DelegationStatus.PENDING,
        requestedById: requestedByUserId,
        requestedAt: new Date(),
      },
    });

    await auditService.log({
      action: 'caregiver_delegation.created',
      entity: 'caregiver_delegation',
      entityId: delegation.id,
      organizationId,
      userId: requestedByUserId,
      newValues: {
        actionType: input.actionType,
        caregiverLinkId: input.caregiverLinkId,
      },
    });

    return delegation;
  }

  /**
   * Execute a delegated action (mark as completed)
   */
  async executeDelegation(
    input: ExecuteDelegationInput,
    organizationId: string
  ): Promise<CaregiverDelegation> {
    const delegation = await prisma.caregiverDelegation.findFirst({
      where: {
        id: input.delegationId,
        organizationId,
        status: { in: [DelegationStatus.PENDING, DelegationStatus.APPROVED] },
      },
    });

    if (!delegation) {
      throw new Error('Delegation not found or not in executable state');
    }

    const updated = await prisma.caregiverDelegation.update({
      where: { id: input.delegationId },
      data: {
        status: DelegationStatus.COMPLETED,
        executedAt: new Date(),
        executedById: input.executedByUserId,
        result: input.result,
      },
    });

    await auditService.log({
      action: 'caregiver_delegation.executed',
      entity: 'caregiver_delegation',
      entityId: input.delegationId,
      organizationId,
      userId: input.executedByUserId,
      newValues: {
        status: DelegationStatus.COMPLETED,
        result: input.result,
      },
    });

    return updated;
  }

  /**
   * Approve a pending delegation
   */
  async approveDelegation(
    delegationId: string,
    organizationId: string,
    approvedByUserId: string
  ): Promise<CaregiverDelegation> {
    const delegation = await prisma.caregiverDelegation.findFirst({
      where: {
        id: delegationId,
        organizationId,
        status: DelegationStatus.PENDING,
      },
    });

    if (!delegation) {
      throw new Error('Delegation not found or not pending');
    }

    const updated = await prisma.caregiverDelegation.update({
      where: { id: delegationId },
      data: {
        status: DelegationStatus.APPROVED,
      },
    });

    await auditService.log({
      action: 'caregiver_delegation.approved',
      entity: 'caregiver_delegation',
      entityId: delegationId,
      organizationId,
      userId: approvedByUserId,
      newValues: { status: DelegationStatus.APPROVED },
    });

    return updated;
  }

  /**
   * Reject a delegation
   */
  async rejectDelegation(
    delegationId: string,
    organizationId: string,
    rejectedByUserId: string,
    reason?: string
  ): Promise<CaregiverDelegation> {
    const delegation = await prisma.caregiverDelegation.findFirst({
      where: {
        id: delegationId,
        organizationId,
        status: DelegationStatus.PENDING,
      },
    });

    if (!delegation) {
      throw new Error('Delegation not found or not pending');
    }

    const updated = await prisma.caregiverDelegation.update({
      where: { id: delegationId },
      data: {
        status: DelegationStatus.REJECTED,
        result: reason,
      },
    });

    await auditService.log({
      action: 'caregiver_delegation.rejected',
      entity: 'caregiver_delegation',
      entityId: delegationId,
      organizationId,
      userId: rejectedByUserId,
      newValues: { status: DelegationStatus.REJECTED, reason },
    });

    return updated;
  }

  /**
   * Get delegations for a caregiver link
   */
  async getDelegations(
    caregiverLinkId: string,
    organizationId: string,
    status?: DelegationStatus
  ): Promise<CaregiverDelegation[]> {
    return prisma.caregiverDelegation.findMany({
      where: {
        caregiverLinkId,
        organizationId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get pending delegations for approval
   */
  async getPendingDelegations(
    organizationId: string
  ): Promise<CaregiverDelegation[]> {
    return prisma.caregiverDelegation.findMany({
      where: {
        organizationId,
        status: DelegationStatus.PENDING,
      },
      include: {
        caregiverLink: {
          include: {
            patient: { include: { user: true } },
            caregiver: { include: { user: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Expire old delegations (cleanup job)
   */
  async expireOldDelegations(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.caregiverDelegation.updateMany({
      where: {
        status: DelegationStatus.PENDING,
        requestedAt: { lt: cutoffDate },
      },
      data: {
        status: DelegationStatus.EXPIRED,
      },
    });

    return result.count;
  }
}

export const caregiverConsentService = new CaregiverConsentService();
