'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button, Input, Badge } from '@nirmitee/ui';
import { patientsApi, type Patient } from '@/lib/api/patients';
import {
  Search,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar,
  Activity,
  FileSpreadsheet,
  Building2,
  PenLine,
  X,
} from 'lucide-react';

type FilterStatus = 'all' | 'active' | 'inactive' | 'pending';

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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('enrollOptions.title') || 'Add New Patient'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t('enrollOptions.subtitle') || 'Choose how you want to add patients'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Options */}
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
                <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-[#745EE1]">
                  {option.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {option.description}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#745EE1] flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Footer */}
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
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Map frontend filter to backend enrollmentStatus enum
  const mapFilterToEnrollmentStatus = useCallback((filter: FilterStatus): string | undefined => {
    switch (filter) {
      case 'active':
        return 'ACTIVE';
      case 'inactive':
        return 'INACTIVE';
      case 'pending':
        return 'PENDING';
      default:
        return undefined;
    }
  }, []);

  // Load patients with current filter
  const loadPatients = useCallback(async (filter: FilterStatus, page: number, search: string) => {
    try {
      setLoading(true);
      const enrollmentStatus = filter === 'all' ? undefined : mapFilterToEnrollmentStatus(filter);
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
  }, [mapFilterToEnrollmentStatus]);

  // Load patients when filter or page changes
  useEffect(() => {
    loadPatients(statusFilter, pagination.page, searchQuery);
  }, [statusFilter, pagination.page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadPatients(statusFilter, 1, searchQuery);
  };

  const handleFilterChange = (newFilter: FilterStatus) => {
    setStatusFilter(newFilter);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleEnrollOption = (option: 'manual' | 'excel' | 'ehr') => {
    setEnrollModalOpen(false);
    switch (option) {
      case 'manual':
        router.push('/patients/enroll');
        break;
      case 'excel':
        router.push('/patients/import');
        break;
      case 'ehr':
        router.push('/patients/import?source=ehr');
        break;
    }
  };

  // Map enrollmentStatus to display status
  const getDisplayStatus = (enrollmentStatus: string): 'active' | 'inactive' | 'pending' => {
    switch (enrollmentStatus) {
      case 'ACTIVE':
        return 'active';
      case 'INACTIVE':
      case 'DISCHARGED':
        return 'inactive';
      default:
        return 'pending';
    }
  };

  const getStatusColor = (status: string): 'success' | 'danger' | 'warning' | 'default' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setEnrollModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t('enrollment.title')}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder') || 'Search patients...'}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline">
            {tCommon('search')}
          </Button>
        </form>
        <div className="flex gap-2">
          {(['all', 'active', 'pending'] as FilterStatus[]).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange(status)}
            >
              {status === 'all' ? tCommon('viewAll') : t(`status.${status}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Patient List */}
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
              {t('noPatients')}
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('noPatientsDescription')}</p>
            <Button className="mt-4" onClick={() => setEnrollModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('enrollment.title')}
            </Button>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.patient')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.contact')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.conditions')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('table.enrolled')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {tCommon('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => router.push(`/patients/${patient.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-brand/10 flex items-center justify-center">
                            <span className="text-brand font-medium">
                              {patient.firstName[0]}
                              {patient.lastName[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {patient.firstName} {patient.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {calculateAge(patient.dateOfBirth)} {t('years')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                            <Phone className="h-3 w-3" />
                            {patient.phone}
                          </div>
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Mail className="h-3 w-3" />
                            {patient.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {patient.conditions.slice(0, 2).map((condition) => (
                            <Badge key={condition} variant="gray" className="text-xs">
                              {condition}
                            </Badge>
                          ))}
                          {patient.conditions.length > 2 && (
                            <Badge variant="gray" className="text-xs">
                              +{patient.conditions.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusColor(getDisplayStatus(patient.enrollmentStatus))}>
                          {t(`status.${getDisplayStatus(patient.enrollmentStatus)}`)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(patient.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            // Open menu
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
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
    </div>
  );
}
