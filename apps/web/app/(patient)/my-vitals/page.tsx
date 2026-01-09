'use client';

import { useState, useEffect, useMemo } from 'react';
import { Filter, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { patientPortalApi, PatientVital } from '@/lib/api/patient-portal';
import { VitalReadingCard } from '../../../../../packages/ui/src/components/rpm/vital-reading-card';
import { VitalTrendChart, type DataPoint } from '../../../../../packages/ui/src/components/rpm/vital-trend-chart';

type VitalType = 'all' | 'blood_pressure' | 'weight' | 'glucose' | 'oxygen' | 'heart_rate';

// Map backend vital types to frontend types
const mapVitalType = (type: string): 'blood_pressure' | 'weight' | 'glucose' | 'oxygen' | 'heart_rate' | 'temperature' => {
  const typeMap: Record<string, 'blood_pressure' | 'weight' | 'glucose' | 'oxygen' | 'heart_rate' | 'temperature'> = {
    BLOOD_PRESSURE: 'blood_pressure',
    WEIGHT: 'weight',
    BLOOD_GLUCOSE: 'glucose',
    PULSE_OXIMETRY: 'oxygen',
    HEART_RATE: 'heart_rate',
    TEMPERATURE: 'temperature',
  };
  return typeMap[type] || 'blood_pressure';
};

// Map backend status to frontend status
const mapStatus = (status: string): 'normal' | 'warning' | 'critical' => {
  const statusMap: Record<string, 'normal' | 'warning' | 'critical'> = {
    NORMAL: 'normal',
    WARNING: 'warning',
    CRITICAL: 'critical',
  };
  return statusMap[status] || 'normal';
};

// Transform API vital to component format
const transformVital = (vital: PatientVital) => ({
  id: vital.id,
  type: mapVitalType(vital.type),
  value: vital.values,
  unit: vital.unit,
  status: mapStatus(vital.status),
  recordedAt: new Date(vital.recordedAt),
  notes: vital.notes,
});

export default function MyVitalsPage() {
  const { t } = useTranslations('patient.vitals');
  const [filterType, setFilterType] = useState<VitalType>('all');
  const [vitals, setVitals] = useState<PatientVital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVitals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await patientPortalApi.getVitals({ limit: 50 });
      setVitals(response.data || []);
    } catch (err) {
      console.error('Failed to load vitals:', err);
      setError('Failed to load vitals data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVitals();
  }, []);

  // Filter vitals based on selected type
  const filteredReadings = useMemo(() => {
    const transformed = vitals.map(transformVital);
    if (filterType === 'all') {
      return transformed;
    }
    return transformed.filter((r) => r.type === filterType);
  }, [vitals, filterType]);

  // Generate trend data for blood pressure (last 7 days)
  const trendData = useMemo<DataPoint[]>(() => {
    const bpReadings = vitals
      .filter((v) => v.type === 'BLOOD_PRESSURE')
      .slice(0, 7)
      .reverse();

    return bpReadings.map((v) => ({
      value: v.values?.systolic || 0,
      timestamp: new Date(v.recordedAt),
    }));
  }, [vitals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#745EE1]" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Loading vitals...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="mt-4 text-sm text-red-500">{error}</p>
          <button
            onClick={fetchVitals}
            className="mt-4 px-4 py-2 text-sm bg-[#745EE1] text-white rounded-lg hover:bg-[#6249d1]"
          >
            <RefreshCw className="h-4 w-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <button
          onClick={fetchVitals}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Filter */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as VitalType)}
            className="flex-1 border-none bg-transparent text-sm text-gray-900 focus:outline-none dark:text-gray-100"
          >
            <option value="all">{t('allTypes')}</option>
            <option value="blood_pressure">{t('bloodPressure')}</option>
            <option value="weight">{t('weight')}</option>
            <option value="glucose">{t('glucose')}</option>
            <option value="oxygen">{t('oxygen')}</option>
            <option value="heart_rate">{t('heartRate')}</option>
          </select>
        </div>
      </div>

      {/* 7-Day Trend Chart */}
      {trendData.length > 0 && (
        <VitalTrendChart
          data={trendData}
          title={t('bloodPressure') + ' - 7 Day'}
          unit="mmHg"
          normalRange={{ min: 110, max: 130 }}
          height={200}
        />
      )}

      {/* Reading History */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
          {t('history')}
        </h2>
        <div className="space-y-3">
          {filteredReadings.length > 0 ? (
            filteredReadings.map((reading) => (
              <VitalReadingCard
                key={reading.id}
                type={reading.type}
                value={reading.value}
                unit={reading.unit}
                status={reading.status}
                recordedAt={reading.recordedAt}
              />
            ))
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('noReadings')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
