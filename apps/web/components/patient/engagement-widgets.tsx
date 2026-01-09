'use client';

import { Flame, Target, Trophy, Calendar, Pill, Clock, ChevronRight, Star, Zap, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n/i18n-context';

// Streak Widget - Shows consecutive days of vital recordings
interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  weeklyProgress: boolean[]; // 7 days, true if recorded
  className?: string;
}

export function StreakWidget({
  currentStreak,
  longestStreak,
  weeklyProgress,
  className,
}: StreakWidgetProps) {
  const { t } = useTranslations('patient.engagement');
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Empty state
  if (currentStreak === 0 && longestStreak === 0) {
    return (
      <div className={cn('rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900', className)}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Flame className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('currentStreak') || 'Start Your Streak'}
            </p>
            <p className="text-xs text-gray-500">
              {t('recordVitals') || 'Record vitals to begin tracking'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 dark:border-orange-800 dark:from-orange-950/50 dark:to-amber-950/50', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
            <Flame className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-orange-700 dark:text-orange-300">
              {t('currentStreak') || 'Current Streak'}
            </p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {currentStreak} {t('days') || 'days'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('best') || 'Best'}: {longestStreak} {t('days') || 'days'}
          </p>
          {currentStreak > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {t('keepGoing') || 'Keep it up!'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Progress Dots */}
      <div className="mt-4 flex items-center justify-between">
        {weeklyProgress.map((completed, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                completed
                  ? 'bg-orange-500 text-white shadow-sm'
                  : index === new Date().getDay()
                  ? 'border-2 border-orange-400 text-orange-600 dark:text-orange-400'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
              )}
            >
              {completed && <Zap className="h-3 w-3" />}
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{dayLabels[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Goals Progress Widget
interface GoalsWidgetProps {
  weeklyGoal: number;
  currentProgress: number;
  goals: Array<{
    id: string;
    name: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    goalType?: string;
  }>;
  className?: string;
}

export function GoalsWidget({
  weeklyGoal,
  currentProgress,
  goals,
  className,
}: GoalsWidgetProps) {
  const { t } = useTranslations('patient.engagement');
  const percentage = weeklyGoal > 0 ? Math.min(Math.round((currentProgress / weeklyGoal) * 100), 100) : 0;

  const iconMap: Record<string, typeof Target> = {
    VITALS: Target,
    MEDICATION: Pill,
    EXERCISE: Zap,
    EDUCATION: Star,
    CUSTOM: Target,
  };

  // Empty state
  if (goals.length === 0) {
    return (
      <Link
        href="/goals"
        className={cn('block rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800', className)}
      >
        <Target className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          {t('weeklyGoals') || 'No Goals Set'}
        </p>
        <p className="mt-1 flex items-center justify-center gap-1 text-xs text-brand-600">
          <Plus className="h-3 w-3" />
          {t('addGoal') || 'Add your first goal'}
        </p>
      </Link>
    );
  }

  return (
    <div className={cn('rounded-xl border border-brand-200 bg-white p-4 dark:border-brand-800 dark:bg-gray-900', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('weeklyGoals') || 'Weekly Goals'}
        </h3>
        <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
          {percentage}%
        </span>
      </div>

      {/* Main Progress Ring */}
      <div className="my-4 flex items-center justify-center">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90 transform">
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-100 dark:text-gray-800"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${(percentage / 100) * 251.2} 251.2`}
              strokeLinecap="round"
              className="text-brand-500 transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{currentProgress}</span>
            <span className="text-xs text-gray-500">/ {weeklyGoal}</span>
          </div>
        </div>
      </div>

      {/* Individual Goals */}
      <div className="space-y-2">
        {goals.slice(0, 3).map((goal) => {
          const GoalIcon = iconMap[goal.goalType || 'CUSTOM'] || Target;
          const goalPercent = goal.targetValue > 0
            ? Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100)
            : 0;

          return (
            <div key={goal.id} className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                <GoalIcon className="h-3 w-3 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {goal.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {goal.currentValue}/{goal.targetValue} {goal.unit}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${goalPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Medication Quick View Widget
interface MedicationWidgetProps {
  todayMeds: Array<{
    id: string;
    name: string;
    dosage: string;
    time: string;
    taken: boolean;
  }>;
  adherenceScore: number;
  className?: string;
}

export function MedicationWidget({
  todayMeds,
  adherenceScore,
  className,
}: MedicationWidgetProps) {
  const { t } = useTranslations('patient.engagement');

  // Empty state
  if (todayMeds.length === 0) {
    return (
      <div className={cn('rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900', className)}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Pill className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t('todaysMeds') || 'No Medications'}
            </p>
            <p className="text-xs text-gray-500">
              {t('noMedsHint') || 'No medications assigned yet'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = todayMeds.filter(m => !m.taken).length;
  const takenCount = todayMeds.filter(m => m.taken).length;

  return (
    <Link
      href="/medications"
      className={cn(
        'block rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 transition-colors hover:bg-purple-100/50 dark:border-purple-800 dark:from-purple-950/50 dark:to-pink-950/50 dark:hover:bg-purple-900/30',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
            <Pill className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('todaysMeds') || "Today's Medications"}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {takenCount}/{todayMeds.length} {t('taken') || 'taken'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {adherenceScore}%
            </p>
            <p className="text-[10px] text-gray-500">{t('adherence') || 'Adherence'}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Next Medication */}
      {pendingCount > 0 && (
        <div className="mt-3 rounded-lg bg-white/60 p-2 dark:bg-gray-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  {todayMeds.find(m => !m.taken)?.name || 'Next medication'}
                </p>
                <p className="text-[10px] text-gray-500">
                  {todayMeds.find(m => !m.taken)?.dosage}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              {todayMeds.find(m => !m.taken)?.time}
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}

// Upcoming Appointment Widget
interface AppointmentWidgetProps {
  appointment?: {
    id: string;
    providerName: string;
    type: string;
    date: string;
    time: string;
  } | null;
  className?: string;
}

export function AppointmentWidget({
  appointment,
  className,
}: AppointmentWidgetProps) {
  const { t } = useTranslations('patient.engagement');

  if (!appointment) {
    return (
      <Link
        href="/video-call"
        className={cn(
          'block rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800',
          className
        )}
      >
        <Calendar className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          {t('noUpcoming') || 'No upcoming appointments'}
        </p>
        <p className="text-xs text-gray-500">
          {t('scheduleNow') || 'Tap to request one'}
        </p>
      </Link>
    );
  }

  return (
    <Link
      href={`/video-call/${appointment.id}`}
      className={cn(
        'block rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 transition-colors hover:bg-blue-100/50 dark:border-blue-800 dark:from-blue-950/50 dark:to-cyan-950/50',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('nextAppointment') || 'Next Appointment'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {appointment.type} {t('with') || 'with'} {appointment.providerName}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 dark:bg-gray-900/40">
        <Clock className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {appointment.date}
        </span>
        <span className="text-sm text-gray-500">
          {t('at') || 'at'} {appointment.time}
        </span>
      </div>
    </Link>
  );
}

// Achievement Badge Component
interface AchievementBadgeProps {
  badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
    earnedAt?: string | null;
  };
  size?: 'sm' | 'md' | 'lg';
}

export function AchievementBadge({ badge, size = 'md' }: AchievementBadgeProps) {
  const iconMap: Record<string, typeof Star> = {
    star: Star,
    trophy: Trophy,
    flame: Flame,
    target: Target,
  };

  const Icon = iconMap[badge.icon] || Star;
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'flex items-center justify-center rounded-full transition-all',
          sizeClasses[size],
          badge.earned
            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg'
            : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
        )}
      >
        <Icon className={iconSizes[size]} />
      </div>
      <p className={cn(
        'text-center text-xs font-medium',
        badge.earned ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'
      )}>
        {badge.name}
      </p>
    </div>
  );
}

// Quick Actions Widget
interface QuickActionsWidgetProps {
  className?: string;
}

export function QuickActionsWidget({ className }: QuickActionsWidgetProps) {
  const { t } = useTranslations('patient.engagement');

  const actions = [
    {
      label: t('recordVitals') || 'Record Vitals',
      icon: Target,
      href: '/record-vitals',
      color: 'bg-brand-500 text-white hover:bg-brand-600',
    },
    {
      label: t('viewHistory') || 'View History',
      icon: Clock,
      href: '/my-vitals',
      color: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
    },
  ];

  return (
    <div className={cn('flex gap-2', className)}>
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors',
            action.color
          )}
        >
          <action.icon className="h-4 w-4" />
          {action.label}
        </Link>
      ))}
    </div>
  );
}

// Empty Achievements Widget
interface AchievementsWidgetProps {
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
    earnedAt?: string | null;
  }>;
  className?: string;
}

export function AchievementsWidget({ achievements, className }: AchievementsWidgetProps) {
  const { t } = useTranslations('patient.engagement');

  if (achievements.length === 0) {
    return (
      <div className={cn('rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-900', className)}>
        <Trophy className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          {t('achievements') || 'No Achievements Yet'}
        </p>
        <p className="text-xs text-gray-500">
          {t('earnFirst') || 'Record vitals to earn badges'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900', className)}>
      <div className="flex items-center justify-around">
        {achievements.slice(0, 4).map((badge) => (
          <AchievementBadge key={badge.id} badge={badge} size="md" />
        ))}
      </div>
    </div>
  );
}
