'use client';

import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryData {
  totalReadings: number;
  lastReading?: {
    systolic: number;
    diastolic: number;
  };
  average?: {
    systolic: number;
    diastolic: number;
  };
  statusCounts: {
    low: number;
    high: number;
    normal: number;
    severe: number;
  };
  lastUpdated?: string;
}

interface QuickSummaryProps {
  summaryData: SummaryData;
  onThresholdSettings?: () => void;
  className?: string;
}

export function QuickSummary({
  summaryData,
  onThresholdSettings,
  className,
}: QuickSummaryProps) {
  const { t } = useTranslations('patientDetail');

  const statusConfig = [
    {
      key: 'low',
      label: t('statusLow'),
      color: 'bg-purple-500 dark:bg-purple-600',
      count: summaryData.statusCounts.low,
    },
    {
      key: 'high',
      label: t('statusHigh'),
      color: 'bg-orange-500 dark:bg-orange-600',
      count: summaryData.statusCounts.high,
    },
    {
      key: 'normal',
      label: t('statusNormal'),
      color: 'bg-green-500 dark:bg-green-600',
      count: summaryData.statusCounts.normal,
    },
    {
      key: 'severe',
      label: t('statusSevere'),
      color: 'bg-red-500 dark:bg-red-600',
      count: summaryData.statusCounts.severe,
    },
  ];

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">
          {t('quickSummary')}
        </CardTitle>
        {onThresholdSettings && (
          <Button
            variant="outline"
            size="sm"
            onClick={onThresholdSettings}
            className="h-7 text-xs"
          >
            <Settings className="w-3 h-3 mr-1" />
            {t('thresholdSettings')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {/* Single Row Layout */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Stats - Inline */}
          <div className="flex items-center gap-2">
            {/* Total Readings */}
            <div className="flex items-center gap-2">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('totalReadingsLabel')}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {summaryData.totalReadings}
                </p>
              </div>
            </div>

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Last Reading */}
            <div className="flex items-center gap-2">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('lastReadingLabel')}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {summaryData.lastReading
                    ? `${summaryData.lastReading.systolic}/${summaryData.lastReading.diastolic}`
                    : '--/--'}
                </p>
              </div>
            </div>

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Average */}
            <div className="flex items-center gap-2">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('averageLabel')}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {summaryData.average
                    ? `${summaryData.average.systolic}/${summaryData.average.diastolic}`
                    : '--/--'}
                </p>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-w-[20px]" />

          {/* Status Counts - Right Side */}
          <div className="flex items-center gap-2">
            {statusConfig.map((status) => (
              <div
                key={status.key}
                className="flex items-center gap-1.5"
              >
                <div className={cn('w-2.5 h-2.5 rounded-full', status.color)} />
                <div className="flex items-baseline gap-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {status.label}:
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {status.count}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Last Updated */}
        {summaryData.lastUpdated && (
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('lastUpdated')}: {new Date(summaryData.lastUpdated).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
