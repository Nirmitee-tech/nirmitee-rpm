'use client';

import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@nirmitee/ui';
import {
  FileText,
  Edit,
  History,
  Target,
  Activity,
  Pill,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CarePlan, CarePlanGoal } from '@/lib/api/patients';

interface CareManagementTabProps {
  patientId: string;
  carePlans: CarePlan[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreatePlan?: () => void;
  onEditPlan?: (planId: string) => void;
  onViewHistory?: (planId: string) => void;
}

export function CareManagementTab({
  patientId,
  carePlans,
  isLoading,
  onRefresh,
  onCreatePlan,
  onEditPlan,
  onViewHistory,
}: CareManagementTabProps) {
  const { t } = useTranslations('careManagement');
  const { t: tCommon } = useTranslations('common');

  // Get active care plan
  const activePlan = carePlans?.find((plan) => plan.status === 'ACTIVE');
  const currentVersion = activePlan?.versions?.find(
    (v) => v.version === activePlan.currentVersion
  );

  // Status badge config
  const getStatusConfig = (status: CarePlan['status']) => {
    const configs = {
      DRAFT: { label: t('statusDraft'), className: 'bg-gray-100 text-gray-700' },
      PENDING_APPROVAL: { label: t('statusPendingApproval'), className: 'bg-yellow-100 text-yellow-700' },
      ACTIVE: { label: t('statusActive'), className: 'bg-green-100 text-green-700' },
      INACTIVE: { label: t('statusInactive'), className: 'bg-red-100 text-red-700' },
    };
    return configs[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  };

  // Goal status icon
  const getGoalStatusIcon = (status?: CarePlanGoal['status']) => {
    switch (status) {
      case 'achieved':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Activity className="w-4 h-4 text-[#745EE1]" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // Threshold cell color
  const getThresholdColor = (type: string, value: number) => {
    if (type === 'critical') {
      return 'bg-red-50 text-red-700 font-semibold';
    }
    if (type === 'max') {
      return 'bg-orange-50 text-orange-700';
    }
    if (type === 'min') {
      return 'bg-blue-50 text-blue-700';
    }
    return '';
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

  if (!activePlan || !currentVersion) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-sm text-gray-600 mb-4">{t('noActivePlan')}</p>
        <Button
          size="sm"
          className="bg-[#745EE1] hover:bg-[#5d4bc4]"
          onClick={onCreatePlan}
          disabled={!onCreatePlan}
          title={!onCreatePlan ? 'Coming soon' : undefined}
        >
          <FileText className="w-4 h-4 mr-2" />
          {t('createPlan')}
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(activePlan.status);

  return (
    <div className="space-y-4">
      {/* Active Care Plan Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">
                  {t('activePlanTitle')}
                </CardTitle>
                <Badge className={cn('text-xs', statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>
                    {t('createdBy')}:{' '}
                    {activePlan.createdBy.firstName} {activePlan.createdBy.lastName}
                  </span>
                </div>
                {activePlan.approvedBy && (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <span>
                      {t('approvedBy')}:{' '}
                      {activePlan.approvedBy.firstName}{' '}
                      {activePlan.approvedBy.lastName}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onViewHistory?.(activePlan.id)}
                disabled={!onViewHistory}
                title={!onViewHistory ? 'Coming soon' : undefined}
              >
                <History className="w-3 h-3 mr-1" />
                {t('viewHistory')}
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-[#745EE1] hover:bg-[#5d4bc4]"
                onClick={() => onEditPlan?.(activePlan.id)}
                disabled={!onEditPlan}
                title={!onEditPlan ? 'Coming soon' : undefined}
              >
                <Edit className="w-3 h-3 mr-1" />
                {t('editPlan')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-gray-500 mb-1">{t('effectiveDate')}</p>
              <p className="font-medium">
                {new Date(currentVersion.effectiveDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">{t('version')}</p>
              <p className="font-medium">v{activePlan.currentVersion}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">{t('activatedOn')}</p>
              <p className="font-medium">
                {activePlan.activatedAt
                  ? new Date(activePlan.activatedAt).toLocaleDateString()
                  : '--'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#745EE1]" />
            <CardTitle className="text-base font-semibold">{t('goals')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {currentVersion.goals.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-3">{t('noGoals')}</p>
          ) : (
            <div className="space-y-2">
              {currentVersion.goals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getGoalStatusIcon(goal.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {goal.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge
                        className={cn(
                          'text-xs border',
                          goal.status === 'achieved' && 'border-green-200 bg-green-50 text-green-700',
                          goal.status === 'in_progress' &&
                            'border-purple-200 bg-purple-50 text-purple-700',
                          goal.status === 'pending' && 'border-gray-200 bg-gray-50 text-gray-700'
                        )}
                      >
                        {t(`goalStatus.${goal.status}`)}
                      </Badge>
                      {goal.targetDate && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {t('targetDate')}:{' '}
                            {new Date(goal.targetDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  {goal.status === 'in_progress' && (
                    <div className="flex-shrink-0">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#745EE1] rounded-full"
                          style={{ width: '60%' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vital Thresholds Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#745EE1]" />
            <CardTitle className="text-base font-semibold">
              {t('vitalThresholds')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {Object.keys(currentVersion?.vitalThresholds || {}).length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-3">
              {t('noThresholds')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold text-gray-700">
                      {t('vitalType')}
                    </th>
                    <th className="text-center py-2 font-semibold text-gray-700">
                      {t('min')}
                    </th>
                    <th className="text-center py-2 font-semibold text-gray-700">
                      {t('max')}
                    </th>
                    <th className="text-center py-2 font-semibold text-gray-700">
                      {t('critical')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(currentVersion?.vitalThresholds || {}).map(([type, threshold]) => (
                    <tr key={type} className="border-b last:border-0">
                      <td className="py-2 font-medium text-gray-900">
                        {t(`vitalTypes.${type}`)}
                      </td>
                      <td
                        className={cn(
                          'py-2 text-center',
                          threshold.min ? getThresholdColor('min', threshold.min) : ''
                        )}
                      >
                        {threshold.min || '-'}
                      </td>
                      <td
                        className={cn(
                          'py-2 text-center',
                          threshold.max ? getThresholdColor('max', threshold.max) : ''
                        )}
                      >
                        {threshold.max || '-'}
                      </td>
                      <td
                        className={cn(
                          'py-2 text-center',
                          threshold.critical ? getThresholdColor('critical', threshold.critical) : ''
                        )}
                      >
                        {threshold.critical || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medications Section */}
      {currentVersion.medications && currentVersion.medications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-[#745EE1]" />
              <CardTitle className="text-base font-semibold">
                {t('medications')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {currentVersion.medications.map((med, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded-md border border-gray-100"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                    <Pill className="w-4 h-4 text-[#745EE1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {med.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {med.dosage} • {med.frequency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Care Instructions */}
      {currentVersion.instructions && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#745EE1]" />
              <CardTitle className="text-base font-semibold">
                {t('careInstructions')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {currentVersion.instructions}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
