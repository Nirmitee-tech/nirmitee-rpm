'use client';

import { useState } from 'react';
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
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@nirmitee/ui';
import { ThresholdSlider, RuleBuilder, type LegacyRule, type Rule } from '@/components/alerts';
import { Modal } from '@/components/ui/modal';
import { useTranslations } from '@/lib/i18n/i18n-context';

// Extended rule type with tracking fields
interface ExtendedRule extends LegacyRule {
  triggeredCount: number;
  lastTriggered: string;
}

// Vital icons mapping
const VITAL_ICONS: Record<string, React.ElementType> = {
  blood_pressure_systolic: Activity,
  blood_pressure_diastolic: Activity,
  heart_rate: Heart,
  blood_glucose: Droplet,
  spo2: Wind,
  weight: Scale,
  temperature: Activity,
};

const VITAL_COLORS: Record<string, string> = {
  blood_pressure_systolic: '#ef4444',
  blood_pressure_diastolic: '#f97316',
  heart_rate: '#ec4899',
  blood_glucose: '#8b5cf6',
  spo2: '#06b6d4',
  weight: '#10b981',
  temperature: '#f59e0b',
};

const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', icon: AlertTriangle, label: 'Critical' },
  warning: { color: '#f59e0b', icon: AlertCircle, label: 'Warning' },
  info: { color: '#3b82f6', icon: Info, label: 'Info' },
};

// Mock threshold data
const initialThresholds = {
  blood_pressure_systolic: { low: 90, high: 140, normalMin: 100, normalMax: 120 },
  blood_pressure_diastolic: { low: 60, high: 90, normalMin: 65, normalMax: 80 },
  heart_rate: { low: 50, high: 100, normalMin: 60, normalMax: 90 },
  blood_glucose: { low: 70, high: 180, normalMin: 80, normalMax: 140 },
  spo2: { low: 92, high: 100, normalMin: 95, normalMax: 100 },
  weight: { low: -5, high: 5, normalMin: -2, normalMax: 2 },
};

// Mock rules
const mockRules = [
  {
    id: '1',
    name: 'Critical High Blood Pressure',
    description: 'Alert when systolic BP exceeds 180 mmHg',
    conditions: [
      { id: 'c1', vital: 'blood_pressure_systolic', operator: 'gt', value: 180 },
    ],
    conditionLogic: 'AND' as const,
    severity: 'critical',
    actions: ['notification', 'sms', 'call'],
    isEnabled: true,
    triggeredCount: 12,
    lastTriggered: '2025-01-08T10:30:00Z',
  },
  {
    id: '2',
    name: 'Low Blood Glucose Alert',
    description: 'Alert for hypoglycemia risk',
    conditions: [
      { id: 'c2', vital: 'blood_glucose', operator: 'lt', value: 70 },
    ],
    conditionLogic: 'AND' as const,
    severity: 'critical',
    actions: ['notification', 'email', 'sms'],
    isEnabled: true,
    triggeredCount: 5,
    lastTriggered: '2025-01-07T15:45:00Z',
  },
  {
    id: '3',
    name: 'Elevated Heart Rate',
    description: 'Monitor tachycardia conditions',
    conditions: [
      { id: 'c3', vital: 'heart_rate', operator: 'gt', value: 100 },
    ],
    conditionLogic: 'AND' as const,
    severity: 'warning',
    actions: ['notification', 'email'],
    isEnabled: true,
    triggeredCount: 28,
    lastTriggered: '2025-01-08T09:15:00Z',
  },
  {
    id: '4',
    name: 'Low SpO2 Warning',
    description: 'Alert for oxygen saturation below normal',
    conditions: [
      { id: 'c4', vital: 'spo2', operator: 'lt', value: 92 },
    ],
    conditionLogic: 'AND' as const,
    severity: 'warning',
    actions: ['notification', 'sms'],
    isEnabled: false,
    triggeredCount: 3,
    lastTriggered: '2025-01-05T11:20:00Z',
  },
  {
    id: '5',
    name: 'Weight Gain Alert',
    description: 'Monitor sudden weight changes (CHF patients)',
    conditions: [
      { id: 'c5', vital: 'weight', operator: 'gt', value: 3 },
    ],
    conditionLogic: 'AND' as const,
    severity: 'info',
    actions: ['notification'],
    isEnabled: true,
    triggeredCount: 8,
    lastTriggered: '2025-01-06T08:00:00Z',
  },
];

// Mock generated alerts
const mockAlerts = [
  {
    id: 'a1',
    ruleId: '1',
    ruleName: 'Critical High Blood Pressure',
    patientId: 'p1',
    patientName: 'John Doe',
    vital: 'blood_pressure_systolic',
    value: 185,
    threshold: 180,
    severity: 'critical',
    status: 'active',
    createdAt: '2025-01-08T10:30:00Z',
    acknowledgedAt: null,
    acknowledgedBy: null,
  },
  {
    id: 'a2',
    ruleId: '3',
    ruleName: 'Elevated Heart Rate',
    patientId: 'p2',
    patientName: 'Jane Smith',
    vital: 'heart_rate',
    value: 112,
    threshold: 100,
    severity: 'warning',
    status: 'acknowledged',
    createdAt: '2025-01-08T09:15:00Z',
    acknowledgedAt: '2025-01-08T09:20:00Z',
    acknowledgedBy: 'Dr. Williams',
  },
  {
    id: 'a3',
    ruleId: '2',
    ruleName: 'Low Blood Glucose Alert',
    patientId: 'p3',
    patientName: 'Robert Brown',
    vital: 'blood_glucose',
    value: 62,
    threshold: 70,
    severity: 'critical',
    status: 'resolved',
    createdAt: '2025-01-07T15:45:00Z',
    acknowledgedAt: '2025-01-07T15:50:00Z',
    acknowledgedBy: 'Nurse Johnson',
  },
  {
    id: 'a4',
    ruleId: '1',
    ruleName: 'Critical High Blood Pressure',
    patientId: 'p4',
    patientName: 'Mary Wilson',
    vital: 'blood_pressure_systolic',
    value: 192,
    threshold: 180,
    severity: 'critical',
    status: 'active',
    createdAt: '2025-01-08T08:45:00Z',
    acknowledgedAt: null,
    acknowledgedBy: null,
  },
  {
    id: 'a5',
    ruleId: '5',
    ruleName: 'Weight Gain Alert',
    patientId: 'p5',
    patientName: 'David Lee',
    vital: 'weight',
    value: 4.2,
    threshold: 3,
    severity: 'info',
    status: 'acknowledged',
    createdAt: '2025-01-06T08:00:00Z',
    acknowledgedAt: '2025-01-06T10:30:00Z',
    acknowledgedBy: 'Dr. Martinez',
  },
];

type TabType = 'rules' | 'thresholds' | 'alerts';

export default function AlertsPage() {
  const { t } = useTranslations('alerts');
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [searchQuery, setSearchQuery] = useState('');
  const [rules, setRules] = useState<ExtendedRule[]>(mockRules);
  const [alerts, setAlerts] = useState(mockAlerts);
  const [thresholds, setThresholds] = useState(initialThresholds);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ExtendedRule | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleSaveRule = (rule: Rule | LegacyRule) => {
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

    if (editingRule) {
      setRules(rules.map((r) => (r.id === legacyRule.id ? { ...legacyRule, triggeredCount: editingRule.triggeredCount, lastTriggered: editingRule.lastTriggered } : r)));
    } else {
      setRules([...rules, { ...legacyRule, triggeredCount: 0, lastTriggered: '' }]);
    }
    setIsRuleModalOpen(false);
    setEditingRule(null);
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
    setOpenDropdown(null);
  };

  const handleToggleRule = (id: string) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r)));
    setOpenDropdown(null);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(alerts.map((a) =>
      a.id === alertId
        ? { ...a, status: 'acknowledged', acknowledgedAt: new Date().toISOString(), acknowledgedBy: 'Current User' }
        : a
    ));
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
      case 'active':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
            <Bell className="w-3 h-3" />
            {t('active')}
          </span>
        );
      case 'acknowledged':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">
            <Clock className="w-3 h-3" />
            {t('acknowledged')}
          </span>
        );
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
    activeAlerts: alerts.filter((a) => a.status === 'active').length,
    criticalAlerts: alerts.filter((a) => a.severity === 'critical' && a.status === 'active').length,
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

            {/* Rules List */}
            <div className="space-y-3">
              {rules
                .filter((rule) =>
                  rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  rule.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((rule) => {
                  const severityConfig = SEVERITY_CONFIG[rule.severity as keyof typeof SEVERITY_CONFIG];
                  const SeverityIcon = severityConfig.icon;
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
                                  backgroundColor: `${severityConfig.color}15`,
                                  color: severityConfig.color,
                                }}
                              >
                                <SeverityIcon className="w-3 h-3" />
                                {severityConfig.label}
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
          </div>
        )}

        {/* Thresholds Tab */}
        {activeTab === 'thresholds' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#745EE1]/5 to-[#8B5CF6]/5 border border-[#745EE1]/20">
              <h3 className="font-semibold text-[#171717] dark:text-white">{t('thresholds.title')}</h3>
              <p className="text-sm text-[#737373] mt-1">{t('thresholds.description')}</p>
            </div>

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
              <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white font-medium hover:opacity-90 transition-opacity">
                {t('saveThresholds')}
              </button>
            </div>
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

            {/* Alerts Table */}
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
                    const SeverityIcon = severityConfig.icon;
                    const VitalIcon = VITAL_ICONS[alert.vital] || Activity;
                    const vitalColor = VITAL_COLORS[alert.vital] || '#737373';

                    return (
                      <tr key={alert.id} className="hover:bg-[#FAFAFA] dark:hover:bg-[#1a1a2e] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${severityConfig.color}15` }}
                            >
                              <SeverityIcon className="w-4 h-4" style={{ color: severityConfig.color }} />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-[#171717] dark:text-white">{alert.ruleName}</p>
                              <p className="text-xs text-[#737373]">{severityConfig.label}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-[#171717] dark:text-white">{alert.patientName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <VitalIcon className="w-4 h-4" style={{ color: vitalColor }} />
                            <span className="text-sm font-medium text-[#171717] dark:text-white">
                              {alert.value}
                            </span>
                            <span className="text-xs text-[#737373]">
                              ({t('threshold')}: {alert.threshold})
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
                              {t('acknowledgedBy')}: {alert.acknowledgedBy}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {alert.status === 'active' && (
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
