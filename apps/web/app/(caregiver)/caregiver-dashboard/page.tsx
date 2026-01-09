'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Heart,
  Activity,
  AlertTriangle,
  Pill,
  ChevronRight,
  Loader2,
  Droplets,
  Scale,
  Thermometer,
  Wind,
  Clock,
  Phone,
  FileText,
} from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';
import { caregiverApi, LinkedPatient, PatientSummary } from '@/lib/api/caregiver';

// Demo data for when API is not connected
const DEMO_LINKED_PATIENTS: LinkedPatient[] = [
  {
    id: 'pat-demo-1',
    firstName: 'Robert',
    lastName: 'Anderson',
    relationship: 'PARENT',
    accessLevel: 'FULL_ACCESS',
    consentGrantedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const DEMO_SUMMARY: PatientSummary = {
  patient: {
    id: 'pat-demo-1',
    firstName: 'Robert',
    lastName: 'Anderson',
    conditions: ['HYPERTENSION', 'DIABETES_TYPE_2'],
    enrollmentStatus: 'ACTIVE',
  },
  careTeam: {
    primaryPhysician: 'Dr. Sarah Smith',
    clinicalStaff: 'Emily Johnson, RN',
  },
  stats: {
    todayReadings: 2,
    weekReadings: 12,
    activeAlerts: 1,
    activeMedications: 4,
  },
  latestVitals: [
    {
      type: 'BLOOD_PRESSURE',
      values: { systolic: 142, diastolic: 88 },
      status: 'WARNING',
      recordedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'BLOOD_GLUCOSE',
      values: { value: 128 },
      status: 'NORMAL',
      recordedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'WEIGHT',
      values: { value: 185 },
      status: 'NORMAL',
      recordedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

export default function CaregiverDashboardPage() {
  const { t } = useTranslations('caregiver');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [linkedPatients, setLinkedPatients] = useState<LinkedPatient[]>(DEMO_LINKED_PATIENTS);
  const [selectedPatient, setSelectedPatient] = useState<LinkedPatient | null>(null);
  const [patientSummary, setPatientSummary] = useState<PatientSummary | null>(DEMO_SUMMARY);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const patients = await caregiverApi.getLinkedPatients();
      setLinkedPatients(patients);

      if (patients.length > 0) {
        setSelectedPatient(patients[0]);
        const summary = await caregiverApi.getPatientSummary(patients[0].id);
        setPatientSummary(summary);
      }
    } catch {
      // Use demo data
      setSelectedPatient(DEMO_LINKED_PATIENTS[0]);
      setPatientSummary(DEMO_SUMMARY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectPatient = async (patient: LinkedPatient) => {
    setSelectedPatient(patient);
    try {
      const summary = await caregiverApi.getPatientSummary(patient.id);
      setPatientSummary(summary);
    } catch {
      // Keep demo data
    }
  };

  const getVitalIcon = (type: string) => {
    switch (type) {
      case 'BLOOD_PRESSURE': return Droplets;
      case 'HEART_RATE': return Heart;
      case 'BLOOD_GLUCOSE': return Droplets;
      case 'WEIGHT': return Scale;
      case 'TEMPERATURE': return Thermometer;
      case 'OXYGEN_SATURATION': return Wind;
      default: return Activity;
    }
  };

  const getVitalColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      case 'WARNING': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
      default: return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    }
  };

  const formatVitalValue = (type: string, values: Record<string, number>) => {
    switch (type) {
      case 'BLOOD_PRESSURE':
        return `${values.systolic}/${values.diastolic} mmHg`;
      case 'BLOOD_GLUCOSE':
        return `${values.value} mg/dL`;
      case 'WEIGHT':
        return `${values.value} lbs`;
      case 'HEART_RATE':
        return `${values.value} bpm`;
      case 'OXYGEN_SATURATION':
        return `${values.value}%`;
      case 'TEMPERATURE':
        return `${values.value}°F`;
      default:
        return JSON.stringify(values);
    }
  };

  const getRelationshipLabel = (rel: string) => {
    const labels: Record<string, string> = {
      PARENT: 'Parent',
      SPOUSE: 'Spouse',
      ADULT_CHILD: 'Adult Child',
      SIBLING: 'Sibling',
      GRANDPARENT: 'Grandparent',
      OTHER: 'Family Member',
    };
    return labels[rel] || rel;
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffHrs >= 24) return `${Math.floor(diffHrs / 24)}d ago`;
    if (diffHrs > 0) return `${diffHrs}h ago`;
    return `${diffMins}m ago`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-600 to-pink-700 px-4 pb-6 pt-4 text-white">
        <p className="text-sm text-rose-100">{t('welcome') || 'Welcome to Family Portal'}</p>
        <h1 className="text-2xl font-bold mt-1">
          {t('monitoringTitle') || 'Caring for Your Loved Ones'}
        </h1>

        {/* Patient Selector */}
        {linkedPatients.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {linkedPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => selectPatient(patient)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all',
                  selectedPatient?.id === patient.id
                    ? 'bg-white text-rose-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
              >
                <Users className="h-4 w-4" />
                {patient.firstName}
              </button>
            ))}
          </div>
        )}

        {/* Selected Patient Card */}
        {selectedPatient && patientSummary && (
          <div className="mt-4 rounded-xl bg-white/15 backdrop-blur p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-200">{t('monitoring') || 'Monitoring'}</p>
                <p className="text-xl font-bold">
                  {patientSummary.patient.firstName} {patientSummary.patient.lastName}
                </p>
                <p className="text-xs text-rose-200">
                  {getRelationshipLabel(selectedPatient.relationship)}
                </p>
              </div>
              <div className="text-right">
                <div className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                  patientSummary.stats.activeAlerts > 0
                    ? 'bg-red-500 text-white'
                    : 'bg-green-500/20 text-green-100'
                )}>
                  {patientSummary.stats.activeAlerts > 0 ? (
                    <>
                      <AlertTriangle className="h-3 w-3" />
                      {patientSummary.stats.activeAlerts} {t('alerts') || 'Alerts'}
                    </>
                  ) : (
                    <>✓ {t('allGood') || 'All Good'}</>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 -mt-2 space-y-4">
        {/* Quick Stats */}
        {patientSummary && (
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-gray-900">
              <Activity className="mx-auto h-5 w-5 text-blue-600" />
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                {patientSummary.stats.todayReadings}
              </p>
              <p className="text-[10px] text-gray-500">{t('today') || 'Today'}</p>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-gray-900">
              <Clock className="mx-auto h-5 w-5 text-purple-600" />
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                {patientSummary.stats.weekReadings}
              </p>
              <p className="text-[10px] text-gray-500">{t('thisWeek') || 'This Week'}</p>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-gray-900">
              <AlertTriangle className={cn(
                'mx-auto h-5 w-5',
                patientSummary.stats.activeAlerts > 0 ? 'text-red-600' : 'text-green-600'
              )} />
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                {patientSummary.stats.activeAlerts}
              </p>
              <p className="text-[10px] text-gray-500">{t('alerts') || 'Alerts'}</p>
            </div>
            <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-gray-900">
              <Pill className="mx-auto h-5 w-5 text-teal-600" />
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                {patientSummary.stats.activeMedications}
              </p>
              <p className="text-[10px] text-gray-500">{t('meds') || 'Meds'}</p>
            </div>
          </div>
        )}

        {/* Latest Vitals */}
        {patientSummary && patientSummary.latestVitals.length > 0 && (
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Activity className="h-4 w-4 text-blue-600" />
              {t('latestVitals') || 'Latest Vitals'}
            </h2>
            <div className="space-y-2">
              {patientSummary.latestVitals.map((vital, idx) => {
                const VitalIcon = getVitalIcon(vital.type);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', getVitalColor(vital.status))}>
                        <VitalIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {vital.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(vital.recordedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatVitalValue(vital.type, vital.values)}
                      </p>
                      <span className={cn(
                        'text-xs font-medium rounded-full px-2 py-0.5',
                        vital.status === 'CRITICAL' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        vital.status === 'WARNING' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                        vital.status === 'NORMAL' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      )}>
                        {vital.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Care Team */}
        {patientSummary && (
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Users className="h-4 w-4 text-purple-600" />
              {t('careTeam') || 'Care Team'}
            </h2>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              {patientSummary.careTeam.primaryPhysician && (
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {patientSummary.careTeam.primaryPhysician}
                    </p>
                    <p className="text-xs text-gray-500">{t('primaryPhysician') || 'Primary Physician'}</p>
                  </div>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400">
                    <Phone className="h-4 w-4" />
                  </button>
                </div>
              )}
              {patientSummary.careTeam.clinicalStaff && (
                <div className="flex items-center justify-between border-t border-gray-100 py-2 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {patientSummary.careTeam.clinicalStaff}
                    </p>
                    <p className="text-xs text-gray-500">{t('clinicalStaff') || 'Clinical Staff'}</p>
                  </div>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400">
                    <Phone className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('quickActions') || 'Quick Actions'}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800">
              <Activity className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('viewAllVitals') || 'View All Vitals'}
              </span>
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800">
              <Pill className="h-5 w-5 text-teal-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('viewMedications') || 'Medications'}
              </span>
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800">
              <FileText className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('carePlan') || 'Care Plan'}
              </span>
            </button>
            <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('alertHistory') || 'Alert History'}
              </span>
            </button>
          </div>
        </div>

        {/* Emergency Contact Card */}
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <Phone className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-100">
                {t('emergencyContact') || 'Emergency Contact'}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {t('emergencyHint') || 'For medical emergencies, call 911'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
