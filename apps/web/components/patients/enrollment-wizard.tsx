'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Input } from '@nirmitee/ui';
import Select, { StylesConfig } from 'react-select';
import { patientsApi, type CreatePatientData } from '@/lib/api/patients';
import { conditionsApi, insuranceApi, type MedicalCondition, type InsuranceProvider } from '@/lib/api/master-data';
import { MasterSelect } from '@/components/master/master-select';
import { User, Stethoscope, CreditCard, Users, FileCheck, Smartphone, ClipboardList, Loader2, RefreshCw, Plus } from 'lucide-react';
import { MasterDrawer } from '@/components/master/master-drawer';

// react-select option type
interface SelectOption {
  value: string;
  label: string;
}

// Custom styles for react-select to match the theme
const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: '36px',
    height: '36px',
    fontSize: '14px',
    borderColor: state.isFocused ? '#745EE1' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #745EE1' : 'none',
    '&:hover': { borderColor: '#745EE1' },
    backgroundColor: 'white',
  }),
  valueContainer: (base) => ({ ...base, padding: '0 8px', height: '34px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, padding: '0 8px' }),
  option: (base, state) => ({
    ...base,
    fontSize: '14px',
    backgroundColor: state.isSelected ? '#745EE1' : state.isFocused ? '#f3f4f6' : 'white',
    color: state.isSelected ? 'white' : '#374151',
    '&:active': { backgroundColor: '#745EE1' },
  }),
  menu: (base) => ({ ...base, zIndex: 50 }),
  placeholder: (base) => ({ ...base, color: '#9ca3af' }),
  singleValue: (base) => ({ ...base, color: '#111827' }),
};

// Field component moved OUTSIDE to prevent re-creation on every render (fixes input focus loss)
interface FieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  className?: string;
  required?: boolean;
}

function Field({ label, children, error, className = '', required }: FieldProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

interface EnrollmentWizardProps {
  onComplete?: (patientId: string) => void;
}

type TabId = 'basic' | 'conditions' | 'insurance' | 'team' | 'consent' | 'devices' | 'review';

const TABS: { id: TabId; icon: React.ElementType; labelKey: string }[] = [
  { id: 'basic', icon: User, labelKey: 'basicInfo' },
  { id: 'conditions', icon: Stethoscope, labelKey: 'conditions' },
  { id: 'insurance', icon: CreditCard, labelKey: 'insurance' },
  { id: 'team', icon: Users, labelKey: 'careTeam' },
  { id: 'consent', icon: FileCheck, labelKey: 'consent' },
  { id: 'devices', icon: Smartphone, labelKey: 'devices' },
  { id: 'review', icon: ClipboardList, labelKey: 'review' },
];

export function EnrollmentWizard({ onComplete }: EnrollmentWizardProps) {
  const { t } = useTranslations('patients.enrollment');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conditionDrawerOpen, setConditionDrawerOpen] = useState(false);

  // Master data states
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [insuranceProviders, setInsuranceProviders] = useState<InsuranceProvider[]>([]);
  const [loadingMasterData, setLoadingMasterData] = useState(true);

  const [form, setForm] = useState<Partial<CreatePatientData>>({
    firstName: '', lastName: '', dateOfBirth: '', gender: '', phone: '', email: '',
    address: '', city: '', state: '', zipCode: '', emergencyContact: '', emergencyPhone: '',
    conditions: [], additionalNotes: '', isSelfPay: false, insuranceProvider: '',
    policyNumber: '', groupNumber: '', subscriberName: '', subscriberRelationship: '',
    primaryPhysicianId: '', careCoordinatorId: '', additionalProviderIds: [],
    consentObtained: false, consentSignature: '', consentWitnessName: '', hipaaAcknowledged: false,
  });

  // Load master data on mount
  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    setLoadingMasterData(true);
    try {
      const [conditionsData, insuranceData] = await Promise.all([
        conditionsApi.list().catch(() => []),
        insuranceApi.list().catch(() => []),
      ]);
      setConditions(conditionsData);
      setInsuranceProviders(insuranceData);
    } catch (error) {
      console.error('Failed to load master data:', error);
    } finally {
      setLoadingMasterData(false);
    }
  };

  const update = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    const required = ['firstName', 'lastName', 'dateOfBirth', 'phone', 'email'];
    const newErrors: Record<string, string> = {};
    required.forEach((f) => { if (!form[f as keyof typeof form]) newErrors[f] = 'Required'; });

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      setActiveTab('basic');
      return;
    }

    setIsSubmitting(true);
    try {
      const patient = await patientsApi.create(form as CreatePatientData);
      onComplete ? onComplete(patient.id) : router.push(`/patients/${patient.id}`);
    } catch (error) {
      console.error('Failed to enroll:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (loadingMasterData && (activeTab === 'conditions' || activeTab === 'insurance')) {
      return (
        <div className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand" />
          <p className="text-sm text-gray-500 mt-2">Loading...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'basic':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label={t('basicInfo.firstName')} error={errors.firstName} required>
              <Input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} placeholder="John" className="h-9 text-sm" error={!!errors.firstName} />
            </Field>
            <Field label={t('basicInfo.lastName')} error={errors.lastName} required>
              <Input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} placeholder="Doe" className="h-9 text-sm" error={!!errors.lastName} />
            </Field>
            <Field label={t('basicInfo.dateOfBirth')} error={errors.dateOfBirth} required>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} className="h-9 text-sm" error={!!errors.dateOfBirth} />
            </Field>
            <Field label={t('basicInfo.gender')}>
              <Select<SelectOption>
                value={form.gender ? { value: form.gender, label: form.gender.charAt(0).toUpperCase() + form.gender.slice(1) } : null}
                onChange={(opt) => update('gender', opt?.value || '')}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
                styles={selectStyles}
                placeholder="Select..."
                isClearable
              />
            </Field>
            <Field label={t('basicInfo.phone')} error={errors.phone} required>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="(555) 123-4567" className="h-9 text-sm" error={!!errors.phone} />
            </Field>
            <Field label={t('basicInfo.email')} error={errors.email} required>
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="john@example.com" className="h-9 text-sm" error={!!errors.email} />
            </Field>
            <Field label={t('basicInfo.emergencyContact')}>
              <Input value={form.emergencyContact} onChange={(e) => update('emergencyContact', e.target.value)} placeholder="Jane Doe" className="h-9 text-sm" />
            </Field>
            <Field label={t('basicInfo.emergencyPhone')}>
              <Input value={form.emergencyPhone} onChange={(e) => update('emergencyPhone', e.target.value)} placeholder="(555) 987-6543" className="h-9 text-sm" />
            </Field>
            <Field label={t('basicInfo.address')} className="col-span-2">
              <Input value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="123 Main St" className="h-9 text-sm" />
            </Field>
            <Field label={t('basicInfo.city')}>
              <Input value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="City" className="h-9 text-sm" />
            </Field>
            <Field label={t('basicInfo.state')}>
              <Input value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="State" className="h-9 text-sm" />
            </Field>
            <Field label={t('basicInfo.zipCode')}>
              <Input value={form.zipCode} onChange={(e) => update('zipCode', e.target.value)} placeholder="12345" className="h-9 text-sm" />
            </Field>
          </div>
        );

      case 'conditions':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {conditions.map((c) => (
                <label key={c.id} className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer text-sm transition-colors ${form.conditions?.includes(c.code) ? 'border-brand bg-brand/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                  <input
                    type="checkbox"
                    checked={form.conditions?.includes(c.code)}
                    onChange={(e) => update('conditions', e.target.checked ? [...(form.conditions || []), c.code] : form.conditions?.filter((x) => x !== c.code))}
                    className="h-4 w-4 rounded border-gray-300 accent-brand focus:ring-brand"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-white">{c.name}</span>
                    {c.icdCode && <span className="text-xs text-gray-400 ml-1">({c.icdCode})</span>}
                  </div>
                </label>
              ))}
              {/* Add New Condition Button */}
              <button
                type="button"
                onClick={() => setConditionDrawerOpen(true)}
                className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-brand hover:border-brand hover:bg-brand/5 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t('conditions.addNew')}
              </button>
            </div>
            {errors.conditions && <p className="text-xs text-red-500">{errors.conditions}</p>}
            <Field label={t('conditions.additionalNotes')}>
              <textarea value={form.additionalNotes || ''} onChange={(e) => update('additionalNotes', e.target.value)} placeholder="Additional notes..." rows={2} className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-sm" />
            </Field>
            {/* Condition Drawer */}
            <MasterDrawer
              masterType="condition"
              isOpen={conditionDrawerOpen}
              onClose={() => setConditionDrawerOpen(false)}
              onCreated={(newCondition) => {
                setConditions((prev) => [...prev, newCondition]);
                update('conditions', [...(form.conditions || []), newCondition.code]);
                setConditionDrawerOpen(false);
              }}
            />
          </div>
        );

      case 'insurance':
        return (
          <div className="space-y-3">
            <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${form.isSelfPay ? 'border-brand bg-brand/5' : 'border-gray-200 dark:border-gray-700'}`}>
              <input type="checkbox" checked={form.isSelfPay} onChange={(e) => update('isSelfPay', e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-brand" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t('insurance.selfPay')}</p>
                <p className="text-xs text-gray-500">{t('insurance.selfPayDesc')}</p>
              </div>
            </label>
            {!form.isSelfPay && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label={t('insurance.insuranceProvider')} className="md:col-span-2">
                  <MasterSelect
                    masterType="insurance"
                    value={form.insuranceProvider || ''}
                    onChange={(value) => update('insuranceProvider', value)}
                    placeholder={t('insurance.selectProvider')}
                  />
                </Field>
                <Field label={t('insurance.policyNumber')}>
                  <Input value={form.policyNumber} onChange={(e) => update('policyNumber', e.target.value)} placeholder="Policy #" className="h-9 text-sm" />
                </Field>
                <Field label={t('insurance.groupNumber')}>
                  <Input value={form.groupNumber} onChange={(e) => update('groupNumber', e.target.value)} placeholder="Group #" className="h-9 text-sm" />
                </Field>
                <Field label={t('insurance.subscriberName')}>
                  <Input value={form.subscriberName} onChange={(e) => update('subscriberName', e.target.value)} placeholder="Subscriber" className="h-9 text-sm" />
                </Field>
                <Field label={t('insurance.subscriberRelationship')}>
                  <Select<SelectOption>
                    value={form.subscriberRelationship ? { value: form.subscriberRelationship, label: form.subscriberRelationship.charAt(0).toUpperCase() + form.subscriberRelationship.slice(1) } : null}
                    onChange={(opt) => update('subscriberRelationship', opt?.value || '')}
                    options={[
                      { value: 'self', label: 'Self' },
                      { value: 'spouse', label: 'Spouse' },
                      { value: 'parent', label: 'Parent' },
                      { value: 'child', label: 'Child' },
                    ]}
                    styles={selectStyles}
                    placeholder="Select..."
                    isClearable
                  />
                </Field>
              </div>
            )}
          </div>
        );

      case 'team':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={t('careTeam.primaryPhysician')} error={errors.primaryPhysicianId} required>
              <MasterSelect
                masterType="provider"
                value={form.primaryPhysicianId || ''}
                onChange={(value) => update('primaryPhysicianId', value)}
                placeholder={t('careTeam.primaryPhysicianPlaceholder')}
                error={errors.primaryPhysicianId}
                addNewLabel={t('careTeam.addNewPhysician')}
              />
            </Field>
            <Field label={t('careTeam.careCoordinator')}>
              <MasterSelect
                masterType="provider"
                value={form.careCoordinatorId || ''}
                onChange={(value) => update('careCoordinatorId', value)}
                placeholder={t('careTeam.careCoordinatorPlaceholder')}
                addNewLabel={t('careTeam.addNewCoordinator')}
              />
            </Field>
          </div>
        );

      case 'consent':
        return (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs text-gray-600 dark:text-gray-400">
              {t('consent.consentText')}
            </div>
            <label className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer ${form.consentObtained ? 'border-brand bg-brand/5' : 'border-gray-200 dark:border-gray-700'}`}>
              <input type="checkbox" checked={form.consentObtained} onChange={(e) => update('consentObtained', e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-brand" />
              <span className="text-sm text-gray-900 dark:text-white">{t('consent.agreeConsent')}</span>
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs text-gray-600 dark:text-gray-400">
              {t('consent.hipaaText')}
            </div>
            <label className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer ${form.hipaaAcknowledged ? 'border-brand bg-brand/5' : 'border-gray-200 dark:border-gray-700'}`}>
              <input type="checkbox" checked={form.hipaaAcknowledged} onChange={(e) => update('hipaaAcknowledged', e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-brand" />
              <span className="text-sm text-gray-900 dark:text-white">{t('consent.agreeHipaa')}</span>
            </label>
            {errors.consent && <p className="text-xs text-red-500">{errors.consent}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('consent.signatureLabel')}>
                <Input value={form.consentSignature} onChange={(e) => update('consentSignature', e.target.value)} placeholder="Type full name" className="h-9 text-sm" />
              </Field>
              <Field label={t('consent.witnessName')}>
                <Input value={form.consentWitnessName} onChange={(e) => update('consentWitnessName', e.target.value)} placeholder="Witness name" className="h-9 text-sm" />
              </Field>
            </div>
          </div>
        );

      case 'devices':
        return (
          <div className="py-6 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <Smartphone className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('devices.comingSoon')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('devices.comingSoonDesc')}</p>
          </div>
        );

      case 'review':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('review.patientInformation')}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{form.firstName} {form.lastName}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{form.email}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{form.phone}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('review.medicalConditions')}</p>
              <p className="text-sm text-gray-900 dark:text-white">{form.conditions?.join(', ') || 'None'}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">{t('review.consentStatus')}</p>
              <p className={`text-sm font-medium ${form.consentObtained ? 'text-green-600' : 'text-red-500'}`}>
                {form.consentObtained ? t('review.consentObtained') : t('review.consentNotObtained')}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto rounded-t-lg">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(`steps.${tab.labelKey}`)}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4">
        {renderContent()}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={loadMasterData}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          title={t('buttons.refresh')}
        >
          <RefreshCw className="h-3 w-3" />
          {t('buttons.refresh')}
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/patients')}>
            {t('buttons.cancel') || 'Cancel'}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                {t('buttons.submitting')}
              </>
            ) : (
              t('buttons.submit') || 'Enroll Patient'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
