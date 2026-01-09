import { apiClient } from './client';

export interface PatientMedication {
  id: string;
  name: string;
  genericName: string | null;
  dosage: string;
  frequency: string;
  route: string | null;
  instructions: string | null;
  refillsRemaining: number | null;
  pharmacy: string | null;
  todayStatus: 'PENDING' | 'TAKEN' | 'MISSED' | 'SKIPPED';
  takenAt: string | null;
}

export interface AdherenceLog {
  id: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  takenAt: string | null;
  status: 'PENDING' | 'TAKEN' | 'MISSED' | 'SKIPPED';
  notes: string | null;
  skippedReason: string | null;
}

export interface AdherenceStats {
  totalExpected: number;
  takenCount: number;
  missedCount: number;
  skippedCount: number;
  adherenceRate: number;
}

export const medicationsApi = {
  /**
   * Get patient's active medications with today's status
   */
  getMedications: async (): Promise<PatientMedication[]> => {
    return apiClient.get<PatientMedication[]>('/patient-portal/medications');
  },

  /**
   * Mark medication as taken
   */
  takeMedication: async (medicationId: string, notes?: string): Promise<{ id: string; status: string; takenAt: string }> => {
    return apiClient.post<{ id: string; status: string; takenAt: string }>(`/patient-portal/medications/${medicationId}/take`, { notes });
  },

  /**
   * Skip medication for today
   */
  skipMedication: async (medicationId: string, reason?: string): Promise<{ id: string; status: string }> => {
    return apiClient.post<{ id: string; status: string }>(`/patient-portal/medications/${medicationId}/skip`, { reason });
  },

  /**
   * Get adherence history
   */
  getAdherenceHistory: async (days?: number): Promise<{ logs: AdherenceLog[]; stats: AdherenceStats }> => {
    const query = days ? `?days=${days}` : '';
    return apiClient.get<{ logs: AdherenceLog[]; stats: AdherenceStats }>(`/patient-portal/medications/adherence${query}`);
  },
};
