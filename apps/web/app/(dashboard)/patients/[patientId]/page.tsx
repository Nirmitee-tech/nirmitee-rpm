'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button, Badge } from '@nirmitee/ui';
import { patientsApi, type Patient, type CarePlan, type Alert, type Device, type VitalReading, type PatientMetrics } from '@/lib/api/patients';
import {
  ArrowLeft,
  Edit,
  AlertCircle,
  Activity,
  Plus,
  Phone,
} from 'lucide-react';
import {
  PatientInfoHeader,
  PatientConditionsCard,
  PatientDevicesCard,
  PatientCareTeamCard,
  MetricsBar,
  VitalsDashboard,
  QuickSummary,
  VitalsChart,
  AddConditionDrawer,
  AddDeviceDrawer,
  EditCareTeamDrawer,
} from '@/components/patient/detail';

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId as string;
  const { t } = useTranslations('patients');
  const { t: tCommon } = useTranslations('common');
  const { t: tDetail } = useTranslations('patientDetail');

  const [patient, setPatient] = useState<Patient | null>(null);
  const [readings, setReadings] = useState<VitalReading[]>([]);
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [metrics, setMetrics] = useState<PatientMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conditionDrawerOpen, setConditionDrawerOpen] = useState(false);
  const [deviceDrawerOpen, setDeviceDrawerOpen] = useState(false);
  const [careTeamDrawerOpen, setCareTeamDrawerOpen] = useState(false);
  const [assignedDevices, setAssignedDevices] = useState<Array<{ id: string; name: string; type: string; serialNumber?: string }>>([
    { id: '1', name: 'Blood Pressure Monitor', type: 'bp' },
    { id: '2', name: 'Weighing Scale', type: 'weight' },
    { id: '3', name: 'Blood Glucose Meter', type: 'glucose' },
  ]);

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      setMetricsLoading(true);
      setError(null);
      const [patientResponse, vitalsResponse, carePlansResponse, alertsResponse, devicesResponse, metricsResponse] = await Promise.all([
        patientsApi.get(patientId),
        patientsApi.getVitals(patientId, { limit: 50 }).catch(() => ({ readings: [], summary: {}, pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } })),
        patientsApi.getCarePlans(patientId).catch(() => []),
        patientsApi.getAlerts(patientId).catch(() => []),
        patientsApi.getDevices(patientId).catch(() => []),
        patientsApi.getMetrics(patientId).catch(() => null),
      ]);
      setPatient(patientResponse);
      setReadings(vitalsResponse.readings);
      setCarePlans(carePlansResponse);
      setAlerts(alertsResponse);
      setDevices(devicesResponse);
      setMetrics(metricsResponse);
    } catch (err) {
      console.error('Failed to load patient:', err);
      setError('Failed to load patient data');
    } finally {
      setLoading(false);
      setMetricsLoading(false);
    }
  };

  const handleConditionAdded = (condition: string) => {
    // Refresh patient data to get updated conditions
    loadPatientData();
  };

  const handleDeviceAdded = (device: { id: string; name: string; type: string; serialNumber?: string }) => {
    setAssignedDevices((prev) => [...prev, device]);
  };

  const handleCareTeamUpdated = (team: Array<{ id: string; name: string; role: string }>) => {
    // TODO: Update patient care team in backend
    // For now, just reload patient data
    loadPatientData();
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    await patientsApi.acknowledgeAlert(patientId, alertId);
    loadPatientData();
  };

  const handleResolveAlert = async (alertId: string, resolution: string) => {
    await patientsApi.resolveAlert(patientId, alertId, resolution);
    loadPatientData();
  };

  const handleRemoveDevice = async (deviceId: string) => {
    await patientsApi.removeDevice(patientId, deviceId);
    loadPatientData();
  };

  // Calculate summary data from readings
  const summaryData = useMemo(() => {
    if (!readings.length) {
      return {
        totalReadings: 0,
        lastReading: { systolic: 0, diastolic: 0 },
        average: { systolic: 0, diastolic: 0 },
        statusCounts: { low: 0, high: 0, normal: 0, severe: 0 },
        lastUpdated: new Date().toISOString(),
      };
    }

    const bpReadings = readings.filter((r) => r.type === 'BLOOD_PRESSURE');
    let lowCount = 0;
    let highCount = 0;
    let normalCount = 0;
    let severeCount = 0;

    bpReadings.forEach((r) => {
      if (r.status === 'CRITICAL') severeCount++;
      else if (r.status === 'WARNING') highCount++;
      else normalCount++;

      // Check for low values
      const systolic = r.values?.systolic || 0;
      if (systolic < 90) lowCount++;
    });

    const lastBp = bpReadings[0];
    const avgSystolic =
      bpReadings.reduce((sum, r) => sum + (r.values?.systolic || 0), 0) /
      (bpReadings.length || 1);
    const avgDiastolic =
      bpReadings.reduce((sum, r) => sum + (r.values?.diastolic || 0), 0) /
      (bpReadings.length || 1);

    return {
      totalReadings: bpReadings.length,
      lastReading: {
        systolic: lastBp?.values?.systolic || 0,
        diastolic: lastBp?.values?.diastolic || 0,
      },
      average: {
        systolic: Math.round(avgSystolic),
        diastolic: Math.round(avgDiastolic),
      },
      statusCounts: {
        low: lowCount,
        high: highCount,
        normal: normalCount,
        severe: severeCount,
      },
      lastUpdated: lastBp?.recordedAt || new Date().toISOString(),
    };
  }, [readings]);

  // Prepare chart data
  const chartReadings = useMemo(() => {
    return readings
      .filter((r) => r.type === 'BLOOD_PRESSURE')
      .slice(0, 20)
      .reverse()
      .map((r) => ({
        timestamp: r.recordedAt,
        systolic: r.values?.systolic || 0,
        diastolic: r.values?.diastolic || 0,
        pulse: r.values?.pulse || 0,
      }));
  }, [readings]);

  // Care team data
  const careTeam = useMemo(() => {
    const team = [];
    if (patient?.assignedClinicalStaff?.name) {
      team.push({
        id: patient.assignedClinicalStaff.id,
        name: patient.assignedClinicalStaff.name,
        role: 'CM',
      });
    }
    if (patient?.primaryPhysician?.name) {
      team.push({
        id: patient.primaryPhysician.id,
        name: patient.primaryPhysician.name,
        role: 'Physician',
      });
    }
    return team;
  }, [patient]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mx-auto" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {tCommon('loading')}
            </p>
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

  return (
    <div className="p-2 lg:p-3 space-y-2">
      {/* Breadcrumb + Action Buttons Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/patients" className="hover:text-brand">
            {t('title')}
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">
            {patient.firstName} {patient.lastName}
          </span>
        </div>
        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {patient.phone && (
            <Button
              size="sm"
              className="h-7 bg-green-600 hover:bg-green-700 text-xs"
              onClick={() => window.open(`tel:${patient.phone}`, '_self')}
            >
              <Phone className="h-3 w-3 mr-1" />
              {tDetail('callPatient')}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => router.push(`/patients/${patientId}/edit`)}>
            <Edit className="h-3 w-3 mr-1" />
            {tCommon('edit')}
          </Button>
          <Button size="sm" className="h-7 text-xs bg-[#745EE1] hover:bg-[#6249d1]" onClick={() => router.push(`/record-vitals?patientId=${patientId}`)}>
            <Activity className="h-3 w-3 mr-1" />
            {tDetail('recordVitals')}
          </Button>
        </div>
      </div>

      {/* Patient Info Header - Full Width */}
      <PatientInfoHeader
        patient={{
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender || '',
          mrn: patient.id.slice(-8).toUpperCase(),
          phone: patient.phone || undefined,
          email: patient.email,
          address: patient.address,
          insurance: patient.insurance,
          enrollmentStatus: patient.enrollmentStatus,
          enrollmentDate: patient.enrollmentDate,
          emergencyContact: patient.emergencyContact,
          emergencyPhone: patient.emergencyPhone,
        }}
      />

      {/* Conditions, Devices, Care Team Row - 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <PatientConditionsCard
          conditions={(patient.conditions || []).map((name, idx) => ({
            id: `condition-${idx}`,
            name,
            icdCode: '', // ICD codes to be added to backend later
          }))}
          onAddCondition={() => setConditionDrawerOpen(true)}
        />
        <PatientDevicesCard
          devices={assignedDevices}
          onAddDevice={() => setDeviceDrawerOpen(true)}
        />
        <PatientCareTeamCard
          careTeam={careTeam}
          onEdit={() => setCareTeamDrawerOpen(true)}
        />
      </div>

      {/* Metrics Bar */}
      <MetricsBar
        metrics={metrics || {
          totalReadings: { current: 0, required: 16 },
          totalMinutes: { current: 0, required: 20 },
          lastCall: null,
          callStatus: null,
        }}
        isLoading={metricsLoading}
      />

      {/* Vitals Dashboard with Tabs */}
      <VitalsDashboard
        patientId={patientId}
        patient={patient}
        carePlans={carePlans}
        alerts={alerts}
        devices={devices}
        isLoading={loading}
        onRefresh={loadPatientData}
        onAcknowledgeAlert={handleAcknowledgeAlert}
        onResolveAlert={handleResolveAlert}
        onAddDevice={() => setDeviceDrawerOpen(true)}
        onRemoveDevice={handleRemoveDevice}
      >
        {/* Quick Summary */}
        <QuickSummary
          summaryData={summaryData}
        />

        {/* Vitals Chart */}
        <VitalsChart readings={chartReadings} vitalType="blood_pressure" />
      </VitalsDashboard>

      {/* Add Condition Drawer */}
      <AddConditionDrawer
        isOpen={conditionDrawerOpen}
        onClose={() => setConditionDrawerOpen(false)}
        patientId={patientId}
        onConditionAdded={handleConditionAdded}
      />

      {/* Add Device Drawer */}
      <AddDeviceDrawer
        isOpen={deviceDrawerOpen}
        onClose={() => setDeviceDrawerOpen(false)}
        patientId={patientId}
        onDeviceAdded={handleDeviceAdded}
      />

      {/* Edit Care Team Drawer */}
      <EditCareTeamDrawer
        isOpen={careTeamDrawerOpen}
        onClose={() => setCareTeamDrawerOpen(false)}
        patientId={patientId}
        currentTeam={careTeam}
        onTeamUpdated={handleCareTeamUpdated}
      />
    </div>
  );
}
