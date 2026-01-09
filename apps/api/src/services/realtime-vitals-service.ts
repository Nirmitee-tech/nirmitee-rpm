import { VitalType, AlertSeverity } from '@prisma/client';
import { log } from '../utils/logger';
import { wsService } from './websocket-service';

// WebSocket events for real-time vitals
export const VITAL_WS_EVENTS = {
  // Vital reading events
  VITAL_READING_NEW: 'vital:reading:new',
  VITAL_READING_BATCH: 'vital:reading:batch',

  // Threshold events
  VITAL_THRESHOLD_EXCEEDED: 'vital:threshold:exceeded',
  VITAL_THRESHOLD_WARNING: 'vital:threshold:warning',

  // Alert events
  ALERT_NEW: 'alert:new',
  ALERT_CRITICAL: 'alert:critical',
  ALERT_UPDATED: 'alert:updated',
  ALERT_ACKNOWLEDGED: 'alert:acknowledged',
  ALERT_ESCALATED: 'alert:escalated',
  ALERT_RESOLVED: 'alert:resolved',

  // Patient status events
  PATIENT_STATUS_CHANGED: 'patient:status:changed',
  PATIENT_VITALS_UPDATED: 'patient:vitals:updated',

  // Dashboard events
  DASHBOARD_STATS_UPDATE: 'dashboard:stats:update',
} as const;

interface VitalReadingPayload {
  id: string;
  patientId: string;
  patientName: string;
  type: VitalType;
  values: Record<string, number>;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  recordedAt: Date;
  source: string;
}

interface AlertPayload {
  id: string;
  patientId: string;
  patientName: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  status: string;
  assignedToId?: string;
  assignedToName?: string;
  createdAt: Date;
  vitalType?: string;
  values?: Record<string, number>;
}

interface PatientStatusPayload {
  patientId: string;
  patientName: string;
  previousStatus?: string;
  currentStatus: string;
  reason?: string;
  timestamp: Date;
}

interface DashboardStatsPayload {
  totalPatients: number;
  criticalAlerts: number;
  warningAlerts: number;
  activeMonitoring: number;
  readingsToday: number;
  timestamp: Date;
}

class RealtimeVitalsService {
  /**
   * Emit new vital reading to organization
   */
  emitNewReading(
    organizationId: string,
    reading: VitalReadingPayload
  ): void {
    try {
      wsService.emitToOrganization(organizationId, VITAL_WS_EVENTS.VITAL_READING_NEW, reading);

      // If critical or warning, also emit threshold event
      if (reading.status === 'critical') {
        wsService.emitToOrganization(organizationId, VITAL_WS_EVENTS.VITAL_THRESHOLD_EXCEEDED, {
          ...reading,
          timestamp: new Date(),
        });
      } else if (reading.status === 'warning') {
        wsService.emitToOrganization(organizationId, VITAL_WS_EVENTS.VITAL_THRESHOLD_WARNING, {
          ...reading,
          timestamp: new Date(),
        });
      }

      log.debug('[REALTIME_VITALS] Emitted new reading', {
        organizationId,
        patientId: reading.patientId,
        type: reading.type,
        status: reading.status,
      });
    } catch (error) {
      log.error('[REALTIME_VITALS] Failed to emit reading', { error, organizationId });
    }
  }

  /**
   * Emit batch of readings (for bulk imports)
   */
  emitBatchReadings(
    organizationId: string,
    readings: VitalReadingPayload[]
  ): void {
    try {
      wsService.emitToOrganization(organizationId, VITAL_WS_EVENTS.VITAL_READING_BATCH, {
        readings,
        count: readings.length,
        timestamp: new Date(),
      });

      log.debug('[REALTIME_VITALS] Emitted batch readings', {
        organizationId,
        count: readings.length,
      });
    } catch (error) {
      log.error('[REALTIME_VITALS] Failed to emit batch readings', { error, organizationId });
    }
  }

  /**
   * Emit new alert
   */
  emitNewAlert(
    organizationId: string,
    alert: AlertPayload
  ): void {
    try {
      const event = alert.severity === 'CRITICAL'
        ? VITAL_WS_EVENTS.ALERT_CRITICAL
        : VITAL_WS_EVENTS.ALERT_NEW;

      wsService.emitToOrganization(organizationId, event, alert);

      // Also emit to assigned user if any
      if (alert.assignedToId) {
        wsService.emitToUser(alert.assignedToId, event, alert);
      }

      log.debug('[REALTIME_VITALS] Emitted new alert', {
        organizationId,
        alertId: alert.id,
        severity: alert.severity,
      });
    } catch (error) {
      log.error('[REALTIME_VITALS] Failed to emit alert', { error, organizationId });
    }
  }

  /**
   * Emit alert update
   */
  emitAlertUpdate(
    organizationId: string,
    alert: Partial<AlertPayload> & { id: string },
    eventType: 'updated' | 'acknowledged' | 'escalated' | 'resolved'
  ): void {
    try {
      const eventMap = {
        updated: VITAL_WS_EVENTS.ALERT_UPDATED,
        acknowledged: VITAL_WS_EVENTS.ALERT_ACKNOWLEDGED,
        escalated: VITAL_WS_EVENTS.ALERT_ESCALATED,
        resolved: VITAL_WS_EVENTS.ALERT_RESOLVED,
      };

      wsService.emitToOrganization(organizationId, eventMap[eventType], {
        ...alert,
        timestamp: new Date(),
      });

      log.debug('[REALTIME_VITALS] Emitted alert update', {
        alertId: alert.id,
        eventType,
      });
    } catch (error) {
      log.error('[REALTIME_VITALS] Failed to emit alert update', { error });
    }
  }

  /**
   * Emit patient status change
   */
  emitPatientStatusChange(
    organizationId: string,
    payload: PatientStatusPayload
  ): void {
    try {
      wsService.emitToOrganization(organizationId, VITAL_WS_EVENTS.PATIENT_STATUS_CHANGED, payload);

      log.debug('[REALTIME_VITALS] Emitted patient status change', {
        patientId: payload.patientId,
        status: payload.currentStatus,
      });
    } catch (error) {
      log.error('[REALTIME_VITALS] Failed to emit patient status', { error });
    }
  }

  /**
   * Emit patient vitals summary update
   */
  emitPatientVitalsUpdate(
    organizationId: string,
    patientId: string,
    summary: {
      latestReadings: Record<VitalType, {
        value: Record<string, number>;
        status: 'normal' | 'warning' | 'critical';
        recordedAt: Date;
      }>;
      overallStatus: 'normal' | 'warning' | 'critical';
      activeAlerts: number;
    }
  ): void {
    try {
      wsService.emitToOrganization(organizationId, VITAL_WS_EVENTS.PATIENT_VITALS_UPDATED, {
        patientId,
        ...summary,
        timestamp: new Date(),
      });
    } catch (error) {
      log.error('[REALTIME_VITALS] Failed to emit patient vitals update', { error });
    }
  }

  /**
   * Emit dashboard stats update
   */
  emitDashboardStatsUpdate(
    organizationId: string,
    stats: DashboardStatsPayload
  ): void {
    try {
      wsService.emitToOrganization(organizationId, VITAL_WS_EVENTS.DASHBOARD_STATS_UPDATE, stats);
    } catch (error) {
      log.error('[REALTIME_VITALS] Failed to emit dashboard stats', { error });
    }
  }

  /**
   * Emit to specific users (care team)
   */
  emitToCareTeam(
    userIds: string[],
    event: string,
    payload: unknown
  ): void {
    for (const userId of userIds) {
      wsService.emitToUser(userId, event, payload);
    }
  }

  /**
   * Emit critical alert to all online admins in org
   */
  emitCriticalAlertToAdmins(
    organizationId: string,
    alert: AlertPayload
  ): void {
    try {
      // This emits to the org room which includes all admins
      wsService.emitToOrganization(organizationId, VITAL_WS_EVENTS.ALERT_CRITICAL, {
        ...alert,
        urgent: true,
        timestamp: new Date(),
      });
    } catch (error) {
      log.error('[REALTIME_VITALS] Failed to emit critical alert to admins', { error });
    }
  }
}

export const realtimeVitalsService = new RealtimeVitalsService();
