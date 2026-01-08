import { api } from './client';

// ============================================
// Types
// ============================================

export interface DeviceModel {
  id: string;
  code: string;
  name: string;
  manufacturer: string | null;
  modelNumber: string | null;
  category: string | null; // e.g., "Blood Pressure", "Glucose", "Weight", "Pulse Oximeter"
  description: string | null;
}

// ============================================
// Device Models API
// ============================================

export const deviceModelsApi = {
  /**
   * List all active device models for the organization
   */
  list: () =>
    api.get<DeviceModel[]>('/api/v1/device-models'),
};
