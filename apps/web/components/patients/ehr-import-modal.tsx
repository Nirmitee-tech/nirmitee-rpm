'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button, Input, Badge } from '@nirmitee/ui';
import {
  X,
  Search,
  CheckCircle,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Loader2,
  RefreshCw,
  ArrowLeft,
  User,
  Link2,
  Settings,
} from 'lucide-react';

// EHR System interface for when integrations are configured
interface EHRSystem {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  logo: string;
  status: 'connected' | 'disconnected';
  lastSync: string | null;
  patientCount: number;
}

// Empty array - EHR integrations will be fetched from API when available
const EHR_SYSTEMS: EHRSystem[] = [];

// Patient data structure for EHR imports
interface EHRPatient {
  ehrId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  conditions: string[];
  provider: string;
  lastVisit: string;
}

interface EHRImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// EHR Logo Component with fallback
function EHRLogo({ ehr }: { ehr: typeof EHR_SYSTEMS[0] }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    // Fallback to styled text logo
    return (
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${ehr.bgColor} ${ehr.textColor}`}
      >
        {ehr.name.charAt(0)}
      </div>
    );
  }

  return (
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${ehr.bgColor} p-2`}>
      <Image
        src={ehr.logo}
        alt={`${ehr.name} logo`}
        width={32}
        height={32}
        className="object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  );
}

// Step 1: EHR Selection
function EHRSelection({
  onSelect,
  onClose,
}: {
  onSelect: (ehrId: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslations('patients');
  const router = useRouter();
  const connectedEHRs = EHR_SYSTEMS.filter(ehr => ehr.status === 'connected');
  const disconnectedEHRs = EHR_SYSTEMS.filter(ehr => ehr.status === 'disconnected');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('import.selectEhr') || 'Select Your EHR System'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('import.selectEhrDesc') || 'Choose the EHR system where your patient records are stored'}
          </p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Connected EHRs */}
      {connectedEHRs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Connected Systems
          </p>
          <div className="grid gap-2">
            {connectedEHRs.map((ehr) => (
              <button
                key={ehr.id}
                onClick={() => onSelect(ehr.id)}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#745EE1] dark:hover:border-[#745EE1] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all text-left group"
              >
                <EHRLogo ehr={ehr} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-[#745EE1]">
                      {ehr.name}
                    </h3>
                    <Badge variant="success" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t('import.connected') || 'Connected'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {ehr.patientCount.toLocaleString()} {t('import.patientsAvailable') || 'patients'} •
                    {t('import.lastSync') || 'Last sync'}: {new Date(ehr.lastSync!).toLocaleDateString()}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#745EE1]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Disconnected EHRs */}
      {disconnectedEHRs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Available to Connect
          </p>
          <div className="grid gap-2">
            {disconnectedEHRs.map((ehr) => (
              <div
                key={ehr.id}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 opacity-60 text-left"
              >
                <EHRLogo ehr={ehr} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{ehr.name}</h3>
                    <Badge variant="gray" className="text-xs">
                      {t('import.notConnected') || 'Not Connected'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Configure in Settings to enable
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connect More */}
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {t('import.needToConnect') || 'Need to connect an EHR?'}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              {t('import.needToConnectDesc') || 'Go to Settings → EHR Integrations to configure your EHR connections.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              router.push('/settings/ehr-integrations');
            }}
          >
            <Link2 className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

// Step 2: Patient Search
function PatientSearch({
  ehrId,
  onPatientFound,
  onBack,
}: {
  ehrId: string;
  onPatientFound: (patient: EHRPatient) => void;
  onBack: () => void;
}) {
  const { t } = useTranslations('patients');
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const selectedEhr = EHR_SYSTEMS.find(e => e.id === ehrId);

  const handleSearch = async () => {
    if (!searchValue.trim()) return;

    setSearching(true);
    setSearchError(null);

    // EHR integration requires backend configuration
    setSearchError(t('import.ehrNotImplemented') || 'EHR integration is not yet configured. Please use CSV import or add patients manually.');
    setSearching(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('import.searchIn') || 'Search in'} {selectedEhr?.name}
            </h2>
            {selectedEhr && (
              <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${selectedEhr.bgColor} ${selectedEhr.textColor}`}>
                {selectedEhr.name.charAt(0)}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('import.enterPatientId') || 'Enter the patient\'s MRN or EHR ID'}
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('import.patientIdentifier') || 'Patient Identifier (MRN or EHR ID)'}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value)}
                placeholder={t('import.searchPlaceholder') || 'e.g., MRN12345 or 987654321'}
                className="pl-10"
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={searching || !searchValue.trim()}>
              {searching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('import.searching') || 'Searching...'}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  {t('import.search') || 'Search'}
                </>
              )}
            </Button>
          </div>
        </div>

        {searchError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{searchError}</p>
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('import.searchHint') || 'Enter the exact patient identifier from your EHR system. This is usually the Medical Record Number (MRN).'}
        </p>
      </div>
    </div>
  );
}

// Step 3: Patient Preview
function PatientPreview({
  patient,
  ehrId,
  onConfirm,
  onBack,
}: {
  patient: EHRPatient;
  ehrId: string;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslations('patients');
  const [importing, setImporting] = useState(false);

  const selectedEhr = EHR_SYSTEMS.find(e => e.id === ehrId);

  const handleConfirm = async () => {
    setImporting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    onConfirm();
  };

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('import.confirmImport') || 'Confirm Patient Import'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('import.reviewDetails') || 'Review the patient details before importing'}
          </p>
        </div>
      </div>

      {/* Patient Card */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#745EE1]/10 flex items-center justify-center">
                <span className="text-[#745EE1] font-semibold">
                  {patient.firstName[0]}{patient.lastName[0]}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {patient.firstName} {patient.lastName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {patient.gender} • {calculateAge(patient.dateOfBirth)} years old
                </p>
              </div>
            </div>
            <Badge variant="gray" className="text-xs">
              {selectedEhr?.name} • {patient.ehrId}
            </Badge>
          </div>
        </div>

        {/* Details Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('import.contactInfo') || 'Contact Information'}
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {new Date(patient.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{patient.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{patient.email}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {patient.address.street}<br />
                  {patient.address.city}, {patient.address.state} {patient.address.zipCode}
                </span>
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('import.medicalInfo') || 'Medical Information'}
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('import.conditions') || 'Conditions'}</p>
                <div className="flex flex-wrap gap-1">
                  {patient.conditions.map((condition) => (
                    <Badge key={condition} variant="gray" className="text-xs">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('import.provider') || 'Provider'}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{patient.provider}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('import.lastVisit') || 'Last Visit'}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {new Date(patient.lastVisit).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>{t('import.importNotice') || 'Important:'}</strong>{' '}
          {t('import.importNoticeDesc') || 'This will create a copy of the patient in your RPM system. The original EHR record will not be modified.'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onBack} disabled={importing}>
          {t('import.goBack') || 'Go Back'}
        </Button>
        <Button onClick={handleConfirm} disabled={importing}>
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('import.importing') || 'Importing...'}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('import.confirmAndImport') || 'Confirm & Import'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Step 4: Success
function ImportSuccess({
  patientName,
  onViewPatient,
  onImportAnother,
  onClose,
}: {
  patientName: string;
  onViewPatient: () => void;
  onImportAnother: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslations('patients');

  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {t('import.successTitle') || 'Patient Imported Successfully!'}
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        <strong>{patientName}</strong> {t('import.successDesc') || 'has been added to your RPM system.'}
      </p>
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onImportAnother}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('import.importAnother') || 'Import Another'}
        </Button>
        <Button onClick={onViewPatient}>
          <User className="h-4 w-4 mr-2" />
          {t('import.viewPatient') || 'View Patient'}
        </Button>
      </div>
    </div>
  );
}

// Main Modal Component
export function EHRImportModal({ isOpen, onClose, onSuccess }: EHRImportModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<'select' | 'search' | 'preview' | 'success'>('select');
  const [selectedEhr, setSelectedEhr] = useState<string | null>(null);
  const [foundPatient, setFoundPatient] = useState<EHRPatient | null>(null);

  const handleEhrSelect = (ehrId: string) => {
    setSelectedEhr(ehrId);
    setStep('search');
  };

  const handlePatientFound = (patient: EHRPatient) => {
    setFoundPatient(patient);
    setStep('preview');
  };

  const handleImportConfirm = () => {
    setStep('success');
  };

  const handleImportAnother = () => {
    setFoundPatient(null);
    setStep('select');
    setSelectedEhr(null);
  };

  const handleViewPatient = () => {
    onClose();
    onSuccess?.();
    router.push('/patients');
  };

  const handleClose = () => {
    // Reset state on close
    setStep('select');
    setSelectedEhr(null);
    setFoundPatient(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {step === 'select' && <EHRSelection onSelect={handleEhrSelect} onClose={handleClose} />}
          {step === 'search' && selectedEhr && (
            <PatientSearch
              ehrId={selectedEhr}
              onPatientFound={handlePatientFound}
              onBack={() => setStep('select')}
            />
          )}
          {step === 'preview' && foundPatient && selectedEhr && (
            <PatientPreview
              patient={foundPatient}
              ehrId={selectedEhr}
              onConfirm={handleImportConfirm}
              onBack={() => setStep('search')}
            />
          )}
          {step === 'success' && foundPatient && (
            <ImportSuccess
              patientName={`${foundPatient.firstName} ${foundPatient.lastName}`}
              onViewPatient={handleViewPatient}
              onImportAnother={handleImportAnother}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
