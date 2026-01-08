'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronRight, X, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Condition {
  id: string;
  name: string;
  icdCode: string;
}

interface PatientConditionsCardProps {
  conditions: Condition[];
  onAddCondition?: () => void;
  className?: string;
}

export function PatientConditionsCard({
  conditions,
  onAddCondition,
  className,
}: PatientConditionsCardProps) {
  const { t } = useTranslations('patientDetail');
  const [showDrawer, setShowDrawer] = useState(false);
  const displayCount = 2;
  const hasMore = conditions.length > displayCount;

  return (
    <>
      <Card className={cn('w-full', className)}>
        <CardContent className="px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Stethoscope className="w-3 h-3 text-[#745EE1]" />
              <span className="text-[11px] font-semibold">{t('conditions')}</span>
              <span className="text-[9px] text-gray-400">({conditions.length})</span>
            </div>
            {onAddCondition && (
              <Button variant="ghost" size="sm" onClick={onAddCondition} className="h-4 w-4 p-0">
                <Plus className="w-2.5 h-2.5" />
              </Button>
            )}
          </div>
          {conditions.length === 0 ? (
            <p className="text-[9px] text-gray-400 text-center">{t('noConditions')}</p>
          ) : (
            <div className="flex flex-wrap gap-0.5 mt-1">
              {conditions.slice(0, displayCount).map((c) => (
                <span key={c.id} className="px-1 py-px text-[9px] font-medium rounded bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                  {c.name}
                </span>
              ))}
              {hasMore && (
                <button
                  onClick={() => setShowDrawer(true)}
                  className="px-1 py-px text-[9px] font-medium rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center"
                >
                  +{conditions.length - displayCount} <ChevronRight className="w-2 h-2" />
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer */}
      {showDrawer && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowDrawer(false)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-[#745EE1]" />
                {t('conditions')} ({conditions.length})
              </h2>
              <button onClick={() => setShowDrawer(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {conditions.map((c, i) => (
                  <div key={c.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-medium flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-xs font-medium">{c.name}</p>
                      {c.icdCode && <p className="text-[10px] text-gray-500">{c.icdCode}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {onAddCondition && (
              <div className="p-3 border-t">
                <Button onClick={onAddCondition} size="sm" className="w-full h-8 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> {t('addCondition')}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
