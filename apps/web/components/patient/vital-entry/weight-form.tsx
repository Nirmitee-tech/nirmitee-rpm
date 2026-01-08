'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Input } from '@nirmitee/ui';
import { vitalsApi } from '@/lib/api/vitals';

interface WeightFormProps {
  onSubmit: (values: { weight: number; unit: 'lbs' | 'kg' }) => void;
  disabled?: boolean;
}

export function WeightForm({ onSubmit, disabled = false }: WeightFormProps) {
  const { t } = useTranslations('patient.vitals.entry.weight');
  const { t: tValidation } = useTranslations('patient.vitals.entry.validation');

  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [error, setError] = useState('');

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!weight) {
      setError(tValidation('required'));
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum)) {
      setError(tValidation('invalidNumber'));
      return;
    }

    const validation = vitalsApi.validateValue('weight', unit, weightNum);
    if (!validation.isValid) {
      setError(validation.message || tValidation('outOfRange', { min: '50', max: unit === 'lbs' ? '500' : '250' }));
      return;
    }

    setError('');
    onSubmit({ weight: weightNum, unit });
  };

  return (
    <form onSubmit={validateAndSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('title')}</h3>
      </div>

      <div>
        <label htmlFor="weight" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('value')}
        </label>
        <Input
          id="weight"
          type="number"
          step="0.1"
          value={weight}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWeight(e.target.value)}
          placeholder={t('valuePlaceholder')}
          disabled={disabled}
          error={!!error}
          className="text-lg"
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('unit')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setUnit('lbs')}
            className={`px-4 py-3 rounded-lg border-2 transition-colors ${
              unit === 'lbs'
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {t('lbs')}
          </button>
          <button
            type="button"
            onClick={() => setUnit('kg')}
            className={`px-4 py-3 rounded-lg border-2 transition-colors ${
              unit === 'kg'
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {t('kg')}
          </button>
        </div>
      </div>
    </form>
  );
}
