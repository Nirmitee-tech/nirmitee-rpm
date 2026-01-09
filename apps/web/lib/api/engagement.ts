import { apiClient } from './client';

// Types for engagement data
export interface EngagementSummary {
  streak: {
    current: number;
    longest: number;
    lastActiveDate: string | null;
  };
  weeklyProgress: {
    current: number;
    target: number;
    percentage: number;
    daysActive: boolean[]; // 7 days, Sun-Sat
  };
  totalStats: {
    readings: number;
    points: number;
  };
}

export interface PatientGoal {
  id: string;
  name: string;
  description: string | null;
  goalType: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  periodType: string;
  isActive: boolean;
  completedAt: string | null;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  pointValue: number;
  requirementType: string;
  requirementValue: number;
  earned: boolean;
  earnedAt: string | null;
  currentProgress: number | null;
}

export interface MedicationSummary {
  todayMeds: Array<{
    id: string;
    name: string;
    dosage: string;
    time: string;
    taken: boolean;
  }>;
  adherenceScore: number;
}

export const engagementApi = {
  /**
   * Get engagement summary (streaks, weekly progress, points)
   */
  getEngagementSummary: async (): Promise<EngagementSummary> => {
    return apiClient.get<EngagementSummary>('/patient-portal/engagement');
  },

  /**
   * Get patient goals
   */
  getGoals: async (): Promise<PatientGoal[]> => {
    return apiClient.get<PatientGoal[]>('/patient-portal/goals');
  },

  /**
   * Create a new goal
   */
  createGoal: async (data: {
    name: string;
    description?: string;
    goalType?: 'VITALS' | 'MEDICATION' | 'EDUCATION' | 'EXERCISE' | 'CUSTOM';
    targetValue: number;
    unit?: string;
    periodType?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  }): Promise<PatientGoal> => {
    return apiClient.post<PatientGoal>('/patient-portal/goals', data);
  },

  /**
   * Get achievements (earned and available)
   */
  getAchievements: async (): Promise<Achievement[]> => {
    return apiClient.get<Achievement[]>('/patient-portal/achievements');
  },

  /**
   * Get medication summary for dashboard
   */
  getMedicationSummary: async (): Promise<MedicationSummary> => {
    return apiClient.get<MedicationSummary>('/patient-portal/medication-summary');
  },
};
