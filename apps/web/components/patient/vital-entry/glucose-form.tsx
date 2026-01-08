'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Input } from '@nirmitee/ui';
import { vitalsApi, type MealContext } from '@/lib/api/vitals';

interface GlucoseFormProps {
  onSubmit: (values: { glucose: number; mealContext: MealContext }) => void;
  disabled?: boolean;
}

const MEAL_CONTEXTS: MealContext[] = ['fasting', 'before_meal', 'after_meal', 'bedtime', 'random'];

export function GlucoseForm({ onSubmit, disabled = false }: GlucoseFormProps) {
  const { t } = useTranslations('patient.vitals.entry.glucose');
  const { t: tValidation } = useTranslations('patient.vitals.entry.validation');

  const [glucose, setGlucose] = useState('');
  const [mealContext, setMealContext] = useState<MealContext>('random');
  const [error, setError] = useState('');

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!glucose) {
      setError(tValidation('required'));
      return;
    }

    const glucoseNum = parseFloat(glucose);
    if (isNaN(glucoseNum)) {
      setError(tValidation('invalidNumber'));
      return;
    }

    const validation = vitalsApi.validateValue('glucose', 'mgdl', glucoseNum);
    if (!validation.isValid) {
      setError(validation.message || tValidation('outOfRange', { min: '20', max: '600' }));
      return;
    }

    setError('');
    onSubmit({ glucose: glucoseNum, mealContext });
  };

  return (
    <form onSubmit={validateAndSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('title')}</h3>
      </div>

      <div>
        <label htmlFor="glucose" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('value')}
        </label>
        <Input
          id="glucose"
          type="number"
          value={glucose}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlucose(e.target.value)}
          placeholder={t('valuePlaceholder')}
          disabled={disabled}
          error={!!error}
          className="text-lg"
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('mealContext')}
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MEAL_CONTEXTS.map((context) => (
            <button
              key={context}
              type="button"
              onClick={() => setMealContext(context)}
              className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
                mealContext === context
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t(context)}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
