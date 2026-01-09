'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button } from '@nirmitee/ui';
import { type VitalType, type MealContext, vitalsApi, type VitalStatus } from '@/lib/api/vitals';
import { VitalTypeSelector } from './vital-type-selector';
import { BloodPressureForm } from './blood-pressure-form';
import { WeightForm } from './weight-form';
import { GlucoseForm } from './glucose-form';
import { OxygenForm } from './oxygen-form';
import { HeartRateForm } from './heart-rate-form';
import { SymptomLogger } from './symptom-logger';
import { ReadingConfirmation } from './reading-confirmation';
import { DeviceSyncIndicator } from './device-sync-indicator';
import { ArrowLeft, Loader2 } from 'lucide-react';

type FormStep = 'type-selection' | 'vital-input' | 'additional-info' | 'confirmation';

interface VitalData {
  type?: VitalType;
  values?: Record<string, number>;
  unit?: string;
  mealContext?: MealContext;
  symptoms: string[];
  timestamp: string;
}

export function VitalEntryForm() {
  const router = useRouter();
  const { t } = useTranslations('patient.vitals.entry');
  const { t: tButtons } = useTranslations('patient.vitals.entry.buttons');
  const { t: tCommon } = useTranslations('common');

  const [step, setStep] = useState<FormStep>('type-selection');
  const [vitalData, setVitalData] = useState<VitalData>({
    symptoms: [],
    timestamp: new Date().toISOString(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readingStatus, setReadingStatus] = useState<VitalStatus>('normal');
  const [error, setError] = useState('');

  const handleTypeSelect = (type: VitalType) => {
    setVitalData({ ...vitalData, type });
    setStep('vital-input');
  };

  const handleVitalSubmit = (values: Record<string, number>, unit: string, mealContext?: MealContext) => {
    setVitalData({
      ...vitalData,
      values,
      unit,
      mealContext,
    });
    setStep('additional-info');
  };

  const handleFinalSubmit = async () => {
    if (!vitalData.type || !vitalData.values || !vitalData.unit) {
      setError('Missing required vital data');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Always use current timestamp at submission time
      const reading = await vitalsApi.createReading({
        type: vitalData.type,
        values: vitalData.values,
        unit: vitalData.unit,
        recordedAt: new Date().toISOString(),
        symptoms: vitalData.symptoms.length > 0 ? vitalData.symptoms : undefined,
        mealContext: vitalData.mealContext,
      });

      setReadingStatus(reading.status);
      setStep('confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reading');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 'vital-input') {
      setStep('type-selection');
    } else if (step === 'additional-info') {
      setStep('vital-input');
    }
  };

  const handleAddAnother = () => {
    setVitalData({
      symptoms: [],
      timestamp: new Date().toISOString(),
    });
    setStep('type-selection');
    setError('');
  };

  const handleViewHistory = () => {
    router.push('/my-vitals');
  };

  const renderVitalForm = () => {
    switch (vitalData.type) {
      case 'blood_pressure':
        return (
          <BloodPressureForm
            onSubmit={(values) => handleVitalSubmit(values, 'mmHg')}
            disabled={isSubmitting}
          />
        );
      case 'weight':
        return (
          <WeightForm
            onSubmit={(values) => handleVitalSubmit({ weight: values.weight }, values.unit)}
            disabled={isSubmitting}
          />
        );
      case 'glucose':
        return (
          <GlucoseForm
            onSubmit={(values) =>
              handleVitalSubmit({ glucose: values.glucose }, 'mgdl', values.mealContext)
            }
            disabled={isSubmitting}
          />
        );
      case 'oxygen':
        return (
          <OxygenForm
            onSubmit={(values) => handleVitalSubmit({ oxygen: values.oxygen }, 'percentage')}
            disabled={isSubmitting}
          />
        );
      case 'heart_rate':
        return (
          <HeartRateForm
            onSubmit={(values) => handleVitalSubmit({ heartRate: values.heartRate }, 'bpm')}
            disabled={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Device sync indicator */}
      {step !== 'confirmation' && (
        <DeviceSyncIndicator
          isConnected={false}
          isSyncing={false}
          className="mb-6"
        />
      )}

      {/* Main content */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        {step === 'type-selection' && <VitalTypeSelector onSelect={handleTypeSelect} />}

        {step === 'vital-input' && (
          <>
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tCommon('back')}
            </Button>
            {renderVitalForm()}
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                {tButtons('cancel')}
              </Button>
              <Button
                type="submit"
                form="vital-form"
                disabled={isSubmitting}
                className="flex-1"
                onClick={() => {
                  // Form submission handled by individual form components
                  const form = document.querySelector('form');
                  if (form) {
                    const event = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(event);
                  }
                }}
              >
                {tCommon('next')}
              </Button>
            </div>
          </>
        )}

        {step === 'additional-info' && (
          <>
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tCommon('back')}
            </Button>

            <div className="space-y-6">
              {/* Timestamp Info - Always uses current time */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('recordingNow') || 'Recording at'}: {new Date().toLocaleString()}
                </p>
              </div>

              <SymptomLogger
                value={vitalData.symptoms}
                onChange={(symptoms) => setVitalData({ ...vitalData, symptoms })}
              />

              {error && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={handleBack} disabled={isSubmitting} className="flex-1">
                  {tButtons('cancel')}
                </Button>
                <Button onClick={handleFinalSubmit} disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {tButtons('saving')}
                    </>
                  ) : (
                    tButtons('save')
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'confirmation' && (
          <ReadingConfirmation
            status={readingStatus}
            onAddAnother={handleAddAnother}
            onViewHistory={handleViewHistory}
          />
        )}
      </div>
    </div>
  );
}
