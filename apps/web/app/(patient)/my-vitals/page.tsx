'use client';

import { useState } from 'react';
import { Filter } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { VitalReadingCard } from '../../../../../packages/ui/src/components/rpm/vital-reading-card';
import { VitalTrendChart, type DataPoint } from '../../../../../packages/ui/src/components/rpm/vital-trend-chart';

type VitalType = 'all' | 'blood_pressure' | 'weight' | 'glucose' | 'oxygen' | 'heart_rate';

export default function MyVitalsPage() {
  const { t } = useTranslations('patient.vitals');
  const [filterType, setFilterType] = useState<VitalType>('all');

  // Mock data - in real app this would come from API
  const mockReadings: Array<{
    id: string;
    type: 'blood_pressure' | 'weight' | 'glucose' | 'oxygen' | 'heart_rate' | 'temperature';
    value: Record<string, number>;
    unit: string;
    status: 'normal' | 'warning' | 'critical';
    recordedAt: Date;
    trend?: 'up' | 'down' | 'stable';
  }> = [
    {
      id: '1',
      type: 'blood_pressure',
      value: { systolic: 128, diastolic: 82, pulse: 72 },
      unit: 'mmHg',
      status: 'normal',
      recordedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      trend: 'down',
    },
    {
      id: '2',
      type: 'weight',
      value: { weight: 185 },
      unit: 'lbs',
      status: 'normal',
      recordedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      trend: 'down',
    },
    {
      id: '3',
      type: 'glucose',
      value: { glucose: 95 },
      unit: 'mg/dL',
      status: 'normal',
      recordedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      id: '4',
      type: 'blood_pressure',
      value: { systolic: 130, diastolic: 85, pulse: 75 },
      unit: 'mmHg',
      status: 'normal',
      recordedAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
      trend: 'stable',
    },
  ];

  // Mock trend data
  const mockTrendData: DataPoint[] = Array.from({ length: 7 }, (_, i) => ({
    value: 120 + Math.random() * 20,
    timestamp: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
  }));

  const filteredReadings =
    filterType === 'all'
      ? mockReadings
      : mockReadings.filter((r) => r.type === filterType);

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
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
      <VitalTrendChart
        data={mockTrendData}
        title={t('bloodPressure') + ' - 7 Day'}
        unit="mmHg"
        normalRange={{ min: 110, max: 130 }}
        height={200}
      />

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
                trend={reading.trend}
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
