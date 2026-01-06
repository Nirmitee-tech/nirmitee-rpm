import { api } from './client';
import type { Organization } from '@nirmitee/types';

export type { Organization };

export interface OrganizationDetail extends Organization {
  settings?: Record<string, unknown>;
  memberCount: number;
  teamCount: number;
  roleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationStats {
  members: {
    total: number;
    active: number;
  };
  teams: number;
  roles: number;
}

export interface UpdateOrganizationData {
  name?: string;
  logo?: string | null;
  settings?: Record<string, unknown>;
}

export interface CreateOrganizationData {
  name: string;
  logo?: string;
}

export interface CreateOrganizationResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  role: string;
  accessToken: string;
  refreshToken: string;
}

export interface SwitchOrganizationResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  role: {
    id: string;
    name: string;
    permissions: string[];
  };
}

export const organizationsApi = {
  list: () =>
    api.get<Organization[]>('/api/organizations'),

  create: (data: CreateOrganizationData) =>
    api.post<CreateOrganizationResponse>('/api/organizations', data),

  getCurrent: () =>
    api.get<OrganizationDetail>('/api/organizations/current'),

  getStats: () =>
    api.get<OrganizationStats>('/api/organizations/current/stats'),

  updateCurrent: (data: UpdateOrganizationData) =>
    api.patch<OrganizationDetail>('/api/organizations/current', data),

  switch: (organizationId: string) =>
    api.post<SwitchOrganizationResponse>('/api/organizations/switch', { organizationId }),
};
