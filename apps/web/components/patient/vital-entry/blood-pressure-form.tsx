'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Input } from '@nirmitee/ui';
import { vitalsApi } from '@/lib/api/vitals';
import { AlertCircle } from 'lucide-react';

interface BloodPressureFormProps {
  onSubmit: (values: { systolic: number; diastolic: number; pulse?: number }) => void;
  disabled?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

export function BloodPressureForm({ onSubmit, disabled = false }: BloodPressureFormProps) {
  const { t } = useTranslations('patient.vitals.entry.bloodPressure');
  const { t: tValidation } = useTranslations('patient.vitals.entry.validation');
  const { t: tSymptoms } = useTranslations('patient.vitals.entry.symptoms');

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const validateValues = (): boolean => {
    const newErrors: ValidationError[] = [];
    const newWarnings: string[] = [];

    // Validate systolic
    if (!systolic) {
      newErrors.push({ field: 'systolic', message: tValidation('systolicRequired') });
    } else {
      const systolicNum = parseInt(systolic, 10);
      if (isNaN(systolicNum)) {
        newErrors.push({ field: 'systolic', message: tValidation('invalidNumber') });
      } else {
        const validation = vitalsApi.validateValue('blood_pressure', 'systolic', systolicNum);
        if (!validation.isValid) {
          newErrors.push({ field: 'systolic', message: validation.message || '' });
        } else if (validation.status === 'warning') {
          newWarnings.push(validation.message || '');
        }
      }
    }

    // Validate diastolic
    if (!diastolic) {
      newErrors.push({ field: 'diastolic', message: tValidation('diastolicRequired') });
    } else {
      const diastolicNum = parseInt(diastolic, 10);
      if (isNaN(diastolicNum)) {
        newErrors.push({ field: 'diastolic', message: tValidation('invalidNumber') });
      } else {
        const validation = vitalsApi.validateValue('blood_pressure', 'diastolic', diastolicNum);
        if (!validation.isValid) {
          newErrors.push({ field: 'diastolic', message: validation.message || '' });
        } else if (validation.status === 'warning') {
          newWarnings.push(validation.message || '');
        }
      }
    }

    // Validate pulse (optional)
    if (pulse) {
      const pulseNum = parseInt(pulse, 10);
      if (isNaN(pulseNum)) {
        newErrors.push({ field: 'pulse', message: tValidation('invalidNumber') });
      } else {
        const validation = vitalsApi.validateValue('blood_pressure', 'pulse', pulseNum);
        if (!validation.isValid) {
          newErrors.push({ field: 'pulse', message: validation.message || '' });
        } else if (validation.status === 'warning') {
          newWarnings.push(validation.message || '');
        }
      }
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateValues()) {
      onSubmit({
        systolic: parseInt(systolic, 10),
        diastolic: parseInt(diastolic, 10),
        pulse: pulse ? parseInt(pulse, 10) : undefined,
      });
    }
  };

  const getFieldError = (field: string): string | undefined => {
    return errors.find((e) => e.field === field)?.message;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('title')}</h3>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                {warnings.map((warning, i) => (
                  <p key={i}>{warning}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Systolic */}
      <div>
        <label htmlFor="systolic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('systolic')}
        </label>
        <Input
          id="systolic"
          type="number"
          value={systolic}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSystolic(e.target.value)}
          placeholder={t('systolicPlaceholder')}
          disabled={disabled}
          error={!!getFieldError('systolic')}
          className="text-lg"
        />
        {getFieldError('systolic') && (
          <p className="mt-1 text-sm text-danger">{getFieldError('systolic')}</p>
        )}
      </div>

      {/* Diastolic */}
      <div>
        <label htmlFor="diastolic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('diastolic')}
        </label>
        <Input
          id="diastolic"
          type="number"
          value={diastolic}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiastolic(e.target.value)}
          placeholder={t('diastolicPlaceholder')}
          disabled={disabled}
          error={!!getFieldError('diastolic')}
          className="text-lg"
        />
        {getFieldError('diastolic') && (
          <p className="mt-1 text-sm text-danger">{getFieldError('diastolic')}</p>
        )}
      </div>

      {/* Pulse (optional) */}
      <div>
        <label htmlFor="pulse" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('pulse')}{' '}
          <span className="text-gray-500 dark:text-gray-400 font-normal">
            {tSymptoms('optional')}
          </span>
        </label>
        <Input
          id="pulse"
          type="number"
          value={pulse}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPulse(e.target.value)}
          placeholder={t('pulsePlaceholder')}
          disabled={disabled}
          error={!!getFieldError('pulse')}
          className="text-lg"
        />
        {getFieldError('pulse') && (
          <p className="mt-1 text-sm text-danger">{getFieldError('pulse')}</p>
        )}
      </div>
    </form>
  );
}
