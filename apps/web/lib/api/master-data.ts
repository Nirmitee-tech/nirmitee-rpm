import { api } from './client';

// ============================================
// Types
// ============================================

export interface MedicalCondition {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  icdCode?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface InsuranceProvider {
  id: string;
  code: string;
  name: string;
  payerId?: string;
  phone?: string;
  website?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CareProvider {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  organizations: Array<{
    role: { name: string };
  }>;
}

export interface CreateConditionInput {
  code: string;
  name: string;
  description?: string;
  category?: string;
  icdCode?: string;
  sortOrder?: number;
}

export interface UpdateConditionInput {
  name?: string;
  description?: string;
  category?: string;
  icdCode?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateInsuranceInput {
  code: string;
  name: string;
  payerId?: string;
  phone?: string;
  website?: string;
  sortOrder?: number;
}

export interface UpdateInsuranceInput {
  name?: string;
  payerId?: string;
  phone?: string;
  website?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// ============================================
// Medical Conditions API
// ============================================

export const conditionsApi = {
  list: (includeInactive = false) =>
    api.get<MedicalCondition[]>(`/api/master-data/conditions?includeInactive=${includeInactive}`),

  get: (id: string) =>
    api.get<MedicalCondition>(`/api/master-data/conditions/${id}`),

  create: (data: CreateConditionInput) =>
    api.post<MedicalCondition>('/api/master-data/conditions', data),

  update: (id: string, data: UpdateConditionInput) =>
    api.patch<{ success: boolean }>(`/api/master-data/conditions/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/api/master-data/conditions/${id}`),

  seed: () =>
    api.post<{ success: boolean; message: string }>('/api/master-data/conditions/seed', {}),
};

// ============================================
// Insurance Providers API
// ============================================

export const insuranceApi = {
  list: (includeInactive = false) =>
    api.get<InsuranceProvider[]>(`/api/master-data/insurance-providers?includeInactive=${includeInactive}`),

  get: (id: string) =>
    api.get<InsuranceProvider>(`/api/master-data/insurance-providers/${id}`),

  create: (data: CreateInsuranceInput) =>
    api.post<InsuranceProvider>('/api/master-data/insurance-providers', data),

  update: (id: string, data: UpdateInsuranceInput) =>
    api.patch<{ success: boolean }>(`/api/master-data/insurance-providers/${id}`, data),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/api/master-data/insurance-providers/${id}`),

  seed: () =>
    api.post<{ success: boolean; message: string }>('/api/master-data/insurance-providers/seed', {}),
};

// ============================================
// Care Providers API
// ============================================

export const providersApi = {
  getPhysicians: () =>
    api.get<CareProvider[]>('/api/master-data/providers/physicians'),

  getCareCoordinators: () =>
    api.get<CareProvider[]>('/api/master-data/providers/care-coordinators'),
};

// ============================================
// Combined Master Data API
// ============================================

export const masterDataApi = {
  conditions: conditionsApi,
  insurance: insuranceApi,
  providers: providersApi,

  // Seed all default data
  seedAll: async () => {
    await conditionsApi.seed();
    await insuranceApi.seed();
  },
};
