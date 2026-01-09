import { api } from './client';

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
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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
}

export interface CreateSessionInput {
  patientId: string;
  scheduledAt?: string;
  description?: string;
}

export interface JoinSessionResponse {
  token: string;
  roomId: string;
  role: 'provider' | 'patient' | 'caregiver';
}

export interface SessionEndResponse {
  duration: number;
  billableMinutes: number;
}

export interface ListSessionsParams {
  patientId?: string;
  providerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ListSessionsApiResponse {
  success: boolean;
  data: TelehealthSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListSessionsResponse {
  sessions: TelehealthSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper to build query string
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

export interface ScheduleSessionInput {
  patientId: string;
  scheduledAt: string;
  description?: string;
  sendEmail?: boolean;
}

export interface CanRejoinResponse {
  canRejoin: boolean;
  reason?: string;
  timeRemaining?: number;
}

export interface VerifyTokenResponse {
  sessionId: string;
  status: string;
  scheduledAt: string;
  providerName: string;
  organizationName: string;
  canJoin: boolean;
  canJoinReason?: string;
  timeRemaining?: number;
}

export interface JoinByTokenResponse {
  sessionId: string;
  token: string;
  roomId: string;
  role: 'provider' | 'patient' | 'caregiver';
  patientName: string;
}

export const telehealthApi = {
  /**
   * Create a new telehealth session
   */
  async createSession(data: CreateSessionInput): Promise<TelehealthSession> {
    const response = await api.post<ApiResponse<TelehealthSession>>('/api/telehealth/sessions', data);
    return response.data;
  },

  /**
   * Schedule a future telehealth session with email notification
   */
  async scheduleSession(data: ScheduleSessionInput): Promise<TelehealthSession & { emailSent: boolean }> {
    const response = await api.post<ApiResponse<TelehealthSession & { emailSent: boolean }>>('/api/telehealth/schedule', data);
    return response.data;
  },

  /**
   * Get sessions for the currently logged-in patient
   * Used in patient portal to display pending video calls
   */
  async getMySessions(status?: string): Promise<TelehealthSession[]> {
    const query = status ? `?status=${status}` : '';
    const response = await api.get<{ success: boolean; data: TelehealthSession[] }>(`/api/telehealth/my-sessions${query}`);
    return response.data;
  },

  /**
   * List telehealth sessions
   */
  async listSessions(params?: ListSessionsParams): Promise<ListSessionsResponse> {
    const query = buildQueryString(params as Record<string, unknown>);
    const response = await api.get<ListSessionsApiResponse>(`/api/telehealth/sessions${query}`);
    return {
      sessions: response.data,
      pagination: response.pagination,
    };
  },

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<TelehealthSession> {
    const response = await api.get<ApiResponse<TelehealthSession>>(`/api/telehealth/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Join a session (get token)
   */
  async joinSession(sessionId: string): Promise<JoinSessionResponse> {
    const response = await api.post<ApiResponse<JoinSessionResponse>>(`/api/telehealth/sessions/${sessionId}/join`);
    return response.data;
  },

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<SessionEndResponse> {
    const response = await api.post<ApiResponse<SessionEndResponse>>(`/api/telehealth/sessions/${sessionId}/end`);
    return response.data;
  },

  /**
   * Cancel a session
   */
  async cancelSession(sessionId: string, reason?: string): Promise<void> {
    await api.post<ApiResponse<void>>(`/api/telehealth/sessions/${sessionId}/cancel`, { reason });
  },

  /**
   * Start a quick call with a patient
   */
  async quickCall(patientId: string): Promise<{
    sessionId: string;
    roomId: string;
    roomCode: string;
    token: string;
    role: 'provider' | 'patient' | 'caregiver';
  }> {
    const response = await api.post<ApiResponse<{
      sessionId: string;
      roomId: string;
      roomCode: string;
      token: string;
      role: 'provider' | 'patient' | 'caregiver';
    }>>('/api/telehealth/quick-call', { patientId });
    return response.data;
  },

  /**
   * Update session clinical notes
   */
  async updateSessionNotes(sessionId: string, notes: string): Promise<{ notes: string; updatedAt: string }> {
    const response = await api.put<{ success: boolean; data: { notes: string; updatedAt: string } }>(
      `/api/telehealth/sessions/${sessionId}/notes`,
      { notes }
    );
    return response.data;
  },

  /**
   * Get session clinical notes
   */
  async getSessionNotes(sessionId: string): Promise<string> {
    const response = await api.get<{ success: boolean; data: { notes: string } }>(
      `/api/telehealth/sessions/${sessionId}/notes`
    );
    return response.data.notes;
  },

  /**
   * Check if a session can be rejoined (after disconnect)
   */
  async canRejoinSession(sessionId: string): Promise<CanRejoinResponse> {
    const response = await api.get<ApiResponse<CanRejoinResponse>>(
      `/api/telehealth/sessions/${sessionId}/can-rejoin`
    );
    return response.data;
  },

  /**
   * Send or resend invite email to patient
   */
  async sendInviteEmail(sessionId: string): Promise<void> {
    await api.post<ApiResponse<void>>(`/api/telehealth/sessions/${sessionId}/send-invite`);
  },

  /**
   * Verify a join token (public - no auth needed)
   * Used when patient clicks email link
   */
  async verifyJoinToken(token: string): Promise<VerifyTokenResponse> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/telehealth/verify-token?token=${encodeURIComponent(token)}`
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify token');
    }
    return data.data;
  },

  /**
   * Join session by email token (public - no auth needed)
   * Used when patient clicks email link
   */
  async joinByToken(token: string): Promise<JoinByTokenResponse> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/telehealth/join-by-token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to join session');
    }
    return data.data;
  },
};

export default telehealthApi;
