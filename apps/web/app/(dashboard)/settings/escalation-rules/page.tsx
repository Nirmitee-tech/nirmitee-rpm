'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  ArrowUpCircle,
  Users,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import {
  escalationApi,
  EscalationRule,
  CreateEscalationRuleInput,
  EscalationStep,
  AlertSeverity,
} from '@/lib/api/escalation';
import { VitalType } from '@/lib/api/thresholds';

const SEVERITY_OPTIONS: { value: AlertSeverity; label: string; color: string }[] = [
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-700' },
  { value: 'SIGNIFICANT', label: 'Significant', color: 'bg-amber-100 text-amber-700' },
  { value: 'INFORMATIONAL', label: 'Informational', color: 'bg-blue-100 text-blue-700' },
];

const VITAL_TYPE_OPTIONS: { value: VitalType; label: string }[] = [
  { value: 'BLOOD_PRESSURE', label: 'Blood Pressure' },
  { value: 'BLOOD_GLUCOSE', label: 'Blood Glucose' },
  { value: 'HEART_RATE', label: 'Heart Rate' },
  { value: 'PULSE_OXIMETRY', label: 'Pulse Oximetry' },
  { value: 'WEIGHT', label: 'Weight' },
  { value: 'TEMPERATURE', label: 'Temperature' },
];

const ROLE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'NURSE', label: 'Nurse' },
  { value: 'PRIMARY_PHYSICIAN', label: 'Primary Physician' },
  { value: 'CARE_COORDINATOR', label: 'Care Coordinator' },
  { value: 'SPECIALIST', label: 'Specialist' },
  { value: 'ON_CALL', label: 'On-Call Staff' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'ADMIN', label: 'Administrator' },
];

interface RuleFormData {
  name: string;
  description: string;
  severity: AlertSeverity;
  vitalTypes: VitalType[];
  escalationChain: EscalationStep[];
  isActive: boolean;
  autoAssign: boolean;
  priority: number;
}

const emptyFormData: RuleFormData = {
  name: '',
  description: '',
  severity: 'CRITICAL',
  vitalTypes: [],
  escalationChain: [{ level: 1, roleType: 'NURSE', delayMinutes: 15 }],
  isActive: true,
  autoAssign: true,
  priority: 1,
};

export default function EscalationRulesPage() {
  const { t } = useTranslations('settings.escalation');
  const { t: tCommon } = useTranslations('common');

  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(emptyFormData);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await escalationApi.getRules();
      setRules(data);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load escalation rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleOpenForm = (rule?: EscalationRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        description: rule.description || '',
        severity: rule.severity,
        vitalTypes: rule.vitalTypes,
        escalationChain: rule.escalationChain as EscalationStep[],
        isActive: rule.isActive,
        autoAssign: rule.autoAssign,
        priority: rule.priority,
      });
    } else {
      setEditingRule(null);
      setFormData(emptyFormData);
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRule(null);
    setFormData(emptyFormData);
  };

  const handleSave = async () => {
    if (!formData.name || formData.escalationChain.length === 0) {
      setError(t('validationError'));
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const input: CreateEscalationRuleInput = {
        name: formData.name,
        description: formData.description || undefined,
        severity: formData.severity,
        vitalTypes: formData.vitalTypes.length > 0 ? formData.vitalTypes : undefined,
        escalationChain: formData.escalationChain,
        isActive: formData.isActive,
        autoAssign: formData.autoAssign,
        priority: formData.priority,
      };

      if (editingRule) {
        await escalationApi.updateRule(editingRule.id, input);
        setSuccess(t('ruleUpdated'));
      } else {
        await escalationApi.createRule(input);
        setSuccess(t('ruleCreated'));
      }

      setTimeout(() => setSuccess(null), 2000);
      handleCloseForm();
      loadRules();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      setDeleting(ruleId);
      setError(null);
      await escalationApi.deleteRule(ruleId);
      setSuccess(t('ruleDeleted'));
      setTimeout(() => setSuccess(null), 2000);
      loadRules();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to delete rule');
    } finally {
      setDeleting(null);
    }
  };

  const addEscalationStep = () => {
    const lastStep = formData.escalationChain[formData.escalationChain.length - 1];
    setFormData({
      ...formData,
      escalationChain: [
        ...formData.escalationChain,
        {
          level: (lastStep?.level || 0) + 1,
          roleType: 'PRIMARY_PHYSICIAN',
          delayMinutes: 15,
        },
      ],
    });
  };

  const removeEscalationStep = (index: number) => {
    setFormData({
      ...formData,
      escalationChain: formData.escalationChain.filter((_, i) => i !== index),
    });
  };

  const updateEscalationStep = (index: number, field: keyof EscalationStep, value: unknown) => {
    setFormData({
      ...formData,
      escalationChain: formData.escalationChain.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      ),
    });
  };

  const toggleRuleExpanded = (ruleId: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#171717] dark:text-white mb-1 flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-[#745EE1]" />
              {t('title')}
            </h2>
            <p className="text-sm text-[#737373]">{t('subtitle')}</p>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addRule')}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-12 text-center">
          <ArrowUpCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-[#737373]">{t('noRules')}</p>
          <Button variant="outline" className="mt-4" onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('createFirstRule')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => {
            const isExpanded = expandedRules.has(rule.id);
            const severityOption = SEVERITY_OPTIONS.find((s) => s.value === rule.severity);

            return (
              <div
                key={rule.id}
                className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl overflow-hidden"
              >
                {/* Rule Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  onClick={() => toggleRuleExpanded(rule.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                        <h3 className="font-medium text-[#171717] dark:text-white">{rule.name}</h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${severityOption?.color}`}
                      >
                        {severityOption?.label}
                      </span>
                      {!rule.isActive && (
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                          {t('inactive')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenForm(rule)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                        disabled={deleting === rule.id}
                      >
                        {deleting === rule.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {rule.description && (
                    <p className="mt-1 text-sm text-[#737373] ml-6">{rule.description}</p>
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#E5E5E5] dark:border-[#212121] pt-4 ml-6">
                    {/* Vital Types */}
                    {rule.vitalTypes.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">{t('appliesTo')}:</p>
                        <div className="flex flex-wrap gap-1">
                          {rule.vitalTypes.map((vt) => {
                            const option = VITAL_TYPE_OPTIONS.find((o) => o.value === vt);
                            return (
                              <span
                                key={vt}
                                className="px-2 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                              >
                                {option?.label || vt}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Escalation Chain */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        {t('escalationChain')}:
                      </p>
                      <div className="space-y-2">
                        {(rule.escalationChain as EscalationStep[]).map((step, index) => {
                          const roleOption = ROLE_TYPE_OPTIONS.find(
                            (r) => r.value === step.roleType
                          );
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
                            >
                              <span className="w-6 h-6 rounded-full bg-[#745EE1] text-white flex items-center justify-center text-xs font-medium">
                                {step.level}
                              </span>
                              <Users className="h-4 w-4" />
                              <span>{roleOption?.label || step.roleType}</span>
                              <Clock className="h-4 w-4" />
                              <span>
                                {t('afterMinutes', { minutes: step.delayMinutes })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseForm}
          />
          <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-xl border border-[#E5E5E5] dark:border-[#212121]">
            {/* Form Header */}
            <div className="sticky top-0 bg-white dark:bg-[#0a0a0a] border-b border-[#E5E5E5] dark:border-[#212121] p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#171717] dark:text-white">
                {editingRule ? t('editRule') : t('createRule')}
              </h3>
              <button
                onClick={handleCloseForm}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-white mb-1">
                  {t('ruleName')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#D7D7D7] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#745EE1]"
                  placeholder={t('ruleNamePlaceholder')}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-white mb-1">
                  {t('description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#D7D7D7] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#745EE1]"
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-white mb-1">
                  {t('severity')} *
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) =>
                    setFormData({ ...formData, severity: e.target.value as AlertSeverity })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#D7D7D7] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#745EE1]"
                >
                  {SEVERITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vital Types */}
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-white mb-1">
                  {t('vitalTypes')}
                </label>
                <p className="text-xs text-gray-500 mb-2">{t('vitalTypesHint')}</p>
                <div className="flex flex-wrap gap-2">
                  {VITAL_TYPE_OPTIONS.map((option) => {
                    const isSelected = formData.vitalTypes.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            vitalTypes: isSelected
                              ? formData.vitalTypes.filter((v) => v !== option.value)
                              : [...formData.vitalTypes, option.value],
                          });
                        }}
                        className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-[#745EE1] text-white border-[#745EE1]'
                            : 'border-[#D7D7D7] dark:border-[#212121] hover:border-[#745EE1]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Escalation Chain */}
              <div>
                <label className="block text-sm font-medium text-[#171717] dark:text-white mb-1">
                  {t('escalationChain')} *
                </label>
                <p className="text-xs text-gray-500 mb-3">{t('escalationChainHint')}</p>
                <div className="space-y-3">
                  {formData.escalationChain.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                    >
                      <span className="w-6 h-6 rounded-full bg-[#745EE1] text-white flex items-center justify-center text-xs font-medium shrink-0">
                        {step.level}
                      </span>
                      <select
                        value={step.roleType}
                        onChange={(e) => updateEscalationStep(index, 'roleType', e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-[#D7D7D7] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#745EE1]"
                      >
                        {ROLE_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={step.delayMinutes}
                          onChange={(e) =>
                            updateEscalationStep(index, 'delayMinutes', Number(e.target.value))
                          }
                          min={1}
                          className="w-16 px-2 py-1.5 text-sm text-center rounded-lg border border-[#D7D7D7] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#745EE1]"
                        />
                        <span className="text-xs text-gray-500">{t('minutes')}</span>
                      </div>
                      {formData.escalationChain.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEscalationStep(index)}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={addEscalationStep}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('addStep')}
                </Button>
              </div>

              {/* Options */}
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-[#745EE1] focus:ring-[#745EE1]"
                  />
                  <span className="text-sm text-[#171717] dark:text-white">{t('ruleActive')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoAssign}
                    onChange={(e) => setFormData({ ...formData, autoAssign: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-[#745EE1] focus:ring-[#745EE1]"
                  />
                  <span className="text-sm text-[#171717] dark:text-white">{t('autoAssign')}</span>
                </label>
              </div>
            </div>

            {/* Form Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-[#0a0a0a] border-t border-[#E5E5E5] dark:border-[#212121] p-4 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={handleCloseForm}>
                {tCommon('cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {tCommon('saving')}
                  </>
                ) : (
                  <>{editingRule ? tCommon('update') : tCommon('create')}</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
