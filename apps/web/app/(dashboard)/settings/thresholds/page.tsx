'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Activity,
  AlertTriangle,
  Settings2,
  RotateCcw,
  Save,
  Info,
} from 'lucide-react';
import { Button } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import {
  thresholdsApi,
  VitalThreshold,
  SystemDefault,
  VitalType,
  SetThresholdInput,
} from '@/lib/api/thresholds';

const VITAL_TYPES: VitalType[] = [
  'BLOOD_PRESSURE',
  'BLOOD_GLUCOSE',
  'HEART_RATE',
  'PULSE_OXIMETRY',
  'WEIGHT',
  'TEMPERATURE',
];

const VITAL_TYPE_LABELS: Record<VitalType, string> = {
  BLOOD_PRESSURE: 'Blood Pressure',
  WEIGHT: 'Weight',
  BLOOD_GLUCOSE: 'Blood Glucose',
  PULSE_OXIMETRY: 'Pulse Oximetry (SpO2)',
  HEART_RATE: 'Heart Rate',
  TEMPERATURE: 'Temperature',
};

const VITAL_TYPE_UNITS: Record<VitalType, string> = {
  BLOOD_PRESSURE: 'mmHg',
  WEIGHT: 'lbs',
  BLOOD_GLUCOSE: 'mg/dL',
  PULSE_OXIMETRY: '%',
  HEART_RATE: 'bpm',
  TEMPERATURE: '°F',
};

interface ThresholdFormData {
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  warningMinSecondary?: number;
  warningMaxSecondary?: number;
  criticalMinSecondary?: number;
  criticalMaxSecondary?: number;
}

export default function ThresholdsSettingsPage() {
  const { t } = useTranslations('settings.thresholds');
  const { t: tCommon } = useTranslations('common');

  const [thresholds, setThresholds] = useState<VitalThreshold[]>([]);
  const [defaults, setDefaults] = useState<SystemDefault[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<VitalType | null>(null);
  const [resetting, setResetting] = useState<VitalType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<VitalType | null>(null);
  const [formData, setFormData] = useState<ThresholdFormData>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [thresholdsData, defaultsData] = await Promise.all([
        thresholdsApi.getOrganizationThresholds(),
        thresholdsApi.getSystemDefaults(),
      ]);
      setThresholds(thresholdsData);
      setDefaults(defaultsData);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load thresholds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getThresholdForType = (vitalType: VitalType): VitalThreshold | SystemDefault['config'] => {
    const orgThreshold = thresholds.find((t) => t.vitalType === vitalType);
    if (orgThreshold) return orgThreshold;

    const systemDefault = defaults.find((d) => d.vitalType === vitalType);
    return systemDefault?.config || { unit: VITAL_TYPE_UNITS[vitalType] };
  };

  const isUsingDefault = (vitalType: VitalType): boolean => {
    return !thresholds.find((t) => t.vitalType === vitalType);
  };

  const handleEdit = (vitalType: VitalType) => {
    const threshold = getThresholdForType(vitalType);
    setFormData({
      warningMin: threshold.warningMin ?? undefined,
      warningMax: threshold.warningMax ?? undefined,
      criticalMin: threshold.criticalMin ?? undefined,
      criticalMax: threshold.criticalMax ?? undefined,
      warningMinSecondary: threshold.warningMinSecondary ?? undefined,
      warningMaxSecondary: threshold.warningMaxSecondary ?? undefined,
      criticalMinSecondary: threshold.criticalMinSecondary ?? undefined,
      criticalMaxSecondary: threshold.criticalMaxSecondary ?? undefined,
    });
    setEditingType(vitalType);
  };

  const handleSave = async () => {
    if (!editingType) return;

    try {
      setSaving(editingType);
      setError(null);

      const input: SetThresholdInput = {
        ...formData,
        unit: VITAL_TYPE_UNITS[editingType],
      };

      await thresholdsApi.setOrganizationThreshold(editingType, input);
      setSuccess(t('saved'));
      setTimeout(() => setSuccess(null), 2000);
      setEditingType(null);
      loadData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to save threshold');
    } finally {
      setSaving(null);
    }
  };

  const handleReset = async (vitalType: VitalType) => {
    try {
      setResetting(vitalType);
      setError(null);

      await thresholdsApi.resetOrganizationThreshold(vitalType);
      setSuccess(t('reset'));
      setTimeout(() => setSuccess(null), 2000);
      loadData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to reset threshold');
    } finally {
      setResetting(null);
    }
  };

  const renderThresholdValue = (
    label: string,
    min?: number,
    max?: number,
    colorClass?: string
  ) => {
    if (min === undefined && max === undefined) return null;

    return (
      <div className="flex items-center gap-2 text-sm">
        <span className={`w-20 font-medium ${colorClass}`}>{label}:</span>
        <span className="text-gray-600 dark:text-gray-400">
          {min !== undefined && `Min: ${min}`}
          {min !== undefined && max !== undefined && ' | '}
          {max !== undefined && `Max: ${max}`}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#171717] dark:text-white mb-1 flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#745EE1]" />
          {t('title')}
        </h2>
        <p className="text-sm text-[#737373]">{t('subtitle')}</p>
      </div>

      {/* Messages */}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Info Banner */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">{t('infoTitle')}</p>
            <p>{t('infoDescription')}</p>
          </div>
        </div>
      </div>

      {/* Threshold Cards */}
      <div className="grid gap-4">
        {VITAL_TYPES.map((vitalType) => {
          const threshold = getThresholdForType(vitalType);
          const usingDefault = isUsingDefault(vitalType);
          const isEditing = editingType === vitalType;
          const isBP = vitalType === 'BLOOD_PRESSURE';

          return (
            <div
              key={vitalType}
              className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-[#171717] dark:text-white flex items-center gap-2">
                    {VITAL_TYPE_LABELS[vitalType]}
                    <span className="text-sm font-normal text-[#737373]">
                      ({VITAL_TYPE_UNITS[vitalType]})
                    </span>
                  </h3>
                  {usingDefault && (
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {t('usingDefault')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!usingDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReset(vitalType)}
                      disabled={resetting === vitalType}
                    >
                      {resetting === vitalType ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      <span className="ml-1">{t('resetToDefault')}</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => (isEditing ? setEditingType(null) : handleEdit(vitalType))}
                  >
                    <Settings2 className="h-4 w-4 mr-1" />
                    {isEditing ? tCommon('cancel') : t('customize')}
                  </Button>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  {/* Warning Thresholds */}
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <h4 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-3">
                      {t('warningThresholds')}
                      {isBP && ' (Systolic)'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {t('minimum')}
                        </label>
                        <input
                          type="number"
                          value={formData.warningMin ?? ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              warningMin: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#D7D7D7] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#745EE1]"
                          placeholder="-"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {t('maximum')}
                        </label>
                        <input
                          type="number"
                          value={formData.warningMax ?? ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              warningMax: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#D7D7D7] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#745EE1]"
                          placeholder="-"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Critical Thresholds */}
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-3">
                      {t('criticalThresholds')}
                      {isBP && ' (Systolic)'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {t('minimum')}
                        </label>
                        <input
                          type="number"
                          value={formData.criticalMin ?? ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              criticalMin: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#D7D7D7] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#745EE1]"
                          placeholder="-"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {t('maximum')}
                        </label>
                        <input
                          type="number"
                          value={formData.criticalMax ?? ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              criticalMax: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[#D7D7D7] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#745EE1]"
                          placeholder="-"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Secondary thresholds for BP (Diastolic) */}
                  {isBP && (
                    <>
                      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <h4 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-3">
                          {t('warningThresholds')} (Diastolic)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                              {t('minimum')}
                            </label>
                            <input
                              type="number"
                              value={formData.warningMinSecondary ?? ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  warningMinSecondary: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                })
                              }
                              className="w-full px-3 py-2 text-sm rounded-lg border border-[#D7D7D7] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#745EE1]"
                              placeholder="-"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                              {t('maximum')}
                            </label>
                            <input
                              type="number"
                              value={formData.warningMaxSecondary ?? ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  warningMaxSecondary: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                })
                              }
                              className="w-full px-3 py-2 text-sm rounded-lg border border-[#D7D7D7] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#745EE1]"
                              placeholder="-"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-3">
                          {t('criticalThresholds')} (Diastolic)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                              {t('minimum')}
                            </label>
                            <input
                              type="number"
                              value={formData.criticalMinSecondary ?? ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  criticalMinSecondary: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                })
                              }
                              className="w-full px-3 py-2 text-sm rounded-lg border border-[#D7D7D7] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#745EE1]"
                              placeholder="-"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                              {t('maximum')}
                            </label>
                            <input
                              type="number"
                              value={formData.criticalMaxSecondary ?? ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  criticalMaxSecondary: e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                })
                              }
                              className="w-full px-3 py-2 text-sm rounded-lg border border-[#D7D7D7] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#745EE1]"
                              placeholder="-"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving === vitalType}>
                      {saving === vitalType ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {tCommon('saving')}
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {tCommon('save')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {renderThresholdValue(
                    t('warning'),
                    threshold.warningMin,
                    threshold.warningMax,
                    'text-amber-600'
                  )}
                  {renderThresholdValue(
                    t('critical'),
                    threshold.criticalMin,
                    threshold.criticalMax,
                    'text-red-600'
                  )}
                  {isBP && (
                    <>
                      <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 mb-2">Diastolic:</p>
                        {renderThresholdValue(
                          t('warning'),
                          threshold.warningMinSecondary,
                          threshold.warningMaxSecondary,
                          'text-amber-600'
                        )}
                        {renderThresholdValue(
                          t('critical'),
                          threshold.criticalMinSecondary,
                          threshold.criticalMaxSecondary,
                          'text-red-600'
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
