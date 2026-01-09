'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Pill,
  Check,
  X,
  Clock,
  AlertTriangle,
  TrendingUp,
  History,
  ChevronRight,
  Loader2,
  Trophy,
  Calendar,
  Info,
} from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';
import { medicationsApi, PatientMedication, AdherenceStats } from '@/lib/api/medications';

// Demo data for when API is not connected
const DEMO_MEDICATIONS: PatientMedication[] = [
  {
    id: 'med-1',
    name: 'Lisinopril',
    genericName: 'Lisinopril',
    dosage: '10mg',
    frequency: 'Once daily',
    route: 'Oral',
    instructions: 'Take in the morning with water',
    refillsRemaining: 3,
    pharmacy: 'CVS Pharmacy',
    todayStatus: 'PENDING',
    takenAt: null,
  },
  {
    id: 'med-2',
    name: 'Metformin',
    genericName: 'Metformin HCL',
    dosage: '500mg',
    frequency: 'Twice daily',
    route: 'Oral',
    instructions: 'Take with meals to reduce stomach upset',
    refillsRemaining: 2,
    pharmacy: 'Walgreens',
    todayStatus: 'TAKEN',
    takenAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: 'med-3',
    name: 'Amlodipine',
    genericName: 'Amlodipine Besylate',
    dosage: '5mg',
    frequency: 'Once daily',
    route: 'Oral',
    instructions: 'Take at bedtime',
    refillsRemaining: 1,
    pharmacy: 'CVS Pharmacy',
    todayStatus: 'PENDING',
    takenAt: null,
  },
  {
    id: 'med-4',
    name: 'Atorvastatin',
    genericName: 'Atorvastatin Calcium',
    dosage: '20mg',
    frequency: 'Once daily',
    route: 'Oral',
    instructions: 'Take in the evening',
    refillsRemaining: 5,
    pharmacy: 'CVS Pharmacy',
    todayStatus: 'SKIPPED',
    takenAt: null,
  },
];

const DEMO_STATS: AdherenceStats = {
  totalExpected: 28,
  takenCount: 24,
  missedCount: 2,
  skippedCount: 2,
  adherenceRate: 86,
};

export default function MedicationsPage() {
  const { t } = useTranslations('patient.medications');
  const [medications, setMedications] = useState<PatientMedication[]>(DEMO_MEDICATIONS);
  const [stats, setStats] = useState<AdherenceStats>(DEMO_STATS);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [medsData, adherenceData] = await Promise.all([
        medicationsApi.getMedications(),
        medicationsApi.getAdherenceHistory(7),
      ]);
      setMedications(medsData);
      setStats(adherenceData.stats);
    } catch {
      // Use demo data on error
      console.log('Using demo medication data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTakeMedication = async (medId: string) => {
    setActionLoading(medId);
    try {
      await medicationsApi.takeMedication(medId);
      // Update local state
      setMedications((prev) =>
        prev.map((med) =>
          med.id === medId
            ? { ...med, todayStatus: 'TAKEN' as const, takenAt: new Date().toISOString() }
            : med
        )
      );
      setStats((prev) => ({
        ...prev,
        takenCount: prev.takenCount + 1,
        adherenceRate: Math.round(((prev.takenCount + 1) / (prev.totalExpected || 1)) * 100),
      }));
    } catch {
      // Optimistic update for demo
      setMedications((prev) =>
        prev.map((med) =>
          med.id === medId
            ? { ...med, todayStatus: 'TAKEN' as const, takenAt: new Date().toISOString() }
            : med
        )
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleSkipMedication = async (medId: string) => {
    setActionLoading(medId);
    try {
      await medicationsApi.skipMedication(medId, 'Skipped by patient');
      setMedications((prev) =>
        prev.map((med) =>
          med.id === medId
            ? { ...med, todayStatus: 'SKIPPED' as const, takenAt: null }
            : med
        )
      );
    } catch {
      // Optimistic update for demo
      setMedications((prev) =>
        prev.map((med) =>
          med.id === medId
            ? { ...med, todayStatus: 'SKIPPED' as const, takenAt: null }
            : med
        )
      );
    } finally {
      setActionLoading(null);
    }
  };

  const pendingMeds = medications.filter((m) => m.todayStatus === 'PENDING');
  const completedMeds = medications.filter((m) => m.todayStatus === 'TAKEN');
  const skippedMeds = medications.filter((m) => m.todayStatus === 'SKIPPED');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TAKEN':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'SKIPPED':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'MISSED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'TAKEN':
        return <Check className="h-4 w-4" />;
      case 'SKIPPED':
        return <X className="h-4 w-4" />;
      case 'MISSED':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header with Adherence Score */}
      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 px-4 pb-6 pt-4 text-white">
        <h1 className="text-xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-sm text-teal-100">{t('subtitle') || 'Track your daily medications'}</p>

        {/* Adherence Stats Card */}
        <div className="mt-4 rounded-xl bg-white/15 backdrop-blur p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                <Trophy className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-teal-100">{t('adherenceScore') || 'Adherence Score'}</p>
                <p className="text-3xl font-bold">{stats.adherenceRate}%</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-1 text-xs text-teal-200">
                <Check className="h-3 w-3" />
                <span>{stats.takenCount} {t('taken') || 'taken'}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-teal-200">
                <X className="h-3 w-3" />
                <span>{stats.skippedCount} {t('skipped') || 'skipped'}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-teal-200">
                <AlertTriangle className="h-3 w-3" />
                <span>{stats.missedCount} {t('missed') || 'missed'}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${stats.adherenceRate}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-teal-200 text-center">{t('last7Days') || 'Last 7 days'}</p>
        </div>
      </div>

      <div className="px-4 -mt-2 space-y-4">
        {/* Today's Progress */}
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-600" />
              <span className="font-medium text-gray-900 dark:text-gray-100">{t('todayProgress') || "Today's Progress"}</span>
            </div>
            <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
              {completedMeds.length}/{medications.length}
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {medications.map((med) => (
              <div
                key={med.id}
                className={cn(
                  'h-2 flex-1 rounded-full transition-colors',
                  med.todayStatus === 'TAKEN' && 'bg-green-500',
                  med.todayStatus === 'SKIPPED' && 'bg-yellow-500',
                  med.todayStatus === 'MISSED' && 'bg-red-500',
                  med.todayStatus === 'PENDING' && 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            ))}
          </div>
        </div>

        {/* Pending Medications */}
        {pendingMeds.length > 0 && (
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Clock className="h-4 w-4 text-blue-500" />
              {t('pending') || 'Pending'} ({pendingMeds.length})
            </h2>
            {pendingMeds.map((med) => (
              <MedicationCard
                key={med.id}
                medication={med}
                onTake={handleTakeMedication}
                onSkip={handleSkipMedication}
                loading={actionLoading === med.id}
                t={t}
              />
            ))}
          </div>
        )}

        {/* Completed Today */}
        {completedMeds.length > 0 && (
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Check className="h-4 w-4 text-green-500" />
              {t('takenToday') || 'Taken Today'} ({completedMeds.length})
            </h2>
            {completedMeds.map((med) => (
              <MedicationCard
                key={med.id}
                medication={med}
                onTake={handleTakeMedication}
                onSkip={handleSkipMedication}
                loading={actionLoading === med.id}
                t={t}
              />
            ))}
          </div>
        )}

        {/* Skipped Today */}
        {skippedMeds.length > 0 && (
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <X className="h-4 w-4 text-yellow-500" />
              {t('skippedToday') || 'Skipped Today'} ({skippedMeds.length})
            </h2>
            {skippedMeds.map((med) => (
              <MedicationCard
                key={med.id}
                medication={med}
                onTake={handleTakeMedication}
                onSkip={handleSkipMedication}
                loading={actionLoading === med.id}
                t={t}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {medications.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm dark:bg-gray-900">
            <Pill className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('noMedications') || 'No medications'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {t('noMedicationsHint') || 'Your medications will appear here when prescribed'}
            </p>
          </div>
        )}

        {/* View History Button */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <History className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-gray-100">{t('viewHistory') || 'View History'}</p>
              <p className="text-xs text-gray-500">{t('viewHistoryDesc') || 'See your medication adherence over time'}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </button>

        {/* Refill Reminder */}
        {medications.some((m) => m.refillsRemaining !== null && m.refillsRemaining <= 2) && (
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-100">{t('refillReminder') || 'Refill Reminder'}</p>
                <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
                  {medications.filter((m) => m.refillsRemaining !== null && m.refillsRemaining <= 2).map(m => m.name).join(', ')} - {t('lowRefills') || 'running low on refills'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MedicationCardProps {
  medication: PatientMedication;
  onTake: (id: string) => void;
  onSkip: (id: string) => void;
  loading: boolean;
  t: (key: string) => string;
}

function MedicationCard({ medication, onTake, onSkip, loading, t }: MedicationCardProps) {
  const isPending = medication.todayStatus === 'PENDING';
  const isTaken = medication.todayStatus === 'TAKEN';
  const isSkipped = medication.todayStatus === 'SKIPPED';

  return (
    <div className={cn(
      'rounded-xl border bg-white p-4 shadow-sm transition-all dark:bg-gray-900',
      isTaken && 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10',
      isSkipped && 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/10',
      isPending && 'border-gray-200 dark:border-gray-800'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl',
          isTaken && 'bg-green-100 dark:bg-green-900/30',
          isSkipped && 'bg-yellow-100 dark:bg-yellow-900/30',
          isPending && 'bg-teal-100 dark:bg-teal-900/30'
        )}>
          <Pill className={cn(
            'h-6 w-6',
            isTaken && 'text-green-600 dark:text-green-400',
            isSkipped && 'text-yellow-600 dark:text-yellow-400',
            isPending && 'text-teal-600 dark:text-teal-400'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{medication.name}</h3>
              {medication.genericName && medication.genericName !== medication.name && (
                <p className="text-xs text-gray-500">{medication.genericName}</p>
              )}
            </div>
            {!isPending && (
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                isTaken && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                isSkipped && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              )}>
                {isTaken && <Check className="h-3 w-3" />}
                {isSkipped && <X className="h-3 w-3" />}
                {isTaken ? (t('taken') || 'Taken') : (t('skipped') || 'Skipped')}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-100">{medication.dosage}</span>
            <span>•</span>
            <span>{medication.frequency}</span>
            {medication.route && (
              <>
                <span>•</span>
                <span>{medication.route}</span>
              </>
            )}
          </div>

          {medication.instructions && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-500">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{medication.instructions}</span>
            </div>
          )}

          {isTaken && medication.takenAt && (
            <p className="mt-2 text-xs text-green-600 dark:text-green-400">
              {t('takenAt') || 'Taken at'} {new Date(medication.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {isPending && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onTake(medication.id)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t('takeMedication') || 'Take Now'}
          </button>
          <button
            onClick={() => onSkip(medication.id)}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            <X className="h-4 w-4" />
            {t('skip') || 'Skip'}
          </button>
        </div>
      )}
    </div>
  );
}
