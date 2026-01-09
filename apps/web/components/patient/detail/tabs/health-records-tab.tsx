'use client';

import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@nirmitee/ui';
import {
  Pill,
  Plus,
  AlertCircle,
  Syringe,
  FileText,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import type { Patient } from '@/lib/api/patients';
import {
  healthRecordsApi,
  type Medication,
  type Allergy,
  type Immunization,
  type LabResult,
  type MedicalHistoryItem,
  type AllergySeverity,
  type LabInterpretation,
} from '@/lib/api/health-records';

interface HealthRecordsTabProps {
  patientId: string;
  patient?: Patient | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

export function HealthRecordsTab({
  patientId,
  patient,
  isLoading: parentLoading,
  onRefresh,
}: HealthRecordsTabProps) {
  const { t } = useTranslations('healthRecords');
  const { t: tCommon } = useTranslations('common');

  const [expandedHistory, setExpandedHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real data states
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [immunizations, setImmunizations] = useState<Immunization[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryItem[]>([]);

  const fetchHealthRecords = useCallback(async () => {
    if (!patientId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [
        medicationsRes,
        allergiesRes,
        immunizationsRes,
        labResultsRes,
        historyRes,
      ] = await Promise.all([
        healthRecordsApi.getMedications(patientId).catch(() => ({ medications: [] })),
        healthRecordsApi.getAllergies(patientId).catch(() => ({ allergies: [] })),
        healthRecordsApi.getImmunizations(patientId).catch(() => ({ immunizations: [] })),
        healthRecordsApi.getLabResults(patientId).catch(() => ({ labResults: [] })),
        healthRecordsApi.getMedicalHistory(patientId).catch(() => ({ medicalHistory: [] })),
      ]);

      setMedications(medicationsRes.medications);
      setAllergies(allergiesRes.allergies);
      setImmunizations(immunizationsRes.immunizations);
      setLabResults(labResultsRes.labResults);
      setMedicalHistory(historyRes.medicalHistory);
    } catch (err) {
      console.error('Failed to fetch health records:', err);
      setError('Failed to load health records');
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchHealthRecords();
  }, [fetchHealthRecords]);

  const handleRefresh = () => {
    fetchHealthRecords();
    onRefresh?.();
  };

  const toggleHistoryExpand = (id: string) => {
    setExpandedHistory((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getSeverityBadge = (severity: AllergySeverity) => {
    const configs: Record<AllergySeverity, { label: string; className: string }> = {
      MILD: {
        label: t('allergySeverity.mild'),
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      },
      MODERATE: {
        label: t('allergySeverity.moderate'),
        className: 'bg-orange-100 text-orange-700 border-orange-200',
      },
      SEVERE: {
        label: t('allergySeverity.severe'),
        className: 'bg-red-100 text-red-700 border-red-200',
      },
      LIFE_THREATENING: {
        label: t('allergySeverity.lifeThreatening') || 'Life-threatening',
        className: 'bg-red-200 text-red-800 border-red-300',
      },
    };
    return configs[severity] || configs.MODERATE;
  };

  const getLabStatusBadge = (interpretation?: LabInterpretation) => {
    const configs: Record<string, { label: string; className: string }> = {
      NORMAL: {
        label: t('labStatus.normal'),
        className: 'bg-green-100 text-green-700',
      },
      ABNORMAL: {
        label: t('labStatus.abnormal'),
        className: 'bg-yellow-100 text-yellow-700',
      },
      CRITICAL: {
        label: t('labStatus.critical'),
        className: 'bg-red-100 text-red-700',
      },
      HIGH: {
        label: t('labStatus.high') || 'High',
        className: 'bg-orange-100 text-orange-700',
      },
      LOW: {
        label: t('labStatus.low') || 'Low',
        className: 'bg-blue-100 text-blue-700',
      },
    };
    return configs[interpretation || 'NORMAL'] || configs.NORMAL;
  };

  if (parentLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#745EE1] mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">{tCommon('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {tCommon('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Medications Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-[#745EE1]" />
              <CardTitle className="text-base font-semibold">
                {t('medications.title')}
              </CardTitle>
              <Badge variant="gray" className="text-xs">
                {medications.length}
              </Badge>
            </div>
            <Button size="sm" className="h-8 text-xs bg-[#745EE1] hover:bg-[#5d4bc4]">
              <Plus className="w-3 h-3 mr-1" />
              {t('medications.addButton')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {medications.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-3">
              {t('medications.noMedications')}
            </p>
          ) : (
            <div className="space-y-2">
              {medications.map((med) => (
                <div
                  key={med.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#745EE1]/20 hover:bg-purple-50/30 transition-all"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center">
                    <Pill className="w-4 h-4 text-[#745EE1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{med.name}</p>
                      {med.status !== 'ACTIVE' && (
                        <Badge variant="gray" className="text-xs">
                          {med.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {med.dosage} • {med.frequency}
                    </p>
                    {med.prescribedBy && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('medications.prescribedBy')}: {med.prescribedBy} •{' '}
                        {med.prescribedDate
                          ? new Date(med.prescribedDate).toLocaleDateString()
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allergies Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <CardTitle className="text-base font-semibold">
                {t('allergies.title')}
              </CardTitle>
              <Badge variant="gray" className="text-xs">
                {allergies.length}
              </Badge>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              {t('allergies.addButton')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {allergies.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-3">
              {t('allergies.noAllergies')}
            </p>
          ) : (
            <div className="space-y-2">
              {allergies.map((allergy) => {
                const severityConfig = getSeverityBadge(allergy.severity);
                return (
                  <div
                    key={allergy.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-red-100 bg-red-50/30"
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {allergy.allergen}
                        </p>
                        <Badge className={cn('text-xs', severityConfig.className)}>
                          {severityConfig.label}
                        </Badge>
                      </div>
                      {allergy.reaction && (
                        <p className="text-xs text-gray-700">
                          {t('allergies.reaction')}: {allergy.reaction}
                        </p>
                      )}
                      {allergy.onsetDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          {t('allergies.diagnosedDate')}:{' '}
                          {new Date(allergy.onsetDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical History Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#745EE1]" />
              <CardTitle className="text-base font-semibold">
                {t('medicalHistory.title')}
              </CardTitle>
              <Badge variant="gray" className="text-xs">
                {medicalHistory.filter((h) => h.status === 'ACTIVE').length}{' '}
                {t('medicalHistory.active')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {medicalHistory.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-3">
              {t('medicalHistory.noHistory')}
            </p>
          ) : (
            <div className="space-y-2">
              {medicalHistory.map((item) => {
                const isExpanded = expandedHistory.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'rounded-lg border transition-all',
                      item.status === 'ACTIVE'
                        ? 'border-gray-200 bg-white'
                        : 'border-gray-100 bg-gray-50'
                    )}
                  >
                    <button
                      onClick={() => toggleHistoryExpand(item.id)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {item.condition}
                          </p>
                          <Badge
                            className={cn(
                              'text-xs',
                              item.status === 'ACTIVE'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            )}
                          >
                            {t(`medicalHistory.status.${item.status.toLowerCase()}`)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {item.diagnosedDate
                              ? new Date(item.diagnosedDate).toLocaleDateString()
                              : ''}
                          </span>
                        </div>
                      </div>
                      {item.notes ? (
                        isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )
                      ) : null}
                    </button>
                    {isExpanded && item.notes && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="pl-3 border-l-2 border-[#745EE1]/20">
                          <p className="text-xs text-gray-600">{item.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Immunizations Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Syringe className="w-4 h-4 text-[#745EE1]" />
              <CardTitle className="text-base font-semibold">
                {t('immunizations.title')}
              </CardTitle>
              <Badge variant="gray" className="text-xs">
                {immunizations.length}
              </Badge>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              {t('immunizations.addButton')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {immunizations.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-3">
              {t('immunizations.noImmunizations')}
            </p>
          ) : (
            <div className="space-y-2">
              {immunizations.map((immunization) => (
                <div
                  key={immunization.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#745EE1]/20 transition-colors"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                    <Syringe className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {immunization.vaccineName}
                    </p>
                    <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                      <p>
                        {t('immunizations.dateAdministered')}:{' '}
                        {new Date(immunization.administeredDate).toLocaleDateString()}
                      </p>
                      {immunization.location && (
                        <p>
                          {t('immunizations.provider')}: {immunization.location}
                        </p>
                      )}
                      {immunization.lotNumber && (
                        <p className="text-gray-500">
                          {t('immunizations.lotNumber')}: {immunization.lotNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lab Results Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-[#745EE1]" />
              <CardTitle className="text-base font-semibold">
                {t('labResults.title')}
              </CardTitle>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs">
              {t('labResults.viewAll')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {labResults.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-3">
              {t('labResults.noResults')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold text-gray-700">
                      {t('labResults.testName')}
                    </th>
                    <th className="text-center py-2 font-semibold text-gray-700">
                      {t('labResults.value')}
                    </th>
                    <th className="text-center py-2 font-semibold text-gray-700">
                      {t('labResults.referenceRange')}
                    </th>
                    <th className="text-center py-2 font-semibold text-gray-700">
                      {t('labResults.status')}
                    </th>
                    <th className="text-center py-2 font-semibold text-gray-700">
                      {t('labResults.date')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {labResults.map((result) => {
                    const statusConfig = getLabStatusBadge(result.interpretation);
                    return (
                      <tr key={result.id} className="border-b last:border-0">
                        <td className="py-2 font-medium text-gray-900">
                          {result.testName}
                        </td>
                        <td className="py-2 text-center font-semibold">
                          {result.value} {result.unit}
                        </td>
                        <td className="py-2 text-center text-gray-600">
                          {result.referenceRange ||
                            (result.referenceMin && result.referenceMax
                              ? `${result.referenceMin}-${result.referenceMax}`
                              : '-')}
                        </td>
                        <td className="py-2 text-center">
                          <Badge className={cn('text-xs', statusConfig.className)}>
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="py-2 text-center text-gray-600">
                          {new Date(result.resultedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
