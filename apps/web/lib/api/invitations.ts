import { api } from './client';

export interface Invitation {
  id: string;
  email: string;
  roleId: string;
  role: {
    id: string;
    name: string;
  };
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  invitedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
  inviteUrl?: string;
}

export interface InvitationDetails {
  email: string;
  organization: {
    id: string;
    name: string;
    logo?: string;
  };
  role: string;
  status: string;
  expiresAt: string;
  isExpired: boolean;
}

export interface ListInvitationsResponse {
  invitations: Invitation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SendInvitationData {
  email: string;
  roleId: string;
}

export interface AcceptInvitationData {
  password?: string;
  firstName?: string;
  lastName?: string;
}

export const invitationsApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    return api.get<ListInvitationsResponse>(`/api/invitations?${query.toString()}`);
  },

  getByToken: (token: string) =>
    api.get<InvitationDetails>(`/api/invitations/${token}`),

  send: (data: SendInvitationData) =>
    api.post<Invitation>('/api/invitations', data),

  accept: (token: string, data?: AcceptInvitationData) =>
    api.post<{ user: any; organization: any; role: string }>(`/api/invitations/${token}/accept`, data || {}),

  resend: (invitationId: string) =>
    api.post<Invitation>(`/api/invitations/${invitationId}/resend`),

  revoke: (invitationId: string) =>
    api.delete<{ message: string }>(`/api/invitations/${invitationId}`),
};
