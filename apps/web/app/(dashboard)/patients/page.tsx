'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button, Input, Badge } from '@nirmitee/ui';
import { patientsApi, type Patient } from '@/lib/api/patients';
import { EHRImportModal, CSVImportModal } from '@/components/patients';
import {
  Search,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  Activity,
  FileSpreadsheet,
  Building2,
  PenLine,
  X,
  User,
  Stethoscope,
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

type EnrollmentTab = 'enrolled' | 'not_enrolled';

// Enrollment Options Modal
function EnrollmentOptionsModal({
  isOpen,
  onClose,
  onSelectOption,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'manual' | 'excel' | 'ehr') => void;
}) {
  const { t } = useTranslations('patients');

  if (!isOpen) return null;

  const options = [
    {
      id: 'manual' as const,
      icon: PenLine,
      title: t('enrollOptions.manual') || 'Add Manually',
      description: t('enrollOptions.manualDesc') || 'Enter patient details step by step',
      color: 'bg-[#745EE1]/10 text-[#745EE1]',
    },
    {
      id: 'excel' as const,
      icon: FileSpreadsheet,
      title: t('enrollOptions.excel') || 'Import from Excel/CSV',
      description: t('enrollOptions.excelDesc') || 'Bulk upload patients from a spreadsheet',
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      id: 'ehr' as const,
      icon: Building2,
      title: t('enrollOptions.ehr') || 'Import from EHR',
      description: t('enrollOptions.ehrDesc') || 'Connect and sync from your EHR system',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('enrollOptions.title') || 'Add New Patient'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t('enrollOptions.subtitle') || 'Choose how you want to add patients'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#745EE1] dark:hover:border-[#745EE1] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group text-left"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${option.color}`}>
                <option.icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-[#745EE1]">{option.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{option.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#745EE1] flex-shrink-0" />
            </button>
          ))}
        </div>
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {t('enrollOptions.hint') || 'You can always add more patients later'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const router = useRouter();
  const { t } = useTranslations('patients');
  const { t: tCommon } = useTranslations('common');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<EnrollmentTab>('not_enrolled');
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [ehrImportModalOpen, setEhrImportModalOpen] = useState(false);
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Map tab to enrollment status
  const mapTabToEnrollmentStatus = useCallback((tab: EnrollmentTab): string | undefined => {
    // Enrolled = ACTIVE patients in RPM/CCM
    // Not Enrolled = PENDING, CONSENTED (not yet active in program)
    return tab === 'enrolled' ? 'ACTIVE' : 'PENDING';
  }, []);

  // Load patients
  const loadPatients = useCallback(async (tab: EnrollmentTab, page: number, search: string) => {
    try {
      setLoading(true);
      const enrollmentStatus = mapTabToEnrollmentStatus(tab);
      const response = await patientsApi.list({
        page,
        limit: 10,
        search: search || undefined,
        enrollmentStatus,
      });
      setPatients(response.patients);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  }, [mapTabToEnrollmentStatus]);

  useEffect(() => {
    loadPatients(activeTab, pagination.page, searchQuery);
  }, [activeTab, pagination.page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadPatients(activeTab, 1, searchQuery);
  };

  const handleTabChange = (tab: EnrollmentTab) => {
    setActiveTab(tab);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleEnrollOption = (option: 'manual' | 'excel' | 'ehr') => {
    setEnrollModalOpen(false);
    switch (option) {
      case 'manual':
        router.push('/patients/enroll');
        break;
      case 'excel':
        setCsvImportModalOpen(true);
        break;
      case 'ehr':
        setEhrImportModalOpen(true);
        break;
    }
  };

  const handleImportSuccess = () => {
    // Refresh patient list after successful import
    loadPatients(activeTab, pagination.page, searchQuery);
  };

  const handleEnrollPatient = async (patientId: string) => {
    // TODO: Implement enrollment action
    router.push(`/patients/${patientId}?action=enroll`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Get eligible programs based on conditions
  const getEligiblePrograms = (conditions: string[]): string[] => {
    const programs: string[] = [];
    const chronicConditions = ['Hypertension', 'Diabetes', 'COPD', 'Heart Failure', 'CKD', 'Asthma'];
    const hasChronicCondition = conditions.some(c =>
      chronicConditions.some(cc => c.toLowerCase().includes(cc.toLowerCase()))
    );

    if (hasChronicCondition || conditions.length >= 2) {
      programs.push('RPM');
    }
    if (conditions.length >= 2) {
      programs.push('CCM');
    }
    return programs.length > 0 ? programs : ['RPM'];
  };

  // Simulate enrollment status for demo
  const getEnrollmentAction = (patient: Patient): 'enroll' | 'sent' | 'enrolled' => {
    if (patient.enrollmentStatus === 'ACTIVE') return 'enrolled';
    if (patient.enrollmentStatus === 'CONSENTED') return 'sent';
    return 'enroll';
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setEnrollModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t('enrollOptions.title') || 'Add New Patient'}
        </Button>
      </div>

      {/* Enrollment Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        <button
          onClick={() => handleTabChange('enrolled')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'enrolled'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {t('tabs.enrolled') || 'Enrolled'}
          </div>
        </button>
        <button
          onClick={() => handleTabChange('not_enrolled')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'not_enrolled'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t('tabs.notEnrolled') || 'Not Enrolled'}
          </div>
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder') || 'Search by name, MRN, or phone...'}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="outline">
          {tCommon('search')}
        </Button>
      </form>

      {/* Patient Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto" />
            <p className="mt-4 text-gray-500">{tCommon('loading')}</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              {activeTab === 'enrolled' ? t('noEnrolledPatients') || 'No enrolled patients' : t('noPatients')}
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {activeTab === 'enrolled'
                ? t('noEnrolledPatientsDesc') || 'No patients have been enrolled in RPM/CCM programs yet.'
                : t('noPatientsDescription')}
            </p>
            {activeTab === 'not_enrolled' && (
              <Button className="mt-4" onClick={() => setEnrollModalOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('enrollOptions.title') || 'Add New Patient'}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.ehrId') || 'EHR ID'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.patientDetails') || 'Patient Details'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.condition') || 'Condition'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.provider') || 'Provider'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.eligibleProgram') || 'Eligible Program'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.lastInteraction') || 'Last Interaction'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.action') || 'Action'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {patients.map((patient) => {
                    const action = getEnrollmentAction(patient);
                    const eligiblePrograms = getEligiblePrograms(patient.conditions);

                    return (
                      <tr
                        key={patient.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                        onClick={() => router.push(`/patients/${patient.id}`)}
                      >
                        {/* EHR ID */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                            {patient.id.slice(-8).toUpperCase()}
                          </span>
                        </td>

                        {/* Patient Details */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-brand/10 flex items-center justify-center">
                              <span className="text-brand font-medium text-sm">
                                {patient.firstName[0]}{patient.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {patient.firstName} {patient.lastName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {patient.gender || 'Not specified'} • {calculateAge(patient.dateOfBirth)} yrs
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Condition */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {patient.conditions.slice(0, 2).map((condition) => (
                              <Badge key={condition} variant="gray" className="text-xs">
                                {condition}
                              </Badge>
                            ))}
                            {patient.conditions.length > 2 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                +{patient.conditions.length - 2} more
                              </span>
                            )}
                            {patient.conditions.length === 0 && (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </td>

                        {/* Provider */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {patient.primaryPhysician?.name || 'Unassigned'}
                            </span>
                          </div>
                        </td>

                        {/* Eligible Program */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-1">
                            {eligiblePrograms.map((program) => (
                              <Badge
                                key={program}
                                variant={program === 'RPM' ? 'default' : 'gray'}
                                className="text-xs"
                              >
                                {program}
                              </Badge>
                            ))}
                          </div>
                        </td>

                        {/* Last Interaction */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(patient.updatedAt)}
                            </span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {action === 'enrolled' ? (
                            <Badge variant="success" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t('actionEnrolled') || 'Enrolled'}
                            </Badge>
                          ) : action === 'sent' ? (
                            <Badge variant="warning" className="text-xs">
                              <Send className="h-3 w-3 mr-1" />
                              {t('actionSent') || 'Sent'}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleEnrollPatient(patient.id);
                              }}
                            >
                              {t('actionEnroll') || 'Enroll'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {tCommon('showing')} {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)} {tCommon('of')}{' '}
                {pagination.total}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {tCommon('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  {tCommon('next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Enrollment Options Modal */}
      <EnrollmentOptionsModal
        isOpen={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        onSelectOption={handleEnrollOption}
      />

      {/* EHR Import Modal */}
      <EHRImportModal
        isOpen={ehrImportModalOpen}
        onClose={() => setEhrImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={csvImportModalOpen}
        onClose={() => setCsvImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
