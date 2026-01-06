/**
 * Permission Service
 * Handles permission checking and patient access validation
 */

import { prisma } from '../utils/prisma';
import { ApiError } from '../utils/api-error';

export interface AccessContext {
  userId: string;
  organizationId: string;
  permissions?: string[];
  roleId?: string;
}

export class PermissionService {
  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    userId: string,
    organizationId: string,
    permissionCode: string
  ): Promise<boolean> {
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      return false;
    }

    const userPermissions = member.role.permissions.map((rp) => rp.permission.code);
    return userPermissions.includes(permissionCode);
  }

  /**
   * Get all permissions for a user in an organization
   */
  async getUserPermissions(
    userId: string,
    organizationId: string
  ): Promise<string[]> {
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      return [];
    }

    return member.role.permissions.map((rp) => rp.permission.code);
  }

  /**
   * Check if user has any of the required permissions
   */
  async hasAnyPermission(
    userId: string,
    organizationId: string,
    permissionCodes: string[]
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, organizationId);
    return permissionCodes.some((code) => userPermissions.includes(code));
  }

  /**
   * Check if user has all required permissions
   */
  async hasAllPermissions(
    userId: string,
    organizationId: string,
    permissionCodes: string[]
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, organizationId);
    return permissionCodes.every((code) => userPermissions.includes(code));
  }

  /**
   * Validate patient access based on role and assignment
   * Returns true if user can access the patient data
   */
  async validatePatientAccess(
    context: AccessContext,
    patientId: string
  ): Promise<boolean> {
    const { userId, organizationId } = context;

    // 1. Check if patient belongs to same organization
    const patient = await prisma.user.findFirst({
      where: {
        id: patientId,
        organizations: {
          some: {
            organizationId,
            status: 'ACTIVE',
          },
        },
      },
    });

    if (!patient) {
      return false;
    }

    // 2. Get user's permissions
    const permissions = context.permissions ||
      await this.getUserPermissions(userId, organizationId);

    // 3. Check access based on permission scope
    // Own access (patient viewing own data)
    if (permissions.includes('patients:read:own') && userId === patientId) {
      return true;
    }

    // All patients access (physicians, admins)
    if (permissions.includes('patients:read:all')) {
      return true;
    }

    // Assigned patients access (clinical staff)
    if (permissions.includes('patients:read:assigned')) {
      const assignment = await this.checkPatientAssignment(userId, patientId);
      if (assignment) {
        return true;
      }
    }

    // Linked patients access (caregivers)
    if (permissions.includes('patients:read:linked')) {
      const hasConsent = await this.checkCaregiverConsent(userId, patientId);
      if (hasConsent) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if clinical staff is assigned to patient
   * Note: This requires a StaffAssignment table (to be created)
   */
  private async checkPatientAssignment(
    staffId: string,
    patientId: string
  ): Promise<boolean> {
    // TODO: Implement when StaffAssignment table exists
    // For now, return false (strict access control)
    //
    // const assignment = await prisma.staffAssignment.findFirst({
    //   where: {
    //     staffId,
    //     patientId,
    //     status: 'ACTIVE',
    //   },
    // });
    // return !!assignment;

    return false;
  }

  /**
   * Check if caregiver has consent to access patient data
   * Note: This requires a CaregiverLink table (to be created)
   */
  private async checkCaregiverConsent(
    caregiverId: string,
    patientId: string
  ): Promise<boolean> {
    // TODO: Implement when CaregiverLink table exists
    // For now, return false (strict access control)
    //
    // const link = await prisma.caregiverLink.findFirst({
    //   where: {
    //     caregiverId,
    //     patientId,
    //     status: 'ACTIVE',
    //     consentGiven: true,
    //   },
    // });
    // return !!link;

    return false;
  }

  /**
   * Validate vital reading access
   */
  async validateVitalAccess(
    context: AccessContext,
    vitalReadingId: string
  ): Promise<boolean> {
    // First, get the patient ID from vital reading
    // TODO: Implement when VitalReading table exists
    // const vitalReading = await prisma.vitalReading.findUnique({
    //   where: { id: vitalReadingId },
    // });
    //
    // if (!vitalReading) {
    //   return false;
    // }
    //
    // return this.validatePatientAccess(context, vitalReading.patientId);

    // For now, use permission-based validation
    const permissions = context.permissions ||
      await this.getUserPermissions(context.userId, context.organizationId);

    return permissions.some(p =>
      p.startsWith('vitals:read:') || p.startsWith('vitals:write:')
    );
  }

  /**
   * Validate alert access
   */
  async validateAlertAccess(
    context: AccessContext,
    alertId: string
  ): Promise<boolean> {
    // Similar to vital access, check patient relationship
    // TODO: Implement when Alert table exists

    const permissions = context.permissions ||
      await this.getUserPermissions(context.userId, context.organizationId);

    return permissions.some(p =>
      p.startsWith('alerts:read:') || p.startsWith('alerts:write:')
    );
  }

  /**
   * Check if user's role requires MFA
   */
  async requiresMFA(userId: string, organizationId: string): Promise<boolean> {
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!member) {
      return false;
    }

    // Roles that require MFA
    const mfaRequiredRoles = [
      'PHYSICIAN',
      'BILLING_STAFF',
      'IT_ADMIN',
      'ORG_ADMIN',
    ];

    return mfaRequiredRoles.includes(member.role.name);
  }

  /**
   * Log access attempt for audit purposes
   */
  async logAccessAttempt(
    userId: string,
    organizationId: string,
    resource: string,
    resourceId: string,
    action: string,
    granted: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        organizationId,
        action: `access.${action}`,
        entity: resource,
        entityId: resourceId,
        metadata: {
          granted,
          ...metadata,
        },
      },
    });
  }

  /**
   * Check permission and log access
   */
  async checkAndLogAccess(
    context: AccessContext,
    permissionCode: string,
    resource: string,
    resourceId: string
  ): Promise<boolean> {
    const granted = await this.hasPermission(
      context.userId,
      context.organizationId,
      permissionCode
    );

    await this.logAccessAttempt(
      context.userId,
      context.organizationId,
      resource,
      resourceId,
      permissionCode,
      granted
    );

    return granted;
  }
}

export const permissionService = new PermissionService();
