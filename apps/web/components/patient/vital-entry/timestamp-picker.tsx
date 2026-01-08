'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Input } from '@nirmitee/ui';
import { Clock } from 'lucide-react';

interface TimestampPickerProps {
  value: string;
  onChange: (timestamp: string) => void;
  className?: string;
}

export function TimestampPicker({ value, onChange, className = '' }: TimestampPickerProps) {
  const { t } = useTranslations('patient.vitals.entry.timestamp');
  const [useCustomTime, setUseCustomTime] = useState(false);

  const handleNow = () => {
    setUseCustomTime(false);
    onChange(new Date().toISOString());
  };

  const handleCustomTime = (dateTimeLocal: string) => {
    const date = new Date(dateTimeLocal);
    onChange(date.toISOString());
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('label')}
      </label>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleNow}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
            !useCustomTime
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <Clock className="h-4 w-4" />
          {t('now')}
        </button>

        <button
          type="button"
          onClick={() => setUseCustomTime(true)}
          className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
            useCustomTime
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          {t('selectTime')}
        </button>

        {useCustomTime && (
          <Input
            type="datetime-local"
            max={new Date().toISOString().slice(0, 16)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomTime(e.target.value)}
            className="mt-2"
          />
        )}
      </div>
    </div>
  );
}
