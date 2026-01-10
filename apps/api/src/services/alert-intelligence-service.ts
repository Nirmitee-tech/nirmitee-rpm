/**
 * Alert Intelligence Service
 * AI-powered alert prioritization, workload balancing, and SLA management
 */

import { prisma } from '../utils/prisma';
import {
  Alert,
  AlertScore,
  AlertWorkload,
  AlertSlaConfig,
  AlertSeverity,
  AlertStatus,
  AlertType,
  VitalType,
  Prisma,
} from '@prisma/client';
import { auditService } from './audit-service';

interface AlertScoreInput {
  alertId: string;
  organizationId: string;
  priorityScore: number;
  urgencyScore: number;
  severityScore: number;
  patientRiskScore: number;
  factors: Record<string, number>;
  predictedOutcome?: string;
  confidence: number;
}

interface SlaConfigInput {
  name: string;
  severity: AlertSeverity;
  vitalTypes: VitalType[];
  acknowledgeSla: number;
  resolveSla: number;
  escalateSla: number;
  warningThreshold: number;
  priority?: number;
}

interface WorkloadStats {
  userId: string;
  activeAlerts: number;
  criticalAlerts: number;
  pendingReview: number;
  availableCapacity: number;
  avgResponseTime: number | null;
}

class AlertIntelligenceService {
  // ==========================================
  // ALERT SCORING & PRIORITIZATION
  // ==========================================

  /**
   * Calculate and store alert score
   */
  async calculateAlertScore(
    alert: Alert,
    organizationId: string
  ): Promise<AlertScore> {
    // Get patient risk factors
    const patient = await prisma.patient.findUnique({
      where: { id: alert.patientId },
      include: {
        vitalReadings: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
        },
        alerts: {
          where: { status: { not: AlertStatus.RESOLVED } },
        },
      },
    });

    // Calculate component scores (0-100)
    const severityScore = this.getSeverityScore(alert.severity);
    const urgencyScore = this.calculateUrgencyScore(alert);
    const patientRiskScore = patient ? this.calculatePatientRiskScore(patient) : 50;

    // Calculate factors
    const factors: Record<string, number> = {
      severity: severityScore * 0.4,
      urgency: urgencyScore * 0.3,
      patientRisk: patientRiskScore * 0.3,
    };

    // Calculate overall priority score
    const priorityScore = Math.round(
      factors.severity + factors.urgency + factors.patientRisk
    );

    // Determine predicted outcome
    const predictedOutcome = priorityScore > 75
      ? 'needs_intervention'
      : priorityScore > 50
        ? 'monitor_closely'
        : 'self_resolving';

    // Confidence based on data availability
    const confidence = patient?.vitalReadings?.length
      ? Math.min(0.95, 0.7 + (patient.vitalReadings.length * 0.025))
      : 0.7;

    // Upsert the score
    const score = await prisma.alertScore.upsert({
      where: { alertId: alert.id },
      create: {
        alertId: alert.id,
        organizationId,
        priorityScore,
        urgencyScore,
        severityScore,
        patientRiskScore,
        factors: factors as Prisma.InputJsonValue,
        predictedOutcome,
        confidence,
        modelVersion: '1.0',
      },
      update: {
        priorityScore,
        urgencyScore,
        severityScore,
        patientRiskScore,
        factors: factors as Prisma.InputJsonValue,
        predictedOutcome,
        confidence,
        calculatedAt: new Date(),
      },
    });

    return score;
  }

  private getSeverityScore(severity: AlertSeverity): number {
    const scores: Record<AlertSeverity, number> = {
      CRITICAL: 100,
      SIGNIFICANT: 75,
      INFORMATIONAL: 25,
    };
    return scores[severity] || 50;
  }

  private calculateUrgencyScore(alert: Alert): number {
    // Time since alert created
    const ageMinutes = (Date.now() - alert.createdAt.getTime()) / 60000;

    // Higher urgency for older unacknowledged alerts
    if (alert.status === AlertStatus.NEW) {
      if (ageMinutes > 60) return 100;
      if (ageMinutes > 30) return 80;
      if (ageMinutes > 15) return 60;
    }

    return 40;
  }

  private calculatePatientRiskScore(patient: {
    conditions: string[];
    alerts: Alert[];
  }): number {
    let score = 50;

    // More conditions = higher risk
    score += Math.min(30, patient.conditions.length * 10);

    // Active alerts = higher risk
    score += Math.min(20, patient.alerts.length * 5);

    return Math.min(100, score);
  }

  /**
   * Get prioritized alerts for an organization
   */
  async getPrioritizedAlerts(
    organizationId: string,
    options?: {
      status?: AlertStatus;
      severity?: AlertSeverity;
      limit?: number;
    }
  ): Promise<(Alert & { score?: AlertScore })[]> {
    const where: Prisma.AlertWhereInput = { organizationId };

    if (options?.status) {
      where.status = options.status;
    }
    if (options?.severity) {
      where.severity = options.severity;
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        patient: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: [
        { severity: 'asc' }, // CRITICAL first
        { createdAt: 'asc' }, // Oldest first
      ],
      take: options?.limit || 50,
    });

    // Get scores for alerts
    const alertIds = alerts.map((a) => a.id);
    const scores = await prisma.alertScore.findMany({
      where: { alertId: { in: alertIds } },
    });
    const scoreMap = new Map(scores.map((s) => [s.alertId, s]));

    // Return alerts with scores attached
    const alertsWithScores = alerts.map((alert) => ({
      ...alert,
      score: scoreMap.get(alert.id),
    }));

    // Sort by score if available
    return alertsWithScores.sort((a, b) => {
      const scoreA = a.score?.priorityScore || 50;
      const scoreB = b.score?.priorityScore || 50;
      return scoreB - scoreA;
    });
  }

  // ==========================================
  // WORKLOAD MANAGEMENT
  // ==========================================

  /**
   * Get or create workload record for user
   */
  async getOrCreateWorkload(
    userId: string,
    organizationId: string
  ): Promise<AlertWorkload> {
    const existing = await prisma.alertWorkload.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });

    if (existing) {
      return existing;
    }

    return prisma.alertWorkload.create({
      data: {
        userId,
        organizationId,
        activeAlerts: 0,
        criticalAlerts: 0,
        pendingReview: 0,
        maxCapacity: 50,
        availableCapacity: 50,
        isAvailable: true,
      },
    });
  }

  /**
   * Update user workload after alert assignment
   */
  async updateWorkloadOnAssignment(
    userId: string,
    organizationId: string,
    alert: Alert
  ): Promise<AlertWorkload> {
    const workload = await this.getOrCreateWorkload(userId, organizationId);

    const isCritical = alert.severity === AlertSeverity.CRITICAL;

    return prisma.alertWorkload.update({
      where: { id: workload.id },
      data: {
        activeAlerts: { increment: 1 },
        criticalAlerts: isCritical ? { increment: 1 } : undefined,
        availableCapacity: { decrement: 1 },
        lastUpdatedAt: new Date(),
      },
    });
  }

  /**
   * Update user workload after alert resolution
   */
  async updateWorkloadOnResolution(
    userId: string,
    organizationId: string,
    alert: Alert
  ): Promise<AlertWorkload> {
    const workload = await this.getOrCreateWorkload(userId, organizationId);

    const isCritical = alert.severity === AlertSeverity.CRITICAL;

    return prisma.alertWorkload.update({
      where: { id: workload.id },
      data: {
        activeAlerts: { decrement: 1 },
        criticalAlerts: isCritical ? { decrement: 1 } : undefined,
        availableCapacity: { increment: 1 },
        lastUpdatedAt: new Date(),
      },
    });
  }

  /**
   * Get available staff for alert assignment (by workload)
   */
  async getAvailableStaff(organizationId: string): Promise<WorkloadStats[]> {
    const workloads = await prisma.alertWorkload.findMany({
      where: {
        organizationId,
        isAvailable: true,
        availableCapacity: { gt: 0 },
      },
      orderBy: [
        { criticalAlerts: 'asc' },
        { availableCapacity: 'desc' },
      ],
    });

    return workloads.map((w) => ({
      userId: w.userId,
      activeAlerts: w.activeAlerts,
      criticalAlerts: w.criticalAlerts,
      pendingReview: w.pendingReview,
      availableCapacity: w.availableCapacity,
      avgResponseTime: w.avgResponseTime,
    }));
  }

  /**
   * Auto-assign alert to best available staff
   */
  async autoAssignAlert(
    alertId: string,
    organizationId: string
  ): Promise<Alert | null> {
    const alert = await prisma.alert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      throw new Error('Alert not found');
    }

    const availableStaff = await this.getAvailableStaff(organizationId);

    if (availableStaff.length === 0) {
      return null; // No available staff
    }

    // Assign to staff with most available capacity
    const assignee = availableStaff[0];

    const updatedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        assignedToId: assignee.userId,
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
      },
    });

    // Update assignee's workload
    await this.updateWorkloadOnAssignment(assignee.userId, organizationId, alert);

    await auditService.log({
      action: 'alert.assigned',
      entity: 'alert',
      entityId: alertId,
      organizationId,
      newValues: { assignedTo: assignee.userId },
    });

    return updatedAlert;
  }

  // ==========================================
  // SLA CONFIGURATION & MONITORING
  // ==========================================

  /**
   * Create SLA configuration
   */
  async createSlaConfig(
    input: SlaConfigInput,
    organizationId: string,
    userId: string
  ): Promise<AlertSlaConfig> {
    const config = await prisma.alertSlaConfig.create({
      data: {
        organizationId,
        name: input.name,
        severity: input.severity,
        vitalTypes: input.vitalTypes,
        acknowledgeSla: input.acknowledgeSla,
        resolveSla: input.resolveSla,
        escalateSla: input.escalateSla,
        warningThreshold: input.warningThreshold,
        priority: input.priority || 0,
        isActive: true,
      },
    });

    await auditService.log({
      action: 'alert_sla.created',
      entity: 'alert_sla',
      entityId: config.id,
      organizationId,
      userId,
      newValues: { name: config.name, severity: config.severity },
    });

    return config;
  }

  /**
   * Get SLA configurations
   */
  async getSlaConfigs(
    organizationId: string,
    options?: { severity?: AlertSeverity; isActive?: boolean }
  ): Promise<AlertSlaConfig[]> {
    const where: Prisma.AlertSlaConfigWhereInput = { organizationId };

    if (options?.severity) {
      where.severity = options.severity;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return prisma.alertSlaConfig.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { severity: 'asc' }],
    });
  }

  /**
   * Get applicable SLA for an alert
   */
  async getApplicableSla(alert: Alert): Promise<AlertSlaConfig | null> {
    // Get config matching severity - SLA configs are per severity
    return prisma.alertSlaConfig.findFirst({
      where: {
        organizationId: alert.organizationId,
        severity: alert.severity,
        isActive: true,
      },
      orderBy: { priority: 'desc' },
    });
  }

  /**
   * Check if alert is breaching SLA
   */
  async checkSlaBreach(alertId: string): Promise<{
    isBreached: boolean;
    breachType?: 'acknowledge' | 'resolve' | 'escalate';
    minutesOverdue?: number;
  }> {
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new Error('Alert not found');
    }

    const sla = await this.getApplicableSla(alert);
    if (!sla) {
      return { isBreached: false };
    }

    const ageMinutes = (Date.now() - alert.createdAt.getTime()) / 60000;

    // Check acknowledge SLA
    if (alert.status === AlertStatus.NEW && ageMinutes > sla.acknowledgeSla) {
      return {
        isBreached: true,
        breachType: 'acknowledge',
        minutesOverdue: Math.round(ageMinutes - sla.acknowledgeSla),
      };
    }

    // Check resolve SLA
    if (
      alert.status !== AlertStatus.RESOLVED &&
      ageMinutes > sla.resolveSla
    ) {
      return {
        isBreached: true,
        breachType: 'resolve',
        minutesOverdue: Math.round(ageMinutes - sla.resolveSla),
      };
    }

    // Check escalate SLA
    if (
      alert.status === AlertStatus.ACKNOWLEDGED &&
      ageMinutes > sla.escalateSla
    ) {
      return {
        isBreached: true,
        breachType: 'escalate',
        minutesOverdue: Math.round(ageMinutes - sla.escalateSla),
      };
    }

    return { isBreached: false };
  }

  /**
   * Get alerts approaching or breaching SLA
   */
  async getAlertsNearingSlaBreach(
    organizationId: string,
    options?: { includeBreached?: boolean }
  ): Promise<
    Array<{
      alert: Alert;
      sla: AlertSlaConfig;
      minutesToBreach: number;
      isBreached: boolean;
    }>
  > {
    const alerts = await prisma.alert.findMany({
      where: {
        organizationId,
        status: { in: [AlertStatus.NEW, AlertStatus.ACKNOWLEDGED] },
      },
      include: { patient: true },
    });

    const results: Array<{
      alert: Alert;
      sla: AlertSlaConfig;
      minutesToBreach: number;
      isBreached: boolean;
    }> = [];

    for (const alert of alerts) {
      const sla = await this.getApplicableSla(alert);
      if (!sla) continue;

      const ageMinutes = (Date.now() - alert.createdAt.getTime()) / 60000;

      // Use appropriate SLA based on status
      const applicableSlaMinutes =
        alert.status === AlertStatus.NEW
          ? sla.acknowledgeSla
          : sla.resolveSla;

      const minutesToBreach = applicableSlaMinutes - ageMinutes;
      const isBreached = minutesToBreach < 0;

      // Include if nearing breach (within warning threshold) or already breached
      if (
        minutesToBreach <= sla.warningThreshold ||
        (options?.includeBreached && isBreached)
      ) {
        results.push({
          alert,
          sla,
          minutesToBreach: Math.round(minutesToBreach),
          isBreached,
        });
      }
    }

    // Sort by most urgent first
    return results.sort((a, b) => a.minutesToBreach - b.minutesToBreach);
  }

  // ==========================================
  // ALERT DEDUPLICATION
  // ==========================================

  /**
   * Check if similar alert exists (deduplication)
   */
  async findSimilarAlert(
    patientId: string,
    organizationId: string,
    alertType: AlertType,
    withinMinutes: number = 30
  ): Promise<Alert | null> {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);

    return prisma.alert.findFirst({
      where: {
        patientId,
        organizationId,
        type: alertType,
        status: { not: AlertStatus.RESOLVED },
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mark alerts as duplicates using deduplication tracking
   */
  async trackDuplicate(
    patientId: string,
    organizationId: string,
    alertType: AlertType,
    originalAlertId: string,
    originalCreatedAt: Date
  ): Promise<void> {
    const now = new Date();
    const windowEnd = new Date(originalCreatedAt.getTime() + 30 * 60 * 1000); // 30 min window

    // Create dedup key (hash of characteristics)
    const dedupKey = `${patientId}:${alertType}:${Math.floor(originalCreatedAt.getTime() / (30 * 60 * 1000))}`;

    // Try to upsert - if original exists, increment suppressed count
    const existing = await prisma.alertDeduplication.findFirst({
      where: { originalAlertId },
    });

    if (existing) {
      await prisma.alertDeduplication.update({
        where: { id: existing.id },
        data: {
          suppressedCount: { increment: 1 },
          lastSuppressedAt: now,
        },
      });
    } else {
      await prisma.alertDeduplication.create({
        data: {
          organizationId,
          patientId,
          alertType,
          dedupKey,
          originalAlertId,
          originalCreatedAt,
          suppressedCount: 1,
          lastSuppressedAt: now,
          windowStart: originalCreatedAt,
          windowEnd,
        },
      });
    }
  }
}

export const alertIntelligenceService = new AlertIntelligenceService();
