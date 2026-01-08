'use client';

import { useState } from 'react';
import { X, Loader2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { patientsApi } from '@/lib/api/patients';

interface AddConditionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onConditionAdded: (condition: string) => void;
}

// Common conditions list
const COMMON_CONDITIONS = [
  { code: 'HTN', name: 'Hypertension', icd: 'I10' },
  { code: 'DM2', name: 'Type 2 Diabetes', icd: 'E11.9' },
  { code: 'CHF', name: 'Congestive Heart Failure', icd: 'I50.9' },
  { code: 'COPD', name: 'Chronic Obstructive Pulmonary Disease', icd: 'J44.9' },
  { code: 'CKD', name: 'Chronic Kidney Disease', icd: 'N18.9' },
  { code: 'AFib', name: 'Atrial Fibrillation', icd: 'I48.91' },
  { code: 'CAD', name: 'Coronary Artery Disease', icd: 'I25.10' },
  { code: 'Asthma', name: 'Asthma', icd: 'J45.909' },
];

export function AddConditionDrawer({ isOpen, onClose, patientId, onConditionAdded }: AddConditionDrawerProps) {
  const { t } = useTranslations('patientDetail');
  const [search, setSearch] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [customCondition, setCustomCondition] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredConditions = COMMON_CONDITIONS.filter(
    c => c.name.toLowerCase().includes(search.toLowerCase()) ||
         c.code.toLowerCase().includes(search.toLowerCase()) ||
         c.icd.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    const conditionToAdd = selectedCondition || customCondition;
    if (!conditionToAdd) return;

    setIsLoading(true);
    try {
      await patientsApi.addCondition(patientId, conditionToAdd);
      onConditionAdded(conditionToAdd);
      onClose();
      setSelectedCondition(null);
      setCustomCondition('');
      setSearch('');
    } catch (error) {
      console.error('Failed to add condition:', error);
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
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold">{t('addCondition')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchConditions')}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Conditions List */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs text-gray-500 mb-2">{t('commonConditions')}</p>
          <div className="space-y-1">
            {filteredConditions.map((condition) => (
              <button
                key={condition.code}
                onClick={() => setSelectedCondition(condition.name)}
                className={`w-full text-left p-2 rounded border text-sm ${
                  selectedCondition === condition.name
                    ? 'border-brand bg-brand/5 text-brand'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="font-medium">{condition.name}</span>
                <span className="text-xs text-gray-500 ml-2">ICD: {condition.icd}</span>
              </button>
            ))}
          </div>

          {/* Custom Condition */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">{t('orEnterCustom')}</p>
            <Input
              value={customCondition}
              onChange={(e) => { setCustomCondition(e.target.value); setSelectedCondition(null); }}
              placeholder={t('enterConditionName')}
              className="h-9"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9">
            {t('cancel')}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={isLoading || (!selectedCondition && !customCondition)}
            className="flex-1 h-9"
          >
            {isLoading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
            <Plus className="w-3 h-3 mr-1" />
            {t('add')}
          </Button>
        </div>
      </div>
    </>
  );
}
