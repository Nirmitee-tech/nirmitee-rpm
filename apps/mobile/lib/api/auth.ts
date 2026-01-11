import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  mfaEnabled?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface LoginResponse {
  user: User;
  organization: Organization;
  accessToken: string;
  refreshToken: string;
  requiresMfa?: boolean;
  mfaSessionToken?: string;
}

export interface MfaVerifyResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      { email, password },
      { skipAuth: true }
    );

    if (response.accessToken && response.refreshToken) {
      await apiClient.setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  },

  verifyMfa: async (mfaSessionToken: string, code: string): Promise<MfaVerifyResponse> => {
    const response = await apiClient.post<MfaVerifyResponse>(
      '/auth/verify-mfa',
      { mfaSessionToken, code },
      { skipAuth: true }
    );

    if (response.accessToken && response.refreshToken) {
      await apiClient.setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      await apiClient.clearTokens();
    }
  },

  getMe: async (): Promise<User> => {
    return apiClient.get<User>('/auth/me');
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return apiClient.post('/auth/forgot-password', { email }, { skipAuth: true });
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    return apiClient.post('/auth/reset-password', { token, password }, { skipAuth: true });
  },
};

export default authApi;
