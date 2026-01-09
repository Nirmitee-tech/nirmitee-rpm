'use client';

import { useState } from 'react';
import { X, Loader2, Activity, Heart, Droplet, Scale, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { vitalsApi, type VitalType } from '@/lib/api/vitals';

interface RecordVitalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onVitalRecorded: () => void;
}

type VitalFormData = {
  type: VitalType;
  values: Record<string, number>;
  unit: string;
};

const VITAL_TYPES: Array<{
  type: VitalType;
  label: string;
  icon: React.ElementType;
  fields: Array<{ key: string; label: string; placeholder: string; unit: string }>;
  defaultUnit: string;
}> = [
  {
    type: 'blood_pressure',
    label: 'Blood Pressure',
    icon: Heart,
    fields: [
      { key: 'systolic', label: 'Systolic', placeholder: 'e.g., 120', unit: 'mmHg' },
      { key: 'diastolic', label: 'Diastolic', placeholder: 'e.g., 80', unit: 'mmHg' },
      { key: 'pulse', label: 'Pulse (Optional)', placeholder: 'e.g., 72', unit: 'bpm' },
    ],
    defaultUnit: 'mmHg',
  },
  {
    type: 'glucose',
    label: 'Blood Glucose',
    icon: Droplet,
    fields: [{ key: 'glucose', label: 'Glucose Level', placeholder: 'e.g., 100', unit: 'mg/dL' }],
    defaultUnit: 'mg/dL',
  },
  {
    type: 'weight',
    label: 'Weight',
    icon: Scale,
    fields: [{ key: 'weight', label: 'Weight', placeholder: 'e.g., 70', unit: 'kg' }],
    defaultUnit: 'kg',
  },
  {
    type: 'oxygen',
    label: 'Oxygen Saturation',
    icon: Wind,
    fields: [{ key: 'oxygen', label: 'SpO2', placeholder: 'e.g., 98', unit: '%' }],
    defaultUnit: '%',
  },
  {
    type: 'heart_rate',
    label: 'Heart Rate',
    icon: Activity,
    fields: [{ key: 'heartRate', label: 'Heart Rate', placeholder: 'e.g., 72', unit: 'bpm' }],
    defaultUnit: 'bpm',
  },
];

export function RecordVitalDrawer({ isOpen, onClose, patientId, onVitalRecorded }: RecordVitalDrawerProps) {
  const { t } = useTranslations('patientDetail');
  const { t: tCommon } = useTranslations('common');
  const [selectedType, setSelectedType] = useState<VitalType | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVitalConfig = VITAL_TYPES.find((v) => v.type === selectedType);

  const handleValueChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedType || !selectedVitalConfig) return;

    // Validate required fields
    const requiredFields = selectedVitalConfig.fields.filter((f) => !f.label.includes('Optional'));
    const missingFields = requiredFields.filter((f) => !values[f.key] || values[f.key].trim() === '');

    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.map((f) => f.label).join(', ')}`);
      return;
    }

    // Convert string values to numbers
    const numericValues: Record<string, number> = {};
    for (const [key, val] of Object.entries(values)) {
      if (val && val.trim() !== '') {
        const num = parseFloat(val);
        if (isNaN(num)) {
          setError(`Invalid number for ${key}`);
          return;
        }
        numericValues[key] = num;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      await vitalsApi.createReading({
        type: selectedType,
        values: numericValues,
        unit: selectedVitalConfig.defaultUnit,
        recordedAt: new Date().toISOString(),
        patientId, // Clinician recording for patient
      });

      onVitalRecorded();
      handleClose();
    } catch (err) {
      console.error('Failed to record vital:', err);
      setError(err instanceof Error ? err.message : 'Failed to record vital');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setValues({});
    setError(null);
    onClose();
  };

  const handleBack = () => {
    setSelectedType(null);
    setValues({});
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={handleClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {selectedType && (
              <button onClick={handleBack} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded mr-1">
                <X className="w-4 h-4 rotate-45" />
              </button>
            )}
            <Activity className="w-4 h-4 text-brand" />
            <h2 className="text-base font-semibold">
              {selectedType ? selectedVitalConfig?.label : t('recordVitals') || 'Record Vital'}
            </h2>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedType ? (
            /* Type Selection */
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('selectVitalType') || 'Select the type of vital to record'}
              </p>
              {VITAL_TYPES.map((vital) => {
                const Icon = vital.icon;
                return (
                  <button
                    key={vital.type}
                    onClick={() => setSelectedType(vital.type)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-brand hover:bg-brand/5 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-brand" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{vital.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Value Input Form */
            <div className="space-y-4">
              {selectedVitalConfig?.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {field.label}
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={values[field.key] || ''}
                      onChange={(e) => handleValueChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      {field.unit}
                    </span>
                  </div>
                </div>
              ))}

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Timestamp Info */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('recordingNow') || 'Recording at current time'}: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedType && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <Button variant="outline" onClick={handleBack} className="flex-1">
              {tCommon('back') || 'Back'}
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="flex-1 bg-brand hover:bg-brand/90">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('saveVital') || 'Save Vital'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
