'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronRight, X, Smartphone, Activity, Weight, Droplets, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Device {
  id: string;
  name: string;
  type?: string;
}

interface PatientDevicesCardProps {
  devices: Device[];
  onAddDevice?: () => void;
  className?: string;
}

const deviceIcons: Record<string, typeof Activity> = {
  bp: Activity,
  weight: Weight,
  glucose: Droplets,
  temperature: Thermometer,
};

export function PatientDevicesCard({
  devices,
  onAddDevice,
  className,
}: PatientDevicesCardProps) {
  const { t } = useTranslations('patientDetail');
  const [showDrawer, setShowDrawer] = useState(false);
  const displayCount = 3;
  const hasMore = devices.length > displayCount;

  return (
    <>
      <Card className={cn('w-full', className)}>
        <CardContent className="px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-green-600" />
              <span className="text-[11px] font-semibold">{t('devices')}</span>
              <span className="text-[9px] text-gray-400">({devices.length})</span>
            </div>
            {onAddDevice && (
              <Button variant="ghost" size="sm" onClick={onAddDevice} className="h-4 w-4 p-0">
                <Plus className="w-2.5 h-2.5" />
              </Button>
            )}
          </div>
          {devices.length === 0 ? (
            <p className="text-[9px] text-gray-400 text-center">{t('noDevices')}</p>
          ) : (
            <div className="flex flex-wrap gap-0.5 mt-1">
              {devices.slice(0, displayCount).map((d) => {
                const Icon = deviceIcons[d.type || ''] || Smartphone;
                return (
                  <span key={d.id} className="px-1 py-px text-[9px] font-medium rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 flex items-center gap-0.5">
                    <Icon className="w-2 h-2" />
                    {d.type || d.name.split(' ')[0]}
                  </span>
                );
              })}
              {hasMore && (
                <button
                  onClick={() => setShowDrawer(true)}
                  className="px-1 py-px text-[9px] font-medium rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center"
                >
                  +{devices.length - displayCount} <ChevronRight className="w-2 h-2" />
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
                <Smartphone className="w-4 h-4 text-green-600" />
                {t('devices')} ({devices.length})
              </h2>
              <button onClick={() => setShowDrawer(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {devices.map((d, i) => {
                  const Icon = deviceIcons[d.type || ''] || Smartphone;
                  return (
                    <div key={d.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-medium">{d.name}</p>
                        <p className="text-[10px] text-gray-500">{d.type}</p>
                      </div>
                      <span className="text-[10px] text-green-600 font-medium">Active</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {onAddDevice && (
              <div className="p-3 border-t">
                <Button onClick={onAddDevice} size="sm" className="w-full h-8 text-xs bg-green-600 hover:bg-green-700">
                  <Plus className="w-3 h-3 mr-1" /> {t('addDevice')}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
