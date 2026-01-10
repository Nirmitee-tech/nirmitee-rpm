import { prisma } from '../utils/prisma';
import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { log } from '../utils/logger';

export type AuditAction =
  // Auth actions
  | 'auth.login'
  | 'auth.logout'
  | 'auth.signup'
  | 'auth.password_reset'
  | 'auth.password_forgot'
  // User actions
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.role_changed'
  | 'user.invited'
  | 'user.invitation_accepted'
  // Team actions
  | 'team.created'
  | 'team.updated'
  | 'team.deleted'
  | 'team.member_added'
  | 'team.member_removed'
  | 'team.member_role_changed'
  // Role actions
  | 'role.created'
  | 'role.updated'
  | 'role.deleted'
  | 'role.permissions_changed'
  // Organization actions
  | 'organization.updated'
  | 'organization.settings_changed'
  // Settings actions
  | 'settings.updated'
  // Patient actions
  | 'patient.created'
  | 'patient.updated'
  | 'patient.deleted'
  | 'patient.enrollment_status_updated'
  | 'patient.care_team_assigned'
  | 'patient.condition_added'
  | 'patient.condition_removed'
  // Device actions
  | 'device.assigned'
  | 'device.removed'
  // Time log actions
  | 'timelog.created'
  // Alert actions
  | 'alert.created'
  | 'alert.acknowledged'
  | 'alert.resolved'
  | 'alert.escalated'
  | 'alert.dismissed'
  // Threshold actions
  | 'threshold.updated'
  | 'threshold.reset'
  | 'patient.threshold.updated'
  | 'patient.threshold.reset'
  // Escalation rule actions
  | 'escalation_rule.created'
  | 'escalation_rule.updated'
  | 'escalation_rule.deleted'
  // Care plan actions
  | 'careplan.created'
  // Assessment actions
  | 'assessment.created'
  | 'assessment.updated'
  | 'assessment.completed'
  | 'assessment.cancelled'
  | 'assessment.deleted'
  // Telehealth actions
  | 'telehealth.session_created'
  | 'telehealth.session_joined'
  | 'telehealth.session_ended'
  | 'telehealth.session_cancelled'
  | 'telehealth.quick_call_started'
  | 'telehealth.notes_updated'
  // Health records actions
  | 'medication.created'
  | 'medication.updated'
  | 'medication.deleted'
  | 'allergy.created'
  | 'allergy.updated'
  | 'allergy.deleted'
  | 'immunization.created'
  | 'immunization.updated'
  | 'immunization.deleted'
  | 'lab_result.created'
  | 'lab_result.updated'
  | 'lab_result.deleted'
  | 'medical_history.created'
  | 'medical_history.updated'
  | 'medical_history.deleted'
  // Messaging actions
  | 'conversation.created'
  | 'conversation.archived'
  | 'message.sent'
  // Device hub actions
  | 'device_hub.created'
  | 'device_hub.updated'
  | 'device_hub.activated'
  | 'device_hub.synced'
  | 'device_hub.deleted'
  | 'device_pairing.created'
  | 'device_pairing.confirmed'
  | 'device_pairing.removed'
  // Device telemetry actions
  | 'device_firmware.created'
  | 'device_firmware.released'
  | 'device_firmware.deprecated'
  // FHIR integration actions
  | 'fhir_connection.created'
  | 'fhir_connection.updated'
  | 'fhir_connection.deleted'
  | 'fhir_mapping.created'
  | 'fhir_sync.started'
  | 'fhir_sync.completed'
  // Claims/RCM actions
  | 'claim.created'
  | 'claim.submitted'
  | 'claim.updated'
  | 'claim.voided'
  | 'claim.denied'
  | 'denial.created'
  | 'denial.appealed'
  | 'payer_rule.created'
  // Analytics/reporting actions
  | 'report_template.created'
  | 'report_template.updated'
  | 'report.executed'
  | 'report.scheduled'
  | 'cohort.created'
  | 'cohort.updated'
  // Alert intelligence actions
  | 'alert_score.calculated'
  | 'alert_sla.created'
  | 'alert_sla.updated'
  | 'alert.assigned'
  | 'alert.reassigned'
  // Inventory/logistics actions
  | 'inventory.created'
  | 'inventory.updated'
  | 'inventory.assigned'
  | 'inventory.returned'
  | 'inventory.status_changed'
  | 'resupply.created'
  | 'resupply.approved'
  | 'shipment.created'
  | 'shipment.updated'
  | 'shipment.shipped'
  | 'shipment.delivered'
  | 'troubleshooting.created'
  | 'troubleshooting.resolved'
  // Caregiver consent actions
  | 'caregiver_consent.created'
  | 'caregiver_consent.revoked'
  | 'caregiver_consent.delegation_changed'
  | 'caregiver_delegation.created'
  | 'caregiver_delegation.executed'
  | 'caregiver_delegation.approved'
  | 'caregiver_delegation.rejected'
  // Compliance actions
  | 'baa.created'
  | 'baa.executed'
  | 'baa.terminated'
  | 'feature_gate.created'
  | 'feature_gate.updated'
  | 'security_header.updated';

export type AuditEntity =
  | 'user'
  | 'team'
  | 'role'
  | 'organization'
  | 'permission'
  | 'invitation'
  | 'session'
  | 'settings'
  | 'patient'
  | 'device'
  | 'timelog'
  | 'alert'
  | 'care_plan'
  | 'careplan'
  | 'assessment'
  | 'threshold'
  | 'escalation_rule'
  | 'telehealth_session'
  | 'medication'
  | 'allergy'
  | 'immunization'
  | 'lab_result'
  | 'medical_history'
  | 'conversation'
  | 'message'
  | 'billing_record'
  // Device hub entities
  | 'device_hub'
  | 'device_pairing'
  | 'device_telemetry'
  | 'device_firmware'
  // FHIR entities
  | 'fhir_connection'
  | 'fhir_mapping'
  | 'fhir_sync'
  // Claims entities
  | 'claim'
  | 'claim_submission'
  | 'claim_denial'
  | 'denial'
  | 'payer_rule'
  // Analytics entities
  | 'report_template'
  | 'report_execution'
  | 'scheduled_report'
  | 'cohort'
  | 'cohort_outcome'
  // Alert intelligence entities
  | 'alert_score'
  | 'alert_workload'
  | 'alert_sla'
  | 'alert_deduplication'
  // Inventory entities
  | 'inventory_item'
  | 'shipment'
  | 'resupply_ticket'
  | 'troubleshooting_log'
  // Caregiver consent entities
  | 'caregiver_consent'
  | 'caregiver_delegation'
  // Compliance entities
  | 'baa'
  | 'feature_gate'
  | 'security_header';

interface AuditLogData {
  userId?: string;
  organizationId?: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  req?: Request;
}

class AuditService {
  /**
   * Log an audit event
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          organizationId: data.organizationId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          oldValues: data.oldValues as Prisma.InputJsonValue,
          newValues: data.newValues as Prisma.InputJsonValue,
          metadata: data.metadata as Prisma.InputJsonValue,
          ipAddress: data.req ? this.getIpAddress(data.req) : null,
          userAgent: data.req?.headers['user-agent'] || null,
        },
      });
    } catch (error) {
      // Log error but don't throw - audit logging should not break main flow
      log.error('Audit log error:', error);
    }
  }

  /**
   * Get audit logs for an organization
   */
  async getOrganizationLogs(
    organizationId: string,
    options?: {
      page?: number;
      limit?: number;
      userId?: string;
      action?: string;
      entity?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (options?.userId) where.userId = options.userId;
    if (options?.action) where.action = { contains: options.action };
    if (options?.entity) where.entity = options.entity;
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options?.startDate) where.createdAt.gte = options.startDate;
      if (options?.endDate) where.createdAt.lte = options.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityLogs(entity: AuditEntity, entityId: string, limit = 20) {
    return prisma.auditLog.findMany({
      where: { entity, entityId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get audit logs for a specific user's actions
   */
  async getUserActivityLogs(userId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get IP address from request, handling proxies
   */
  private getIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * Helper to create audit log from request context
   */
  fromRequest(req: Request) {
    return {
      userId: req.user?.userId,
      organizationId: req.organizationId,
      req,
    };
  }
}

export const auditService = new AuditService();

// Export helper function for quick logging
export function audit(data: AuditLogData) {
  return auditService.log(data);
}
