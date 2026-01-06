import { api } from './client';

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatar?: string;
  role: 'LEAD' | 'MEMBER';
  joinedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  members: TeamMember[];
  createdAt: string;
}

export interface TeamDetail extends Team {
  updatedAt: string;
}

export interface ListTeamsResponse {
  teams: Team[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateTeamData {
  name: string;
  description?: string;
}

export interface UpdateTeamData {
  name?: string;
  description?: string | null;
}

export const teamsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    return api.get<ListTeamsResponse>(`/api/teams?${query.toString()}`);
  },

  get: (teamId: string) =>
    api.get<TeamDetail>(`/api/teams/${teamId}`),

  create: (data: CreateTeamData) =>
    api.post<Team>('/api/teams', data),

  update: (teamId: string, data: UpdateTeamData) =>
    api.patch<Team>(`/api/teams/${teamId}`, data),

  delete: (teamId: string) =>
    api.delete<{ message: string }>(`/api/teams/${teamId}`),

  addMember: (teamId: string, userId: string, role?: 'LEAD' | 'MEMBER') =>
    api.post<TeamMember>(`/api/teams/${teamId}/members`, { userId, role }),

  removeMember: (teamId: string, userId: string) =>
    api.delete<{ message: string }>(`/api/teams/${teamId}/members/${userId}`),

  updateMemberRole: (teamId: string, userId: string, role: 'LEAD' | 'MEMBER') =>
    api.patch<TeamMember>(`/api/teams/${teamId}/members/${userId}`, { role }),
};
