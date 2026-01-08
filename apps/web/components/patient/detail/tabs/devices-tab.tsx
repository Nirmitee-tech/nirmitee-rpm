'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Scale, Droplet, Heart, Thermometer, Trash2, Eye, RefreshCw, Plus } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Badge } from '@nirmitee/ui';
import { Button } from '@/components/ui/button';
import { Device } from '@/lib/api/patients';

interface DevicesTabProps {
  patientId: string;
  devices: Device[];
  isLoading: boolean;
  onAddDevice: () => void;
  onRemoveDevice: (deviceId: string) => Promise<void>;
  onRefresh: () => void;
}

// Map device type to icon
const getDeviceIcon = (type: string) => {
  const typeLower = type.toLowerCase();

  if (typeLower.includes('blood_pressure') || typeLower === 'bp') {
    return Activity;
  }
  if (typeLower.includes('weight') || typeLower.includes('scale')) {
    return Scale;
  }
  if (typeLower.includes('glucose')) {
    return Droplet;
  }
  if (typeLower.includes('pulse') || typeLower.includes('oximeter') || typeLower.includes('oxygen')) {
    return Heart;
  }
  if (typeLower.includes('temperature') || typeLower.includes('thermometer')) {
    return Thermometer;
  }

  return Activity;
};

// Map device type to display name
const getDeviceTypeName = (type: string): string => {
  const typeLower = type.toLowerCase();

  if (typeLower.includes('blood_pressure') || typeLower === 'bp') {
    return 'Blood Pressure Monitor';
  }
  if (typeLower.includes('weight') || typeLower.includes('scale')) {
    return 'Weight Scale';
  }
  if (typeLower.includes('glucose')) {
    return 'Glucose Monitor';
  }
  if (typeLower.includes('pulse') || typeLower.includes('oximeter') || typeLower.includes('oxygen')) {
    return 'Pulse Oximeter';
  }
  if (typeLower.includes('temperature') || typeLower.includes('thermometer')) {
    return 'Thermometer';
  }

  return type;
};

// Get sync status indicator color
const getSyncStatusColor = (lastSyncDate: string | null): 'success' | 'warning' | 'danger' => {
  if (!lastSyncDate) return 'danger';

  const hoursSinceSync = (Date.now() - new Date(lastSyncDate).getTime()) / (1000 * 60 * 60);

  if (hoursSinceSync < 24) return 'success';
  if (hoursSinceSync < 48) return 'warning';
  return 'danger';
};

// Format relative time
const formatRelativeTime = (date: string | null, t: (key: string, params?: Record<string, string | number>) => string): string => {
  if (!date) return t('deviceInfo.neverSynced');

  const now = Date.now();
  const syncTime = new Date(date).getTime();
  const diffMinutes = Math.floor((now - syncTime) / (1000 * 60));

  if (diffMinutes < 1) return t('deviceInfo.justNow');
  if (diffMinutes < 60) return t('deviceInfo.minutesAgo', { minutes: diffMinutes });

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return t('deviceInfo.hoursAgo', { hours: diffHours });

  const diffDays = Math.floor(diffHours / 24);
  return t('deviceInfo.daysAgo', { days: diffDays });
};

export function DevicesTab({
  patientId,
  devices,
  isLoading,
  onAddDevice,
  onRemoveDevice,
  onRefresh,
}: DevicesTabProps) {
  const router = useRouter();
  const { t } = useTranslations('patientDetail');
  const [removingDeviceId, setRemovingDeviceId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const handleViewReadings = (deviceId: string, deviceType: string) => {
    // Navigate to vitals page with device filter
    const vitalType = deviceType.toLowerCase().includes('blood_pressure') ? 'blood_pressure'
      : deviceType.toLowerCase().includes('glucose') ? 'blood_glucose'
      : deviceType.toLowerCase().includes('weight') ? 'weight'
      : deviceType.toLowerCase().includes('pulse') || deviceType.toLowerCase().includes('oximeter') ? 'oxygen_saturation'
      : deviceType.toLowerCase().includes('temp') ? 'temperature'
      : 'blood_pressure';
    router.push(`/patients/${patientId}?tab=vitals&vitalType=${vitalType}&deviceId=${deviceId}`);
  };

  const handleRemoveDevice = async (deviceId: string) => {
    setRemovingDeviceId(deviceId);
    try {
      await onRemoveDevice(deviceId);
      setConfirmRemoveId(null);
    } catch (error) {
      console.error('Failed to remove device:', error);
    } finally {
      setRemovingDeviceId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-brand" />
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
          {t('deviceInfo.noDevicesAssigned')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center max-w-sm">
          {t('deviceInfo.addFirstDevice')}
        </p>
        <Button onClick={onAddDevice} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('addDevice')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Device button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('devices')} ({devices.length})
          </h3>
          <button
            onClick={onRefresh}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <Button onClick={onAddDevice} size="sm" className="h-8 gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          {t('addDevice')}
        </Button>
      </div>

      {/* Device Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map((device) => {
          const DeviceIcon = getDeviceIcon(device.type);
          const syncStatusColor = getSyncStatusColor(device.lastSyncDate);
          const isRemoving = removingDeviceId === device.id;
          const showConfirm = confirmRemoveId === device.id;

          return (
            <div
              key={device.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-900"
            >
              {/* Device Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-brand/10">
                  <DeviceIcon className="w-5 h-5 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {getDeviceTypeName(device.type)}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    SN: {device.serialNumber}
                  </p>
                </div>
                <Badge
                  variant={
                    device.status === 'ACTIVE'
                      ? 'success'
                      : device.status === 'MAINTENANCE'
                      ? 'warning'
                      : 'gray'
                  }
                  className="text-xs"
                >
                  {t(`deviceStatus.${device.status.toLowerCase()}`)}
                </Badge>
              </div>

              {/* Device Info */}
              <div className="space-y-2 mb-4">
                {device.manufacturer && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{t('manufacturer')}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {device.manufacturer}
                    </span>
                  </div>
                )}
                {device.model && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{t('modelNumber')}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {device.model}
                    </span>
                  </div>
                )}

                {/* Last Sync Info */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{t('deviceInfo.lastSync')}</span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          syncStatusColor === 'success'
                            ? 'bg-green-500'
                            : syncStatusColor === 'warning'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatRelativeTime(device.lastSyncDate, t)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {showConfirm ? (
                <div className="space-y-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded">
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                    {t('deviceInfo.confirmRemove')}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500">
                    {t('deviceInfo.confirmRemoveMessage')}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmRemoveId(null)}
                      className="flex-1 h-7 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleRemoveDevice(device.id)}
                      disabled={isRemoving}
                      className="flex-1 h-7 text-xs bg-red-600 hover:bg-red-700"
                    >
                      {isRemoving ? (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1.5"
                    onClick={() => handleViewReadings(device.id, device.type)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {t('deviceInfo.viewReadings')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 border-red-200 dark:border-red-900/30"
                    onClick={() => setConfirmRemoveId(device.id)}
                    disabled={isRemoving}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('deviceInfo.removeDevice')}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
