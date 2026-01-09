import { prisma } from '../utils/prisma';
import {
  AlertSeverity,
  AlertType,
  VitalType,
  EscalationReason,
  AlertStatus,
  Prisma,
} from '@prisma/client';
import { log } from '../utils/logger';

// Escalation chain step definition
interface EscalationStep {
  level: number;
  roleType: 'CLINICAL_STAFF' | 'PHYSICIAN' | 'SUPERVISOR' | 'ADMIN';
  delayMinutes: number;
}

interface CreateAlertWithEscalationData {
  patientId: string;
  organizationId: string;
  vitalReadingId?: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, unknown>;
}

interface EscalationRuleData {
  name: string;
  description?: string;
  severity: AlertSeverity;
  vitalTypes: VitalType[];
  escalationChain: EscalationStep[];
  isActive?: boolean;
  autoAssign?: boolean;
  priority?: number;
}

class EscalationService {
  /**
   * Create an alert with auto-assignment based on escalation rules
   */
  async createAlertWithAssignment(
    data: CreateAlertWithEscalationData
  ): Promise<{
    alert: {
      id: string;
      assignedToId: string | null;
      escalationRuleId: string | null;
      nextEscalationAt: Date | null;
    };
    assignedUser: { id: string; firstName: string; lastName: string } | null;
  }> {
    // Find matching escalation rule
    const rule = await this.findMatchingRule(
      data.organizationId,
      data.severity,
      data.metadata?.vitalType as VitalType | undefined
    );

    let assignedUserId: string | null = null;
    let nextEscalationAt: Date | null = null;

    if (rule && rule.autoAssign) {
      // Get initial assignee from care team
      const escalationChain = rule.escalationChain as EscalationStep[];
      const firstStep = escalationChain[0];

      if (firstStep) {
        assignedUserId = await this.getAssignee(
          data.patientId,
          data.organizationId,
          firstStep.roleType,
          0
        );

        // Schedule next escalation
        if (escalationChain.length > 1 && firstStep.delayMinutes > 0) {
          nextEscalationAt = new Date(Date.now() + firstStep.delayMinutes * 60 * 1000);
        }
      }
    }

    // Create the alert
    const alert = await prisma.alert.create({
      data: {
        patientId: data.patientId,
        organizationId: data.organizationId,
        vitalReadingId: data.vitalReadingId,
        type: data.type as AlertType,
        severity: data.severity,
        message: data.message,
        metadata: data.metadata as Prisma.InputJsonValue,
        assignedToId: assignedUserId,
        escalationRuleId: rule?.id || null,
        escalationLevel: 0,
        nextEscalationAt,
      },
    });

    // Get assigned user details
    let assignedUser = null;
    if (assignedUserId) {
      assignedUser = await prisma.user.findUnique({
        where: { id: assignedUserId },
        select: { id: true, firstName: true, lastName: true },
      });
    }

    log.info('[ESCALATION] Alert created with assignment', {
      alertId: alert.id,
      assignedToId: assignedUserId,
      escalationRuleId: rule?.id,
      nextEscalationAt,
    });

    return {
      alert: {
        id: alert.id,
        assignedToId: alert.assignedToId,
        escalationRuleId: alert.escalationRuleId,
        nextEscalationAt: alert.nextEscalationAt,
      },
      assignedUser,
    };
  }

  /**
   * Find matching escalation rule for an alert
   */
  private async findMatchingRule(
    organizationId: string,
    severity: AlertSeverity,
    vitalType?: VitalType
  ): Promise<{
    id: string;
    autoAssign: boolean;
    escalationChain: unknown;
  } | null> {
    const rules = await prisma.escalationRule.findMany({
      where: {
        organizationId,
        severity,
        isActive: true,
        ...(vitalType && { vitalTypes: { has: vitalType } }),
      },
      orderBy: { priority: 'desc' },
      take: 1,
    });

    return rules[0] || null;
  }

  /**
   * Get assignee from patient's care team based on role type
   */
  async getAssignee(
    patientId: string,
    organizationId: string,
    roleType: 'CLINICAL_STAFF' | 'PHYSICIAN' | 'SUPERVISOR' | 'ADMIN',
    level: number
  ): Promise<string | null> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        primaryPhysicianId: true,
        assignedClinicalStaffId: true,
      },
    });

    if (!patient) return null;

    // Map role type to care team member
    switch (roleType) {
      case 'CLINICAL_STAFF':
        return patient.assignedClinicalStaffId;
      case 'PHYSICIAN':
        return patient.primaryPhysicianId;
      case 'SUPERVISOR':
      case 'ADMIN':
        // Find org admin or supervisor
        const admin = await prisma.organizationMember.findFirst({
          where: {
            organizationId,
            status: 'ACTIVE',
            role: {
              name: { in: ['Admin', 'Supervisor', 'Organization Admin'] },
            },
          },
          select: { userId: true },
        });
        return admin?.userId || null;
      default:
        return null;
    }
  }

  /**
   * Escalate an alert to the next level
   */
  async escalateAlert(
    alertId: string,
    reason: EscalationReason,
    notes?: string
  ): Promise<{
    success: boolean;
    alert?: { id: string; escalationLevel: number; assignedToId: string | null };
    error?: string;
  }> {
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        escalationRule: true,
        patient: true,
      },
    });

    if (!alert) {
      return { success: false, error: 'Alert not found' };
    }

    if (!alert.escalationRule) {
      return { success: false, error: 'No escalation rule attached to this alert' };
    }

    const escalationChain = alert.escalationRule.escalationChain as unknown as EscalationStep[];
    const currentLevel = alert.escalationLevel;
    const nextLevel = currentLevel + 1;

    if (nextLevel >= escalationChain.length) {
      return { success: false, error: 'Alert already at maximum escalation level' };
    }

    const nextStep = escalationChain[nextLevel];
    const newAssigneeId = await this.getAssignee(
      alert.patientId,
      alert.organizationId,
      nextStep.roleType,
      nextLevel
    );

    // Calculate next escalation time
    let nextEscalationAt: Date | null = null;
    if (nextLevel + 1 < escalationChain.length && nextStep.delayMinutes > 0) {
      nextEscalationAt = new Date(Date.now() + nextStep.delayMinutes * 60 * 1000);
    }

    // Update alert
    const updatedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        escalationLevel: nextLevel,
        assignedToId: newAssigneeId,
        escalatedToId: newAssigneeId,
        escalatedAt: new Date(),
        nextEscalationAt,
        status: AlertStatus.ESCALATED,
      },
    });

    // Create escalation audit log
    await prisma.alertEscalation.create({
      data: {
        alertId,
        organizationId: alert.organizationId,
        fromLevel: currentLevel,
        toLevel: nextLevel,
        fromUserId: alert.assignedToId,
        toUserId: newAssigneeId || alert.assignedToId || '',
        reason,
        notes,
        executedAt: new Date(),
      },
    });

    log.info('[ESCALATION] Alert escalated', {
      alertId,
      fromLevel: currentLevel,
      toLevel: nextLevel,
      newAssigneeId,
      reason,
    });

    return {
      success: true,
      alert: {
        id: updatedAlert.id,
        escalationLevel: updatedAlert.escalationLevel,
        assignedToId: updatedAlert.assignedToId,
      },
    };
  }

  /**
   * Schedule next escalation for an alert
   */
  async scheduleEscalation(alertId: string, delayMinutes: number): Promise<void> {
    const nextEscalationAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    await prisma.alert.update({
      where: { id: alertId },
      data: { nextEscalationAt },
    });

    log.info('[ESCALATION] Scheduled next escalation', {
      alertId,
      nextEscalationAt,
      delayMinutes,
    });
  }

  /**
   * Process pending escalations (called by background job)
   */
  async processPendingEscalations(): Promise<number> {
    const now = new Date();

    // Find alerts that need escalation
    const alertsToEscalate = await prisma.alert.findMany({
      where: {
        nextEscalationAt: { lte: now },
        status: { in: [AlertStatus.NEW, AlertStatus.ESCALATED] },
        escalationRuleId: { not: null },
      },
      include: {
        escalationRule: true,
      },
    });

    let processedCount = 0;

    for (const alert of alertsToEscalate) {
      if (!alert.escalationRule) continue;

      const escalationChain = alert.escalationRule.escalationChain as unknown as EscalationStep[];
      const nextLevel = alert.escalationLevel + 1;

      // Check if there's a next level
      if (nextLevel < escalationChain.length) {
        const result = await this.escalateAlert(
          alert.id,
          EscalationReason.TIME_EXCEEDED,
          'Auto-escalated due to response timeout'
        );

        if (result.success) {
          processedCount++;
        }
      } else {
        // Clear nextEscalationAt if at max level
        await prisma.alert.update({
          where: { id: alert.id },
          data: { nextEscalationAt: null },
        });
      }
    }

    if (processedCount > 0) {
      log.info('[ESCALATION] Processed pending escalations', { count: processedCount });
    }

    return processedCount;
  }

  /**
   * Get escalation history for an alert
   */
  async getEscalationHistory(alertId: string): Promise<{
    id: string;
    fromLevel: number;
    toLevel: number;
    fromUser: { id: string; firstName: string; lastName: string } | null;
    toUser: { id: string; firstName: string; lastName: string };
    reason: EscalationReason;
    notes: string | null;
    executedAt: Date;
  }[]> {
    const escalations = await prisma.alertEscalation.findMany({
      where: { alertId },
      include: {
        fromUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        toUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { executedAt: 'asc' },
    });

    return escalations.map(e => ({
      id: e.id,
      fromLevel: e.fromLevel,
      toLevel: e.toLevel,
      fromUser: e.fromUser,
      toUser: e.toUser,
      reason: e.reason,
      notes: e.notes,
      executedAt: e.executedAt,
    }));
  }

  // ============================================
  // ESCALATION RULE CRUD
  // ============================================

  /**
   * Create an escalation rule
   */
  async createRule(
    organizationId: string,
    data: EscalationRuleData
  ): Promise<{
    id: string;
    name: string;
    severity: AlertSeverity;
    vitalTypes: VitalType[];
    escalationChain: unknown;
  }> {
    const rule = await prisma.escalationRule.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        severity: data.severity,
        vitalTypes: data.vitalTypes,
        escalationChain: data.escalationChain as unknown as Prisma.InputJsonValue,
        isActive: data.isActive ?? true,
        autoAssign: data.autoAssign ?? true,
        priority: data.priority ?? 0,
      },
    });

    log.info('[ESCALATION] Rule created', {
      ruleId: rule.id,
      name: rule.name,
      organizationId,
    });

    return {
      id: rule.id,
      name: rule.name,
      severity: rule.severity,
      vitalTypes: rule.vitalTypes,
      escalationChain: rule.escalationChain,
    };
  }

  /**
   * Get all escalation rules for an organization
   */
  async getRules(organizationId: string): Promise<{
    id: string;
    name: string;
    description: string | null;
    severity: AlertSeverity;
    vitalTypes: VitalType[];
    escalationChain: unknown;
    isActive: boolean;
    autoAssign: boolean;
    priority: number;
  }[]> {
    const rules = await prisma.escalationRule.findMany({
      where: { organizationId },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });

    return rules.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      severity: r.severity,
      vitalTypes: r.vitalTypes,
      escalationChain: r.escalationChain,
      isActive: r.isActive,
      autoAssign: r.autoAssign,
      priority: r.priority,
    }));
  }

  /**
   * Update an escalation rule
   */
  async updateRule(
    ruleId: string,
    organizationId: string,
    data: Partial<EscalationRuleData>
  ): Promise<{
    id: string;
    name: string;
    severity: AlertSeverity;
  }> {
    const rule = await prisma.escalationRule.update({
      where: {
        id: ruleId,
        organizationId, // Ensure rule belongs to org
      },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.severity && { severity: data.severity }),
        ...(data.vitalTypes && { vitalTypes: data.vitalTypes }),
        ...(data.escalationChain && {
          escalationChain: data.escalationChain as unknown as Prisma.InputJsonValue,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.autoAssign !== undefined && { autoAssign: data.autoAssign }),
        ...(data.priority !== undefined && { priority: data.priority }),
      },
    });

    log.info('[ESCALATION] Rule updated', { ruleId, name: rule.name });

    return {
      id: rule.id,
      name: rule.name,
      severity: rule.severity,
    };
  }

  /**
   * Delete an escalation rule
   */
  async deleteRule(ruleId: string, organizationId: string): Promise<void> {
    await prisma.escalationRule.delete({
      where: {
        id: ruleId,
        organizationId,
      },
    });

    log.info('[ESCALATION] Rule deleted', { ruleId });
  }
}

export const escalationService = new EscalationService();
