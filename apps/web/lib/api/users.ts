import { api } from './client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  status: string;
  role: {
    id: string;
    name: string;
  };
  joinedAt: string;
}

export interface UserDetail extends User {
  role: {
    id: string;
    name: string;
    permissions: string[];
  };
}

export interface ListUsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleId: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  isActive?: boolean;
}

export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    return api.get<ListUsersResponse>(`/api/users?${query.toString()}`);
  },

  get: (userId: string) =>
    api.get<UserDetail>(`/api/users/${userId}`),

  create: (data: CreateUserData) =>
    api.post<User>('/api/users', data),

  update: (userId: string, data: UpdateUserData) =>
    api.patch<User>(`/api/users/${userId}`, data),

  updateRole: (userId: string, roleId: string) =>
    api.patch<User>(`/api/users/${userId}/role`, { roleId }),

  remove: (userId: string) =>
    api.delete<{ message: string }>(`/api/users/${userId}`),
};
