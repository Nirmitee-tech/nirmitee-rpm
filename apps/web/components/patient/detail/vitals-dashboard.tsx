'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CareManagementTab, AlertsTab, DevicesTab, AssessmentTab, DocumentsTab, HealthRecordsTab, BillingTab, ThresholdsTab, ScheduleTab } from './tabs';
import { CreateCarePlanDrawer } from './create-care-plan-drawer';
import { StartAssessmentDrawer } from './start-assessment-drawer';
import { patientsApi, type AssessmentType } from '@/lib/api/patients';
import type { Patient, CarePlan, Alert, Device, VitalSummary, VitalReading } from '@/lib/api/patients';
import { thresholdsApi, type VitalType as ThresholdVitalType, type SetThresholdInput } from '@/lib/api/thresholds';
import { VitalsChart } from './vitals-chart';

interface VitalsDashboardProps {
  patientId: string;
  patient: Patient | null;
  carePlans: CarePlan[];
  alerts: Alert[];
  devices: Device[];
  isLoading: boolean;
  onRefresh: () => void;
  onAcknowledgeAlert: (alertId: string) => Promise<void>;
  onResolveAlert: (alertId: string, resolution: string) => Promise<void>;
  onAddDevice: () => void;
  onRemoveDevice: (deviceId: string) => Promise<void>;
  className?: string;
  children?: React.ReactNode;
}

type MainTab =
  | 'vitals'
  | 'care_management'
  | 'health_records'
  | 'assessment'
  | 'alerts'
  | 'schedule'
  | 'thresholds'
  | 'billing'
  | 'devices'
  | 'documents';

type VitalType =
  | 'blood_glucose'
  | 'blood_pressure'
  | 'weight'
  | 'oxygen_saturation'
  | 'temperature';

export function VitalsDashboard({
  patientId,
  patient,
  carePlans,
  alerts,
  devices,
  isLoading,
  onRefresh,
  onAcknowledgeAlert,
  onResolveAlert,
  onAddDevice,
  onRemoveDevice,
  className,
  children,
}: VitalsDashboardProps) {
  const { t } = useTranslations('patientDetail');
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('vitals');
  const [activeVitalType, setActiveVitalType] =
    useState<VitalType>('blood_pressure');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [carePlanDrawerOpen, setCarePlanDrawerOpen] = useState(false);
  const [assessmentDrawerOpen, setAssessmentDrawerOpen] = useState(false);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<AssessmentType | undefined>(undefined);

  // Map frontend assessment type names to backend API types
  const mapAssessmentType = (type: string): AssessmentType => {
    const typeMap: Record<string, AssessmentType> = {
      'PHQ-9': 'PHQ9',
      'GAD-7': 'GAD7',
      'Falls Risk': 'FALLS_RISK',
      'Nutrition': 'NUTRITION',
      'Pain Scale': 'PAIN_SCALE',
      'ADL': 'ADL',
    };
    return typeMap[type] || (type as AssessmentType);
  };

  const handleStartAssessment = (type: string) => {
    setSelectedAssessmentType(mapAssessmentType(type));
    setAssessmentDrawerOpen(true);
  };

  const mainTabs: { id: MainTab; label: string }[] = [
    { id: 'vitals', label: t('tabs.vitals') },
    { id: 'care_management', label: t('tabs.careManagement') },
    { id: 'health_records', label: t('tabs.healthRecords') },
    { id: 'assessment', label: t('tabs.assessment') },
    { id: 'alerts', label: t('tabs.alerts') },
    { id: 'schedule', label: t('tabs.schedule') },
    { id: 'thresholds', label: t('tabs.thresholds') },
    { id: 'billing', label: t('tabs.billing') },
    { id: 'devices', label: t('tabs.devices') },
    { id: 'documents', label: t('tabs.documents') },
  ];

  const vitalTypes: { id: VitalType; label: string }[] = [
    { id: 'blood_glucose', label: t('vitalTypes.bloodGlucose') },
    { id: 'blood_pressure', label: t('vitalTypes.bloodPressure') },
    { id: 'weight', label: t('vitalTypes.weight') },
    { id: 'oxygen_saturation', label: t('vitalTypes.oxygenSaturation') },
    { id: 'temperature', label: t('vitalTypes.temperature') },
  ];

  const handlePreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleGeneratePDF = () => {
    // Open print dialog for the current view
    window.print();
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-0">
        {/* Main Tabs */}
        <div className="border-b">
          <div className="flex overflow-x-auto scrollbar-hide">
            {mainTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id)}
                className={cn(
                  'px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeMainTab === tab.id
                    ? 'text-[#745EE1] dark:text-[#745EE1]' : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                )}
                style={activeMainTab === tab.id ? { borderColor: '#745EE1' } : {}}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vitals Sub-Tabs and Controls */}
        {activeMainTab === 'vitals' && (
          <div className="border-b bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {vitalTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setActiveVitalType(type.id)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors',
                      activeVitalType === type.id
                        ? 'text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border'
                    )}
                    style={activeVitalType === type.id ? { backgroundColor: '#745EE1' } : {}}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {/* Date Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm" className="h-7 text-xs"
                    onClick={handlePreviousDay}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[100px] text-center">
                    {currentDate.toLocaleDateString()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm" className="h-7 text-xs"
                    onClick={handleNextDay}
                    disabled={
                      currentDate.toDateString() === new Date().toDateString()
                    }
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>

                {/* Generate PDF */}
                <Button
                  variant="outline"
                  size="sm" className="h-7 text-xs"
                  onClick={handleGeneratePDF}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  {t('generatePDF')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="p-3">
          {activeMainTab === 'vitals' ? (
            <>
              {activeVitalType === 'blood_pressure' && (
                children || (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    {t('vitalContentPlaceholder')}
                  </div>
                )
              )}
              {activeVitalType === 'blood_glucose' && (
                <BloodGlucoseContent patientId={patientId} />
              )}
              {activeVitalType === 'weight' && (
                <WeightContent patientId={patientId} />
              )}
              {activeVitalType === 'oxygen_saturation' && (
                <OxygenSaturationContent patientId={patientId} />
              )}
              {activeVitalType === 'temperature' && (
                <TemperatureContent patientId={patientId} />
              )}
            </>
          ) : (
            <div className="space-y-2">
              {activeMainTab === 'care_management' && (
                <CareManagementTab
                  patientId={patientId}
                  carePlans={carePlans}
                  isLoading={isLoading}
                  onRefresh={onRefresh}
                  onCreatePlan={() => setCarePlanDrawerOpen(true)}
                />
              )}

              {activeMainTab === 'health_records' && (
                <HealthRecordsTab
                  patientId={patientId}
                  isLoading={isLoading}
                  onRefresh={onRefresh}
                />
              )}

              {activeMainTab === 'assessment' && (
                <AssessmentTab
                  patientId={patientId}
                  isLoading={isLoading}
                  onRefresh={onRefresh}
                  onStartAssessment={handleStartAssessment}
                />
              )}

              {activeMainTab === 'alerts' && (
                <AlertsTab
                  patientId={patientId}
                  alerts={alerts}
                  isLoading={isLoading}
                  onAcknowledge={onAcknowledgeAlert}
                  onResolve={onResolveAlert}
                  onRefresh={onRefresh}
                />
              )}

              {activeMainTab === 'schedule' && (
                <ScheduleTab
                  patientId={patientId}
                  isLoading={isLoading}
                  onRefresh={onRefresh}
                />
              )}

              {activeMainTab === 'thresholds' && (
                <ThresholdsTab
                  patientId={patientId}
                  patientName={patient?.firstName ? `${patient.firstName} ${patient.lastName}` : undefined}
                  onSave={async (thresholds) => {
                    try {
                      // Save each threshold via API
                      for (const [vitalType, config] of Object.entries(thresholds)) {
                        if (config && typeof config === 'object') {
                          await thresholdsApi.setPatientThreshold(
                            patientId,
                            vitalType as ThresholdVitalType,
                            config as SetThresholdInput
                          );
                        }
                      }
                      onRefresh();
                    } catch (err) {
                      console.error('Failed to save thresholds:', err);
                    }
                  }}
                />
              )}

              {activeMainTab === 'billing' && (
                <BillingTab
                  patientId={patientId}
                  enrollmentDate={patient?.enrollmentDate ?? undefined}
                  isLoading={isLoading}
                  onRefresh={onRefresh}
                />
              )}

              {activeMainTab === 'devices' && (
                <DevicesTab
                  patientId={patientId}
                  devices={devices}
                  isLoading={isLoading}
                  onAddDevice={onAddDevice}
                  onRemoveDevice={onRemoveDevice}
                  onRefresh={onRefresh}
                />
              )}

              {activeMainTab === 'documents' && (
                <DocumentsTab
                  patientId={patientId}
                  isLoading={isLoading}
                  onRefresh={onRefresh}
                />
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Create Care Plan Drawer */}
      <CreateCarePlanDrawer
        isOpen={carePlanDrawerOpen}
        onClose={() => setCarePlanDrawerOpen(false)}
        patientId={patientId}
        onCarePlanCreated={() => {
          setCarePlanDrawerOpen(false);
          onRefresh();
        }}
      />

      {/* Start Assessment Drawer */}
      <StartAssessmentDrawer
        isOpen={assessmentDrawerOpen}
        onClose={() => {
          setAssessmentDrawerOpen(false);
          setSelectedAssessmentType(undefined);
        }}
        patientId={patientId}
        onAssessmentCreated={() => {
          setAssessmentDrawerOpen(false);
          setSelectedAssessmentType(undefined);
          onRefresh();
        }}
        preselectedType={selectedAssessmentType}
      />
    </Card>
  );
}

// Reusable Vitals Content Component
interface VitalsContentProps {
  patientId: string;
  vitalType: string;
  chartVitalType: 'blood_pressure' | 'blood_glucose' | 'weight' | 'oxygen' | 'heart_rate' | 'temperature';
  title: string;
  unit: string;
  valueKey: string;
  targetRange?: string;
}

function VitalsContent({ patientId, vitalType, chartVitalType, title, unit, valueKey, targetRange }: VitalsContentProps) {
  const { t } = useTranslations('patientDetail');
  const [vitalsData, setVitalsData] = useState<{
    summary: VitalSummary | null;
    readings: VitalReading[];
    isLoading: boolean;
    error: string | null;
  }>({
    summary: null,
    readings: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchVitals = async () => {
      try {
        setVitalsData(prev => ({ ...prev, isLoading: true, error: null }));
        const response = await patientsApi.getVitals(patientId, { type: vitalType, limit: 50 });
        const summary = response.summary[vitalType] || null;
        setVitalsData({
          summary,
          readings: response.readings,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setVitalsData(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load vitals data',
        }));
      }
    };
    fetchVitals();
  }, [patientId, vitalType]);

  const { summary, readings, isLoading, error } = vitalsData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#745EE1]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        {error}
      </div>
    );
  }

  // Transform readings for chart
  const chartReadings = readings.map(reading => ({
    timestamp: reading.recordedAt,
    value: reading.values?.[valueKey],
    status: reading.status,
  }));

  return (
    <div className="space-y-4">
      {/* Enhanced Vitals Chart - Full Width */}
      <VitalsChart
        readings={chartReadings}
        vitalType={chartVitalType}
        unit={unit}
      />

      {/* Recent Readings Table */}
      {readings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>{t('recentReadings')}</span>
              <span className="text-xs font-normal text-gray-500">
                {readings.length} {t('readings')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-xs text-gray-500">Date/Time</th>
                    <th className="text-right py-2 font-medium text-xs text-gray-500">Value ({unit})</th>
                    <th className="text-center py-2 font-medium text-xs text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.slice(0, 8).map((reading) => (
                    <tr key={reading.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-2 text-gray-600 dark:text-gray-400 text-xs">
                        {new Date(reading.recordedAt).toLocaleString()}
                      </td>
                      <td className="py-2 text-right font-semibold text-sm">
                        {reading.values?.[valueKey] ?? '--'}
                      </td>
                      <td className="py-2 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          reading.status === 'NORMAL' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                          reading.status === 'WARNING' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                          reading.status === 'CRITICAL' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                          {reading.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Blood Glucose Content Component
function BloodGlucoseContent({ patientId }: { patientId: string }) {
  return (
    <VitalsContent
      patientId={patientId}
      vitalType="BLOOD_GLUCOSE"
      chartVitalType="blood_glucose"
      title="Blood Glucose"
      unit="mg/dL"
      valueKey="glucose"
      targetRange="80-130"
    />
  );
}

// Weight Content Component
function WeightContent({ patientId }: { patientId: string }) {
  return (
    <VitalsContent
      patientId={patientId}
      vitalType="WEIGHT"
      chartVitalType="weight"
      title="Weight"
      unit="lbs"
      valueKey="weight"
    />
  );
}

// Oxygen Saturation Content Component
function OxygenSaturationContent({ patientId }: { patientId: string }) {
  return (
    <VitalsContent
      patientId={patientId}
      vitalType="PULSE_OXIMETRY"
      chartVitalType="oxygen"
      title="Oxygen Saturation"
      unit="%"
      valueKey="spo2"
      targetRange="≥95%"
    />
  );
}

// Temperature Content Component
function TemperatureContent({ patientId }: { patientId: string }) {
  return (
    <VitalsContent
      patientId={patientId}
      vitalType="TEMPERATURE"
      chartVitalType="temperature"
      title="Temperature"
      unit="°F"
      valueKey="temperature"
      targetRange="97.8-99.1"
    />
  );
}
