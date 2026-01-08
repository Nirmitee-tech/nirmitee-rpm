'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Input } from '@nirmitee/ui';
import { vitalsApi } from '@/lib/api/vitals';

interface HeartRateFormProps {
  onSubmit: (values: { heartRate: number }) => void;
  disabled?: boolean;
}

export function HeartRateForm({ onSubmit, disabled = false }: HeartRateFormProps) {
  const { t } = useTranslations('patient.vitals.entry.heartRate');
  const { t: tValidation } = useTranslations('patient.vitals.entry.validation');

  const [heartRate, setHeartRate] = useState('');
  const [error, setError] = useState('');

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!heartRate) {
      setError(tValidation('required'));
      return;
    }

    const heartRateNum = parseFloat(heartRate);
    if (isNaN(heartRateNum)) {
      setError(tValidation('invalidNumber'));
      return;
    }

    const validation = vitalsApi.validateValue('heart_rate', 'bpm', heartRateNum);
    if (!validation.isValid) {
      setError(validation.message || tValidation('outOfRange', { min: '40', max: '200' }));
      return;
    }

    setError('');
    onSubmit({ heartRate: heartRateNum });
  };

  return (
    <form onSubmit={validateAndSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('title')}</h3>
      </div>

      <div>
        <label htmlFor="heartRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('value')}
        </label>
        <Input
          id="heartRate"
          type="number"
          value={heartRate}
          onChange={(e) => setHeartRate(e.target.value)}
          placeholder={t('valuePlaceholder')}
          disabled={disabled}
          error={!!error}
          className="text-lg"
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
