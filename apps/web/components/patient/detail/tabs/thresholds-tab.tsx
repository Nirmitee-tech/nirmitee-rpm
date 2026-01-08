'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { ThresholdSlider } from '@/components/alerts';
import {
  Activity,
  Heart,
  Droplet,
  Wind,
  Scale,
  RefreshCw,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@nirmitee/ui';

interface PatientThreshold {
  vitalType: string;
  low: number;
  high: number;
  normalMin?: number;
  normalMax?: number;
}

interface ThresholdsTabProps {
  patientId: string;
  patientName?: string;
  onSave?: (thresholds: PatientThreshold[]) => void;
}

// Default organization-level thresholds
const DEFAULT_THRESHOLDS: Record<string, PatientThreshold> = {
  blood_pressure_systolic: { vitalType: 'blood_pressure_systolic', low: 90, high: 140, normalMin: 100, normalMax: 120 },
  blood_pressure_diastolic: { vitalType: 'blood_pressure_diastolic', low: 60, high: 90, normalMin: 65, normalMax: 80 },
  heart_rate: { vitalType: 'heart_rate', low: 50, high: 100, normalMin: 60, normalMax: 90 },
  blood_glucose: { vitalType: 'blood_glucose', low: 70, high: 180, normalMin: 80, normalMax: 140 },
  spo2: { vitalType: 'spo2', low: 92, high: 100, normalMin: 95, normalMax: 100 },
  weight: { vitalType: 'weight', low: -5, high: 5, normalMin: -2, normalMax: 2 },
};

const VITAL_CONFIG = [
  {
    key: 'blood_pressure_systolic',
    label: 'Blood Pressure (Systolic)',
    unit: 'mmHg',
    min: 60,
    max: 200,
    color: '#ef4444',
    icon: Activity,
    description: 'Alert when systolic BP is outside range',
  },
  {
    key: 'blood_pressure_diastolic',
    label: 'Blood Pressure (Diastolic)',
    unit: 'mmHg',
    min: 40,
    max: 120,
    color: '#f97316',
    icon: Activity,
    description: 'Alert when diastolic BP is outside range',
  },
  {
    key: 'heart_rate',
    label: 'Heart Rate',
    unit: 'bpm',
    min: 30,
    max: 150,
    color: '#ec4899',
    icon: Heart,
    description: 'Alert when heart rate is abnormal',
  },
  {
    key: 'blood_glucose',
    label: 'Blood Glucose',
    unit: 'mg/dL',
    min: 40,
    max: 300,
    color: '#8b5cf6',
    icon: Droplet,
    description: 'Alert for hypo/hyperglycemia',
  },
  {
    key: 'spo2',
    label: 'Oxygen Saturation (SpO2)',
    unit: '%',
    min: 80,
    max: 100,
    color: '#06b6d4',
    icon: Wind,
    description: 'Alert when oxygen levels drop',
  },
  {
    key: 'weight',
    label: 'Weight Change (Daily)',
    unit: 'lbs',
    min: -10,
    max: 10,
    color: '#10b981',
    icon: Scale,
    description: 'Alert for sudden weight changes (CHF patients)',
  },
];

export function ThresholdsTab({ patientId, patientName, onSave }: ThresholdsTabProps) {
  const { t } = useTranslations('patientDetail');
  const [thresholds, setThresholds] = useState<Record<string, PatientThreshold>>(DEFAULT_THRESHOLDS);
  const [useCustom, setUseCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleThresholdChange = (key: string, field: 'low' | 'high', value: number) => {
    setThresholds(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleResetToDefaults = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    setUseCustom(false);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Convert thresholds to array format
      const thresholdArray = Object.values(thresholds);
      onSave?.(thresholdArray);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save thresholds:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#171717] dark:text-white">
            {t('thresholds.title')}
          </h3>
          <p className="text-sm text-[#737373] mt-1">
            {t('thresholds.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] text-[#737373] hover:text-[#171717] dark:hover:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#1a1a2e] transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            {t('thresholds.resetToDefaults')}
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? t('thresholds.saving') : t('thresholds.save')}
          </button>
        </div>
      </div>

      {/* Custom vs Default Toggle */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#745EE1]/5 to-[#8B5CF6]/5 border border-[#745EE1]/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#745EE1]/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-[#745EE1]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-[#171717] dark:text-white">
                  {t('thresholds.customThresholds')}
                </h4>
                <p className="text-sm text-[#737373] mt-0.5">
                  {t('thresholds.customThresholdsDesc')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustom}
                  onChange={(e) => setUseCustom(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#E5E5E5] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#745EE1]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#745EE1]" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Threshold Sliders */}
      <div className={cn(
        'grid grid-cols-1 md:grid-cols-2 gap-4',
        !useCustom && 'opacity-60 pointer-events-none'
      )}>
        {VITAL_CONFIG.map((vital) => {
          const threshold = thresholds[vital.key];
          const Icon = vital.icon;

          return (
            <ThresholdSlider
              key={vital.key}
              label={vital.label}
              unit={vital.unit}
              min={vital.min}
              max={vital.max}
              lowValue={threshold?.low || 0}
              highValue={threshold?.high || 100}
              normalMin={threshold?.normalMin}
              normalMax={threshold?.normalMax}
              onLowChange={(v) => handleThresholdChange(vital.key, 'low', v)}
              onHighChange={(v) => handleThresholdChange(vital.key, 'high', v)}
              color={vital.color}
              icon={<Icon className="w-4 h-4" />}
            />
          );
        })}
      </div>

      {/* Info Card */}
      {!useCustom && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">{t('thresholds.usingOrgDefaults')}</span>
            {' '}
            {t('thresholds.usingOrgDefaultsDesc')}
          </p>
        </div>
      )}
    </div>
  );
}
