'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button, Input, Badge } from '@nirmitee/ui';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Building2,
  Search,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Download,
  X,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';

// Mock connected EHR systems
const CONNECTED_EHRS = [
  {
    id: 'epic',
    name: 'Epic',
    logo: '🏥',
    status: 'connected',
    lastSync: '2024-01-08T10:30:00Z',
    patientCount: 1250,
  },
  {
    id: 'cerner',
    name: 'Cerner',
    logo: '🔬',
    status: 'connected',
    lastSync: '2024-01-07T15:45:00Z',
    patientCount: 890,
  },
  {
    id: 'athena',
    name: 'athenahealth',
    logo: '🦉',
    status: 'disconnected',
    lastSync: null,
    patientCount: 0,
  },
];

// Mock patient data from EHR
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

// EHR Selection Component
function EHRSelection({
  onSelect,
}: {
  onSelect: (ehrId: string) => void;
}) {
  const { t } = useTranslations('patients');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('import.selectEhr') || 'Select Your EHR System'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('import.selectEhrDesc') || 'Choose the EHR system where your patient records are stored'}
        </p>
      </div>

      <div className="grid gap-3">
        {CONNECTED_EHRS.map((ehr) => (
          <button
            key={ehr.id}
            onClick={() => ehr.status === 'connected' && onSelect(ehr.id)}
            disabled={ehr.status !== 'connected'}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
              ehr.status === 'connected'
                ? 'border-gray-200 dark:border-gray-700 hover:border-[#745EE1] dark:hover:border-[#745EE1] hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer'
                : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl">
              {ehr.logo}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 dark:text-white">{ehr.name}</h3>
                <Badge
                  variant={ehr.status === 'connected' ? 'success' : 'gray'}
                  className="text-xs"
                >
                  {ehr.status === 'connected' ? t('import.connected') || 'Connected' : t('import.notConnected') || 'Not Connected'}
                </Badge>
              </div>
              {ehr.status === 'connected' && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {ehr.patientCount.toLocaleString()} {t('import.patientsAvailable') || 'patients available'} • {t('import.lastSync') || 'Last sync'}: {new Date(ehr.lastSync!).toLocaleDateString()}
                </p>
              )}
            </div>
            {ehr.status === 'connected' && (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>{t('import.needToConnect') || 'Need to connect an EHR?'}</strong>{' '}
          {t('import.needToConnectDesc') || 'Contact your administrator to set up EHR integrations.'}
        </p>
      </div>
    </div>
  );
}

// Patient Search Component
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

  const selectedEhr = CONNECTED_EHRS.find(e => e.id === ehrId);

  const handleSearch = async () => {
    if (!searchValue.trim()) return;

    setSearching(true);
    setSearchError(null);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock patient data
    if (searchValue.toLowerCase().includes('test') || searchValue.length >= 4) {
      onPatientFound({
        ehrId: searchValue.toUpperCase(),
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: '1965-03-15',
        gender: 'Male',
        phone: '(555) 123-4567',
        email: 'john.smith@email.com',
        address: {
          street: '123 Main Street',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
        },
        conditions: ['Hypertension', 'Type 2 Diabetes', 'Hyperlipidemia'],
        provider: 'Dr. Sarah Johnson',
        lastVisit: '2024-01-05',
      });
    } else {
      setSearchError(t('import.patientNotFound') || 'Patient not found. Please check the ID and try again.');
    }

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
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('import.searchIn') || 'Search in'} {selectedEhr?.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('import.enterPatientId') || 'Enter the patient\'s MRN or EHR ID'}
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
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
    </div>
  );
}

// Patient Preview Component
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

  const selectedEhr = CONNECTED_EHRS.find(e => e.id === ehrId);

  const handleConfirm = async () => {
    setImporting(true);
    // Simulate import
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
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
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
      <div className="flex justify-end gap-3">
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

// Import Success Component
function ImportSuccess({ patientName, onViewPatient, onImportAnother }: {
  patientName: string;
  onViewPatient: () => void;
  onImportAnother: () => void;
}) {
  const { t } = useTranslations('patients');

  return (
    <div className="text-center py-12">
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

// CSV Upload Component
function CSVUpload() {
  const { t } = useTranslations('patients');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('import.uploadCsv') || 'Upload Patient List'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('import.uploadCsvDesc') || 'Upload an Excel or CSV file with patient information'}
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-12 transition-colors ${
          dragActive
            ? 'border-[#745EE1] bg-[#745EE1]/5'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }`}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="text-center">
          {file ? (
            <>
              <FileSpreadsheet className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setFile(null);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                {t('import.removeFile') || 'Remove'}
              </Button>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('import.dragDrop') || 'Drag and drop your file here'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('import.orClick') || 'or click to browse'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                {t('import.supportedFormats') || 'Supports CSV, XLS, XLSX (max 10MB)'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Download Template */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {t('import.needTemplate') || 'Need a template?'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('import.templateDesc') || 'Download our CSV template with the required columns'}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          {t('import.downloadTemplate') || 'Download Template'}
        </Button>
      </div>

      {/* Upload Button */}
      <div className="flex justify-end">
        <Button disabled={!file}>
          <Upload className="h-4 w-4 mr-2" />
          {t('import.uploadAndProcess') || 'Upload & Process'}
        </Button>
      </div>
    </div>
  );
}

// Main Import Page
export default function ImportPatientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslations('patients');

  const source = searchParams.get('source');
  const isEHRImport = source === 'ehr';

  // EHR Import State
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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/patients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('import.backToPatients') || 'Back to Patients'}
          </Button>
        </Link>
      </div>

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {isEHRImport
            ? t('import.ehrTitle') || 'Import from EHR'
            : t('import.csvTitle') || 'Import Patients'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {isEHRImport
            ? t('import.ehrSubtitle') || 'Pull patient data directly from your connected EHR system'
            : t('import.csvSubtitle') || 'Upload a spreadsheet to add multiple patients at once'}
        </p>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        {isEHRImport ? (
          <>
            {step === 'select' && <EHRSelection onSelect={handleEhrSelect} />}
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
                onViewPatient={() => router.push('/patients')}
                onImportAnother={handleImportAnother}
              />
            )}
          </>
        ) : (
          <CSVUpload />
        )}
      </div>
    </div>
  );
}
