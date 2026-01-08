'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button, Input } from '@nirmitee/ui';
import { cn } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { api } from '@/lib/api/client';

export type MasterType =
  | 'condition'
  | 'insurance'
  | 'provider'
  | 'medication'
  | 'procedure'
  | 'facility'
  | 'device';

interface MasterDrawerProps {
  masterType: MasterType;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item: Record<string, unknown>) => void;
}

// Field definitions for each master type
const MASTER_FIELDS: Record<MasterType, Array<{
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'textarea';
  required?: boolean;
  placeholder?: string;
  colSpan?: 1 | 2;
}>> = {
  condition: [
    { name: 'code', label: 'code', type: 'text', required: true, placeholder: 'HTN' },
    { name: 'icdCode', label: 'icdCode', type: 'text', placeholder: 'I10' },
    { name: 'name', label: 'name', type: 'text', required: true, placeholder: 'Hypertension', colSpan: 2 },
    { name: 'category', label: 'category', type: 'text', placeholder: 'Cardiovascular' },
    { name: 'description', label: 'description', type: 'textarea', colSpan: 2 },
  ],
  insurance: [
    { name: 'code', label: 'code', type: 'text', required: true, placeholder: 'BCBS' },
    { name: 'payerId', label: 'payerId', type: 'text', placeholder: '12345' },
    { name: 'name', label: 'name', type: 'text', required: true, placeholder: 'Blue Cross Blue Shield', colSpan: 2 },
    { name: 'phone', label: 'phone', type: 'tel', placeholder: '+1 800-123-4567' },
    { name: 'website', label: 'website', type: 'url', placeholder: 'https://www.example.com' },
  ],
  provider: [
    { name: 'npiNumber', label: 'npiNumber', type: 'text', required: true, placeholder: '1234567890' },
    { name: 'credentials', label: 'credentials', type: 'text', placeholder: 'MD, FACC' },
    { name: 'firstName', label: 'firstName', type: 'text', placeholder: 'John' },
    { name: 'lastName', label: 'lastName', type: 'text', placeholder: 'Smith' },
    { name: 'name', label: 'displayName', type: 'text', required: true, placeholder: 'Dr. John Smith, MD', colSpan: 2 },
    { name: 'specialty', label: 'specialty', type: 'text', placeholder: 'Cardiology' },
    { name: 'taxonomyCode', label: 'taxonomyCode', type: 'text', placeholder: '207RC0000X' },
    { name: 'practiceName', label: 'practiceName', type: 'text', colSpan: 2 },
    { name: 'licenseNumber', label: 'licenseNumber', type: 'text' },
    { name: 'licenseState', label: 'licenseState', type: 'text', placeholder: 'CA' },
    { name: 'deaNumber', label: 'deaNumber', type: 'text' },
    { name: 'phone', label: 'phone', type: 'tel' },
    { name: 'fax', label: 'fax', type: 'tel' },
    { name: 'email', label: 'email', type: 'email' },
  ],
  medication: [
    { name: 'code', label: 'code', type: 'text', required: true, placeholder: 'MET500' },
    { name: 'ndc', label: 'ndc', type: 'text', placeholder: '0000-0000-00' },
    { name: 'name', label: 'name', type: 'text', required: true, placeholder: 'Metformin', colSpan: 2 },
    { name: 'genericName', label: 'genericName', type: 'text', placeholder: 'Metformin HCl' },
    { name: 'dosageForm', label: 'dosageForm', type: 'text', placeholder: 'Tablet' },
    { name: 'strength', label: 'strength', type: 'text', placeholder: '500mg' },
    { name: 'category', label: 'category', type: 'text', placeholder: 'Antidiabetic' },
  ],
  procedure: [
    { name: 'code', label: 'code', type: 'text', required: true, placeholder: 'RPM001' },
    { name: 'cptCode', label: 'cptCode', type: 'text', placeholder: '99453' },
    { name: 'name', label: 'name', type: 'text', required: true, placeholder: 'RPM Device Setup', colSpan: 2 },
    { name: 'category', label: 'category', type: 'text', placeholder: 'RPM Setup' },
    { name: 'hcpcsCode', label: 'hcpcsCode', type: 'text' },
    { name: 'description', label: 'description', type: 'textarea', colSpan: 2 },
  ],
  facility: [
    { name: 'code', label: 'code', type: 'text', required: true, placeholder: 'FAC001' },
    { name: 'npi', label: 'npi', type: 'text', placeholder: '1234567890' },
    { name: 'name', label: 'name', type: 'text', required: true, placeholder: 'Main Clinic', colSpan: 2 },
    { name: 'type', label: 'type', type: 'text', placeholder: 'Clinic' },
    { name: 'phone', label: 'phone', type: 'tel' },
    { name: 'fax', label: 'fax', type: 'tel' },
    { name: 'email', label: 'email', type: 'email' },
  ],
  device: [
    { name: 'code', label: 'code', type: 'text', required: true, placeholder: 'BP001' },
    { name: 'category', label: 'category', type: 'text', placeholder: 'Blood Pressure' },
    { name: 'name', label: 'name', type: 'text', required: true, placeholder: 'Omron BP Monitor', colSpan: 2 },
    { name: 'manufacturer', label: 'manufacturer', type: 'text', placeholder: 'Omron' },
    { name: 'modelNumber', label: 'modelNumber', type: 'text', placeholder: 'BP786N' },
    { name: 'description', label: 'description', type: 'textarea', colSpan: 2 },
  ],
};

// API endpoints for each master type
const MASTER_API_ENDPOINTS: Record<MasterType, string> = {
  condition: '/api/master-data/conditions',
  insurance: '/api/master-data/insurance-providers',
  provider: '/api/master-data/external-providers',
  medication: '/api/master-data/medications',
  procedure: '/api/master-data/procedures',
  facility: '/api/master-data/facilities',
  device: '/api/master-data/device-models',
};

// Title keys for each master type
const MASTER_TITLES: Record<MasterType, string> = {
  condition: 'medicalCondition',
  insurance: 'insuranceProvider',
  provider: 'externalProvider',
  medication: 'medication',
  procedure: 'procedure',
  facility: 'facility',
  device: 'deviceModel',
};

export function MasterDrawer({ masterType, isOpen, onClose, onCreated }: MasterDrawerProps) {
  const { t } = useTranslations('settings.masters');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = MASTER_FIELDS[masterType];
  const endpoint = MASTER_API_ENDPOINTS[masterType];
  const titleKey = MASTER_TITLES[masterType];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const newItem = await api.post<Record<string, unknown>>(endpoint, formData);
      onCreated(newItem);
      setFormData({});
      onClose();
    } catch (err) {
      const errorMessage = (err as { message?: string })?.message || 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 bg-brand/5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('addNew')} {t(titleKey)}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-brand/10 text-gray-500 dark:text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100%-57px)]">
          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {fields.map((field) => (
                <div
                  key={field.name}
                  className={cn(field.colSpan === 2 && 'col-span-2')}
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t(`fields.${field.label}`)}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="w-full px-3 py-2 border dark:border-gray-700 rounded-md text-sm resize-none h-20 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand focus:border-brand"
                    />
                  ) : (
                    <Input
                      type={field.type}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      className="h-9"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} size="sm">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('create')}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
