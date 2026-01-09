import { api } from './client';
import { VitalType } from './thresholds';

export type AlertSeverity = 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL';
export type EscalationReason =
  | 'TIME_EXCEEDED'
  | 'MANUAL_ESCALATION'
  | 'NO_RESPONSE'
  | 'CONDITION_WORSENED'
  | 'REPEATED_ALERT';

export interface EscalationStep {
  level: number;
  roleType: string;
  delayMinutes: number;
  notifyChannels?: string[];
}

export interface EscalationRule {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  severity: AlertSeverity;
  vitalTypes: VitalType[];
  escalationChain: EscalationStep[];
  isActive: boolean;
  autoAssign: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEscalation {
  id: string;
  alertId: string;
  fromLevel: number;
  toLevel: number;
  fromUserId?: string;
  toUserId: string;
  reason: EscalationReason;
  notes?: string;
  executedAt: string;
  fromUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  toUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateEscalationRuleInput {
  name: string;
  description?: string;
  severity: AlertSeverity;
  vitalTypes?: VitalType[];
  escalationChain: EscalationStep[];
  isActive?: boolean;
  autoAssign?: boolean;
  priority?: number;
}

export interface UpdateEscalationRuleInput {
  name?: string;
  description?: string;
  severity?: AlertSeverity;
  vitalTypes?: VitalType[];
  escalationChain?: EscalationStep[];
  isActive?: boolean;
  autoAssign?: boolean;
  priority?: number;
}

export interface EscalateAlertInput {
  reason?: EscalationReason;
  notes?: string;
}

// Role type labels for display
export const ROLE_TYPE_LABELS: Record<string, string> = {
  PRIMARY_PHYSICIAN: 'Primary Physician',
  NURSE: 'Nurse',
  CARE_COORDINATOR: 'Care Coordinator',
  SPECIALIST: 'Specialist',
  ON_CALL: 'On-Call Staff',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Administrator',
};

// Escalation reason labels
export const ESCALATION_REASON_LABELS: Record<EscalationReason, string> = {
  TIME_EXCEEDED: 'Time Limit Exceeded',
  MANUAL_ESCALATION: 'Manual Escalation',
  NO_RESPONSE: 'No Response',
  CONDITION_WORSENED: 'Condition Worsened',
  REPEATED_ALERT: 'Repeated Alert',
};

// Severity labels and colors
export const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; color: string; bgColor: string }
> = {
  CRITICAL: {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  SIGNIFICANT: {
    label: 'Significant',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  INFORMATIONAL: {
    label: 'Informational',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
};

export const escalationApi = {
  /**
   * Get all escalation rules
   */
  getRules: async (): Promise<EscalationRule[]> => {
    const response = await api.get<{ success: boolean; data: EscalationRule[] }>(
      '/api/escalation-rules'
    );
    return response.data;
  },

  /**
   * Get a specific escalation rule
   */
  getRule: async (ruleId: string): Promise<EscalationRule> => {
    const response = await api.get<{ success: boolean; data: EscalationRule }>(
      `/api/escalation-rules/${ruleId}`
    );
    return response.data;
  },

  /**
   * Create a new escalation rule
   */
  createRule: async (data: CreateEscalationRuleInput): Promise<EscalationRule> => {
    const response = await api.post<{ success: boolean; data: EscalationRule }>(
      '/api/escalation-rules',
      data
    );
    return response.data;
  },

  /**
   * Update an escalation rule
   */
  updateRule: async (
    ruleId: string,
    data: UpdateEscalationRuleInput
  ): Promise<EscalationRule> => {
    const response = await api.put<{ success: boolean; data: EscalationRule }>(
      `/api/escalation-rules/${ruleId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete an escalation rule
   */
  deleteRule: async (ruleId: string): Promise<void> => {
    await api.delete(`/api/escalation-rules/${ruleId}`);
  },

  /**
   * Manually escalate an alert
   */
  escalateAlert: async (
    alertId: string,
    data?: EscalateAlertInput
  ): Promise<{ alert: unknown }> => {
    const response = await api.post<{ success: boolean; data: unknown }>(
      `/api/escalation-rules/alerts/${alertId}/escalate`,
      data || {}
    );
    return { alert: response.data };
  },

  /**
   * Get escalation history for an alert
   */
  getAlertEscalations: async (alertId: string): Promise<AlertEscalation[]> => {
    const response = await api.get<{ success: boolean; data: AlertEscalation[] }>(
      `/api/escalation-rules/alerts/${alertId}/escalations`
    );
    return response.data;
  },
};
