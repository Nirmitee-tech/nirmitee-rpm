'use client';

import { useState, useEffect, useMemo } from 'react';
import { MessageCircle, BookOpen, ChevronRight, Loader2, Award } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { HealthSummaryCard } from '@/components/patient/health-summary-card';
import { VitalsQuickView } from '@/components/patient/vitals-quick-view';
import {
  StreakWidget,
  GoalsWidget,
  MedicationWidget,
  AppointmentWidget,
  QuickActionsWidget,
  AchievementsWidget,
} from '@/components/patient/engagement-widgets';
import { VitalTrendChart, type DataPoint } from '../../../../../packages/ui/src/components/rpm/vital-trend-chart';
import { patientPortalApi, type PatientVital } from '@/lib/api/patient-portal';
import { engagementApi, type EngagementSummary, type PatientGoal, type Achievement, type MedicationSummary } from '@/lib/api/engagement';

// Helper to get time ago string
function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

export default function PatientDashboardPage() {
  const { t } = useTranslations('patient.dashboard');
  const { t: tCommon } = useTranslations('common');
  const { t: tEngagement } = useTranslations('patient.engagement');

  // Vitals state
  const [vitals, setVitals] = useState<PatientVital[]>([]);
  const [vitalsLoading, setVitalsLoading] = useState(true);

  // Engagement state
  const [engagement, setEngagement] = useState<EngagementSummary | null>(null);
  const [goals, setGoals] = useState<PatientGoal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [medicationSummary, setMedicationSummary] = useState<MedicationSummary | null>(null);
  const [engagementLoading, setEngagementLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    // Load vitals
    loadVitals();

    // Load engagement data in parallel
    loadEngagementData();
  };

  const loadVitals = async () => {
    try {
      setVitalsLoading(true);
      const response = await patientPortalApi.getVitals({ limit: 50 });
      setVitals(response.data || []);
    } catch (err) {
      console.error('Failed to load vitals:', err);
    } finally {
      setVitalsLoading(false);
    }
  };

  const loadEngagementData = async () => {
    try {
      setEngagementLoading(true);

      // Load all engagement data in parallel
      const [engagementData, goalsData, achievementsData, medsData] = await Promise.allSettled([
        engagementApi.getEngagementSummary(),
        engagementApi.getGoals(),
        engagementApi.getAchievements(),
        engagementApi.getMedicationSummary(),
      ]);

      if (engagementData.status === 'fulfilled') {
        setEngagement(engagementData.value);
      }
      if (goalsData.status === 'fulfilled') {
        setGoals(goalsData.value);
      }
      if (achievementsData.status === 'fulfilled') {
        setAchievements(achievementsData.value);
      }
      if (medsData.status === 'fulfilled') {
        setMedicationSummary(medsData.value);
      }
    } catch (err) {
      console.error('Failed to load engagement data:', err);
    } finally {
      setEngagementLoading(false);
    }
  };

  // Process vitals for quick view display
  const processedVitals = useMemo(() => {
    const result: Array<{
      type: 'bloodPressure' | 'weight' | 'glucose' | 'oxygen';
      value: string;
      unit: string;
      status: 'normal' | 'warning' | 'critical';
      trend?: 'up' | 'down';
      lastReading: string;
    }> = [];

    // Get latest of each type
    const latestByType: Record<string, PatientVital> = {};
    vitals.forEach((v) => {
      const type = v.type.toLowerCase().replace('_', '');
      if (!latestByType[type] || new Date(v.recordedAt) > new Date(latestByType[type].recordedAt)) {
        latestByType[type] = v;
      }
    });

    // Blood Pressure
    const bpVital = latestByType['bloodpressure'] || latestByType['blood_pressure'];
    if (bpVital) {
      result.push({
        type: 'bloodPressure',
        value: `${bpVital.values?.systolic || 0}/${bpVital.values?.diastolic || 0}`,
        unit: 'mmHg',
        status: bpVital.status || 'normal',
        lastReading: getTimeAgo(bpVital.recordedAt),
      });
    }

    // Weight
    const weightVital = latestByType['weight'];
    if (weightVital) {
      result.push({
        type: 'weight',
        value: String(weightVital.values?.weight || weightVital.values?.value || 0),
        unit: weightVital.unit || 'lbs',
        status: weightVital.status || 'normal',
        lastReading: getTimeAgo(weightVital.recordedAt),
      });
    }

    // Glucose
    const glucoseVital = latestByType['glucose'] || latestByType['bloodglucose'] || latestByType['blood_glucose'];
    if (glucoseVital) {
      result.push({
        type: 'glucose',
        value: String(glucoseVital.values?.glucose || glucoseVital.values?.value || 0),
        unit: glucoseVital.unit || 'mg/dL',
        status: glucoseVital.status || 'normal',
        lastReading: getTimeAgo(glucoseVital.recordedAt),
      });
    }

    // Oxygen
    const oxygenVital = latestByType['oxygen'] || latestByType['spo2'] || latestByType['pulse_oximetry'];
    if (oxygenVital) {
      result.push({
        type: 'oxygen',
        value: String(oxygenVital.values?.spo2 || oxygenVital.values?.value || 0),
        unit: '%',
        status: oxygenVital.status || 'normal',
        lastReading: getTimeAgo(oxygenVital.recordedAt),
      });
    }

    return result;
  }, [vitals]);

  // Trend data for blood pressure chart
  const trendData: DataPoint[] = useMemo(() => {
    return vitals
      .filter((v) => v.type.toLowerCase().includes('blood') && v.type.toLowerCase().includes('pressure'))
      .slice(0, 20)
      .reverse()
      .map((v) => ({
        value: v.values?.systolic || 0,
        timestamp: new Date(v.recordedAt),
      }));
  }, [vitals]);

  // Calculate overall health status
  const overallStatus = useMemo((): 'good' | 'attention' | 'critical' => {
    const hasWarning = vitals.some((v) => v.status === 'warning');
    const hasCritical = vitals.some((v) => v.status === 'critical');
    if (hasCritical) return 'critical';
    if (hasWarning) return 'attention';
    return 'good';
  }, [vitals]);

  // Get last reading time
  const lastReadingTime = useMemo(() => {
    if (vitals.length === 0) return t('noReadings') || 'No readings yet';
    const sorted = [...vitals].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    return getTimeAgo(sorted[0].recordedAt);
  }, [vitals, t]);

  // Initial loading state
  if (vitalsLoading && engagementLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* Health Summary */}
      <HealthSummaryCard overallStatus={overallStatus} lastReadingTime={lastReadingTime} />

      {/* Quick Actions */}
      <QuickActionsWidget />

      {/* Streak Widget - Real data from API */}
      <StreakWidget
        currentStreak={engagement?.streak.current || 0}
        longestStreak={engagement?.streak.longest || 0}
        weeklyProgress={engagement?.weeklyProgress.daysActive || [false, false, false, false, false, false, false]}
      />

      {/* Goals & Medication Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GoalsWidget
          weeklyGoal={engagement?.weeklyProgress.target || 0}
          currentProgress={engagement?.weeklyProgress.current || 0}
          goals={goals.filter(g => g.isActive).map(g => ({
            id: g.id,
            name: g.name,
            targetValue: g.targetValue,
            currentValue: g.currentValue,
            unit: g.unit,
            goalType: g.goalType,
          }))}
        />
        <div className="space-y-4">
          <MedicationWidget
            todayMeds={medicationSummary?.todayMeds || []}
            adherenceScore={medicationSummary?.adherenceScore || 0}
          />
          <AppointmentWidget appointment={null} />
        </div>
      </div>

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
        {processedVitals.length > 0 ? (
          <VitalsQuickView vitals={processedVitals} />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('noVitalsRecorded') || 'No vitals recorded yet. Use your monitoring devices to record your first readings.'}
            </p>
          </div>
        )}
      </div>

      {/* 7-Day Trend */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
          {t('trends')}
        </h2>
        {trendData.length > 0 ? (
          <VitalTrendChart
            data={trendData}
            title={t('trends')}
            unit="mmHg"
            normalRange={{ min: 110, max: 130 }}
            height={180}
          />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('noTrendData') || 'No blood pressure data available for trend chart.'}
            </p>
          </div>
        )}
      </div>

      {/* Achievements */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {tEngagement('achievements') || 'Achievements'}
          </h2>
          <Link
            href="/achievements"
            className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            <Award className="h-4 w-4" />
            {t('viewAll')}
          </Link>
        </div>
        <AchievementsWidget
          achievements={achievements.slice(0, 4).map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            icon: a.icon,
            earned: a.earned,
            earnedAt: a.earnedAt,
          }))}
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
              {t('unreadCount', { count: 0 })}
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
              {tEngagement('continueLesson') || 'Continue your lesson'}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </Link>
    </div>
  );
}
