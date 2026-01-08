'use client';

import { type VitalType } from '@/lib/api/vitals';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Activity, Droplet, Heart, Scale, TrendingUp } from 'lucide-react';

interface VitalTypeSelectorProps {
  onSelect: (type: VitalType) => void;
  className?: string;
}

const VITAL_TYPE_CONFIG: Record<
  VitalType,
  { icon: typeof Heart; color: string; bgColor: string }
> = {
  blood_pressure: {
    icon: Heart,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30',
  },
  weight: {
    icon: Scale,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30',
  },
  glucose: {
    icon: Droplet,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor:
      'bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/30',
  },
  oxygen: {
    icon: TrendingUp,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/20 hover:bg-cyan-100 dark:hover:bg-cyan-950/30',
  },
  heart_rate: {
    icon: Activity,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20 hover:bg-pink-100 dark:hover:bg-pink-950/30',
  },
};

export function VitalTypeSelector({ onSelect, className = '' }: VitalTypeSelectorProps) {
  const { t } = useTranslations('patient.vitals.entry');

  const vitalTypes: VitalType[] = ['blood_pressure', 'weight', 'glucose', 'oxygen', 'heart_rate'];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('selectType')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vitalTypes.map((type) => {
          const config = VITAL_TYPE_CONFIG[type];
          const Icon = config.icon;

          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={`group relative flex flex-col items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-6 transition-all ${config.bgColor} focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2`}
            >
              <div
                className={`rounded-full p-4 ${config.color} bg-white dark:bg-gray-800 shadow-sm group-hover:scale-110 transition-transform`}
              >
                <Icon className="h-8 w-8" />
              </div>
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                {t(`vitalTypes.${type}`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
