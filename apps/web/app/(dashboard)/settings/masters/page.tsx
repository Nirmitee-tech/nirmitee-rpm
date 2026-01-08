'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, Activity, Building, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Button, Input } from '@nirmitee/ui';
import { cn } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import {
  conditionsApi,
  insuranceApi,
  deviceModelsApi,
  MedicalCondition,
  InsuranceProvider,
  DeviceModel,
  CreateConditionInput,
  UpdateConditionInput,
  CreateInsuranceInput,
  UpdateInsuranceInput,
  CreateDeviceModelInput,
  UpdateDeviceModelInput,
} from '@/lib/api/master-data';
import { Smartphone } from 'lucide-react';

type TabType = 'conditions' | 'insurance' | 'devices';

// Modal for editing/creating conditions
function ConditionModal({
  condition,
  onClose,
  onSave,
  isLoading,
}: {
  condition?: MedicalCondition;
  onClose: () => void;
  onSave: (data: CreateConditionInput | UpdateConditionInput) => Promise<void>;
  isLoading: boolean;
}) {
  const { t } = useTranslations('settings.masters');
  const [formData, setFormData] = useState({
    code: condition?.code || '',
    name: condition?.name || '',
    description: condition?.description || '',
    category: condition?.category || '',
    icdCode: condition?.icdCode || '',
    sortOrder: condition?.sortOrder || 0,
    isActive: condition?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(condition ? { ...formData } : { code: formData.code, name: formData.name, description: formData.description || undefined, category: formData.category || undefined, icdCode: formData.icdCode || undefined, sortOrder: formData.sortOrder });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">
            {condition ? t('editCondition') : t('addCondition')}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('code')}</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="HTN"
                required
                disabled={!!condition}
                className="h-9"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('icdCode')}</label>
              <Input
                value={formData.icdCode}
                onChange={(e) => setFormData({ ...formData, icdCode: e.target.value })}
                placeholder="I10"
                className="h-9"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Hypertension"
              required
              className="h-9"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Cardiovascular"
              className="h-9"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('description')}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('descriptionPlaceholder')}
              className="w-full px-3 py-2 border rounded-md text-sm resize-none h-16"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('sortOrder')}</label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                min={0}
                className="h-9"
              />
            </div>
            {condition && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{t('active')}</span>
                </label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} size="sm">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal for editing/creating insurance providers
function InsuranceModal({
  provider,
  onClose,
  onSave,
  isLoading,
}: {
  provider?: InsuranceProvider;
  onClose: () => void;
  onSave: (data: CreateInsuranceInput | UpdateInsuranceInput) => Promise<void>;
  isLoading: boolean;
}) {
  const { t } = useTranslations('settings.masters');
  const [formData, setFormData] = useState({
    code: provider?.code || '',
    name: provider?.name || '',
    payerId: provider?.payerId || '',
    phone: provider?.phone || '',
    website: provider?.website || '',
    sortOrder: provider?.sortOrder || 0,
    isActive: provider?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(provider ? { ...formData } : { code: formData.code, name: formData.name, payerId: formData.payerId || undefined, phone: formData.phone || undefined, website: formData.website || undefined, sortOrder: formData.sortOrder });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">
            {provider ? t('editInsurance') : t('addInsurance')}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('code')}</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="BCBS"
                required
                disabled={!!provider}
                className="h-9"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('payerId')}</label>
              <Input
                value={formData.payerId}
                onChange={(e) => setFormData({ ...formData, payerId: e.target.value })}
                placeholder="12345"
                className="h-9"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Blue Cross Blue Shield"
              required
              className="h-9"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 800-123-4567"
              className="h-9"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('website')}</label>
            <Input
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://www.example.com"
              type="url"
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('sortOrder')}</label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                min={0}
                className="h-9"
              />
            </div>
            {provider && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{t('active')}</span>
                </label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} size="sm">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal for editing/creating device models
function DeviceModal({
  device,
  onClose,
  onSave,
  isLoading,
}: {
  device?: DeviceModel;
  onClose: () => void;
  onSave: (data: CreateDeviceModelInput | UpdateDeviceModelInput) => Promise<void>;
  isLoading: boolean;
}) {
  const { t } = useTranslations('settings.masters');
  const [formData, setFormData] = useState({
    code: device?.code || '',
    name: device?.name || '',
    manufacturer: device?.manufacturer || '',
    modelNumber: device?.modelNumber || '',
    category: device?.category || '',
    description: device?.description || '',
    sortOrder: device?.sortOrder || 0,
    isActive: device?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(device ? { ...formData } : { code: formData.code, name: formData.name, manufacturer: formData.manufacturer || undefined, modelNumber: formData.modelNumber || undefined, category: formData.category || undefined, description: formData.description || undefined, sortOrder: formData.sortOrder });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">
            {device ? t('editDevice') : t('addDevice')}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('code')}</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                placeholder="OMRON_BP786N"
                required
                disabled={!!device}
                className="h-9"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.category')}</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm h-9"
              >
                <option value="">Select category...</option>
                <option value="Blood Pressure">Blood Pressure</option>
                <option value="Weight">Weight</option>
                <option value="Glucose">Blood Glucose</option>
                <option value="Pulse Oximeter">Pulse Oximeter</option>
                <option value="Thermometer">Thermometer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Omron Evolv BP Monitor"
              required
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.manufacturer')}</label>
              <Input
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="Omron"
                className="h-9"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('fields.modelNumber')}</label>
              <Input
                value={formData.modelNumber}
                onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                placeholder="BP786N"
                className="h-9"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('description')}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('descriptionPlaceholder')}
              className="w-full px-3 py-2 border rounded-md text-sm resize-none h-16"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('sortOrder')}</label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                min={0}
                className="h-9"
              />
            </div>
            {device && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{t('active')}</span>
                </label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} size="sm">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MastersPage() {
  const { t } = useTranslations('settings.masters');
  const [activeTab, setActiveTab] = useState<TabType>('conditions');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Conditions state
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [conditionsLoading, setConditionsLoading] = useState(true);
  const [editingCondition, setEditingCondition] = useState<MedicalCondition | null>(null);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [conditionSaving, setConditionSaving] = useState(false);

  // Insurance state
  const [insuranceProviders, setInsuranceProviders] = useState<InsuranceProvider[]>([]);
  const [insuranceLoading, setInsuranceLoading] = useState(true);
  const [editingInsurance, setEditingInsurance] = useState<InsuranceProvider | null>(null);
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [insuranceSaving, setInsuranceSaving] = useState(false);

  // Device models state
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [editingDevice, setEditingDevice] = useState<DeviceModel | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [deviceSaving, setDeviceSaving] = useState(false);

  // Load conditions
  const loadConditions = useCallback(async () => {
    setConditionsLoading(true);
    try {
      const data = await conditionsApi.list(showInactive);
      setConditions(data);
    } catch (error) {
      console.error('Failed to load conditions:', error);
    } finally {
      setConditionsLoading(false);
    }
  }, [showInactive]);

  // Load insurance providers
  const loadInsurance = useCallback(async () => {
    setInsuranceLoading(true);
    try {
      const data = await insuranceApi.list(showInactive);
      setInsuranceProviders(data);
    } catch (error) {
      console.error('Failed to load insurance providers:', error);
    } finally {
      setInsuranceLoading(false);
    }
  }, [showInactive]);

  // Load device models
  const loadDeviceModels = useCallback(async () => {
    setDevicesLoading(true);
    try {
      const data = await deviceModelsApi.list(showInactive);
      setDeviceModels(data);
    } catch (error) {
      console.error('Failed to load device models:', error);
    } finally {
      setDevicesLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    loadConditions();
    loadInsurance();
    loadDeviceModels();
  }, [loadConditions, loadInsurance, loadDeviceModels]);

  // Filter data based on search
  const filteredConditions = conditions.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInsurance = insuranceProviders.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDevices = deviceModels.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Condition handlers
  const handleSaveCondition = async (data: CreateConditionInput | UpdateConditionInput) => {
    setConditionSaving(true);
    try {
      if (editingCondition) {
        await conditionsApi.update(editingCondition.id, data as UpdateConditionInput);
      } else {
        await conditionsApi.create(data as CreateConditionInput);
      }
      await loadConditions();
    } catch (error) {
      console.error('Failed to save condition:', error);
    } finally {
      setConditionSaving(false);
    }
  };

  const handleDeleteCondition = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await conditionsApi.delete(id);
      await loadConditions();
    } catch (error) {
      console.error('Failed to delete condition:', error);
    }
  };

  const handleSeedConditions = async () => {
    try {
      await conditionsApi.seed();
      await loadConditions();
    } catch (error) {
      console.error('Failed to seed conditions:', error);
    }
  };

  // Insurance handlers
  const handleSaveInsurance = async (data: CreateInsuranceInput | UpdateInsuranceInput) => {
    setInsuranceSaving(true);
    try {
      if (editingInsurance) {
        await insuranceApi.update(editingInsurance.id, data as UpdateInsuranceInput);
      } else {
        await insuranceApi.create(data as CreateInsuranceInput);
      }
      await loadInsurance();
    } catch (error) {
      console.error('Failed to save insurance provider:', error);
    } finally {
      setInsuranceSaving(false);
    }
  };

  const handleDeleteInsurance = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await insuranceApi.delete(id);
      await loadInsurance();
    } catch (error) {
      console.error('Failed to delete insurance provider:', error);
    }
  };

  const handleSeedInsurance = async () => {
    try {
      await insuranceApi.seed();
      await loadInsurance();
    } catch (error) {
      console.error('Failed to seed insurance providers:', error);
    }
  };

  // Device handlers
  const handleSaveDevice = async (data: CreateDeviceModelInput | UpdateDeviceModelInput) => {
    setDeviceSaving(true);
    try {
      if (editingDevice) {
        await deviceModelsApi.update(editingDevice.id, data as UpdateDeviceModelInput);
      } else {
        await deviceModelsApi.create(data as CreateDeviceModelInput);
      }
      await loadDeviceModels();
    } catch (error) {
      console.error('Failed to save device model:', error);
    } finally {
      setDeviceSaving(false);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await deviceModelsApi.delete(id);
      await loadDeviceModels();
    } catch (error) {
      console.error('Failed to delete device model:', error);
    }
  };

  const handleSeedDevices = async () => {
    try {
      await deviceModelsApi.seed();
      await loadDeviceModels();
    } catch (error) {
      console.error('Failed to seed device models:', error);
    }
  };

  const tabs = [
    { id: 'conditions' as TabType, label: t('medicalConditions'), icon: Activity, count: conditions.length },
    { id: 'insurance' as TabType, label: t('insuranceProviders'), icon: Building, count: insuranceProviders.length },
    { id: 'devices' as TabType, label: t('deviceModels'), icon: Smartphone, count: deviceModels.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
              <p className="text-sm text-gray-500">{t('subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Tabs */}
        <div className="bg-white rounded-lg border mb-4">
          <div className="flex border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                <span className={cn(
                  'px-1.5 py-0.5 text-xs rounded-full',
                  activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search')}
                  className="pl-8 h-8 w-64"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300"
                />
                {t('showInactive')}
              </label>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'conditions' && (
                <>
                  <Button variant="outline" size="sm" onClick={handleSeedConditions}>
                    {t('seedDefaults')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingCondition(null);
                      setShowConditionModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('add')}
                  </Button>
                </>
              )}
              {activeTab === 'insurance' && (
                <>
                  <Button variant="outline" size="sm" onClick={handleSeedInsurance}>
                    {t('seedDefaults')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingInsurance(null);
                      setShowInsuranceModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('add')}
                  </Button>
                </>
              )}
              {activeTab === 'devices' && (
                <>
                  <Button variant="outline" size="sm" onClick={handleSeedDevices}>
                    {t('seedDefaults')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingDevice(null);
                      setShowDeviceModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('add')}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-3">
            {/* Medical Conditions Tab */}
            {activeTab === 'conditions' && (
              <>
                {conditionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredConditions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>{t('noConditions')}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleSeedConditions}>
                      {t('seedDefaults')}
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2 font-medium">{t('code')}</th>
                          <th className="pb-2 font-medium">{t('name')}</th>
                          <th className="pb-2 font-medium">{t('category')}</th>
                          <th className="pb-2 font-medium">{t('icdCode')}</th>
                          <th className="pb-2 font-medium">{t('status')}</th>
                          <th className="pb-2 font-medium text-right">{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredConditions.map((condition) => (
                          <tr key={condition.id} className="hover:bg-gray-50">
                            <td className="py-2 font-mono text-xs">{condition.code}</td>
                            <td className="py-2">{condition.name}</td>
                            <td className="py-2 text-gray-500">{condition.category || '-'}</td>
                            <td className="py-2 font-mono text-xs">{condition.icdCode || '-'}</td>
                            <td className="py-2">
                              <span
                                className={cn(
                                  'px-2 py-0.5 text-xs rounded-full',
                                  condition.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                )}
                              >
                                {condition.isActive ? t('active') : t('inactive')}
                              </span>
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingCondition(condition);
                                    setShowConditionModal(true);
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  <Pencil className="h-4 w-4 text-gray-500" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCondition(condition.id)}
                                  className="p-1 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Insurance Providers Tab */}
            {activeTab === 'insurance' && (
              <>
                {insuranceLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredInsurance.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Building className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>{t('noInsurance')}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleSeedInsurance}>
                      {t('seedDefaults')}
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2 font-medium">{t('code')}</th>
                          <th className="pb-2 font-medium">{t('name')}</th>
                          <th className="pb-2 font-medium">{t('payerId')}</th>
                          <th className="pb-2 font-medium">{t('phone')}</th>
                          <th className="pb-2 font-medium">{t('status')}</th>
                          <th className="pb-2 font-medium text-right">{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredInsurance.map((provider) => (
                          <tr key={provider.id} className="hover:bg-gray-50">
                            <td className="py-2 font-mono text-xs">{provider.code}</td>
                            <td className="py-2">{provider.name}</td>
                            <td className="py-2 font-mono text-xs">{provider.payerId || '-'}</td>
                            <td className="py-2 text-gray-500">{provider.phone || '-'}</td>
                            <td className="py-2">
                              <span
                                className={cn(
                                  'px-2 py-0.5 text-xs rounded-full',
                                  provider.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                )}
                              >
                                {provider.isActive ? t('active') : t('inactive')}
                              </span>
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingInsurance(provider);
                                    setShowInsuranceModal(true);
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  <Pencil className="h-4 w-4 text-gray-500" />
                                </button>
                                <button
                                  onClick={() => handleDeleteInsurance(provider.id)}
                                  className="p-1 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Device Models Tab */}
            {activeTab === 'devices' && (
              <>
                {devicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Smartphone className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>{t('noDevices')}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleSeedDevices}>
                      {t('seedDefaults')}
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2 font-medium">{t('code')}</th>
                          <th className="pb-2 font-medium">{t('name')}</th>
                          <th className="pb-2 font-medium">{t('fields.manufacturer')}</th>
                          <th className="pb-2 font-medium">{t('fields.category')}</th>
                          <th className="pb-2 font-medium">{t('status')}</th>
                          <th className="pb-2 font-medium text-right">{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredDevices.map((device) => (
                          <tr key={device.id} className="hover:bg-gray-50">
                            <td className="py-2 font-mono text-xs">{device.code}</td>
                            <td className="py-2">{device.name}</td>
                            <td className="py-2 text-gray-500">{device.manufacturer || '-'}</td>
                            <td className="py-2 text-gray-500">{device.category || '-'}</td>
                            <td className="py-2">
                              <span
                                className={cn(
                                  'px-2 py-0.5 text-xs rounded-full',
                                  device.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                )}
                              >
                                {device.isActive ? t('active') : t('inactive')}
                              </span>
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingDevice(device);
                                    setShowDeviceModal(true);
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  <Pencil className="h-4 w-4 text-gray-500" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDevice(device.id)}
                                  className="p-1 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showConditionModal && (
        <ConditionModal
          condition={editingCondition || undefined}
          onClose={() => {
            setShowConditionModal(false);
            setEditingCondition(null);
          }}
          onSave={handleSaveCondition}
          isLoading={conditionSaving}
        />
      )}

      {showInsuranceModal && (
        <InsuranceModal
          provider={editingInsurance || undefined}
          onClose={() => {
            setShowInsuranceModal(false);
            setEditingInsurance(null);
          }}
          onSave={handleSaveInsurance}
          isLoading={insuranceSaving}
        />
      )}

      {showDeviceModal && (
        <DeviceModal
          device={editingDevice || undefined}
          onClose={() => {
            setShowDeviceModal(false);
            setEditingDevice(null);
          }}
          onSave={handleSaveDevice}
          isLoading={deviceSaving}
        />
      )}
    </div>
  );
}
