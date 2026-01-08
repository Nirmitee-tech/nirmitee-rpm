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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { Patient } from '@/lib/api/patients';

interface HealthRecordsTabProps {
  patientId: string;
  patient?: Patient | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

// Mock data structures for future API integration
interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedDate: string;
  prescribedBy?: string;
}

interface Allergy {
  id: string;
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
  diagnosedDate: string;
}

interface MedicalHistoryItem {
  id: string;
  diagnosis: string;
  diagnosisDate: string;
  status: 'active' | 'resolved';
  notes?: string;
}

interface Immunization {
  id: string;
  vaccineName: string;
  dateAdministered: string;
  provider?: string;
  lotNumber?: string;
}

interface LabResult {
  id: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  dateCollected: string;
}

export function HealthRecordsTab({
  patientId,
  patient,
  isLoading,
  onRefresh,
}: HealthRecordsTabProps) {
  const { t } = useTranslations('healthRecords');
  const { t: tCommon } = useTranslations('common');

  const [expandedHistory, setExpandedHistory] = useState<string[]>([]);

  // Mock data - replace with API calls
  const mockMedications: Medication[] = [
    {
      id: '1',
      name: 'Lisinopril',
      dosage: '10 mg',
      frequency: 'Once daily',
      prescribedDate: '2024-01-15',
      prescribedBy: 'Dr. Smith',
    },
    {
      id: '2',
      name: 'Metformin',
      dosage: '500 mg',
      frequency: 'Twice daily',
      prescribedDate: '2023-11-20',
      prescribedBy: 'Dr. Smith',
    },
    {
      id: '3',
      name: 'Atorvastatin',
      dosage: '20 mg',
      frequency: 'Once daily at bedtime',
      prescribedDate: '2024-02-10',
      prescribedBy: 'Dr. Johnson',
    },
  ];

  const mockAllergies: Allergy[] = [
    {
      id: '1',
      allergen: 'Penicillin',
      reaction: 'Rash, itching',
      severity: 'moderate',
      diagnosedDate: '2010-05-12',
    },
    {
      id: '2',
      allergen: 'Shellfish',
      reaction: 'Anaphylaxis',
      severity: 'severe',
      diagnosedDate: '2015-08-22',
    },
  ];

  const mockMedicalHistory: MedicalHistoryItem[] = [
    {
      id: '1',
      diagnosis: 'Type 2 Diabetes Mellitus',
      diagnosisDate: '2018-03-15',
      status: 'active',
      notes: 'Well controlled with medication and diet',
    },
    {
      id: '2',
      diagnosis: 'Essential Hypertension',
      diagnosisDate: '2016-07-10',
      status: 'active',
      notes: 'Managed with ACE inhibitor',
    },
    {
      id: '3',
      diagnosis: 'Hyperlipidemia',
      diagnosisDate: '2019-11-05',
      status: 'active',
    },
    {
      id: '4',
      diagnosis: 'Appendicitis',
      diagnosisDate: '2012-02-20',
      status: 'resolved',
      notes: 'Appendectomy performed',
    },
  ];

  const mockImmunizations: Immunization[] = [
    {
      id: '1',
      vaccineName: 'Influenza vaccine',
      dateAdministered: '2024-09-15',
      provider: 'City Health Clinic',
      lotNumber: 'FL2024-001',
    },
    {
      id: '2',
      vaccineName: 'COVID-19 vaccine (Booster)',
      dateAdministered: '2024-05-10',
      provider: 'County Medical Center',
      lotNumber: 'COV2024-456',
    },
    {
      id: '3',
      vaccineName: 'Tdap',
      dateAdministered: '2023-01-12',
      provider: 'Family Practice Associates',
    },
  ];

  const mockLabResults: LabResult[] = [
    {
      id: '1',
      testName: 'HbA1c',
      value: '6.8',
      unit: '%',
      referenceRange: '< 5.7',
      status: 'abnormal',
      dateCollected: '2024-12-01',
    },
    {
      id: '2',
      testName: 'Total Cholesterol',
      value: '195',
      unit: 'mg/dL',
      referenceRange: '< 200',
      status: 'normal',
      dateCollected: '2024-12-01',
    },
    {
      id: '3',
      testName: 'LDL Cholesterol',
      value: '115',
      unit: 'mg/dL',
      referenceRange: '< 100',
      status: 'abnormal',
      dateCollected: '2024-12-01',
    },
    {
      id: '4',
      testName: 'HDL Cholesterol',
      value: '52',
      unit: 'mg/dL',
      referenceRange: '> 40',
      status: 'normal',
      dateCollected: '2024-12-01',
    },
    {
      id: '5',
      testName: 'Creatinine',
      value: '1.0',
      unit: 'mg/dL',
      referenceRange: '0.7-1.3',
      status: 'normal',
      dateCollected: '2024-12-01',
    },
  ];

  const toggleHistoryExpand = (id: string) => {
    setExpandedHistory((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getSeverityBadge = (severity: Allergy['severity']) => {
    const configs = {
      mild: {
        label: t('allergySeverity.mild'),
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      },
      moderate: {
        label: t('allergySeverity.moderate'),
        className: 'bg-orange-100 text-orange-700 border-orange-200',
      },
      severe: {
        label: t('allergySeverity.severe'),
        className: 'bg-red-100 text-red-700 border-red-200',
      },
    };
    return configs[severity];
  };

  const getLabStatusBadge = (status: LabResult['status']) => {
    const configs = {
      normal: {
        label: t('labStatus.normal'),
        className: 'bg-green-100 text-green-700',
      },
      abnormal: {
        label: t('labStatus.abnormal'),
        className: 'bg-yellow-100 text-yellow-700',
      },
      critical: {
        label: t('labStatus.critical'),
        className: 'bg-red-100 text-red-700',
      },
    };
    return configs[status];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#745EE1] mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">{tCommon('loading')}</p>
        </div>
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
                {mockMedications.length}
              </Badge>
            </div>
            <Button size="sm" className="h-8 text-xs bg-[#745EE1] hover:bg-[#5d4bc4]">
              <Plus className="w-3 h-3 mr-1" />
              {t('medications.addButton')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {mockMedications.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-3">
              {t('medications.noMedications')}
            </p>
          ) : (
            <div className="space-y-2">
              {mockMedications.map((med) => (
                <div
                  key={med.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#745EE1]/20 hover:bg-purple-50/30 transition-all"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center">
                    <Pill className="w-4 h-4 text-[#745EE1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{med.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {med.dosage} • {med.frequency}
                    </p>
                    {med.prescribedBy && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('medications.prescribedBy')}: {med.prescribedBy} •{' '}
                        {new Date(med.prescribedDate).toLocaleDateString()}
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
                {mockAllergies.length}
              </Badge>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              {t('allergies.addButton')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {mockAllergies.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-3">
              {t('allergies.noAllergies')}
            </p>
          ) : (
            <div className="space-y-2">
              {mockAllergies.map((allergy) => {
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
                        <Badge
                          className={cn('text-xs', severityConfig.className)}
                        >
                          {severityConfig.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-700">
                        {t('allergies.reaction')}: {allergy.reaction}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('allergies.diagnosedDate')}:{' '}
                        {new Date(allergy.diagnosedDate).toLocaleDateString()}
                      </p>
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
                {mockMedicalHistory.filter((h) => h.status === 'active').length}{' '}
                {t('medicalHistory.active')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {mockMedicalHistory.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-3">
              {t('medicalHistory.noHistory')}
            </p>
          ) : (
            <div className="space-y-2">
              {mockMedicalHistory.map((item) => {
                const isExpanded = expandedHistory.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'rounded-lg border transition-all',
                      item.status === 'active'
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
                            {item.diagnosis}
                          </p>
                          <Badge
                            className={cn(
                              'text-xs',
                              item.status === 'active'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            )}
                          >
                            {t(`medicalHistory.status.${item.status}`)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(item.diagnosisDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
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
                {mockImmunizations.length}
              </Badge>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              {t('immunizations.addButton')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {mockImmunizations.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-3">
              {t('immunizations.noImmunizations')}
            </p>
          ) : (
            <div className="space-y-2">
              {mockImmunizations.map((immunization) => (
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
                        {new Date(immunization.dateAdministered).toLocaleDateString()}
                      </p>
                      {immunization.provider && (
                        <p>
                          {t('immunizations.provider')}: {immunization.provider}
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
          {mockLabResults.length === 0 ? (
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
                  {mockLabResults.map((result) => {
                    const statusConfig = getLabStatusBadge(result.status);
                    return (
                      <tr key={result.id} className="border-b last:border-0">
                        <td className="py-2 font-medium text-gray-900">
                          {result.testName}
                        </td>
                        <td className="py-2 text-center font-semibold">
                          {result.value} {result.unit}
                        </td>
                        <td className="py-2 text-center text-gray-600">
                          {result.referenceRange}
                        </td>
                        <td className="py-2 text-center">
                          <Badge className={cn('text-xs', statusConfig.className)}>
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="py-2 text-center text-gray-600">
                          {new Date(result.dateCollected).toLocaleDateString()}
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
