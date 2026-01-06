import { api } from './client';

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  action: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  memberCount: number;
  permissions: {
    code: string;
    name: string;
    module: string;
  }[];
  createdAt: string;
}

export interface RoleDetail extends Role {
  permissions: Permission[];
  members: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }[];
  updatedAt: string;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  permissions: string[]; // Permission codes
}

export interface UpdateRoleData {
  name?: string;
  description?: string | null;
  permissions?: string[];
}

export interface PermissionsByModule {
  [module: string]: Permission[];
}

export const rolesApi = {
  list: () =>
    api.get<Role[]>('/api/roles'),

  get: (roleId: string) =>
    api.get<RoleDetail>(`/api/roles/${roleId}`),

  create: (data: CreateRoleData) =>
    api.post<Role>('/api/roles', data),

  update: (roleId: string, data: UpdateRoleData) =>
    api.patch<Role>(`/api/roles/${roleId}`, data),

  delete: (roleId: string) =>
    api.delete<{ message: string }>(`/api/roles/${roleId}`),

  listPermissions: () =>
    api.get<PermissionsByModule>('/api/roles/permissions'),
};
