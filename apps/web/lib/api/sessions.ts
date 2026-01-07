import { api } from './client';

export interface Session {
  id: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string | null;
  location: string | null;
  lastActive: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface SessionsResponse {
  sessions: Session[];
}

export interface CurrentSessionResponse {
  session: Session;
}

export interface RevokeAllResponse {
  message: string;
  revokedCount: number;
}

export const sessionsApi = {
  /**
   * Get all active sessions for the current user
   */
  getSessions: async (refreshToken?: string): Promise<SessionsResponse> => {
    return api.get<SessionsResponse>('/api/sessions');
  },

  /**
   * Get current session information
   */
  getCurrentSession: async (refreshToken: string): Promise<CurrentSessionResponse> => {
    return api.post<CurrentSessionResponse>('/api/sessions/current', {
      refreshToken,
    });
  },

  /**
   * Revoke a specific session by ID
   */
  revokeSession: async (sessionId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/api/sessions/${sessionId}`);
  },

  /**
   * Revoke all sessions except the current one
   */
  revokeAllOtherSessions: async (refreshToken: string): Promise<RevokeAllResponse> => {
    return api.post<RevokeAllResponse>('/api/sessions/revoke-all', {
      refreshToken,
    });
  },
};
