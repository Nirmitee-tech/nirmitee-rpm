'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Heart,
  Activity,
  Droplets,
  Scale,
  Wind,
  FileText,
  Clock,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Target,
  AlertTriangle,
  Calendar,
  Pill,
  Stethoscope,
  Play,
  Pause,
  CheckSquare,
  Square,
  Bell,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { cn } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { vitalsApi, VitalType, VitalReading } from '@/lib/api/vitals';
import { telehealthApi } from '@/lib/api/telehealth';
import { alertsApi, Alert, AlertSeverity } from '@/lib/api/alerts';
import { patientsApi, CarePlan, CarePlanGoal } from '@/lib/api/patients';

// ============================================
// TYPES
// ============================================

interface PatientInfo {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  mrn?: string;
  conditions?: string[];
}

interface ProviderSidebarProps {
  patientId: string;
  sessionId: string;
  patientInfo?: PatientInfo;
  callDuration?: number; // Duration in seconds from parent VideoRoom
  onScheduleFollowUp?: () => void;
  onCreateAlert?: () => void;
  onViewCarePlan?: () => void;
}

type TabType = 'vitals' | 'notes' | 'tasks' | 'carePlan' | 'alerts';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface VitalFormData {
  bloodPressure: { systolic: string; diastolic: string; pulse: string };
  weight: { value: string; unit: 'lbs' | 'kg' };
  glucose: { value: string; mealContext: string };
  oxygen: { value: string };
  heartRate: { value: string };
}

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

const initialVitalData: VitalFormData = {
  bloodPressure: { systolic: '', diastolic: '', pulse: '' },
  weight: { value: '', unit: 'lbs' },
  glucose: { value: '', mealContext: 'random' },
  oxygen: { value: '' },
  heartRate: { value: '' },
};

const defaultChecklist: ChecklistItem[] = [
  { id: 'vitals', label: 'reviewVitals', completed: false },
  { id: 'symptoms', label: 'discussSymptoms', completed: false },
  { id: 'meds', label: 'medicationReview', completed: false },
  { id: 'compliance', label: 'assessCompliance', completed: false },
  { id: 'careplan', label: 'updateCarePlan', completed: false },
  { id: 'schedule', label: 'scheduleNext', completed: false },
];

// ============================================
// HELPER COMPONENTS
// ============================================

function StatusIcon({ status }: { status: SaveStatus }) {
  switch (status) {
    case 'saving':
      return <Loader2 className="w-3.5 h-3.5 animate-spin text-[#745EE1]" />;
    case 'saved':
      return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
    default:
      return null;
  }
}

interface VitalSectionProps {
  id: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  canSave: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  status: SaveStatus;
  translations: { saving?: string; saved?: string; error?: string; save?: string };
}

function VitalSection({
  icon: Icon,
  title,
  children,
  onSave,
  canSave,
  isExpanded,
  onToggle,
  status,
  translations,
}: VitalSectionProps) {
  return (
    <div className="border border-[#E5E5E5] dark:border-[#2a2a3e] rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between bg-[#FAFAFA] dark:bg-[#1a1a24] hover:bg-[#F0F0F0] dark:hover:bg-[#22222e] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#745EE1]" />
          <span className="text-sm font-medium text-[#171717] dark:text-white">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#737373]" /> : <ChevronDown className="w-4 h-4 text-[#737373]" />}
        </div>
      </button>
      {isExpanded && (
        <div className="p-3 space-y-3 bg-white dark:bg-[#12121a]">
          {children}
          <button
            onClick={onSave}
            disabled={!canSave || status === 'saving'}
            className={cn(
              'w-full py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2',
              canSave && status !== 'saving'
                ? 'bg-[#745EE1] text-white hover:bg-[#6350c9]'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            {status === 'saving' ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />{translations.saving}</>
            ) : status === 'saved' ? (
              <><CheckCircle className="w-3.5 h-3.5" />{translations.saved}</>
            ) : status === 'error' ? (
              <><AlertCircle className="w-3.5 h-3.5" />{translations.error}</>
            ) : (
              <><Save className="w-3.5 h-3.5" />{translations.save}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Helper functions
function formatReading(reading: VitalReading): string {
  const values = reading.values;
  switch (reading.type) {
    case 'blood_pressure': return `${values.systolic}/${values.diastolic} mmHg`;
    case 'weight': return `${values.value} ${reading.unit}`;
    case 'glucose': return `${values.mgdl} mg/dL`;
    case 'oxygen': return `${values.percentage}%`;
    case 'heart_rate': return `${values.bpm} bpm`;
    default: return JSON.stringify(values);
  }
}

function getVitalIcon(type: VitalType): React.ElementType {
  switch (type) {
    case 'blood_pressure': return Heart;
    case 'weight': return Scale;
    case 'glucose': return Droplets;
    case 'oxygen': return Wind;
    case 'heart_rate': return Activity;
    default: return Activity;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'normal': return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400';
    case 'warning': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
    case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400';
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ProviderSidebar({
  patientId,
  sessionId,
  patientInfo,
  callDuration,
  onScheduleFollowUp,
  onCreateAlert,
  onViewCarePlan,
}: ProviderSidebarProps) {
  const { t } = useTranslations('telehealth.sidebar');
  const [activeTab, setActiveTab] = useState<TabType>('vitals');
  const [vitalData, setVitalData] = useState<VitalFormData>(initialVitalData);
  const [notes, setNotes] = useState('');
  const [notesSaveStatus, setNotesSaveStatus] = useState<SaveStatus>('idle');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['bloodPressure', 'oxygen']));
  const [savingStates, setSavingStates] = useState<Record<string, SaveStatus>>({});
  const [recentReadings, setRecentReadings] = useState<VitalReading[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Session timer
  const [sessionTime, setSessionTime] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>(defaultChecklist);

  // Alerts from API
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [processingAlertId, setProcessingAlertId] = useState<string | null>(null);

  // Care Plan from API
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [loadingCarePlan, setLoadingCarePlan] = useState(false);

  // Session timer effect
  useEffect(() => {
    if (!isTimerPaused) {
      timerRef.current = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerPaused]);

  // Load data on mount
  useEffect(() => {
    loadRecentVitals();
    loadSessionNotes();
    loadPatientAlerts();
    loadPatientCarePlan();
  }, [patientId, sessionId]);

  const loadRecentVitals = async () => {
    try {
      setLoadingHistory(true);
      const result = await vitalsApi.getReadings({ patientId, limit: 10 });
      setRecentReadings(result.readings);
    } catch (error) {
      console.error('Failed to load recent vitals:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadSessionNotes = async () => {
    try {
      setLoadingNotes(true);
      const existingNotes = await telehealthApi.getSessionNotes(sessionId);
      setNotes(existingNotes);
    } catch (error) {
      console.error('Failed to load session notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  };

  const loadPatientAlerts = async () => {
    try {
      setLoadingAlerts(true);
      const patientAlerts = await alertsApi.getPatientAlerts(patientId, { limit: 10 });
      setAlerts(patientAlerts);
    } catch (error) {
      console.error('Failed to load patient alerts:', error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const loadPatientCarePlan = async () => {
    try {
      setLoadingCarePlan(true);
      const carePlans = await patientsApi.getCarePlans(patientId);
      // Get the most recent active care plan
      const activePlan = carePlans.find(cp => cp.status === 'ACTIVE') || carePlans[0];
      setCarePlan(activePlan || null);
    } catch (error) {
      console.error('Failed to load patient care plan:', error);
    } finally {
      setLoadingCarePlan(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      setProcessingAlertId(alertId);
      await alertsApi.acknowledgeAlert(alertId);
      // Refresh alerts
      await loadPatientAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    } finally {
      setProcessingAlertId(null);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      setProcessingAlertId(alertId);
      await alertsApi.dismissAlert(alertId, 'Dismissed during telehealth session');
      // Refresh alerts
      await loadPatientAlerts();
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    } finally {
      setProcessingAlertId(null);
    }
  };

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) newSet.delete(section);
      else newSet.add(section);
      return newSet;
    });
  }, []);

  const toggleChecklistItem = useCallback((id: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  }, []);

  // Save vital reading
  const saveVital = useCallback(async (
    type: VitalType,
    values: Record<string, number>,
    unit: string,
    mealContext?: string
  ) => {
    if (Object.values(values).every(v => !v || v === 0 || isNaN(v))) return;
    setSavingStates((prev) => ({ ...prev, [type]: 'saving' }));
    try {
      await vitalsApi.createReading({
        type, values, unit,
        recordedAt: new Date().toISOString(),
        patientId,
        ...(mealContext && { mealContext: mealContext as 'fasting' | 'before_meal' | 'after_meal' | 'bedtime' | 'random' }),
        notes: `Recorded during telehealth session ${sessionId}`,
      });
      setSavingStates((prev) => ({ ...prev, [type]: 'saved' }));
      loadRecentVitals();
      setTimeout(() => setSavingStates((prev) => ({ ...prev, [type]: 'idle' })), 3000);
    } catch (error) {
      console.error('Failed to save vital:', error);
      setSavingStates((prev) => ({ ...prev, [type]: 'error' }));
      setTimeout(() => setSavingStates((prev) => ({ ...prev, [type]: 'idle' })), 5000);
    }
  }, [patientId, sessionId]);

  const handleSaveNotes = useCallback(async () => {
    if (!notes.trim()) return;
    setNotesSaveStatus('saving');
    try {
      await telehealthApi.updateSessionNotes(sessionId, notes);
      setNotesSaveStatus('saved');
      setTimeout(() => setNotesSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save notes:', error);
      setNotesSaveStatus('error');
      setTimeout(() => setNotesSaveStatus('idle'), 5000);
    }
  }, [sessionId, notes]);

  // Vital save handlers
  const handleBloodPressureSave = useCallback(() => {
    const { systolic, diastolic, pulse } = vitalData.bloodPressure;
    if (!systolic || !diastolic) return;
    const values: Record<string, number> = { systolic: parseInt(systolic), diastolic: parseInt(diastolic) };
    if (pulse) values.pulse = parseInt(pulse);
    saveVital('blood_pressure', values, 'mmHg');
  }, [vitalData.bloodPressure, saveVital]);

  const handleWeightSave = useCallback(() => {
    const { value, unit } = vitalData.weight;
    if (!value) return;
    saveVital('weight', { value: parseFloat(value) }, unit);
  }, [vitalData.weight, saveVital]);

  const handleGlucoseSave = useCallback(() => {
    const { value, mealContext } = vitalData.glucose;
    if (!value) return;
    saveVital('glucose', { mgdl: parseInt(value) }, 'mg/dL', mealContext);
  }, [vitalData.glucose, saveVital]);

  const handleOxygenSave = useCallback(() => {
    const { value } = vitalData.oxygen;
    if (!value) return;
    saveVital('oxygen', { percentage: parseInt(value) }, '%');
  }, [vitalData.oxygen, saveVital]);

  const handleHeartRateSave = useCallback(() => {
    const { value } = vitalData.heartRate;
    if (!value) return;
    saveVital('heart_rate', { bpm: parseInt(value) }, 'bpm');
  }, [vitalData.heartRate, saveVital]);

  const getVitalTrend = useCallback((type: VitalType) => {
    const typeReadings = recentReadings.filter(r => r.type === type);
    if (typeReadings.length < 2) return null;
    const getMainValue = (reading: VitalReading) => {
      switch (reading.type) {
        case 'blood_pressure': return reading.values.systolic;
        case 'glucose': return reading.values.mgdl;
        case 'oxygen': return reading.values.percentage;
        case 'heart_rate': return reading.values.bpm;
        case 'weight': return reading.values.value;
        default: return 0;
      }
    };
    const diff = getMainValue(typeReadings[0]) - getMainValue(typeReadings[1]);
    return { diff, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable' };
  }, [recentReadings]);

  const translations = {
    saving: t('saving') || 'Saving...',
    saved: t('saved') || 'Saved!',
    error: t('error') || 'Error - Try Again',
    save: t('save') || 'Save',
  };

  const completedCount = checklist.filter(item => item.completed).length;
  // Use callDuration from VideoRoom if provided, otherwise use internal timer
  const effectiveDuration = callDuration ?? sessionTime;
  const billableMinutes = Math.ceil(effectiveDuration / 60);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#12121a]">
      {/* Header with Patient Info & Timer */}
      <div className="flex-shrink-0 p-3 border-b border-[#E5E5E5] dark:border-[#1f1f2e] bg-gradient-to-r from-[#745EE1]/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#745EE1] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {patientInfo?.name?.split(' ').map(n => n[0]).join('') || 'P'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#171717] dark:text-white truncate">
              {patientInfo?.name || 'Patient'}
            </h3>
            <p className="text-xs text-[#737373]">
              {patientInfo?.age && `${patientInfo.age}y`}
              {patientInfo?.gender && ` • ${patientInfo.gender}`}
              {patientInfo?.mrn && ` • MRN: ${patientInfo.mrn}`}
            </p>
          </div>
        </div>

        {/* Session Timer */}
        <div className="mt-3 p-2 rounded-lg bg-[#F5F5F5] dark:bg-[#1a1a24] flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#737373] uppercase">{t('sessionTimer') || 'Session Timer'}</p>
            <p className="text-lg font-mono font-bold text-[#171717] dark:text-white">{formatTime(effectiveDuration)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#737373] uppercase">{t('billableTime') || 'Billable'}</p>
            <p className="text-sm font-semibold text-[#745EE1]">{billableMinutes} min</p>
          </div>
          <button
            onClick={() => setIsTimerPaused(!isTimerPaused)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isTimerPaused ? 'bg-green-500/20 text-green-600' : 'bg-yellow-500/20 text-yellow-600'
            )}
          >
            {isTimerPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Stats */}
        {recentReadings.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(['blood_pressure', 'oxygen', 'heart_rate'] as VitalType[]).map((type) => {
              const reading = recentReadings.find(r => r.type === type);
              if (!reading) return null;
              const trend = getVitalTrend(type);
              return (
                <div key={type} className="p-2 rounded-lg bg-[#F5F5F5] dark:bg-[#1a1a24]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[#737373] uppercase">
                      {type === 'blood_pressure' ? 'BP' : type === 'oxygen' ? 'SpO2' : 'HR'}
                    </span>
                    {trend && (trend.direction === 'up' ? <TrendingUp className="w-3 h-3 text-red-500" /> : trend.direction === 'down' ? <TrendingDown className="w-3 h-3 text-green-500" /> : null)}
                  </div>
                  <p className={cn('text-xs font-semibold', reading.status === 'critical' ? 'text-red-600' : reading.status === 'warning' ? 'text-yellow-600' : 'text-[#171717] dark:text-white')}>
                    {formatReading(reading).split(' ')[0]}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-[#E5E5E5] dark:border-[#1f1f2e]">
        <p className="text-[10px] text-[#737373] uppercase mb-2">{t('quickActions') || 'Quick Actions'}</p>
        <div className="flex gap-1 flex-wrap">
          <button onClick={onScheduleFollowUp} className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md bg-[#745EE1]/10 text-[#745EE1] hover:bg-[#745EE1]/20 transition-colors">
            <Calendar className="w-3 h-3" />{t('scheduleFollowUp') || 'Follow-up'}
          </button>
          <button onClick={onCreateAlert} className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors">
            <Bell className="w-3 h-3" />{t('createAlert') || 'Alert'}
          </button>
          <button className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors">
            <Pill className="w-3 h-3" />{t('prescribe') || 'Rx'}
          </button>
          <button className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors">
            <Stethoscope className="w-3 h-3" />{t('orderLab') || 'Lab'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-[#E5E5E5] dark:border-[#1f1f2e] overflow-x-auto">
        {[
          { id: 'vitals' as TabType, label: t('vitals') || 'Vitals', icon: Activity },
          { id: 'notes' as TabType, label: t('notes') || 'Notes', icon: FileText },
          { id: 'tasks' as TabType, label: t('tasks') || 'Tasks', icon: ClipboardList, badge: checklist.length - completedCount },
          { id: 'carePlan' as TabType, label: t('carePlan') || 'Plan', icon: Target },
          { id: 'alerts' as TabType, label: t('alerts') || 'Alerts', icon: Bell, badge: alerts.filter(a => a.severity === 'CRITICAL').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 min-w-0 px-2 py-2 text-[10px] font-medium transition-all flex flex-col items-center gap-0.5 relative',
              activeTab === tab.id
                ? 'text-[#745EE1] border-b-2 border-[#745EE1] bg-[#745EE1]/5'
                : 'text-[#737373] hover:text-[#171717] dark:hover:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#1a1a24]'
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="truncate">{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 text-[9px] font-bold rounded-full bg-red-500 text-white flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* VITALS TAB */}
        {activeTab === 'vitals' && (
          <div className="p-3 space-y-2">
            <VitalSection id="bloodPressure" icon={Heart} title={t('bloodPressure') || 'Blood Pressure'}
              onSave={handleBloodPressureSave} canSave={!!vitalData.bloodPressure.systolic && !!vitalData.bloodPressure.diastolic}
              isExpanded={expandedSections.has('bloodPressure')} onToggle={() => toggleSection('bloodPressure')}
              status={savingStates['blood_pressure'] || 'idle'} translations={translations}>
              <div className="grid grid-cols-3 gap-2">
                {['systolic', 'diastolic', 'pulse'].map((field) => (
                  <div key={field}>
                    <label className="text-xs text-[#737373] mb-1 block capitalize">{t(field) || field}</label>
                    <input type="number" placeholder={field === 'systolic' ? '120' : field === 'diastolic' ? '80' : '72'}
                      value={vitalData.bloodPressure[field as keyof typeof vitalData.bloodPressure]}
                      onChange={(e) => setVitalData(prev => ({ ...prev, bloodPressure: { ...prev.bloodPressure, [field]: e.target.value } }))}
                      className="w-full px-2 py-2 text-sm rounded-md border border-[#E5E5E5] dark:border-[#2a2a3e] bg-white dark:bg-[#0a0a0f] text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#745EE1]/30" />
                  </div>
                ))}
              </div>
            </VitalSection>

            <VitalSection id="oxygen" icon={Wind} title={t('oxygenSaturation') || 'SpO2'}
              onSave={handleOxygenSave} canSave={!!vitalData.oxygen.value}
              isExpanded={expandedSections.has('oxygen')} onToggle={() => toggleSection('oxygen')}
              status={savingStates['oxygen'] || 'idle'} translations={translations}>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="98" value={vitalData.oxygen.value}
                  onChange={(e) => setVitalData(prev => ({ ...prev, oxygen: { value: e.target.value } }))}
                  className="flex-1 px-3 py-2 text-sm rounded-md border border-[#E5E5E5] dark:border-[#2a2a3e] bg-white dark:bg-[#0a0a0f] text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#745EE1]/30" />
                <span className="text-sm text-[#737373]">%</span>
              </div>
            </VitalSection>

            <VitalSection id="heartRate" icon={Activity} title={t('heartRate') || 'Heart Rate'}
              onSave={handleHeartRateSave} canSave={!!vitalData.heartRate.value}
              isExpanded={expandedSections.has('heartRate')} onToggle={() => toggleSection('heartRate')}
              status={savingStates['heart_rate'] || 'idle'} translations={translations}>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="72" value={vitalData.heartRate.value}
                  onChange={(e) => setVitalData(prev => ({ ...prev, heartRate: { value: e.target.value } }))}
                  className="flex-1 px-3 py-2 text-sm rounded-md border border-[#E5E5E5] dark:border-[#2a2a3e] bg-white dark:bg-[#0a0a0f] text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#745EE1]/30" />
                <span className="text-sm text-[#737373]">bpm</span>
              </div>
            </VitalSection>

            <VitalSection id="weight" icon={Scale} title={t('weight') || 'Weight'}
              onSave={handleWeightSave} canSave={!!vitalData.weight.value}
              isExpanded={expandedSections.has('weight')} onToggle={() => toggleSection('weight')}
              status={savingStates['weight'] || 'idle'} translations={translations}>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="150" value={vitalData.weight.value}
                  onChange={(e) => setVitalData(prev => ({ ...prev, weight: { ...prev.weight, value: e.target.value } }))}
                  className="flex-1 px-3 py-2 text-sm rounded-md border border-[#E5E5E5] dark:border-[#2a2a3e] bg-white dark:bg-[#0a0a0f] text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#745EE1]/30" />
                <select value={vitalData.weight.unit}
                  onChange={(e) => setVitalData(prev => ({ ...prev, weight: { ...prev.weight, unit: e.target.value as 'lbs' | 'kg' } }))}
                  className="px-2 py-2 text-sm rounded-md border border-[#E5E5E5] dark:border-[#2a2a3e] bg-white dark:bg-[#0a0a0f] text-[#171717] dark:text-white">
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </VitalSection>

            <VitalSection id="glucose" icon={Droplets} title={t('bloodGlucose') || 'Blood Glucose'}
              onSave={handleGlucoseSave} canSave={!!vitalData.glucose.value}
              isExpanded={expandedSections.has('glucose')} onToggle={() => toggleSection('glucose')}
              status={savingStates['glucose'] || 'idle'} translations={translations}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="100" value={vitalData.glucose.value}
                    onChange={(e) => setVitalData(prev => ({ ...prev, glucose: { ...prev.glucose, value: e.target.value } }))}
                    className="flex-1 px-3 py-2 text-sm rounded-md border border-[#E5E5E5] dark:border-[#2a2a3e] bg-white dark:bg-[#0a0a0f] text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#745EE1]/30" />
                  <span className="text-sm text-[#737373]">mg/dL</span>
                </div>
                <select value={vitalData.glucose.mealContext}
                  onChange={(e) => setVitalData(prev => ({ ...prev, glucose: { ...prev.glucose, mealContext: e.target.value } }))}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[#E5E5E5] dark:border-[#2a2a3e] bg-white dark:bg-[#0a0a0f] text-[#171717] dark:text-white">
                  <option value="fasting">{t('fasting') || 'Fasting'}</option>
                  <option value="before_meal">{t('beforeMeal') || 'Before Meal'}</option>
                  <option value="after_meal">{t('afterMeal') || 'After Meal'}</option>
                  <option value="bedtime">{t('bedtime') || 'Bedtime'}</option>
                  <option value="random">{t('random') || 'Random'}</option>
                </select>
              </div>
            </VitalSection>

            {/* Recent History */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-[#737373] uppercase">{t('patientHistory') || 'Recent History'}</h4>
                <button onClick={loadRecentVitals} disabled={loadingHistory} className="p-1 rounded hover:bg-[#F5F5F5] dark:hover:bg-[#1a1a24]">
                  <RefreshCw className={cn('w-3.5 h-3.5 text-[#737373]', loadingHistory && 'animate-spin')} />
                </button>
              </div>
              {loadingHistory ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#745EE1]" /></div>
              ) : recentReadings.length === 0 ? (
                <p className="text-xs text-[#737373] text-center py-4">{t('noHistory') || 'No recent readings'}</p>
              ) : (
                <div className="space-y-1">
                  {recentReadings.slice(0, 5).map((reading) => {
                    const Icon = getVitalIcon(reading.type);
                    return (
                      <div key={reading.id} className="flex items-center gap-2 p-2 rounded bg-[#FAFAFA] dark:bg-[#1a1a24]">
                        <Icon className="w-3.5 h-3.5 text-[#745EE1]" />
                        <span className="text-xs text-[#171717] dark:text-white flex-1">{formatReading(reading)}</span>
                        <span className={cn('px-1.5 py-0.5 text-[9px] rounded', getStatusColor(reading.status))}>{reading.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="p-3 flex flex-col h-full">
            {loadingNotes ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#745EE1]" /></div>
            ) : (
              <>
                <textarea placeholder={t('enterNotes') || 'Enter clinical notes...'} value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex-1 w-full px-3 py-2 text-sm rounded-lg border border-[#E5E5E5] dark:border-[#2a2a3e] bg-white dark:bg-[#0a0a0f] text-[#171717] dark:text-white placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#745EE1]/30 resize-none min-h-[200px]" />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-[#737373]">{notes.length} {t('characters') || 'chars'}</span>
                  <button onClick={handleSaveNotes} disabled={!notes.trim() || notesSaveStatus === 'saving'}
                    className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
                      notes.trim() && notesSaveStatus !== 'saving' ? 'bg-[#745EE1] text-white hover:bg-[#6350c9]' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed')}>
                    {notesSaveStatus === 'saving' ? <><Loader2 className="w-4 h-4 animate-spin" />{t('saving')}</> :
                     notesSaveStatus === 'saved' ? <><CheckCircle className="w-4 h-4" />{t('saved')}</> :
                     notesSaveStatus === 'error' ? <><AlertCircle className="w-4 h-4" />{t('error')}</> :
                     <><Save className="w-4 h-4" />{t('saveNotes') || 'Save'}</>}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-[#171717] dark:text-white">{t('sessionChecklist') || 'Session Checklist'}</h4>
              <span className={cn('text-xs px-2 py-1 rounded-full', completedCount === checklist.length ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                {completedCount}/{checklist.length}
              </span>
            </div>
            <div className="space-y-2">
              {checklist.map((item) => (
                <button key={item.id} onClick={() => toggleChecklistItem(item.id)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                    item.completed ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-[#E5E5E5] dark:border-[#2a2a3e] hover:bg-[#F5F5F5] dark:hover:bg-[#1a1a24]')}>
                  {item.completed ? <CheckSquare className="w-5 h-5 text-green-500 flex-shrink-0" /> : <Square className="w-5 h-5 text-[#737373] flex-shrink-0" />}
                  <span className={cn('text-sm', item.completed ? 'text-green-700 dark:text-green-400 line-through' : 'text-[#171717] dark:text-white')}>
                    {t(item.label) || item.label}
                  </span>
                </button>
              ))}
            </div>
            {completedCount === checklist.length && (
              <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-700 dark:text-green-400">{t('checklistComplete') || 'Checklist Complete!'}</p>
              </div>
            )}
          </div>
        )}

        {/* CARE PLAN TAB */}
        {activeTab === 'carePlan' && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-[#171717] dark:text-white">{t('carePlanStatus') || 'Care Plan'}</h4>
              <div className="flex items-center gap-2">
                <button onClick={loadPatientCarePlan} disabled={loadingCarePlan} className="p-1 rounded hover:bg-[#F5F5F5] dark:hover:bg-[#1a1a24]">
                  <RefreshCw className={cn('w-3.5 h-3.5 text-[#737373]', loadingCarePlan && 'animate-spin')} />
                </button>
                <button
                  onClick={() => window.open(`/patients/${patientId}?tab=care-plan`, '_blank')}
                  className="text-xs text-[#745EE1] hover:underline flex items-center gap-1"
                >
                  {t('viewCarePlan') || 'View'}<ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {loadingCarePlan ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#745EE1]" />
              </div>
            ) : !carePlan ? (
              <div className="text-center py-8">
                <Target className="w-10 h-10 mx-auto mb-3 text-[#737373] opacity-50" />
                <p className="text-sm text-[#737373] mb-3">{t('noCarePlan') || 'No active care plan'}</p>
                <button
                  onClick={() => window.open(`/patients/${patientId}?tab=care-plan&action=create`, '_blank')}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-[#745EE1] text-white hover:bg-[#6350c9] transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />{t('createCarePlan') || 'Create Care Plan'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Care Plan Status */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded',
                    carePlan.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                      : carePlan.status === 'DRAFT' ? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                  )}>
                    {carePlan.status}
                  </span>
                  <span className="text-xs text-[#737373]">v{carePlan.currentVersion}</span>
                </div>

                {/* Goals Section */}
                {carePlan.versions[0]?.goals && carePlan.versions[0].goals.length > 0 && (
                  <div className="p-3 rounded-lg border border-[#E5E5E5] dark:border-[#2a2a3e]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#737373] uppercase">{t('activeGoals') || 'Active Goals'}</span>
                      <span className="text-lg font-bold text-[#745EE1]">{carePlan.versions[0].goals.length}</span>
                    </div>
                    <div className="space-y-2">
                      {carePlan.versions[0].goals.map((goal: CarePlanGoal, i: number) => {
                        const progress = goal.status === 'achieved' ? 100 : goal.status === 'in_progress' ? 50 : 0;
                        return (
                          <div key={goal.id || i}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#171717] dark:text-white truncate flex-1 mr-2">{goal.description}</span>
                              <span className={cn(
                                'px-1.5 py-0.5 text-[9px] rounded',
                                goal.status === 'achieved' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                  : goal.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                              )}>
                                {goal.status || 'pending'}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                              <div className="h-full rounded-full bg-[#745EE1]" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Goal Stats */}
                {carePlan.versions[0]?.goals && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                      <p className="text-lg font-bold text-green-600">
                        {carePlan.versions[0].goals.filter((g: CarePlanGoal) => g.status === 'achieved').length}
                      </p>
                      <p className="text-[10px] text-green-700 dark:text-green-400">{t('completedGoals') || 'Achieved'}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-center">
                      <p className="text-lg font-bold text-yellow-600">
                        {carePlan.versions[0].goals.filter((g: CarePlanGoal) => g.status === 'pending' || !g.status).length}
                      </p>
                      <p className="text-[10px] text-yellow-700 dark:text-yellow-400">{t('pendingGoals') || 'Pending'}</p>
                    </div>
                  </div>
                )}

                {/* Medications */}
                {carePlan.versions[0]?.medications && carePlan.versions[0].medications.length > 0 && (
                  <div className="p-3 rounded-lg border border-[#E5E5E5] dark:border-[#2a2a3e]">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="w-4 h-4 text-[#745EE1]" />
                      <span className="text-xs text-[#737373] uppercase">{t('medications') || 'Medications'}</span>
                    </div>
                    <div className="space-y-1">
                      {carePlan.versions[0].medications.slice(0, 3).map((med: { name: string; dosage: string; frequency: string }, i: number) => (
                        <div key={i} className="text-xs text-[#171717] dark:text-white">
                          <span className="font-medium">{med.name}</span>
                          <span className="text-[#737373]"> - {med.dosage}, {med.frequency}</span>
                        </div>
                      ))}
                      {carePlan.versions[0].medications.length > 3 && (
                        <p className="text-xs text-[#737373]">+{carePlan.versions[0].medications.length - 3} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Edit Button */}
                <button
                  onClick={() => window.open(`/patients/${patientId}?tab=care-plan&action=edit`, '_blank')}
                  className="w-full py-2 text-sm font-medium rounded-lg border border-[#745EE1] text-[#745EE1] hover:bg-[#745EE1]/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />{t('editCarePlan') || 'Edit Care Plan'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-[#171717] dark:text-white">{t('activeAlerts') || 'Active Alerts'}</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#737373]">{alerts.length} total</span>
                <button onClick={loadPatientAlerts} disabled={loadingAlerts} className="p-1 rounded hover:bg-[#F5F5F5] dark:hover:bg-[#1a1a24]">
                  <RefreshCw className={cn('w-3.5 h-3.5 text-[#737373]', loadingAlerts && 'animate-spin')} />
                </button>
              </div>
            </div>

            {loadingAlerts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#745EE1]" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-10 h-10 mx-auto mb-3 text-[#737373] opacity-50" />
                <p className="text-sm text-[#737373]">{t('noActiveAlerts') || 'No active alerts'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => {
                  const isCritical = alert.severity === 'CRITICAL';
                  const isSignificant = alert.severity === 'SIGNIFICANT';
                  const isProcessing = processingAlertId === alert.id;
                  const alertTime = new Date(alert.createdAt);
                  const timeAgo = formatTimeAgo(alertTime);

                  return (
                    <div key={alert.id} className={cn('p-3 rounded-lg border',
                      isCritical ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : isSignificant ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                      : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20')}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={cn('w-4 h-4 flex-shrink-0 mt-0.5',
                          isCritical ? 'text-red-500' : isSignificant ? 'text-yellow-500' : 'text-blue-500')} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('px-1.5 py-0.5 text-[9px] font-medium rounded uppercase',
                              isCritical ? 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200'
                              : isSignificant ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200')}>
                              {alert.severity}
                            </span>
                            <span className={cn('px-1.5 py-0.5 text-[9px] font-medium rounded',
                              'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                              {alert.status}
                            </span>
                          </div>
                          <p className={cn('text-sm font-medium',
                            isCritical ? 'text-red-700 dark:text-red-400'
                            : isSignificant ? 'text-yellow-700 dark:text-yellow-400'
                            : 'text-blue-700 dark:text-blue-400')}>
                            {alert.message}
                          </p>
                          <p className="text-xs text-[#737373] mt-1">{timeAgo}</p>
                        </div>
                      </div>
                      {alert.status !== 'RESOLVED' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            disabled={isProcessing || alert.status === 'ACKNOWLEDGED'}
                            className={cn(
                              'flex-1 py-1.5 text-xs font-medium rounded flex items-center justify-center gap-1',
                              alert.status === 'ACKNOWLEDGED'
                                ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 cursor-default'
                                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[#171717] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700',
                              isProcessing && 'opacity-50 cursor-wait'
                            )}>
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> :
                             alert.status === 'ACKNOWLEDGED' ? <><CheckCircle className="w-3 h-3" />{t('acknowledged') || 'Acknowledged'}</> :
                             t('acknowledgeAlert') || 'Acknowledge'}
                          </button>
                          <button
                            onClick={() => handleDismissAlert(alert.id)}
                            disabled={isProcessing}
                            className={cn(
                              'flex-1 py-1.5 text-xs font-medium rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[#737373] hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-1',
                              isProcessing && 'opacity-50 cursor-wait'
                            )}>
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : t('dismissAlert') || 'Dismiss'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => window.open(`/patients/${patientId}?tab=alerts`, '_blank')}
              className="w-full mt-3 py-2 text-sm font-medium rounded-lg border border-[#E5E5E5] dark:border-[#2a2a3e] text-[#737373] hover:bg-[#F5F5F5] dark:hover:bg-[#1a1a24] transition-colors flex items-center justify-center gap-2">
              <ExternalLink className="w-4 h-4" />
              {t('viewAllAlerts') || 'View All Alerts'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
