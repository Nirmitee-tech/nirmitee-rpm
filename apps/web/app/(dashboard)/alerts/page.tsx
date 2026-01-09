'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Activity,
  Heart,
  Droplet,
  Wind,
  Scale,
  AlertTriangle,
  AlertCircle,
  Info,
  Bell,
  Clock,
  CheckCircle2,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@nirmitee/ui';
import { ThresholdSlider, RuleBuilder, type LegacyRule, type Rule } from '@/components/alerts';
import { useTranslations } from '@/lib/i18n/i18n-context';
import {
  alertRulesApi,
  alertsApi,
  thresholdsApi,
  type AlertRule,
  type AlertCondition,
  type VitalThreshold,
} from '@/lib/api';
import type { Alert } from '@/lib/api/alerts';

// Vital icons mapping
const VITAL_ICONS: Record<string, React.ElementType> = {
  blood_pressure_systolic: Activity,
  blood_pressure_diastolic: Activity,
  BLOOD_PRESSURE: Activity,
  heart_rate: Heart,
  HEART_RATE: Heart,
  blood_glucose: Droplet,
  BLOOD_GLUCOSE: Droplet,
  spo2: Wind,
  PULSE_OXIMETRY: Wind,
  weight: Scale,
  WEIGHT: Scale,
  temperature: Activity,
  TEMPERATURE: Activity,
};

const VITAL_COLORS: Record<string, string> = {
  blood_pressure_systolic: '#ef4444',
  blood_pressure_diastolic: '#f97316',
  BLOOD_PRESSURE: '#ef4444',
  heart_rate: '#ec4899',
  HEART_RATE: '#ec4899',
  blood_glucose: '#8b5cf6',
  BLOOD_GLUCOSE: '#8b5cf6',
  spo2: '#06b6d4',
  PULSE_OXIMETRY: '#06b6d4',
  weight: '#10b981',
  WEIGHT: '#10b981',
  temperature: '#f59e0b',
  TEMPERATURE: '#f59e0b',
};

const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', icon: AlertTriangle, label: 'Critical' },
  warning: { color: '#f59e0b', icon: AlertCircle, label: 'Warning' },
  info: { color: '#3b82f6', icon: Info, label: 'Info' },
  CRITICAL: { color: '#ef4444', icon: AlertTriangle, label: 'Critical' },
  SIGNIFICANT: { color: '#f59e0b', icon: AlertCircle, label: 'Warning' },
  INFORMATIONAL: { color: '#3b82f6', icon: Info, label: 'Info' },
};

// Map API severity to UI severity
const mapApiSeverityToUI = (severity: string): 'critical' | 'warning' | 'info' => {
  switch (severity) {
    case 'CRITICAL':
      return 'critical';
    case 'SIGNIFICANT':
      return 'warning';
    case 'INFORMATIONAL':
    default:
      return 'info';
  }
};

// Map UI severity to API severity
const mapUISeverityToApi = (severity: string): 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL' => {
  switch (severity) {
    case 'critical':
      return 'CRITICAL';
    case 'warning':
      return 'SIGNIFICANT';
    case 'info':
    default:
      return 'INFORMATIONAL';
  }
};

// Extended rule type for UI
interface ExtendedRule extends LegacyRule {
  triggeredCount: number;
  lastTriggered: string;
}

// Convert AlertRule from API to UI format
const apiRuleToUIRule = (rule: AlertRule): ExtendedRule => ({
  id: rule.id,
  name: rule.name,
  description: rule.description || '',
  conditions: (rule.conditions as AlertCondition[]).map((c) => ({
    id: c.id,
    vital: c.vital,
    operator: c.operator,
    value: c.value,
  })),
  conditionLogic: rule.conditionLogic,
  severity: mapApiSeverityToUI(rule.severity),
  actions: rule.actions,
  isEnabled: rule.isEnabled,
  triggeredCount: rule.triggeredCount,
  lastTriggered: rule.lastTriggeredAt || '',
});

// Convert UI rule to API format
const uiRuleToApiRule = (rule: LegacyRule): Parameters<typeof alertRulesApi.createRule>[0] => ({
  name: rule.name,
  description: rule.description,
  conditions: rule.conditions.map((c) => ({
    id: c.id,
    vital: c.vital,
    operator: c.operator as 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq',
    value: c.value,
  })),
  conditionLogic: rule.conditionLogic,
  severity: mapUISeverityToApi(rule.severity),
  actions: rule.actions,
  isEnabled: rule.isEnabled,
});

// Default thresholds (used when org thresholds not set)
const defaultThresholds = {
  blood_pressure_systolic: { low: 90, high: 140, normalMin: 100, normalMax: 120 },
  blood_pressure_diastolic: { low: 60, high: 90, normalMin: 65, normalMax: 80 },
  heart_rate: { low: 50, high: 100, normalMin: 60, normalMax: 90 },
  blood_glucose: { low: 70, high: 180, normalMin: 80, normalMax: 140 },
  spo2: { low: 92, high: 100, normalMin: 95, normalMax: 100 },
  weight: { low: -5, high: 5, normalMin: -2, normalMax: 2 },
};

type TabType = 'rules' | 'thresholds' | 'alerts';

export default function AlertsPage() {
  const { t } = useTranslations('alerts');
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [rules, setRules] = useState<ExtendedRule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [orgThresholds, setOrgThresholds] = useState<VitalThreshold[]>([]);

  // Loading states
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingThresholds, setLoadingThresholds] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);

  // UI states
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ExtendedRule | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Fetch rules
  const fetchRules = useCallback(async () => {
    try {
      setLoadingRules(true);
      const response = await alertRulesApi.getRules();
      setRules(response.rules.map(apiRuleToUIRule));
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoadingRules(false);
    }
  }, []);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      setLoadingAlerts(true);
      const response = await alertsApi.listAlerts({ limit: 50 });
      setAlerts(response.alerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  // Fetch thresholds
  const fetchThresholds = useCallback(async () => {
    try {
      setLoadingThresholds(true);
      const data = await thresholdsApi.getOrganizationThresholds();
      setOrgThresholds(data);

      // Map to UI format
      const mapped = { ...defaultThresholds };
      for (const threshold of data) {
        const vitalKey = threshold.vitalType.toLowerCase();
        if (vitalKey === 'blood_pressure') {
          mapped.blood_pressure_systolic = {
            low: threshold.criticalMin || mapped.blood_pressure_systolic.low,
            high: threshold.criticalMax || mapped.blood_pressure_systolic.high,
            normalMin: threshold.warningMin || mapped.blood_pressure_systolic.normalMin,
            normalMax: threshold.warningMax || mapped.blood_pressure_systolic.normalMax,
          };
          mapped.blood_pressure_diastolic = {
            low: threshold.criticalMinSecondary || mapped.blood_pressure_diastolic.low,
            high: threshold.criticalMaxSecondary || mapped.blood_pressure_diastolic.high,
            normalMin: threshold.warningMinSecondary || mapped.blood_pressure_diastolic.normalMin,
            normalMax: threshold.warningMaxSecondary || mapped.blood_pressure_diastolic.normalMax,
          };
        } else if (vitalKey === 'heart_rate') {
          mapped.heart_rate = {
            low: threshold.criticalMin || mapped.heart_rate.low,
            high: threshold.criticalMax || mapped.heart_rate.high,
            normalMin: threshold.warningMin || mapped.heart_rate.normalMin,
            normalMax: threshold.warningMax || mapped.heart_rate.normalMax,
          };
        } else if (vitalKey === 'blood_glucose') {
          mapped.blood_glucose = {
            low: threshold.criticalMin || mapped.blood_glucose.low,
            high: threshold.criticalMax || mapped.blood_glucose.high,
            normalMin: threshold.warningMin || mapped.blood_glucose.normalMin,
            normalMax: threshold.warningMax || mapped.blood_glucose.normalMax,
          };
        } else if (vitalKey === 'pulse_oximetry') {
          mapped.spo2 = {
            low: threshold.criticalMin || mapped.spo2.low,
            high: threshold.criticalMax || mapped.spo2.high,
            normalMin: threshold.warningMin || mapped.spo2.normalMin,
            normalMax: threshold.warningMax || mapped.spo2.normalMax,
          };
        } else if (vitalKey === 'weight') {
          mapped.weight = {
            low: threshold.criticalMin || mapped.weight.low,
            high: threshold.criticalMax || mapped.weight.high,
            normalMin: threshold.warningMin || mapped.weight.normalMin,
            normalMax: threshold.warningMax || mapped.weight.normalMax,
          };
        }
      }
      setThresholds(mapped);
    } catch (error) {
      console.error('Failed to fetch thresholds:', error);
    } finally {
      setLoadingThresholds(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchRules();
    fetchAlerts();
    fetchThresholds();
  }, [fetchRules, fetchAlerts, fetchThresholds]);

  const handleSaveRule = async (rule: Rule | LegacyRule) => {
    // Convert Rule to LegacyRule if needed
    const legacyRule: LegacyRule = 'conditions' in rule
      ? rule
      : {
          id: rule.id,
          name: rule.name,
          description: rule.description,
          conditions: rule.conditionGroups.flatMap(g => g.conditions),
          conditionLogic: rule.conditionGroups.length === 1 ? rule.conditionGroups[0].logic : rule.groupLogic,
          severity: rule.severity,
          actions: rule.actions,
          isEnabled: rule.isEnabled,
        };

    try {
      setSavingRule(true);

      if (editingRule) {
        // Update existing rule
        const updated = await alertRulesApi.updateRule(editingRule.id, uiRuleToApiRule(legacyRule));
        setRules(rules.map((r) => (r.id === updated.id ? apiRuleToUIRule(updated) : r)));
      } else {
        // Create new rule
        const created = await alertRulesApi.createRule(uiRuleToApiRule(legacyRule));
        setRules([...rules, apiRuleToUIRule(created)]);
      }

      setIsRuleModalOpen(false);
      setEditingRule(null);
    } catch (error) {
      console.error('Failed to save rule:', error);
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await alertRulesApi.deleteRule(id);
      setRules(rules.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
    setOpenDropdown(null);
  };

  const handleToggleRule = async (id: string) => {
    try {
      const updated = await alertRulesApi.toggleRule(id);
      setRules(rules.map((r) => (r.id === id ? apiRuleToUIRule(updated) : r)));
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
    setOpenDropdown(null);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const updated = await alertsApi.acknowledgeAlert(alertId);
      setAlerts(alerts.map((a) => (a.id === alertId ? updated : a)));
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleSaveThresholds = async () => {
    try {
      setSavingThresholds(true);

      // Save blood pressure thresholds
      await thresholdsApi.setOrganizationThreshold('BLOOD_PRESSURE', {
        criticalMin: thresholds.blood_pressure_systolic.low,
        criticalMax: thresholds.blood_pressure_systolic.high,
        warningMin: thresholds.blood_pressure_systolic.normalMin,
        warningMax: thresholds.blood_pressure_systolic.normalMax,
        criticalMinSecondary: thresholds.blood_pressure_diastolic.low,
        criticalMaxSecondary: thresholds.blood_pressure_diastolic.high,
        warningMinSecondary: thresholds.blood_pressure_diastolic.normalMin,
        warningMaxSecondary: thresholds.blood_pressure_diastolic.normalMax,
        unit: 'mmHg',
      });

      // Save heart rate thresholds
      await thresholdsApi.setOrganizationThreshold('HEART_RATE', {
        criticalMin: thresholds.heart_rate.low,
        criticalMax: thresholds.heart_rate.high,
        warningMin: thresholds.heart_rate.normalMin,
        warningMax: thresholds.heart_rate.normalMax,
        unit: 'bpm',
      });

      // Save blood glucose thresholds
      await thresholdsApi.setOrganizationThreshold('BLOOD_GLUCOSE', {
        criticalMin: thresholds.blood_glucose.low,
        criticalMax: thresholds.blood_glucose.high,
        warningMin: thresholds.blood_glucose.normalMin,
        warningMax: thresholds.blood_glucose.normalMax,
        unit: 'mg/dL',
      });

      // Save SpO2 thresholds
      await thresholdsApi.setOrganizationThreshold('PULSE_OXIMETRY', {
        criticalMin: thresholds.spo2.low,
        criticalMax: thresholds.spo2.high,
        warningMin: thresholds.spo2.normalMin,
        warningMax: thresholds.spo2.normalMax,
        unit: '%',
      });

      // Save weight thresholds
      await thresholdsApi.setOrganizationThreshold('WEIGHT', {
        criticalMin: thresholds.weight.low,
        criticalMax: thresholds.weight.high,
        warningMin: thresholds.weight.normalMin,
        warningMax: thresholds.weight.normalMax,
        unit: 'lbs',
      });

      // Refresh thresholds
      await fetchThresholds();
    } catch (error) {
      console.error('Failed to save thresholds:', error);
    } finally {
      setSavingThresholds(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
      case 'active':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
            <Bell className="w-3 h-3" />
            {t('active')}
          </span>
        );
      case 'ACKNOWLEDGED':
      case 'acknowledged':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">
            <Clock className="w-3 h-3" />
            {t('acknowledged')}
          </span>
        );
      case 'RESOLVED':
      case 'resolved':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            {t('resolved')}
          </span>
        );
      default:
        return null;
    }
  };

  const stats = {
    totalRules: rules.length,
    activeRules: rules.filter((r) => r.isEnabled).length,
    totalAlerts: alerts.length,
    activeAlerts: alerts.filter((a) => a.status === 'NEW').length,
    criticalAlerts: alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'NEW').length,
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0a0a14]">
      {/* Header */}
      <div className="bg-white dark:bg-[#0f0f1a] border-b border-[#E5E5E5] dark:border-[#1f1f2e]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#171717] dark:text-white">{t('title')}</h1>
              <p className="text-sm text-[#737373] mt-1">{t('subtitle')}</p>
            </div>
            <button
              onClick={() => {
                setEditingRule(null);
                setIsRuleModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              {t('createRule')}
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-5 gap-4 mt-4">
            <div className="p-3 rounded-xl bg-[#FAFAFA] dark:bg-[#1a1a2e]">
              <p className="text-xs text-[#737373]">{t('stats.totalRules')}</p>
              <p className="text-xl font-bold text-[#171717] dark:text-white mt-1">{stats.totalRules}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFAFA] dark:bg-[#1a1a2e]">
              <p className="text-xs text-[#737373]">{t('stats.activeRules')}</p>
              <p className="text-xl font-bold text-green-500 mt-1">{stats.activeRules}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFAFA] dark:bg-[#1a1a2e]">
              <p className="text-xs text-[#737373]">{t('stats.totalAlerts')}</p>
              <p className="text-xl font-bold text-[#171717] dark:text-white mt-1">{stats.totalAlerts}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFAFA] dark:bg-[#1a1a2e]">
              <p className="text-xs text-[#737373]">{t('stats.activeAlerts')}</p>
              <p className="text-xl font-bold text-yellow-500 mt-1">{stats.activeAlerts}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-xs text-[#737373]">{t('stats.criticalAlerts')}</p>
              <p className="text-xl font-bold text-red-500 mt-1">{stats.criticalAlerts}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b border-[#E5E5E5] dark:border-[#1f1f2e] -mb-px">
            {(['rules', 'thresholds', 'alerts'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab
                    ? 'text-[#745EE1] border-[#745EE1]'
                    : 'text-[#737373] border-transparent hover:text-[#171717] dark:hover:text-white'
                )}
              >
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            {/* Search & Filter */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchRules')}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] bg-white dark:bg-[#0f0f1a] text-[#171717] dark:text-white placeholder:text-[#737373]"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] bg-white dark:bg-[#0f0f1a] text-[#737373] hover:text-[#171717] dark:hover:text-white transition-colors">
                <Filter className="w-4 h-4" />
                {t('filter')}
              </button>
            </div>

            {/* Loading State */}
            {loadingRules ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#745EE1]" />
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 mx-auto text-[#737373] mb-3" />
                <p className="text-[#737373]">{t('noRules')}</p>
                <button
                  onClick={() => setIsRuleModalOpen(true)}
                  className="mt-4 px-4 py-2 rounded-lg bg-[#745EE1] text-white font-medium"
                >
                  {t('createFirstRule')}
                </button>
              </div>
            ) : (
              /* Rules List */
              <div className="space-y-3">
                {rules
                  .filter((rule) =>
                    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    rule.description.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((rule) => {
                    const severityConfig = SEVERITY_CONFIG[rule.severity as keyof typeof SEVERITY_CONFIG];
                    const SeverityIcon = severityConfig?.icon || AlertCircle;
                    const primaryVital = rule.conditions[0]?.vital;
                    const VitalIcon = VITAL_ICONS[primaryVital] || Activity;
                    const vitalColor = VITAL_COLORS[primaryVital] || '#737373';

                    return (
                      <div
                        key={rule.id}
                        className={cn(
                          'p-4 rounded-xl bg-white dark:bg-[#0f0f1a] border transition-all',
                          rule.isEnabled
                            ? 'border-[#E5E5E5] dark:border-[#1f1f2e]'
                            : 'border-dashed border-[#E5E5E5] dark:border-[#1f1f2e] opacity-60'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {/* Vital Icon */}
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${vitalColor}15` }}
                            >
                              <VitalIcon className="w-5 h-5" style={{ color: vitalColor }} />
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-[#171717] dark:text-white">{rule.name}</h3>
                                <span
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{
                                    backgroundColor: `${severityConfig?.color || '#737373'}15`,
                                    color: severityConfig?.color || '#737373',
                                  }}
                                >
                                  <SeverityIcon className="w-3 h-3" />
                                  {severityConfig?.label || 'Unknown'}
                                </span>
                                {!rule.isEnabled && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#F5F5F5] dark:bg-[#1a1a2e] text-[#737373] text-xs">
                                    {t('disabled')}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[#737373] mt-0.5">{rule.description}</p>

                              {/* Rule Stats */}
                              <div className="flex items-center gap-4 mt-2 text-xs text-[#737373]">
                                <span className="flex items-center gap-1">
                                  <Bell className="w-3 h-3" />
                                  {rule.triggeredCount} {t('triggered')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {t('lastTriggered')}: {formatDate(rule.lastTriggered)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenDropdown(openDropdown === rule.id ? null : rule.id)}
                              className="p-2 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#1a1a2e] text-[#737373] transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openDropdown === rule.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-white dark:bg-[#0f0f1a] border border-[#E5E5E5] dark:border-[#1f1f2e] shadow-lg z-10">
                                <button
                                  onClick={() => {
                                    setEditingRule(rule);
                                    setIsRuleModalOpen(true);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#171717] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#1a1a2e] transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  {t('edit')}
                                </button>
                                <button
                                  onClick={() => handleToggleRule(rule.id)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#171717] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#1a1a2e] transition-colors"
                                >
                                  {rule.isEnabled ? (
                                    <>
                                      <PowerOff className="w-4 h-4" />
                                      {t('disable')}
                                    </>
                                  ) : (
                                    <>
                                      <Power className="w-4 h-4" />
                                      {t('enable')}
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {t('delete')}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Thresholds Tab */}
        {activeTab === 'thresholds' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#745EE1]/5 to-[#8B5CF6]/5 border border-[#745EE1]/20">
              <h3 className="font-semibold text-[#171717] dark:text-white">{t('thresholds.title')}</h3>
              <p className="text-sm text-[#737373] mt-1">{t('thresholds.description')}</p>
            </div>

            {loadingThresholds ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#745EE1]" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <ThresholdSlider
                    label={t('vitals.bloodPressureSystolic')}
                    unit="mmHg"
                    min={60}
                    max={200}
                    lowValue={thresholds.blood_pressure_systolic.low}
                    highValue={thresholds.blood_pressure_systolic.high}
                    normalMin={thresholds.blood_pressure_systolic.normalMin}
                    normalMax={thresholds.blood_pressure_systolic.normalMax}
                    onLowChange={(v) => setThresholds({ ...thresholds, blood_pressure_systolic: { ...thresholds.blood_pressure_systolic, low: v } })}
                    onHighChange={(v) => setThresholds({ ...thresholds, blood_pressure_systolic: { ...thresholds.blood_pressure_systolic, high: v } })}
                    color="#ef4444"
                    icon={<Activity className="w-4 h-4" />}
                  />

                  <ThresholdSlider
                    label={t('vitals.bloodPressureDiastolic')}
                    unit="mmHg"
                    min={40}
                    max={120}
                    lowValue={thresholds.blood_pressure_diastolic.low}
                    highValue={thresholds.blood_pressure_diastolic.high}
                    normalMin={thresholds.blood_pressure_diastolic.normalMin}
                    normalMax={thresholds.blood_pressure_diastolic.normalMax}
                    onLowChange={(v) => setThresholds({ ...thresholds, blood_pressure_diastolic: { ...thresholds.blood_pressure_diastolic, low: v } })}
                    onHighChange={(v) => setThresholds({ ...thresholds, blood_pressure_diastolic: { ...thresholds.blood_pressure_diastolic, high: v } })}
                    color="#f97316"
                    icon={<Activity className="w-4 h-4" />}
                  />

                  <ThresholdSlider
                    label={t('vitals.heartRate')}
                    unit="bpm"
                    min={30}
                    max={150}
                    lowValue={thresholds.heart_rate.low}
                    highValue={thresholds.heart_rate.high}
                    normalMin={thresholds.heart_rate.normalMin}
                    normalMax={thresholds.heart_rate.normalMax}
                    onLowChange={(v) => setThresholds({ ...thresholds, heart_rate: { ...thresholds.heart_rate, low: v } })}
                    onHighChange={(v) => setThresholds({ ...thresholds, heart_rate: { ...thresholds.heart_rate, high: v } })}
                    color="#ec4899"
                    icon={<Heart className="w-4 h-4" />}
                  />

                  <ThresholdSlider
                    label={t('vitals.bloodGlucose')}
                    unit="mg/dL"
                    min={40}
                    max={300}
                    lowValue={thresholds.blood_glucose.low}
                    highValue={thresholds.blood_glucose.high}
                    normalMin={thresholds.blood_glucose.normalMin}
                    normalMax={thresholds.blood_glucose.normalMax}
                    onLowChange={(v) => setThresholds({ ...thresholds, blood_glucose: { ...thresholds.blood_glucose, low: v } })}
                    onHighChange={(v) => setThresholds({ ...thresholds, blood_glucose: { ...thresholds.blood_glucose, high: v } })}
                    color="#8b5cf6"
                    icon={<Droplet className="w-4 h-4" />}
                  />

                  <ThresholdSlider
                    label={t('vitals.spo2')}
                    unit="%"
                    min={80}
                    max={100}
                    lowValue={thresholds.spo2.low}
                    highValue={thresholds.spo2.high}
                    normalMin={thresholds.spo2.normalMin}
                    normalMax={thresholds.spo2.normalMax}
                    onLowChange={(v) => setThresholds({ ...thresholds, spo2: { ...thresholds.spo2, low: v } })}
                    onHighChange={(v) => setThresholds({ ...thresholds, spo2: { ...thresholds.spo2, high: v } })}
                    color="#06b6d4"
                    icon={<Wind className="w-4 h-4" />}
                  />

                  <ThresholdSlider
                    label={t('vitals.weightChange')}
                    unit="lbs"
                    min={-10}
                    max={10}
                    lowValue={thresholds.weight.low}
                    highValue={thresholds.weight.high}
                    normalMin={thresholds.weight.normalMin}
                    normalMax={thresholds.weight.normalMax}
                    onLowChange={(v) => setThresholds({ ...thresholds, weight: { ...thresholds.weight, low: v } })}
                    onHighChange={(v) => setThresholds({ ...thresholds, weight: { ...thresholds.weight, high: v } })}
                    color="#10b981"
                    icon={<Scale className="w-4 h-4" />}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveThresholds}
                    disabled={savingThresholds}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {savingThresholds && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('saveThresholds')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {/* Search & Filter */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
                <input
                  type="text"
                  placeholder={t('searchAlerts')}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] bg-white dark:bg-[#0f0f1a] text-[#171717] dark:text-white placeholder:text-[#737373]"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] bg-white dark:bg-[#0f0f1a] text-[#737373] hover:text-[#171717] dark:hover:text-white transition-colors">
                <Filter className="w-4 h-4" />
                {t('filter')}
              </button>
            </div>

            {loadingAlerts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#745EE1]" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-[#737373]">{t('noAlerts')}</p>
              </div>
            ) : (
              /* Alerts Table */
              <div className="rounded-xl border border-[#E5E5E5] dark:border-[#1f1f2e] overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#FAFAFA] dark:bg-[#1a1a2e]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                        {t('table.alert')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                        {t('table.patient')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                        {t('table.value')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                        {t('table.status')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                        {t('table.time')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[#737373] uppercase tracking-wider">
                        {t('table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-[#0f0f1a] divide-y divide-[#E5E5E5] dark:divide-[#1f1f2e]">
                    {alerts.map((alert) => {
                      const severityConfig = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG];
                      const SeverityIcon = severityConfig?.icon || AlertCircle;
                      const vitalType = alert.vitalReading?.type || alert.type;
                      const VitalIcon = VITAL_ICONS[vitalType] || Activity;
                      const vitalColor = VITAL_COLORS[vitalType] || '#737373';
                      const patientName = alert.patient
                        ? `${alert.patient.user.firstName} ${alert.patient.user.lastName}`
                        : 'Unknown';

                      return (
                        <tr key={alert.id} className="hover:bg-[#FAFAFA] dark:hover:bg-[#1a1a2e] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${severityConfig?.color || '#737373'}15` }}
                              >
                                <SeverityIcon className="w-4 h-4" style={{ color: severityConfig?.color || '#737373' }} />
                              </div>
                              <div>
                                <p className="font-medium text-sm text-[#171717] dark:text-white">{alert.message}</p>
                                <p className="text-xs text-[#737373]">{severityConfig?.label || 'Unknown'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-[#171717] dark:text-white">{patientName}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <VitalIcon className="w-4 h-4" style={{ color: vitalColor }} />
                              <span className="text-sm font-medium text-[#171717] dark:text-white">
                                {alert.vitalReading?.values
                                  ? String(Object.values(alert.vitalReading.values)[0])
                                  : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(alert.status)}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-[#737373]">{formatDate(alert.createdAt)}</p>
                            {alert.acknowledgedBy && (
                              <p className="text-xs text-[#737373]">
                                {t('acknowledgedBy')}: {alert.acknowledgedBy.firstName} {alert.acknowledgedBy.lastName}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {alert.status === 'NEW' && (
                                <button
                                  onClick={() => handleAcknowledgeAlert(alert.id)}
                                  className="px-3 py-1.5 rounded-lg bg-[#745EE1]/10 text-[#745EE1] text-sm font-medium hover:bg-[#745EE1]/20 transition-colors"
                                >
                                  {t('acknowledge')}
                                </button>
                              )}
                              <button className="p-1.5 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#1a1a2e] text-[#737373] hover:text-[#171717] dark:hover:text-white transition-colors">
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rule Builder Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setIsRuleModalOpen(false);
              setEditingRule(null);
            }}
          />
          <div className="relative w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0f0f1a] rounded-xl shadow-xl border border-[#E5E5E5] dark:border-[#1f1f2e]">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[#E5E5E5] dark:border-[#1f1f2e] bg-white dark:bg-[#0f0f1a]">
              <div>
                <h2 className="text-lg font-semibold text-[#171717] dark:text-white">
                  {editingRule ? t('editRule') : t('createNewRule')}
                </h2>
                <p className="text-sm text-[#737373] mt-0.5">{t('ruleBuilderDescription')}</p>
              </div>
            </div>
            <div className="p-4">
              <RuleBuilder
                rule={editingRule || undefined}
                onSave={handleSaveRule}
                onCancel={() => {
                  setIsRuleModalOpen(false);
                  setEditingRule(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
