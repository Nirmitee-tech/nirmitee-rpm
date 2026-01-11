import apiClient from './client';

export interface TelehealthSession {
  id: string;
  roomId: string;
  roomCode: string;
  patientId: string;
  providerId: string;
  organizationId: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  billableMinutes?: number;
  metadata?: {
    patientName?: string;
    providerName?: string;
    clinicalNotes?: string;
  };
  patient?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email?: string;
    };
  };
  provider?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface JoinSessionResponse {
  token: string;
  roomId: string;
  role: 'provider' | 'patient' | 'caregiver';
}

export interface EndSessionResponse {
  duration: number;
  billableMinutes: number;
}

export interface CanRejoinResponse {
  canRejoin: boolean;
  reason?: string;
  timeRemaining?: number;
}

class TelehealthApi {
  /**
   * Get all telehealth sessions for the organization
   */
  async getSessions(params?: {
    patientId?: string;
    providerId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    sessions: TelehealthSession[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.patientId) searchParams.append('patientId', params.patientId);
    if (params?.providerId) searchParams.append('providerId', params.providerId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const query = searchParams.toString();
    return apiClient.get(`/telehealth/sessions${query ? `?${query}` : ''}`);
  }

  /**
   * Get upcoming/active sessions for the current user
   */
  async getUpcomingSessions(): Promise<TelehealthSession[]> {
    const result = await this.getSessions({ status: 'SCHEDULED,ACTIVE', limit: 10 });
    return result.sessions;
  }

  /**
   * Get a specific telehealth session
   */
  async getSession(sessionId: string): Promise<TelehealthSession> {
    return apiClient.get(`/telehealth/sessions/${sessionId}`);
  }

  /**
   * Join a telehealth session and get the 100ms token
   */
  async joinSession(sessionId: string): Promise<JoinSessionResponse> {
    return apiClient.post(`/telehealth/sessions/${sessionId}/join`);
  }

  /**
   * Check if a session can be rejoined
   */
  async canRejoinSession(sessionId: string): Promise<CanRejoinResponse> {
    return apiClient.get(`/telehealth/sessions/${sessionId}/can-rejoin`);
  }

  /**
   * End a telehealth session (provider only)
   */
  async endSession(sessionId: string): Promise<EndSessionResponse> {
    return apiClient.post(`/telehealth/sessions/${sessionId}/end`);
  }

  /**
   * Update clinical notes for a session
   */
  async updateNotes(sessionId: string, notes: string): Promise<{ notes: string; updatedAt: string }> {
    return apiClient.put(`/telehealth/sessions/${sessionId}/notes`, { notes });
  }

  /**
   * Get clinical notes for a session
   */
  async getNotes(sessionId: string): Promise<string> {
    const result = await apiClient.get<{ notes: string }>(`/telehealth/sessions/${sessionId}/notes`);
    return result.notes;
  }

  /**
   * Cancel a scheduled session
   */
  async cancelSession(sessionId: string, reason?: string): Promise<{ success: boolean }> {
    return apiClient.post(`/telehealth/sessions/${sessionId}/cancel`, { reason });
  }
}

export const telehealthApi = new TelehealthApi();
