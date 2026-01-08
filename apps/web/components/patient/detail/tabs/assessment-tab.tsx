'use client';

import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@nirmitee/ui';
import {
  ClipboardList,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
type AssessmentStatus = 'completed' | 'pending' | 'overdue';
type AssessmentType = 'PHQ-9' | 'GAD-7' | 'Falls Risk' | 'Nutrition' | 'Pain Scale' | 'ADL';

interface Assessment {
  id: string;
  type: AssessmentType;
  status: AssessmentStatus;
  score?: number;
  maxScore?: number;
  completedDate?: string;
  dueDate?: string;
  completedBy?: string;
  notes?: string;
}

interface AssessmentTabProps {
  patientId: string;
  assessments?: Assessment[];
  isLoading: boolean;
  onRefresh?: () => void;
  onStartAssessment?: (type: AssessmentType) => void;
  onViewAssessment?: (id: string) => void;
}

// Mock data for demonstration
const mockAssessments: Assessment[] = [
  {
    id: '1',
    type: 'PHQ-9',
    status: 'completed',
    score: 8,
    maxScore: 27,
    completedDate: '2024-01-05T10:30:00Z',
    completedBy: 'Dr. Sarah Johnson',
    notes: 'Mild depression symptoms, monitoring recommended',
  },
  {
    id: '2',
    type: 'GAD-7',
    status: 'completed',
    score: 5,
    maxScore: 21,
    completedDate: '2024-01-05T10:45:00Z',
    completedBy: 'Dr. Sarah Johnson',
  },
  {
    id: '3',
    type: 'Falls Risk',
    status: 'pending',
    dueDate: '2024-01-10T00:00:00Z',
  },
  {
    id: '4',
    type: 'Nutrition',
    status: 'overdue',
    dueDate: '2024-01-03T00:00:00Z',
  },
  {
    id: '5',
    type: 'Pain Scale',
    status: 'completed',
    score: 3,
    maxScore: 10,
    completedDate: '2024-01-04T14:20:00Z',
    completedBy: 'Nurse Mary Williams',
  },
];

export function AssessmentTab({
  patientId,
  assessments = mockAssessments,
  isLoading,
  onRefresh,
  onStartAssessment,
  onViewAssessment,
}: AssessmentTabProps) {
  const { t } = useTranslations('assessment');
  const { t: tCommon } = useTranslations('common');

  // Status badge config
  const getStatusConfig = (status: AssessmentStatus) => {
    const configs = {
      completed: {
        label: t('statusCompleted'),
        className: 'bg-green-100 text-green-700',
        icon: CheckCircle2,
      },
      pending: {
        label: t('statusPending'),
        className: 'bg-yellow-100 text-yellow-700',
        icon: Clock,
      },
      overdue: {
        label: t('statusOverdue'),
        className: 'bg-red-100 text-red-700',
        icon: AlertCircle,
      },
    };
    return configs[status];
  };

  // Get score interpretation
  const getScoreInterpretation = (type: AssessmentType, score: number) => {
    if (type === 'PHQ-9') {
      if (score <= 4) return { level: t('levelMinimal'), color: 'text-green-600' };
      if (score <= 9) return { level: t('levelMild'), color: 'text-yellow-600' };
      if (score <= 14) return { level: t('levelModerate'), color: 'text-orange-600' };
      if (score <= 19) return { level: t('levelModeratelySevere'), color: 'text-red-600' };
      return { level: t('levelSevere'), color: 'text-red-700' };
    }
    if (type === 'GAD-7') {
      if (score <= 4) return { level: t('levelMinimal'), color: 'text-green-600' };
      if (score <= 9) return { level: t('levelMild'), color: 'text-yellow-600' };
      if (score <= 14) return { level: t('levelModerate'), color: 'text-orange-600' };
      return { level: t('levelSevere'), color: 'text-red-700' };
    }
    if (type === 'Pain Scale') {
      if (score <= 3) return { level: t('painMild'), color: 'text-green-600' };
      if (score <= 6) return { level: t('painModerate'), color: 'text-yellow-600' };
      return { level: t('painSevere'), color: 'text-red-600' };
    }
    return null;
  };

  const completedAssessments = assessments.filter((a) => a.status === 'completed');
  const pendingAssessments = assessments.filter(
    (a) => a.status === 'pending' || a.status === 'overdue'
  );

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

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {t('title')}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">{t('subtitle')}</p>
        </div>
        <Button
          size="sm"
          className="bg-[#745EE1] hover:bg-[#5d4bc4]"
          onClick={() => onStartAssessment?.('PHQ-9')}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {t('startNewAssessment')}
        </Button>
      </div>

      {/* Pending Assessments */}
      {pendingAssessments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <CardTitle className="text-base font-semibold">
                {t('pendingAssessments')}
              </CardTitle>
              <Badge variant="gray" className="ml-auto text-xs">
                {pendingAssessments.length} {t('pending')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {pendingAssessments.map((assessment) => {
                const statusConfig = getStatusConfig(assessment.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <div
                    key={assessment.id}
                    className="flex items-center gap-3 p-3 rounded-md border border-gray-200 hover:border-[#745EE1] transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-[#745EE1]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {t(`types.${assessment.type}`)}
                      </p>
                      {assessment.dueDate && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {t('dueDate')}:{' '}
                            {new Date(assessment.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', statusConfig.className)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => onStartAssessment?.(assessment.type)}
                      >
                        {t('startNow')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Assessments */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <CardTitle className="text-base font-semibold">
              {t('completedAssessments')}
            </CardTitle>
            <Badge variant="gray" className="ml-auto text-xs">
              {completedAssessments.length} {t('completed')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {completedAssessments.length === 0 ? (
            <div className="text-center py-6">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t('noCompletedAssessments')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {completedAssessments.map((assessment) => {
                const interpretation =
                  assessment.score !== undefined
                    ? getScoreInterpretation(assessment.type, assessment.score)
                    : null;
                return (
                  <div
                    key={assessment.id}
                    className="p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {t(`types.${assessment.type}`)}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              {assessment.completedDate && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>
                                    {new Date(
                                      assessment.completedDate
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              {assessment.completedBy && (
                                <span>• {assessment.completedBy}</span>
                              )}
                            </div>
                          </div>
                          {assessment.score !== undefined && (
                            <div className="text-right">
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-gray-900">
                                  {assessment.score}
                                </span>
                                <span className="text-xs text-gray-500">
                                  / {assessment.maxScore}
                                </span>
                              </div>
                              {interpretation && (
                                <p
                                  className={cn(
                                    'text-xs font-medium mt-0.5',
                                    interpretation.color
                                  )}
                                >
                                  {interpretation.level}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        {assessment.notes && (
                          <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                            {assessment.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-[#745EE1] hover:text-[#5d4bc4] hover:bg-purple-50"
                        onClick={() => onViewAssessment?.(assessment.id)}
                      >
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {t('viewDetails')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment Types Reference */}
      <Card className="bg-gray-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">
            {t('assessmentTypes')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium text-gray-900">{t('types.PHQ-9')}:</span>{' '}
              <span className="text-gray-600">{t('descriptions.PHQ-9')}</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">{t('types.GAD-7')}:</span>{' '}
              <span className="text-gray-600">{t('descriptions.GAD-7')}</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">
                {t('types.Falls Risk')}:
              </span>{' '}
              <span className="text-gray-600">{t('descriptions.Falls Risk')}</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">{t('types.Nutrition')}:</span>{' '}
              <span className="text-gray-600">{t('descriptions.Nutrition')}</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">
                {t('types.Pain Scale')}:
              </span>{' '}
              <span className="text-gray-600">{t('descriptions.Pain Scale')}</span>
            </div>
            <div>
              <span className="font-medium text-gray-900">{t('types.ADL')}:</span>{' '}
              <span className="text-gray-600">{t('descriptions.ADL')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
