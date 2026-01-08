'use client';

import { useState } from 'react';
import { X, Loader2, Plus, Trash2, Target, Activity, Pill, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Badge } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { patientsApi } from '@/lib/api/patients';
import { cn } from '@/lib/utils';

interface CreateCarePlanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onCarePlanCreated: () => void;
}

interface Goal {
  description: string;
  targetDate: string;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

interface VitalThreshold {
  min?: number;
  max?: number;
  critical?: number;
}

// Common vital types for thresholds
const VITAL_TYPES = [
  { key: 'bloodPressureSystolic', label: 'Blood Pressure (Systolic)', unit: 'mmHg' },
  { key: 'bloodPressureDiastolic', label: 'Blood Pressure (Diastolic)', unit: 'mmHg' },
  { key: 'bloodGlucose', label: 'Blood Glucose', unit: 'mg/dL' },
  { key: 'weight', label: 'Weight', unit: 'lbs' },
  { key: 'heartRate', label: 'Heart Rate', unit: 'bpm' },
  { key: 'oxygenSaturation', label: 'Oxygen Saturation', unit: '%' },
];

export function CreateCarePlanDrawer({
  isOpen,
  onClose,
  patientId,
  onCarePlanCreated,
}: CreateCarePlanDrawerProps) {
  const { t } = useTranslations('careManagement');
  const { t: tCommon } = useTranslations('common');

  // Form state
  const [goals, setGoals] = useState<Goal[]>([{ description: '', targetDate: '' }]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [vitalThresholds, setVitalThresholds] = useState<Record<string, VitalThreshold>>({});
  const [instructions, setInstructions] = useState('');
  const [activateImmediately, setActivateImmediately] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'goals' | 'thresholds' | 'medications' | 'instructions'>('goals');

  // Goal handlers
  const addGoal = () => setGoals([...goals, { description: '', targetDate: '' }]);
  const removeGoal = (idx: number) => setGoals(goals.filter((_, i) => i !== idx));
  const updateGoal = (idx: number, field: keyof Goal, value: string) => {
    const updated = [...goals];
    updated[idx][field] = value;
    setGoals(updated);
  };

  // Medication handlers
  const addMedication = () => setMedications([...medications, { name: '', dosage: '', frequency: '' }]);
  const removeMedication = (idx: number) => setMedications(medications.filter((_, i) => i !== idx));
  const updateMedication = (idx: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[idx][field] = value;
    setMedications(updated);
  };

  // Threshold handlers
  const updateThreshold = (vitalKey: string, field: keyof VitalThreshold, value: string) => {
    setVitalThresholds((prev) => ({
      ...prev,
      [vitalKey]: {
        ...prev[vitalKey],
        [field]: value ? Number(value) : undefined,
      },
    }));
  };

  const handleSubmit = async () => {
    // Validate at least one goal
    const validGoals = goals.filter((g) => g.description.trim());
    if (validGoals.length === 0) {
      setError(t('errorAtLeastOneGoal') || 'Please add at least one goal');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await patientsApi.createCarePlan(patientId, {
        goals: validGoals.map((g) => ({
          description: g.description,
          targetDate: g.targetDate || undefined,
          status: 'pending',
        })),
        vitalThresholds: Object.keys(vitalThresholds).length > 0 ? vitalThresholds : undefined,
        medications: medications.filter((m) => m.name.trim()).length > 0
          ? medications.filter((m) => m.name.trim())
          : undefined,
        instructions: instructions.trim() || undefined,
        activateImmediately,
      });

      onCarePlanCreated();
      onClose();
      // Reset form
      setGoals([{ description: '', targetDate: '' }]);
      setMedications([]);
      setVitalThresholds({});
      setInstructions('');
    } catch (err) {
      console.error('Failed to create care plan:', err);
      setError(t('errorCreatingPlan') || 'Failed to create care plan');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#745EE1]/10 to-transparent">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#745EE1]" />
              {t('createPlan')}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('createPlanDescription') || 'Create a new care plan for this patient'}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
          {[
            { id: 'goals', icon: Target, label: t('goals') || 'Goals' },
            { id: 'thresholds', icon: Activity, label: t('vitalThresholds') || 'Thresholds' },
            { id: 'medications', icon: Pill, label: t('medications') || 'Medications' },
            { id: 'instructions', icon: FileText, label: t('careInstructions') || 'Instructions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as typeof activeSection)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                activeSection === tab.id
                  ? "border-[#745EE1] text-[#745EE1]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Goals Section */}
          {activeSection === 'goals' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-3">{t('goalsDescription') || 'Define care goals for the patient'}</p>
              {goals.map((goal, idx) => (
                <div key={idx} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                        {t('goalDescription') || 'Goal Description'} *
                      </label>
                      <Input
                        value={goal.description}
                        onChange={(e) => updateGoal(idx, 'description', e.target.value)}
                        placeholder={t('goalPlaceholder') || 'e.g., Maintain BP below 140/90 mmHg'}
                        className="text-sm"
                      />
                    </div>
                    {goals.length > 1 && (
                      <button
                        onClick={() => removeGoal(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded mt-5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      {t('targetDate') || 'Target Date'}
                    </label>
                    <Input
                      type="date"
                      value={goal.targetDate}
                      onChange={(e) => updateGoal(idx, 'targetDate', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addGoal} className="w-full">
                <Plus className="w-3.5 h-3.5 mr-1" />
                {t('addGoal') || 'Add Goal'}
              </Button>
            </div>
          )}

          {/* Thresholds Section */}
          {activeSection === 'thresholds' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-3">{t('thresholdsDescription') || 'Set alert thresholds for vital signs'}</p>
              {VITAL_TYPES.map((vital) => (
                <div key={vital.key} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-sm font-medium mb-2">
                    {vital.label} <span className="text-xs text-gray-400">({vital.unit})</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 block">{t('min') || 'Min'}</label>
                      <Input
                        type="number"
                        value={vitalThresholds[vital.key]?.min || ''}
                        onChange={(e) => updateThreshold(vital.key, 'min', e.target.value)}
                        placeholder="--"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 block">{t('max') || 'Max'}</label>
                      <Input
                        type="number"
                        value={vitalThresholds[vital.key]?.max || ''}
                        onChange={(e) => updateThreshold(vital.key, 'max', e.target.value)}
                        placeholder="--"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 block">{t('critical') || 'Critical'}</label>
                      <Input
                        type="number"
                        value={vitalThresholds[vital.key]?.critical || ''}
                        onChange={(e) => updateThreshold(vital.key, 'critical', e.target.value)}
                        placeholder="--"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Medications Section */}
          {activeSection === 'medications' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-3">{t('medicationsDescription') || 'Add medications for the patient'}</p>
              {medications.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Pill className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">{t('noMedications') || 'No medications added'}</p>
                </div>
              ) : (
                medications.map((med, idx) => (
                  <div key={idx} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                          {t('medicationName') || 'Medication Name'}
                        </label>
                        <Input
                          value={med.name}
                          onChange={(e) => updateMedication(idx, 'name', e.target.value)}
                          placeholder={t('medicationNamePlaceholder') || 'e.g., Metformin'}
                          className="text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeMedication(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded mt-5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                          {t('dosage') || 'Dosage'}
                        </label>
                        <Input
                          value={med.dosage}
                          onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                          placeholder={t('dosagePlaceholder') || 'e.g., 500mg'}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                          {t('frequency') || 'Frequency'}
                        </label>
                        <Input
                          value={med.frequency}
                          onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                          placeholder={t('frequencyPlaceholder') || 'e.g., Twice daily'}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
              <Button variant="outline" size="sm" onClick={addMedication} className="w-full">
                <Plus className="w-3.5 h-3.5 mr-1" />
                {t('addMedication') || 'Add Medication'}
              </Button>
            </div>
          )}

          {/* Instructions Section */}
          {activeSection === 'instructions' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-3">{t('instructionsDescription') || 'Add care instructions and notes'}</p>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={t('instructionsPlaceholder') || 'Enter care instructions, dietary recommendations, exercise guidance, etc.'}
                className="w-full h-48 p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 resize-none focus:ring-2 focus:ring-[#745EE1] focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
          {/* Activate Immediately Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={activateImmediately}
              onChange={(e) => setActivateImmediately(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#745EE1] focus:ring-[#745EE1]"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('activateImmediately') || 'Activate care plan immediately'}
            </span>
            {activateImmediately && (
              <Badge className="bg-green-100 text-green-700 text-[10px]">ACTIVE</Badge>
            )}
            {!activateImmediately && (
              <Badge className="bg-gray-100 text-gray-600 text-[10px]">DRAFT</Badge>
            )}
          </label>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 bg-[#745EE1] hover:bg-[#6249d1]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('creating') || 'Creating...'}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('createPlan')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
