'use client';

import { MessageCircle, BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { HealthSummaryCard } from '@/components/patient/health-summary-card';
import { VitalsQuickView } from '@/components/patient/vitals-quick-view';
import { VitalTrendChart, type DataPoint } from '../../../../../packages/ui/src/components/rpm/vital-trend-chart';

export default function PatientDashboardPage() {
  const { t } = useTranslations('patient.dashboard');

  // Mock data - in real app this would come from API
  const mockVitals = [
    {
      type: 'bloodPressure' as const,
      value: '128/82',
      unit: 'mmHg',
      status: 'normal' as const,
      trend: 'down' as const,
      lastReading: '2 hours ago',
    },
    {
      type: 'weight' as const,
      value: '185',
      unit: 'lbs',
      status: 'normal' as const,
      trend: 'down' as const,
      lastReading: 'Today',
    },
    {
      type: 'glucose' as const,
      value: '95',
      unit: 'mg/dL',
      status: 'normal' as const,
      lastReading: '3 hours ago',
    },
    {
      type: 'oxygen' as const,
      value: '98',
      unit: '%',
      status: 'normal' as const,
      lastReading: '1 hour ago',
    },
  ];

  // Mock trend data - 7 days of blood pressure readings
  const mockTrendData: DataPoint[] = Array.from({ length: 7 }, (_, i) => ({
    value: 120 + Math.random() * 20,
    timestamp: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
  }));

  return (
    <div className="space-y-4 p-4">
      {/* Health Summary */}
      <HealthSummaryCard overallStatus="good" lastReadingTime="2 hours ago" />

      {/* Quick Stats */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t('quickStats')}
          </h2>
          <Link
            href="/my-vitals"
            className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            {t('viewAll')}
          </Link>
        </div>
        <VitalsQuickView vitals={mockVitals} />
      </div>

      {/* 7-Day Trend */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
          {t('trends')}
        </h2>
        <VitalTrendChart
          data={mockTrendData}
          title={t('trends')}
          unit="mmHg"
          normalRange={{ min: 110, max: 130 }}
          height={180}
        />
      </div>

      {/* Messages Preview */}
      <Link
        href="/my-messages"
        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
            <MessageCircle className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('messages')}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('unreadCount', { count: 2 })}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </Link>

      {/* Educational Content */}
      <Link
        href="/education"
        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
            <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('todayEducation')}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Managing Your Blood Pressure
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </Link>
    </div>
  );
}
