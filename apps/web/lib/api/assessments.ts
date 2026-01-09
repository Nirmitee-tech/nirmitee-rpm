import { api } from './client';

// Types
export type AssessmentType = 'PHQ9' | 'GAD7' | 'FALLS_RISK' | 'NUTRITION' | 'PAIN_SCALE' | 'ADL';
export type AssessmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Assessment {
  id: string;
  patientId: string;
  organizationId: string;
  type: AssessmentType;
  status: AssessmentStatus;
  score?: number | null;
  maxScore?: number | null;
  responses?: Record<string, unknown> | null;
  notes?: string | null;
  completedById?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    mrn?: string;
  };
  completedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface CreateAssessmentInput {
  patientId: string;
  type: AssessmentType;
  dueDate?: string;
  notes?: string;
}

export interface UpdateAssessmentInput {
  score?: number;
  maxScore?: number;
  responses?: Record<string, unknown>;
  notes?: string;
  status?: AssessmentStatus;
}

export interface CompleteAssessmentInput {
  score: number;
  maxScore: number;
  responses?: Record<string, unknown>;
  notes?: string;
}

export interface ListAssessmentsParams {
  patientId?: string;
  type?: AssessmentType;
  status?: AssessmentStatus;
  page?: number;
  limit?: number;
}

export interface ListAssessmentsResponse {
  assessments: Assessment[];
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

export const assessmentsApi = {
  /**
   * Get all assessments for organization
   */
  getAssessments: async (params?: ListAssessmentsParams): Promise<ListAssessmentsResponse> => {
    const query = buildQueryString(params as Record<string, unknown>);
    const response = await api.get<{
      success: boolean;
      data: Assessment[];
      pagination: ListAssessmentsResponse['pagination'];
    }>(`/api/assessments${query}`);
    return {
      assessments: response.data,
      pagination: response.pagination,
    };
  },

  /**
   * Get assessments for a specific patient
   */
  getPatientAssessments: async (
    patientId: string,
    params?: { type?: AssessmentType; status?: AssessmentStatus }
  ): Promise<Assessment[]> => {
    const query = buildQueryString(params as Record<string, unknown>);
    const response = await api.get<{ success: boolean; data: Assessment[] }>(
      `/api/assessments/patient/${patientId}${query}`
    );
    return response.data;
  },

  /**
   * Get overdue assessments
   */
  getOverdueAssessments: async (): Promise<Assessment[]> => {
    const response = await api.get<{ success: boolean; data: Assessment[] }>(
      '/api/assessments/overdue'
    );
    return response.data;
  },

  /**
   * Get pending assessments count
   */
  getPendingCount: async (): Promise<number> => {
    const response = await api.get<{ success: boolean; data: { count: number } }>(
      '/api/assessments/pending/count'
    );
    return response.data.count;
  },

  /**
   * Get a single assessment
   */
  getAssessment: async (id: string): Promise<Assessment> => {
    const response = await api.get<{ success: boolean; data: Assessment }>(
      `/api/assessments/${id}`
    );
    return response.data;
  },

  /**
   * Create a new assessment (schedule)
   */
  createAssessment: async (data: CreateAssessmentInput): Promise<Assessment> => {
    const response = await api.post<{ success: boolean; data: Assessment }>(
      '/api/assessments',
      data
    );
    return response.data;
  },

  /**
   * Update an assessment
   */
  updateAssessment: async (id: string, data: UpdateAssessmentInput): Promise<Assessment> => {
    const response = await api.put<{ success: boolean; data: Assessment }>(
      `/api/assessments/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Complete an assessment
   */
  completeAssessment: async (id: string, data: CompleteAssessmentInput): Promise<Assessment> => {
    const response = await api.post<{ success: boolean; data: Assessment }>(
      `/api/assessments/${id}/complete`,
      data
    );
    return response.data;
  },

  /**
   * Cancel an assessment
   */
  cancelAssessment: async (id: string, reason?: string): Promise<Assessment> => {
    const response = await api.post<{ success: boolean; data: Assessment }>(
      `/api/assessments/${id}/cancel`,
      { reason }
    );
    return response.data;
  },

  /**
   * Delete an assessment
   */
  deleteAssessment: async (id: string): Promise<void> => {
    await api.delete(`/api/assessments/${id}`);
  },
};

// Map API assessment type to UI display type
export function mapApiTypeToUI(type: AssessmentType): string {
  const mapping: Record<AssessmentType, string> = {
    PHQ9: 'PHQ-9',
    GAD7: 'GAD-7',
    FALLS_RISK: 'Falls Risk',
    NUTRITION: 'Nutrition',
    PAIN_SCALE: 'Pain Scale',
    ADL: 'ADL',
  };
  return mapping[type] || type;
}

// Map UI display type to API type
export function mapUITypeToApi(type: string): AssessmentType {
  const mapping: Record<string, AssessmentType> = {
    'PHQ-9': 'PHQ9',
    'GAD-7': 'GAD7',
    'Falls Risk': 'FALLS_RISK',
    'Nutrition': 'NUTRITION',
    'Pain Scale': 'PAIN_SCALE',
    'ADL': 'ADL',
  };
  return mapping[type] || (type as AssessmentType);
}

// Map API status to UI status
export function mapApiStatusToUI(status: AssessmentStatus): 'completed' | 'pending' | 'overdue' {
  switch (status) {
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'completed'; // Treat cancelled as completed for display
    case 'SCHEDULED':
    case 'IN_PROGRESS':
    default:
      return 'pending';
  }
}
