'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Input } from '@nirmitee/ui';
import { vitalsApi } from '@/lib/api/vitals';

interface OxygenFormProps {
  onSubmit: (values: { oxygen: number }) => void;
  disabled?: boolean;
}

export function OxygenForm({ onSubmit, disabled = false }: OxygenFormProps) {
  const { t } = useTranslations('patient.vitals.entry.oxygen');
  const { t: tValidation } = useTranslations('patient.vitals.entry.validation');

  const [oxygen, setOxygen] = useState('');
  const [error, setError] = useState('');

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!oxygen) {
      setError(tValidation('required'));
      return;
    }

    const oxygenNum = parseFloat(oxygen);
    if (isNaN(oxygenNum)) {
      setError(tValidation('invalidNumber'));
      return;
    }

    const validation = vitalsApi.validateValue('oxygen', 'percentage', oxygenNum);
    if (!validation.isValid) {
      setError(validation.message || tValidation('outOfRange', { min: '70', max: '100' }));
      return;
    }

    setError('');
    onSubmit({ oxygen: oxygenNum });
  };

  return (
    <form onSubmit={validateAndSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('title')}</h3>
      </div>

      <div>
        <label htmlFor="oxygen" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('value')}
        </label>
        <Input
          id="oxygen"
          type="number"
          value={oxygen}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOxygen(e.target.value)}
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
