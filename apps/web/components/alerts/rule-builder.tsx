'use client';

import { useState, useCallback } from 'react';
import Select, { StylesConfig, GroupBase } from 'react-select';
import {
  Plus,
  Trash2,
  Activity,
  Heart,
  Droplet,
  Wind,
  Scale,
  Bell,
  Mail,
  MessageSquare,
  Phone,
  AlertTriangle,
  AlertCircle,
  Info,
  Copy,
  Layers,
  ChevronDown,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '@nirmitee/ui';

// Types
interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
  description?: string;
}

interface RuleCondition {
  id: string;
  vital: string;
  operator: string;
  value: number;
  value2?: number;
}

interface ConditionGroup {
  id: string;
  logic: 'AND' | 'OR';
  conditions: RuleCondition[];
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  conditionGroups: ConditionGroup[];
  groupLogic: 'AND' | 'OR';
  severity: string;
  actions: string[];
  isEnabled: boolean;
}

// Legacy single-group rule support
export interface LegacyRule {
  id: string;
  name: string;
  description: string;
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  severity: string;
  actions: string[];
  isEnabled: boolean;
}

// Vital types with metadata
const VITAL_OPTIONS: SelectOption[] = [
  { value: 'blood_pressure_systolic', label: 'Blood Pressure (Systolic)', icon: <Activity className="w-4 h-4" />, color: '#ef4444' },
  { value: 'blood_pressure_diastolic', label: 'Blood Pressure (Diastolic)', icon: <Activity className="w-4 h-4" />, color: '#f97316' },
  { value: 'heart_rate', label: 'Heart Rate', icon: <Heart className="w-4 h-4" />, color: '#ec4899' },
  { value: 'blood_glucose', label: 'Blood Glucose', icon: <Droplet className="w-4 h-4" />, color: '#8b5cf6' },
  { value: 'spo2', label: 'Oxygen Saturation (SpO2)', icon: <Wind className="w-4 h-4" />, color: '#06b6d4' },
  { value: 'weight', label: 'Weight Change', icon: <Scale className="w-4 h-4" />, color: '#10b981' },
  { value: 'temperature', label: 'Temperature', icon: <Activity className="w-4 h-4" />, color: '#f59e0b' },
  { value: 'respiratory_rate', label: 'Respiratory Rate', icon: <Wind className="w-4 h-4" />, color: '#14b8a6' },
];

const VITAL_UNITS: Record<string, string> = {
  blood_pressure_systolic: 'mmHg',
  blood_pressure_diastolic: 'mmHg',
  heart_rate: 'bpm',
  blood_glucose: 'mg/dL',
  spo2: '%',
  weight: 'lbs',
  temperature: '°F',
  respiratory_rate: '/min',
};

const OPERATOR_OPTIONS: SelectOption[] = [
  { value: 'gt', label: 'is greater than', description: '>' },
  { value: 'gte', label: 'is greater than or equal to', description: '>=' },
  { value: 'lt', label: 'is less than', description: '<' },
  { value: 'lte', label: 'is less than or equal to', description: '<=' },
  { value: 'eq', label: 'is equal to', description: '=' },
  { value: 'between', label: 'is between', description: '↔' },
  { value: 'outside', label: 'is outside range', description: '⇿' },
];

const SEVERITY_OPTIONS: SelectOption[] = [
  { value: 'critical', label: 'Critical', icon: <AlertTriangle className="w-4 h-4" />, color: '#ef4444' },
  { value: 'warning', label: 'Warning', icon: <AlertCircle className="w-4 h-4" />, color: '#f59e0b' },
  { value: 'info', label: 'Info', icon: <Info className="w-4 h-4" />, color: '#3b82f6' },
];

const ACTION_OPTIONS: SelectOption[] = [
  { value: 'notification', label: 'In-App Notification', icon: <Bell className="w-4 h-4" /> },
  { value: 'email', label: 'Send Email Alert', icon: <Mail className="w-4 h-4" /> },
  { value: 'sms', label: 'Send SMS Alert', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'call', label: 'Trigger Phone Call', icon: <Phone className="w-4 h-4" /> },
];

// Rule Templates
const RULE_TEMPLATES = [
  {
    name: 'Hypertensive Crisis',
    description: 'Alert when BP indicates hypertensive crisis',
    conditionGroups: [
      {
        id: 't1g1',
        logic: 'OR' as const,
        conditions: [
          { id: 't1c1', vital: 'blood_pressure_systolic', operator: 'gt', value: 180 },
          { id: 't1c2', vital: 'blood_pressure_diastolic', operator: 'gt', value: 120 },
        ],
      },
    ],
    groupLogic: 'AND' as const,
    severity: 'critical',
    actions: ['notification', 'sms', 'call'],
  },
  {
    name: 'Hypoglycemia Risk',
    description: 'Alert for low blood glucose (diabetes patients)',
    conditionGroups: [
      {
        id: 't2g1',
        logic: 'AND' as const,
        conditions: [
          { id: 't2c1', vital: 'blood_glucose', operator: 'lt', value: 70 },
        ],
      },
    ],
    groupLogic: 'AND' as const,
    severity: 'critical',
    actions: ['notification', 'sms'],
  },
  {
    name: 'Tachycardia with Low SpO2',
    description: 'Compound alert for elevated heart rate AND low oxygen',
    conditionGroups: [
      {
        id: 't3g1',
        logic: 'AND' as const,
        conditions: [
          { id: 't3c1', vital: 'heart_rate', operator: 'gt', value: 100 },
          { id: 't3c2', vital: 'spo2', operator: 'lt', value: 92 },
        ],
      },
    ],
    groupLogic: 'AND' as const,
    severity: 'critical',
    actions: ['notification', 'email', 'call'],
  },
  {
    name: 'CHF Weight Gain',
    description: 'Monitor sudden weight gain (heart failure patients)',
    conditionGroups: [
      {
        id: 't4g1',
        logic: 'AND' as const,
        conditions: [
          { id: 't4c1', vital: 'weight', operator: 'gt', value: 3 },
        ],
      },
    ],
    groupLogic: 'AND' as const,
    severity: 'warning',
    actions: ['notification', 'email'],
  },
  {
    name: 'Fever Alert',
    description: 'Alert for elevated body temperature',
    conditionGroups: [
      {
        id: 't5g1',
        logic: 'AND' as const,
        conditions: [
          { id: 't5c1', vital: 'temperature', operator: 'gte', value: 100.4 },
        ],
      },
    ],
    groupLogic: 'AND' as const,
    severity: 'warning',
    actions: ['notification'],
  },
  {
    name: 'Bradycardia OR Tachycardia',
    description: 'Alert for abnormal heart rate (too slow OR too fast)',
    conditionGroups: [
      {
        id: 't6g1',
        logic: 'OR' as const,
        conditions: [
          { id: 't6c1', vital: 'heart_rate', operator: 'lt', value: 50 },
          { id: 't6c2', vital: 'heart_rate', operator: 'gt', value: 120 },
        ],
      },
    ],
    groupLogic: 'AND' as const,
    severity: 'warning',
    actions: ['notification', 'email'],
  },
];

// React Select custom styles
const selectStyles: StylesConfig<SelectOption, false, GroupBase<SelectOption>> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--select-bg, #FAFAFA)',
    borderColor: state.isFocused ? '#745EE1' : 'var(--select-border, #E5E5E5)',
    borderRadius: '0.5rem',
    minHeight: '40px',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(116, 94, 225, 0.2)' : 'none',
    '&:hover': {
      borderColor: '#745EE1',
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--select-menu-bg, white)',
    borderRadius: '0.5rem',
    border: '1px solid var(--select-border, #E5E5E5)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zIndex: 50,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#745EE1'
      : state.isFocused
      ? 'rgba(116, 94, 225, 0.1)'
      : 'transparent',
    color: state.isSelected ? 'white' : 'var(--select-text, #171717)',
    cursor: 'pointer',
    padding: '10px 12px',
    '&:active': {
      backgroundColor: 'rgba(116, 94, 225, 0.2)',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--select-text, #171717)',
  }),
  input: (base) => ({
    ...base,
    color: 'var(--select-text, #171717)',
  }),
  placeholder: (base) => ({
    ...base,
    color: '#737373',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: '#737373',
    '&:hover': {
      color: '#745EE1',
    },
  }),
};

const multiSelectStyles: StylesConfig<SelectOption, true, GroupBase<SelectOption>> = {
  ...selectStyles,
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'rgba(116, 94, 225, 0.1)',
    borderRadius: '0.375rem',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#745EE1',
    fontWeight: 500,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#745EE1',
    '&:hover': {
      backgroundColor: 'rgba(116, 94, 225, 0.2)',
      color: '#5a47b8',
    },
  }),
} as StylesConfig<SelectOption, true, GroupBase<SelectOption>>;

// Custom Option component for vital signs
const VitalOption = ({ data, innerProps, isSelected, isFocused }: any) => (
  <div
    {...innerProps}
    className={cn(
      'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors',
      isSelected && 'bg-[#745EE1] text-white',
      !isSelected && isFocused && 'bg-[#745EE1]/10',
      !isSelected && !isFocused && 'hover:bg-[#745EE1]/5'
    )}
  >
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${data.color}15` }}
    >
      <span style={{ color: isSelected ? 'white' : data.color }}>{data.icon}</span>
    </div>
    <span className="font-medium">{data.label}</span>
  </div>
);

// Custom SingleValue component for vital signs
const VitalSingleValue = ({ data }: any) => (
  <div className="flex items-center gap-2">
    <span style={{ color: data.color }}>{data.icon}</span>
    <span>{data.label}</span>
  </div>
);

// Custom Option for severity
const SeverityOption = ({ data, innerProps, isSelected, isFocused }: any) => (
  <div
    {...innerProps}
    className={cn(
      'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors',
      isSelected && 'bg-[#745EE1] text-white',
      !isSelected && isFocused && 'bg-[#745EE1]/10'
    )}
  >
    <div
      className="w-6 h-6 rounded flex items-center justify-center"
      style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${data.color}15` }}
    >
      <span style={{ color: isSelected ? 'white' : data.color }}>{data.icon}</span>
    </div>
    <span className="font-medium">{data.label}</span>
  </div>
);

interface RuleBuilderProps {
  rule?: Rule | LegacyRule;
  onSave: (rule: Rule | LegacyRule) => void;
  onCancel: () => void;
}

export function RuleBuilder({ rule, onSave, onCancel }: RuleBuilderProps) {
  // Convert legacy rule format to new format
  const convertToNewFormat = (r: Rule | LegacyRule): Rule => {
    if ('conditionGroups' in r) return r;
    return {
      ...r,
      conditionGroups: [{
        id: crypto.randomUUID(),
        logic: r.conditionLogic,
        conditions: r.conditions,
      }],
      groupLogic: 'AND',
    };
  };

  const initialRule = rule ? convertToNewFormat(rule) : null;

  const [name, setName] = useState(initialRule?.name || '');
  const [description, setDescription] = useState(initialRule?.description || '');
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>(
    initialRule?.conditionGroups || [
      {
        id: crypto.randomUUID(),
        logic: 'AND',
        conditions: [
          { id: crypto.randomUUID(), vital: 'blood_pressure_systolic', operator: 'gt', value: 140 },
        ],
      },
    ]
  );
  const [groupLogic, setGroupLogic] = useState<'AND' | 'OR'>(initialRule?.groupLogic || 'AND');
  const [severity, setSeverity] = useState(initialRule?.severity || 'warning');
  const [actions, setActions] = useState<string[]>(initialRule?.actions || ['notification']);
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(conditionGroups.map(g => g.id)));

  // Group management
  const addConditionGroup = () => {
    const newGroup: ConditionGroup = {
      id: crypto.randomUUID(),
      logic: 'AND',
      conditions: [
        { id: crypto.randomUUID(), vital: 'heart_rate', operator: 'gt', value: 100 },
      ],
    };
    setConditionGroups([...conditionGroups, newGroup]);
    setExpandedGroups(new Set([...expandedGroups, newGroup.id]));
  };

  const removeConditionGroup = (groupId: string) => {
    if (conditionGroups.length > 1) {
      setConditionGroups(conditionGroups.filter(g => g.id !== groupId));
    }
  };

  const updateGroupLogic = (groupId: string, logic: 'AND' | 'OR') => {
    setConditionGroups(conditionGroups.map(g =>
      g.id === groupId ? { ...g, logic } : g
    ));
  };

  const toggleGroupExpanded = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Condition management within groups
  const addCondition = (groupId: string) => {
    setConditionGroups(conditionGroups.map(g =>
      g.id === groupId
        ? {
            ...g,
            conditions: [
              ...g.conditions,
              { id: crypto.randomUUID(), vital: 'heart_rate', operator: 'gt', value: 100 },
            ],
          }
        : g
    ));
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    setConditionGroups(conditionGroups.map(g => {
      if (g.id !== groupId) return g;
      if (g.conditions.length <= 1) return g;
      return { ...g, conditions: g.conditions.filter(c => c.id !== conditionId) };
    }));
  };

  const updateCondition = (groupId: string, conditionId: string, updates: Partial<RuleCondition>) => {
    setConditionGroups(conditionGroups.map(g =>
      g.id === groupId
        ? {
            ...g,
            conditions: g.conditions.map(c =>
              c.id === conditionId ? { ...c, ...updates } : c
            ),
          }
        : g
    ));
  };

  // Apply template
  const applyTemplate = (template: typeof RULE_TEMPLATES[0]) => {
    setName(template.name);
    setDescription(template.description);
    setConditionGroups(template.conditionGroups.map(g => ({
      ...g,
      id: crypto.randomUUID(),
      conditions: g.conditions.map(c => ({ ...c, id: crypto.randomUUID() })),
    })));
    setGroupLogic(template.groupLogic);
    setSeverity(template.severity);
    setActions(template.actions);
    setShowTemplates(false);
  };

  // Save handler - convert back to legacy format for compatibility
  const handleSave = () => {
    const newRule: LegacyRule = {
      id: rule?.id || crypto.randomUUID(),
      name,
      description,
      conditions: conditionGroups.flatMap(g => g.conditions),
      conditionLogic: conditionGroups.length === 1 ? conditionGroups[0].logic : groupLogic,
      severity,
      actions,
      isEnabled: rule && 'isEnabled' in rule ? rule.isEnabled : true,
    };
    onSave(newRule);
  };

  const selectedSeverity = SEVERITY_OPTIONS.find(s => s.value === severity);

  // Build human-readable rule preview
  const buildPreview = () => {
    const parts: string[] = [];
    conditionGroups.forEach((group, gi) => {
      if (gi > 0) parts.push(groupLogic);
      if (group.conditions.length > 1) parts.push('(');
      group.conditions.forEach((c, ci) => {
        if (ci > 0) parts.push(group.logic);
        const vital = VITAL_OPTIONS.find(v => v.value === c.vital);
        const op = OPERATOR_OPTIONS.find(o => o.value === c.operator);
        parts.push(`${vital?.label} ${op?.label} ${c.value}${c.value2 ? ` and ${c.value2}` : ''} ${VITAL_UNITS[c.vital] || ''}`);
      });
      if (group.conditions.length > 1) parts.push(')');
    });
    return parts.join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Templates Section */}
      <div className="rounded-xl border border-[#E5E5E5] dark:border-[#1f1f2e] overflow-hidden">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#745EE1]/5 to-[#8B5CF6]/5 hover:from-[#745EE1]/10 hover:to-[#8B5CF6]/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#745EE1]/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#745EE1]" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-[#171717] dark:text-white">Start from Template</h3>
              <p className="text-sm text-[#737373]">Choose from pre-built alert rules for common scenarios</p>
            </div>
          </div>
          <ChevronDown className={cn(
            'w-5 h-5 text-[#737373] transition-transform',
            showTemplates && 'rotate-180'
          )} />
        </button>

        {showTemplates && (
          <div className="p-4 bg-white dark:bg-[#0f0f1a] border-t border-[#E5E5E5] dark:border-[#1f1f2e]">
            <div className="grid grid-cols-2 gap-3">
              {RULE_TEMPLATES.map((template, i) => (
                <button
                  key={i}
                  onClick={() => applyTemplate(template)}
                  className="p-3 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] hover:border-[#745EE1] hover:bg-[#745EE1]/5 text-left transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      template.severity === 'critical' && 'bg-red-500/10',
                      template.severity === 'warning' && 'bg-yellow-500/10',
                      template.severity === 'info' && 'bg-blue-500/10',
                    )}>
                      {template.severity === 'critical' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      {template.severity === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                      {template.severity === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#171717] dark:text-white group-hover:text-[#745EE1] truncate">
                        {template.name}
                      </p>
                      <p className="text-xs text-[#737373] line-clamp-2 mt-0.5">
                        {template.description}
                      </p>
                    </div>
                    <Copy className="w-4 h-4 text-[#737373] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rule Name & Description */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#171717] dark:text-white mb-1.5">
            Rule Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., High Blood Pressure Alert"
            className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] bg-[#FAFAFA] dark:bg-[#1a1a2e] text-[#171717] dark:text-white placeholder:text-[#737373] focus:border-[#745EE1] focus:ring-2 focus:ring-[#745EE1]/20 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#171717] dark:text-white mb-1.5">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this rule"
            className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] bg-[#FAFAFA] dark:bg-[#1a1a2e] text-[#171717] dark:text-white placeholder:text-[#737373] focus:border-[#745EE1] focus:ring-2 focus:ring-[#745EE1]/20 outline-none transition-all"
          />
        </div>
      </div>

      {/* Condition Groups */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#171717] dark:text-white">Conditions (WHEN)</h3>
          {conditionGroups.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#737373]">Match groups with:</span>
              <div className="flex rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] overflow-hidden">
                {(['AND', 'OR'] as const).map(logic => (
                  <button
                    key={logic}
                    onClick={() => setGroupLogic(logic)}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium transition-colors',
                      groupLogic === logic
                        ? 'bg-[#745EE1] text-white'
                        : 'bg-white dark:bg-[#1a1a2e] text-[#737373] hover:text-[#171717] dark:hover:text-white'
                    )}
                  >
                    {logic}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {conditionGroups.map((group, groupIndex) => (
          <div key={group.id} className="relative">
            {/* Group connector */}
            {groupIndex > 0 && (
              <div className="absolute -top-3 left-6 px-2 py-0.5 rounded bg-[#745EE1] text-white text-xs font-medium z-10">
                {groupLogic}
              </div>
            )}

            <div className="rounded-xl border border-[#E5E5E5] dark:border-[#1f1f2e] bg-[#FAFAFA] dark:bg-[#1a1a2e] overflow-hidden">
              {/* Group Header */}
              <div className="flex items-center justify-between p-3 bg-white dark:bg-[#0f0f1a] border-b border-[#E5E5E5] dark:border-[#1f1f2e]">
                <button
                  onClick={() => toggleGroupExpanded(group.id)}
                  className="flex items-center gap-2 text-[#171717] dark:text-white"
                >
                  {expandedGroups.has(group.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <Layers className="w-4 h-4 text-[#745EE1]" />
                  <span className="font-medium">Condition Group {groupIndex + 1}</span>
                  <span className="text-sm text-[#737373]">({group.conditions.length} condition{group.conditions.length !== 1 ? 's' : ''})</span>
                </button>

                <div className="flex items-center gap-3">
                  {group.conditions.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#737373]">Match:</span>
                      <div className="flex rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] overflow-hidden">
                        {(['AND', 'OR'] as const).map(logic => (
                          <button
                            key={logic}
                            onClick={() => updateGroupLogic(group.id, logic)}
                            className={cn(
                              'px-2 py-1 text-xs font-medium transition-colors',
                              group.logic === logic
                                ? 'bg-[#745EE1] text-white'
                                : 'bg-white dark:bg-[#0f0f1a] text-[#737373] hover:text-[#171717] dark:hover:text-white'
                            )}
                          >
                            {logic}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {conditionGroups.length > 1 && (
                    <button
                      onClick={() => removeConditionGroup(group.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-[#737373] hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Conditions */}
              {expandedGroups.has(group.id) && (
                <div className="p-3 space-y-3">
                  {group.conditions.map((condition, condIndex) => {
                    const selectedVital = VITAL_OPTIONS.find(v => v.value === condition.vital);
                    const needsSecondValue = ['between', 'outside'].includes(condition.operator);

                    return (
                      <div key={condition.id} className="relative">
                        {/* Condition connector */}
                        {condIndex > 0 && (
                          <div className="absolute -top-2.5 left-4 px-1.5 py-0.5 rounded bg-[#745EE1]/10 text-[#745EE1] text-xs font-medium">
                            {group.logic}
                          </div>
                        )}

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-[#0f0f1a] border border-[#E5E5E5] dark:border-[#1f1f2e]">
                          {/* IF label */}
                          <span className="text-sm font-medium text-[#737373] w-8 shrink-0">
                            {condIndex === 0 ? 'IF' : ''}
                          </span>

                          {/* Vital Select */}
                          <div className="w-64">
                            <Select<SelectOption>
                              value={VITAL_OPTIONS.find(v => v.value === condition.vital)}
                              onChange={(opt) => opt && updateCondition(group.id, condition.id, { vital: opt.value })}
                              options={VITAL_OPTIONS}
                              styles={selectStyles}
                              components={{ Option: VitalOption, SingleValue: VitalSingleValue }}
                              isSearchable={false}
                              placeholder="Select vital..."
                            />
                          </div>

                          {/* Operator Select */}
                          <div className="w-56">
                            <Select<SelectOption>
                              value={OPERATOR_OPTIONS.find(o => o.value === condition.operator)}
                              onChange={(opt) => opt && updateCondition(group.id, condition.id, { operator: opt.value })}
                              options={OPERATOR_OPTIONS}
                              styles={selectStyles}
                              isSearchable={false}
                              placeholder="Select condition..."
                              formatOptionLabel={(opt) => (
                                <div className="flex items-center gap-2">
                                  <span className="text-[#745EE1] font-mono">{opt.description}</span>
                                  <span>{opt.label}</span>
                                </div>
                              )}
                            />
                          </div>

                          {/* Value Input(s) */}
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={condition.value}
                              onChange={(e) => updateCondition(group.id, condition.id, { value: Number(e.target.value) })}
                              className="w-20 px-3 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] bg-[#FAFAFA] dark:bg-[#1a1a2e] text-center text-[#171717] dark:text-white focus:border-[#745EE1] focus:ring-2 focus:ring-[#745EE1]/20 outline-none transition-all"
                            />
                            {needsSecondValue && (
                              <>
                                <span className="text-sm text-[#737373]">and</span>
                                <input
                                  type="number"
                                  value={condition.value2 || 0}
                                  onChange={(e) => updateCondition(group.id, condition.id, { value2: Number(e.target.value) })}
                                  className="w-20 px-3 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] bg-[#FAFAFA] dark:bg-[#1a1a2e] text-center text-[#171717] dark:text-white focus:border-[#745EE1] focus:ring-2 focus:ring-[#745EE1]/20 outline-none transition-all"
                                />
                              </>
                            )}
                            <span className="text-sm text-[#737373] w-14 shrink-0">
                              {VITAL_UNITS[condition.vital] || ''}
                            </span>
                          </div>

                          {/* Remove condition */}
                          {group.conditions.length > 1 && (
                            <button
                              onClick={() => removeCondition(group.id, condition.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-[#737373] hover:text-red-500 transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add condition button */}
                  <button
                    onClick={() => addCondition(group.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#E5E5E5] dark:border-[#1f1f2e] text-[#737373] hover:text-[#745EE1] hover:border-[#745EE1] transition-colors w-full justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add Condition to Group</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Add Group Button */}
        <button
          onClick={addConditionGroup}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[#E5E5E5] dark:border-[#1f1f2e] text-[#737373] hover:text-[#745EE1] hover:border-[#745EE1] transition-colors w-full justify-center"
        >
          <Layers className="w-4 h-4" />
          <span className="text-sm font-medium">Add Another Condition Group</span>
        </button>
      </div>

      {/* Severity & Actions */}
      <div className="grid grid-cols-2 gap-4">
        {/* Severity Selection */}
        <div>
          <label className="block text-sm font-medium text-[#171717] dark:text-white mb-1.5">
            Alert Severity (THEN)
          </label>
          <Select<SelectOption>
            value={SEVERITY_OPTIONS.find(s => s.value === severity)}
            onChange={(opt) => opt && setSeverity(opt.value)}
            options={SEVERITY_OPTIONS}
            styles={selectStyles}
            components={{ Option: SeverityOption }}
            isSearchable={false}
            formatOptionLabel={(opt) => (
              <div className="flex items-center gap-2">
                <span style={{ color: opt.color }}>{opt.icon}</span>
                <span>{opt.label}</span>
              </div>
            )}
          />
        </div>

        {/* Actions Selection */}
        <div>
          <label className="block text-sm font-medium text-[#171717] dark:text-white mb-1.5">
            Notification Actions
          </label>
          <Select<SelectOption, true>
            isMulti
            value={ACTION_OPTIONS.filter(a => actions.includes(a.value))}
            onChange={(opts) => setActions(opts ? opts.map(o => o.value) : [])}
            options={ACTION_OPTIONS}
            styles={multiSelectStyles as StylesConfig<SelectOption, true, GroupBase<SelectOption>>}
            placeholder="Select actions..."
            formatOptionLabel={(opt) => (
              <div className="flex items-center gap-2">
                {opt.icon}
                <span>{opt.label}</span>
              </div>
            )}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#745EE1]/5 to-[#8B5CF6]/5 border border-[#745EE1]/20">
        <h3 className="font-semibold text-[#171717] dark:text-white mb-2">Rule Preview</h3>
        <div className="flex items-start gap-3">
          <div
            className="px-2 py-1 rounded text-white text-xs font-medium shrink-0"
            style={{ backgroundColor: selectedSeverity?.color }}
          >
            {selectedSeverity?.label}
          </div>
          <p className="text-sm text-[#737373] dark:text-gray-400">
            <span className="text-[#171717] dark:text-white font-medium">WHEN </span>
            {buildPreview()}
            <span className="text-[#171717] dark:text-white font-medium"> THEN </span>
            {actions.map((a, i) => {
              const action = ACTION_OPTIONS.find(act => act.value === a);
              return (
                <span key={a}>
                  {i > 0 && ', '}
                  {action?.label}
                </span>
              );
            })}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] text-[#737373] hover:text-[#171717] dark:hover:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#1a1a2e] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name || conditionGroups.length === 0 || actions.length === 0}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {rule ? 'Update Rule' : 'Create Rule'}
        </button>
      </div>
    </div>
  );
}
