'use client';

import { useTranslations } from '@/lib/i18n/i18n-context';
import { Checkbox } from '@nirmitee/ui';

interface SymptomLoggerProps {
  value: string[];
  onChange: (symptoms: string[]) => void;
  className?: string;
}

const SYMPTOMS = [
  'headache',
  'dizziness',
  'fatigue',
  'chestPain',
  'shortBreath',
  'nausea',
  'sweating',
  'palpitations',
];

export function SymptomLogger({ value, onChange, className = '' }: SymptomLoggerProps) {
  const { t } = useTranslations('patient.vitals.entry.symptoms');

  const toggleSymptom = (symptom: string) => {
    if (value.includes(symptom)) {
      onChange(value.filter((s) => s !== symptom));
    } else {
      onChange([...value, symptom]);
    }
  };

  return (
    <div className={className}>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {t('title')} <span className="text-gray-500 font-normal">{t('optional')}</span>
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SYMPTOMS.map((symptom) => (
          <label
            key={symptom}
            className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
          >
            <Checkbox
              checked={value.includes(symptom)}
              onChange={() => toggleSymptom(symptom)}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{t(symptom)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
