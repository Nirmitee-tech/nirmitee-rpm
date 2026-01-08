'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Activity, Scale, Droplet, Heart, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { patientsApi } from '@/lib/api/patients';
import { deviceModelsApi, DeviceModel } from '@/lib/api/device-models';

interface Device {
  id: string;
  name: string;
  type: string;
  serialNumber?: string;
}

interface AddDeviceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onDeviceAdded: (device: Device) => void;
}

// Map device model category to backend DeviceType enum
const mapCategoryToDeviceType = (category: string | null | undefined): string => {
  if (!category) return 'OTHER';

  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('blood pressure')) return 'BLOOD_PRESSURE_MONITOR';
  if (categoryLower.includes('glucose')) return 'GLUCOSE_MONITOR';
  if (categoryLower.includes('weight') || categoryLower.includes('scale')) return 'WEIGHT_SCALE';
  if (categoryLower.includes('pulse') || categoryLower.includes('oximeter')) return 'PULSE_OXIMETER';
  if (categoryLower.includes('temperature') || categoryLower.includes('thermometer')) return 'THERMOMETER';

  return 'OTHER';
};

// Get icon component for device category
const getCategoryIcon = (category: string | null | undefined) => {
  if (!category) return Activity;

  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('blood pressure')) return Activity;
  if (categoryLower.includes('glucose')) return Droplet;
  if (categoryLower.includes('weight') || categoryLower.includes('scale')) return Scale;
  if (categoryLower.includes('pulse') || categoryLower.includes('oximeter')) return Heart;
  if (categoryLower.includes('temperature') || categoryLower.includes('thermometer')) return Thermometer;

  return Activity;
};

// Get display type for vitals
const getDisplayType = (category: string | null | undefined): string => {
  if (!category) return 'other';

  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('blood pressure')) return 'bp';
  if (categoryLower.includes('glucose')) return 'glucose';
  if (categoryLower.includes('weight')) return 'weight';
  if (categoryLower.includes('pulse') || categoryLower.includes('oximeter')) return 'oxygen';
  if (categoryLower.includes('temperature')) return 'temperature';

  return 'other';
};

export function AddDeviceDrawer({ isOpen, onClose, patientId, onDeviceAdded }: AddDeviceDrawerProps) {
  const { t } = useTranslations('patientDetail');
  const { t: tCommon } = useTranslations('common');
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [modelNumber, setModelNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch device models on mount
  useEffect(() => {
    const fetchDeviceModels = async () => {
      setIsLoadingModels(true);
      try {
        const models = await deviceModelsApi.list();
        setDeviceModels(models);
      } catch (error) {
        console.error('Failed to fetch device models:', error);
      } finally {
        setIsLoadingModels(false);
      }
    };

    if (isOpen) {
      fetchDeviceModels();
    }
  }, [isOpen]);

  // Auto-fill manufacturer and model number when device model is selected
  useEffect(() => {
    if (selectedModelId) {
      const selectedModel = deviceModels.find(m => m.id === selectedModelId);
      if (selectedModel) {
        setManufacturer(selectedModel.manufacturer || '');
        setModelNumber(selectedModel.modelNumber || '');
      }
    }
  }, [selectedModelId, deviceModels]);

  const handleAdd = async () => {
    if (!selectedModelId || !serialNumber.trim()) return;

    const selectedModel = deviceModels.find(m => m.id === selectedModelId);
    if (!selectedModel) return;

    setIsLoading(true);
    try {
      const deviceType = mapCategoryToDeviceType(selectedModel.category);

      const assignedDevice = await patientsApi.assignDevice(patientId, {
        type: deviceType,
        serialNumber: serialNumber.trim(),
        manufacturer: manufacturer.trim() || (selectedModel.manufacturer ?? undefined),
        model: modelNumber.trim() || (selectedModel.modelNumber ?? undefined),
      });

      onDeviceAdded({
        id: assignedDevice.id,
        name: selectedModel.name,
        type: getDisplayType(selectedModel.category),
        serialNumber: assignedDevice.serialNumber,
      });

      // Reset state
      setSelectedModelId(null);
      setSerialNumber('');
      setManufacturer('');
      setModelNumber('');
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Failed to add device:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold">{t('addDevice')}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoadingModels ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-2">{t('selectDevice')}</p>
              <div className="space-y-2 mb-4">
                {deviceModels.map((model) => {
                  const IconComponent = getCategoryIcon(model.category);
                  return (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModelId(model.id)}
                      className={`w-full text-left p-3 rounded border flex items-center gap-3 transition-colors ${
                        selectedModelId === model.id
                          ? 'border-brand bg-brand/5'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{model.name}</p>
                        <p className="text-xs text-gray-500">
                          {model.category}
                          {model.manufacturer && ` • ${model.manufacturer}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedModelId && (
                <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  {/* Serial Number - Required */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {t('serialNumber')} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder={t('enterSerialNumber')}
                      className="h-9"
                      required
                    />
                  </div>

                  {/* Manufacturer - Editable */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {t('manufacturer')}
                    </label>
                    <Input
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      placeholder={t('enterManufacturer')}
                      className="h-9"
                    />
                  </div>

                  {/* Model Number - Editable */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {t('modelNumber')}
                    </label>
                    <Input
                      value={modelNumber}
                      onChange={(e) => setModelNumber(e.target.value)}
                      placeholder={t('enterModelNumber')}
                      className="h-9"
                    />
                  </div>

                  {/* Notes - Optional */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {t('notes')}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('enterNotes')}
                      className="w-full h-20 px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9">
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={isLoading || !selectedModelId || !serialNumber.trim()}
            className="flex-1 h-9"
          >
            {isLoading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
            <Plus className="w-3 h-3 mr-1" />
            {t('assignDevice')}
          </Button>
        </div>
      </div>
    </>
  );
}
