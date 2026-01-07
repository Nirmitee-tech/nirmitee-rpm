import { api } from './client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  role?: string;
}

export interface AuthResponse {
  user: User;
  organization: Organization;
  accessToken: string;
  refreshToken: string;
  permissions?: string[];
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export type MfaMethod = 'TOTP' | 'EMAIL';

export interface LoginResponse {
  user?: User;
  organization?: Organization;
  accessToken?: string;
  refreshToken?: string;
  mfaRequired?: boolean;
  userId?: string;
  mfaMethod?: MfaMethod;
  message?: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  otpauthUrl: string;
}

export interface MfaStatusResponse {
  enabled: boolean;
  method: MfaMethod | null;
  enabledAt: string | null;
  hasBackupCodes: boolean;
  backupCodesCount: number;
}

export interface OAuthProvider {
  id: string;
  type: string;
  name: string;
  isGlobal: boolean;
}

export interface OAuthProviderConfig {
  id: string;
  provider: string;
  name: string;
  clientId: string;
  tenantId?: string;
  domain?: string;
  scopes: string[];
  enabled: boolean;
  autoProvision: boolean;
  defaultRoleId?: string;
  defaultRole?: { id: string; name: string };
}

export const authApi = {
  signup: (data: SignupData) =>
    api.post<AuthResponse>('/api/auth/signup', data),

  login: (data: LoginData) =>
    api.post<AuthResponse>('/api/auth/login', data),

  logout: (refreshToken?: string) =>
    api.post<{ message: string }>('/api/auth/logout', { refreshToken }),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>('/api/auth/reset-password', { token, newPassword }),

  me: () =>
    api.get<{ userId: string; email: string; organizationId: string }>('/api/auth/me'),

  // Token refresh
  refreshToken: (refreshToken: string) =>
    api.post<AuthResponse>('/api/auth/refresh', { refreshToken }),

  // Change password
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/api/auth/change-password', { currentPassword, newPassword }),
};

export const mfaApi = {
  // Get MFA status
  getStatus: () =>
    api.get<MfaStatusResponse>('/api/auth/mfa/status'),

  // Generate MFA setup (secret + QR code)
  setup: () =>
    api.post<MfaSetupResponse>('/api/auth/mfa/setup', {}),

  // Verify code and enable MFA
  verifySetup: (code: string) =>
    api.post<{ message: string; backupCodes: string[] }>('/api/auth/mfa/verify-setup', { code }),

  // Disable MFA
  disable: (password: string) =>
    api.post<{ message: string }>('/api/auth/mfa/disable', { password }),

  // Regenerate backup codes
  regenerateBackupCodes: (code: string) =>
    api.post<{ message: string; backupCodes: string[] }>('/api/auth/mfa/regenerate-backup-codes', { code }),

  // Verify MFA during login
  verifyLogin: (userId: string, code: string) =>
    api.post<AuthResponse>('/api/auth/verify-mfa', { userId, code }),

  // Enable email OTP MFA
  enableEmail: () =>
    api.post<{ message: string; backupCodes: string[] }>('/api/auth/mfa/enable-email', {}),

  // Send email OTP (for authenticated user)
  sendEmailOtp: () =>
    api.post<{ message: string }>('/api/auth/mfa/send-email-otp', {}),

  // Resend email OTP during login (no auth required)
  resendLoginOtp: (userId: string) =>
    api.post<{ message: string }>('/api/auth/send-email-otp', { userId }),
};

export const oauthApi = {
  // Get available OAuth providers for login page
  getProviders: (organizationId?: string) =>
    api.get<{ providers: OAuthProvider[] }>(
      `/api/oauth/providers${organizationId ? `?organizationId=${organizationId}` : ''}`
    ),

  // Get supported provider types
  getSupportedProviders: () =>
    api.get<{ providers: Array<{ type: string; name: string; description: string; configFields: string[]; comingSoon?: boolean }> }>(
      '/api/oauth/supported-providers'
    ),

  // Initiate OAuth flow
  initiateOAuth: (providerId: string, redirectUrl?: string) =>
    api.post<{ authorizationUrl: string; state: string }>(
      '/api/oauth/initiate',
      { providerId, redirectUrl }
    ),

  // Admin: Get organization's OAuth provider configurations
  getOrgProviders: () =>
    api.get<{ providers: OAuthProviderConfig[] }>('/api/oauth/admin/providers'),

  // Admin: Configure OAuth provider
  configureProvider: (data: {
    provider: string;
    name: string;
    clientId: string;
    clientSecret: string;
    tenantId?: string;
    domain?: string;
    scopes?: string[];
    enabled?: boolean;
    autoProvision?: boolean;
    defaultRoleId?: string;
  }) => api.post<{ provider: OAuthProviderConfig }>('/api/oauth/admin/providers', data),

  // Admin: Update OAuth provider
  updateProvider: (id: string, data: Partial<{
    name: string;
    clientId: string;
    clientSecret: string;
    tenantId?: string;
    domain?: string;
    scopes?: string[];
    enabled?: boolean;
    autoProvision?: boolean;
    defaultRoleId?: string;
  }>) => api.put<{ provider: OAuthProviderConfig }>(`/api/oauth/admin/providers/${id}`, data),

  // Admin: Delete OAuth provider
  deleteProvider: (id: string) =>
    api.delete<{ message: string }>(`/api/oauth/admin/providers/${id}`),
};
