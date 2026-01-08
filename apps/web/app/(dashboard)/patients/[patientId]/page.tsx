'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button, Badge } from '@nirmitee/ui';
import { patientsApi, type Patient } from '@/lib/api/patients';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Activity,
  Users,
  FileCheck,
  Edit,
  AlertCircle,
  Heart,
  Stethoscope,
  CreditCard,
  Clock,
} from 'lucide-react';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId as string;
  const { t } = useTranslations('patients');
  const { t: tCommon } = useTranslations('common');
  const { t: tDetail } = useTranslations('patients.detail');

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPatient();
  }, [patientId]);

  const loadPatient = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await patientsApi.get(patientId);
      setPatient(response);
    } catch (err) {
      console.error('Failed to load patient:', err);
      setError('Failed to load patient data');
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  // Quick action handlers
  const handleRecordVitals = () => {
    router.push(`/record-vitals?patientId=${patientId}`);
  };

  const handleSendMessage = () => {
    router.push(`/my-messages?patientId=${patientId}`);
  };

  const handleScheduleAppointment = () => {
    // TODO: Implement appointments page
    alert('Appointments feature coming soon!');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mx-auto" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">{tCommon('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              {tDetail('notFound')}
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {tDetail('notFoundDescription')}
            </p>
            <Link href="/patients" className="mt-4 inline-block">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {tDetail('backToList')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayStatus = getDisplayStatus(patient.enrollmentStatus);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/patients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center">
              <span className="text-brand text-xl font-semibold">
                {patient.firstName[0]}
                {patient.lastName[0]}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {patient.firstName} {patient.lastName}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant={getStatusColor(displayStatus)}>
                  {t(`status.${displayStatus}`)}
                </Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {calculateAge(patient.dateOfBirth)} {t('years')} {patient.gender ? `(${patient.gender})` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/patients/${patientId}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            {tCommon('edit')}
          </Button>
          <Button onClick={handleRecordVitals}>
            <Activity className="h-4 w-4 mr-2" />
            {tDetail('viewVitals')}
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-brand" />
              {tDetail('contactInformation')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{tDetail('email')}</p>
                  <p className="text-gray-900 dark:text-white">{patient.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{tDetail('phone')}</p>
                  <p className="text-gray-900 dark:text-white">{patient.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:col-span-2">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{tDetail('address')}</p>
                  <p className="text-gray-900 dark:text-white">
                    {patient.address ? (
                      [
                        patient.address.street,
                        patient.address.city,
                        patient.address.state,
                        patient.address.zipCode,
                      ].filter(Boolean).join(', ') || '-'
                    ) : '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{tDetail('dateOfBirth')}</p>
                  <p className="text-gray-900 dark:text-white">{formatDate(patient.dateOfBirth)}</p>
                </div>
              </div>
            </div>

            {/* Emergency Contact - shown when data available */}
            {(patient.emergencyContact || patient.emergencyPhone) && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  {tDetail('emergencyContact')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{tDetail('name')}</p>
                    <p className="text-gray-900 dark:text-white">{patient.emergencyContact || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{tDetail('phone')}</p>
                    <p className="text-gray-900 dark:text-white">{patient.emergencyPhone || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Medical Conditions */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-brand" />
              {tDetail('medicalConditions')}
            </h2>
            {patient.conditions && patient.conditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {patient.conditions.map((condition, index) => (
                  <Badge key={index} variant="gray" className="text-sm py-1.5 px-3">
                    {condition}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">{tDetail('noConditions')}</p>
            )}

            {patient.additionalNotes && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {tDetail('additionalNotes')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{patient.additionalNotes}</p>
              </div>
            )}
          </div>

          {/* Insurance Information */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-brand" />
              {tDetail('insuranceInformation')}
            </h2>
            {patient.insurance?.planName === 'Self-Pay' ? (
              <p className="text-gray-600 dark:text-gray-400">{tDetail('selfPay')}</p>
            ) : patient.insurance?.providerId ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{tDetail('provider')}</p>
                  <p className="text-gray-900 dark:text-white">{patient.insurance.providerId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{tDetail('policyNumber')}</p>
                  <p className="text-gray-900 dark:text-white">{patient.insurance.memberId || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{tDetail('groupNumber')}</p>
                  <p className="text-gray-900 dark:text-white">{patient.insurance.groupNumber || '-'}</p>
                </div>
                {patient.insurance.planName && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Plan Name</p>
                    <p className="text-gray-900 dark:text-white">{patient.insurance.planName}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">{tDetail('noInsurance')}</p>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Enrollment Status */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <FileCheck className="h-5 w-5 text-brand" />
              {tDetail('enrollmentStatus')}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{tDetail('status')}</span>
                <Badge variant={getStatusColor(displayStatus)}>
                  {patient.enrollmentStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{tDetail('enrolledOn')}</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatDate(patient.enrollmentDate || patient.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{tDetail('consentObtained')}</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {patient.consentDate ? (
                    <Badge variant="success">{tCommon('yes')}</Badge>
                  ) : (
                    <Badge variant="warning">{tCommon('no')}</Badge>
                  )}
                </span>
              </div>
              {patient.consentDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{tDetail('consentDate')}</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {formatDate(patient.consentDate)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Care Team */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-brand" />
              {tDetail('careTeam')}
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Stethoscope className="h-4 w-4" />
                  {tDetail('primaryPhysician')}
                </p>
                <p className="text-gray-900 dark:text-white mt-1">
                  {patient.primaryPhysician?.name || tDetail('notAssigned')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{tDetail('careCoordinator')}</p>
                <p className="text-gray-900 dark:text-white mt-1">
                  {patient.assignedClinicalStaff?.name || tDetail('notAssigned')}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-brand" />
              {tDetail('quickActions')}
            </h2>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={handleRecordVitals}>
                <Activity className="h-4 w-4 mr-2" />
                {tDetail('recordVitals')}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleSendMessage}>
                <Mail className="h-4 w-4 mr-2" />
                {tDetail('sendMessage')}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleScheduleAppointment}>
                <Calendar className="h-4 w-4 mr-2" />
                {tDetail('scheduleAppointment')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
