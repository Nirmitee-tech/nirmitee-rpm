import { api } from './client';

// Types
export type AlertSeverity = 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL';
export type AlertConditionLogic = 'AND' | 'OR';
export type AlertConditionOperator = 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';

export interface AlertCondition {
  id: string;
  vital: string;
  operator: AlertConditionOperator;
  value: number;
}

export interface AlertRule {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  conditions: AlertCondition[];
  conditionLogic: AlertConditionLogic;
  severity: AlertSeverity;
  actions: string[];
  isEnabled: boolean;
  triggeredCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateAlertRuleInput {
  name: string;
  description?: string;
  conditions: AlertCondition[];
  conditionLogic?: AlertConditionLogic;
  severity: AlertSeverity;
  actions: string[];
  isEnabled?: boolean;
}

export interface UpdateAlertRuleInput {
  name?: string;
  description?: string;
  conditions?: AlertCondition[];
  conditionLogic?: AlertConditionLogic;
  severity?: AlertSeverity;
  actions?: string[];
  isEnabled?: boolean;
}

export interface ListAlertRulesParams {
  severity?: AlertSeverity;
  isEnabled?: boolean;
  page?: number;
  limit?: number;
}

export interface ListAlertRulesResponse {
  rules: AlertRule[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const alertRulesApi = {
  /**
   * Get all alert rules for the organization
   */
  getRules: async (params?: ListAlertRulesParams): Promise<ListAlertRulesResponse> => {
    const query = buildQueryString(params as Record<string, unknown>);
    const response = await api.get<{
      success: boolean;
      data: AlertRule[];
      pagination: ListAlertRulesResponse['pagination'];
    }>(`/api/alert-rules${query}`);
    return {
      rules: response.data,
      pagination: response.pagination,
    };
  },

  /**
   * Get a specific alert rule
   */
  getRule: async (ruleId: string): Promise<AlertRule> => {
    const response = await api.get<{ success: boolean; data: AlertRule }>(
      `/api/alert-rules/${ruleId}`
    );
    return response.data;
  },

  /**
   * Create a new alert rule
   */
  createRule: async (data: CreateAlertRuleInput): Promise<AlertRule> => {
    const response = await api.post<{ success: boolean; data: AlertRule }>(
      '/api/alert-rules',
      data
    );
    return response.data;
  },

  /**
   * Update an alert rule
   */
  updateRule: async (ruleId: string, data: UpdateAlertRuleInput): Promise<AlertRule> => {
    const response = await api.put<{ success: boolean; data: AlertRule }>(
      `/api/alert-rules/${ruleId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete an alert rule
   */
  deleteRule: async (ruleId: string): Promise<void> => {
    await api.delete(`/api/alert-rules/${ruleId}`);
  },

  /**
   * Toggle an alert rule's enabled status
   */
  toggleRule: async (ruleId: string): Promise<AlertRule> => {
    const response = await api.post<{ success: boolean; data: AlertRule }>(
      `/api/alert-rules/${ruleId}/toggle`
    );
    return response.data;
  },
};
