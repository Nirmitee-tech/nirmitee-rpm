import { api } from './client';

export type VitalType = 'blood_pressure' | 'weight' | 'glucose' | 'oxygen' | 'heart_rate';
export type MealContext = 'fasting' | 'before_meal' | 'after_meal' | 'bedtime' | 'random';
export type VitalStatus = 'normal' | 'warning' | 'critical';

// Backend enum types (Prisma)
type BackendVitalType =
  | 'BLOOD_PRESSURE'
  | 'WEIGHT'
  | 'BLOOD_GLUCOSE'
  | 'PULSE_OXIMETRY'
  | 'HEART_RATE'
  | 'TEMPERATURE';

// Map frontend types to backend enum
const typeToBackend: Record<VitalType, BackendVitalType> = {
  blood_pressure: 'BLOOD_PRESSURE',
  weight: 'WEIGHT',
  glucose: 'BLOOD_GLUCOSE',
  oxygen: 'PULSE_OXIMETRY',
  heart_rate: 'HEART_RATE',
};

// Map backend enum to frontend types
const typeFromBackend: Record<BackendVitalType, VitalType> = {
  BLOOD_PRESSURE: 'blood_pressure',
  WEIGHT: 'weight',
  BLOOD_GLUCOSE: 'glucose',
  PULSE_OXIMETRY: 'oxygen',
  HEART_RATE: 'heart_rate',
  TEMPERATURE: 'heart_rate', // Fallback
};

export interface VitalReading {
  id: string;
  type: VitalType;
  values: Record<string, number>;
  unit: string;
  recordedAt: string;
  symptoms?: string[];
  mealContext?: MealContext;
  status: VitalStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVitalReadingRequest {
  type: VitalType;
  values: Record<string, number>;
  unit: string;
  recordedAt: string;
  symptoms?: string[];
  mealContext?: MealContext;
  notes?: string;
}

export interface ListVitalReadingsResponse {
  readings: VitalReading[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VitalRanges {
  min: number;
  max: number;
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
}

export const VITAL_RANGES: Record<string, VitalRanges> = {
  'blood_pressure.systolic': {
    min: 70,
    max: 250,
    warningMax: 140,
    criticalMax: 180,
    criticalMin: 90,
  },
  'blood_pressure.diastolic': {
    min: 40,
    max: 150,
    warningMax: 90,
    criticalMax: 120,
    criticalMin: 60,
  },
  'blood_pressure.pulse': {
    min: 40,
    max: 200,
    warningMin: 60,
    warningMax: 100,
  },
  'weight.lbs': {
    min: 50,
    max: 500,
  },
  'weight.kg': {
    min: 20,
    max: 250,
  },
  'glucose.mgdl': {
    min: 20,
    max: 600,
    warningMin: 70,
    warningMax: 140,
    criticalMin: 54,
    criticalMax: 250,
  },
  'oxygen.percentage': {
    min: 70,
    max: 100,
    warningMin: 92,
    criticalMin: 88,
  },
  'heart_rate.bpm': {
    min: 40,
    max: 200,
    warningMin: 60,
    warningMax: 100,
  },
};

export const vitalsApi = {
  /**
   * Create a new vital reading
   */
  createReading: async (data: CreateVitalReadingRequest): Promise<VitalReading> => {
    const backendData = {
      ...data,
      type: typeToBackend[data.type],
    };
    const response = await api.post<any>('/api/vitals/readings', backendData);
    return {
      ...response,
      type: typeFromBackend[response.type as BackendVitalType],
    };
  },

  /**
   * Get list of vital readings with filters
   */
  getReadings: async (params?: {
    type?: VitalType;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ListVitalReadingsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', typeToBackend[params.type]);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const query = queryParams.toString();
    const response = await api.get<any>(
      `/api/vitals/readings${query ? `?${query}` : ''}`
    );
    return {
      ...response,
      readings: response.readings.map((r: any) => ({
        ...r,
        type: typeFromBackend[r.type as BackendVitalType],
      })),
    };
  },

  /**
   * Get a single vital reading by ID
   */
  getReading: async (id: string): Promise<VitalReading> => {
    const response = await api.get<any>(`/api/vitals/readings/${id}`);
    return {
      ...response,
      type: typeFromBackend[response.type as BackendVitalType],
    };
  },

  /**
   * Update a vital reading
   */
  updateReading: async (
    id: string,
    data: Partial<CreateVitalReadingRequest>
  ): Promise<VitalReading> => {
    const backendData = {
      ...data,
      ...(data.type && { type: typeToBackend[data.type] }),
    };
    const response = await api.put<any>(`/api/vitals/readings/${id}`, backendData);
    return {
      ...response,
      type: typeFromBackend[response.type as BackendVitalType],
    };
  },

  /**
   * Delete a vital reading
   */
  deleteReading: async (id: string): Promise<void> => {
    return api.delete<void>(`/api/vitals/readings/${id}`);
  },

  /**
   * Get recent readings (last 5)
   */
  getRecentReadings: async (): Promise<VitalReading[]> => {
    const response = await api.get<ListVitalReadingsResponse>(
      '/api/vitals/readings?limit=5'
    );
    return response.readings;
  },

  /**
   * Validate vital value against ranges
   */
  validateValue: (
    type: VitalType,
    field: string,
    value: number
  ): { isValid: boolean; status: VitalStatus; message?: string } => {
    const rangeKey = `${type}.${field}`;
    const range = VITAL_RANGES[rangeKey];

    if (!range) {
      return { isValid: true, status: 'normal' };
    }

    // Check critical ranges first
    if (range.criticalMin !== undefined && value < range.criticalMin) {
      return {
        isValid: false,
        status: 'critical',
        message: `Value is critically low (minimum ${range.criticalMin})`,
      };
    }
    if (range.criticalMax !== undefined && value > range.criticalMax) {
      return {
        isValid: false,
        status: 'critical',
        message: `Value is critically high (maximum ${range.criticalMax})`,
      };
    }

    // Check warning ranges
    if (range.warningMin !== undefined && value < range.warningMin) {
      return {
        isValid: true,
        status: 'warning',
        message: `Value is below normal range`,
      };
    }
    if (range.warningMax !== undefined && value > range.warningMax) {
      return {
        isValid: true,
        status: 'warning',
        message: `Value is above normal range`,
      };
    }

    // Check absolute ranges
    if (value < range.min || value > range.max) {
      return {
        isValid: false,
        status: 'warning',
        message: `Value is outside expected range (${range.min}-${range.max})`,
      };
    }

    return { isValid: true, status: 'normal' };
  },
};
