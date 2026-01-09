'use client';

import { Award, Flame, Target, Trophy, Star, Lock, Calendar, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/lib/i18n/i18n-context';

// Demo achievements data
const achievements = [
  {
    id: '1',
    name: 'First Reading',
    description: 'Record your first vital sign reading',
    icon: 'star' as const,
    earned: true,
    earnedDate: '2024-01-15',
    category: 'milestone',
    points: 50,
  },
  {
    id: '2',
    name: '7-Day Streak',
    description: 'Record vitals for 7 consecutive days',
    icon: 'flame' as const,
    earned: true,
    earnedDate: '2024-01-22',
    category: 'streak',
    points: 100,
  },
  {
    id: '3',
    name: '14-Day Streak',
    description: 'Record vitals for 14 consecutive days',
    icon: 'flame' as const,
    earned: true,
    earnedDate: '2024-02-05',
    category: 'streak',
    points: 200,
  },
  {
    id: '4',
    name: '30-Day Streak',
    description: 'Record vitals for 30 consecutive days',
    icon: 'flame' as const,
    earned: false,
    category: 'streak',
    points: 500,
    progress: 21,
    target: 30,
  },
  {
    id: '5',
    name: 'Perfect Week',
    description: 'Complete all weekly goals in one week',
    icon: 'trophy' as const,
    earned: false,
    category: 'goals',
    points: 150,
  },
  {
    id: '6',
    name: 'Goal Crusher',
    description: 'Exceed weekly goal by 50%',
    icon: 'target' as const,
    earned: false,
    category: 'goals',
    points: 200,
  },
  {
    id: '7',
    name: 'Med Master',
    description: 'Take all medications on time for 7 days',
    icon: 'star' as const,
    earned: true,
    earnedDate: '2024-01-28',
    category: 'medication',
    points: 100,
  },
  {
    id: '8',
    name: 'Educator',
    description: 'Complete 5 educational lessons',
    icon: 'star' as const,
    earned: true,
    earnedDate: '2024-02-01',
    category: 'education',
    points: 75,
  },
  {
    id: '9',
    name: 'Knowledge Seeker',
    description: 'Complete all educational content in a category',
    icon: 'trophy' as const,
    earned: false,
    category: 'education',
    points: 200,
    progress: 4,
    target: 8,
  },
  {
    id: '10',
    name: 'Health Champion',
    description: 'Maintain good status for 30 days',
    icon: 'trophy' as const,
    earned: false,
    category: 'health',
    points: 300,
    progress: 18,
    target: 30,
  },
];

const categories = [
  { id: 'all', name: 'All' },
  { id: 'streak', name: 'Streaks' },
  { id: 'goals', name: 'Goals' },
  { id: 'milestone', name: 'Milestones' },
  { id: 'medication', name: 'Medications' },
  { id: 'education', name: 'Education' },
  { id: 'health', name: 'Health' },
];

const iconMap = {
  star: Star,
  trophy: Trophy,
  flame: Flame,
  target: Target,
};

export default function AchievementsPage() {
  const { t } = useTranslations('patient.engagement');
  const { t: tCommon } = useTranslations('common');

  const earnedCount = achievements.filter((a) => a.earned).length;
  const totalPoints = achievements.filter((a) => a.earned).reduce((sum, a) => sum + a.points, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 px-4 pb-8 pt-6 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6" />
            <h1 className="text-xl font-bold">{t('achievements') || 'Achievements'}</h1>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/20 p-3 text-center backdrop-blur-sm">
              <p className="text-2xl font-bold">{earnedCount}</p>
              <p className="text-xs opacity-90">{t('earnedBadges') || 'Earned'}</p>
            </div>
            <div className="rounded-xl bg-white/20 p-3 text-center backdrop-blur-sm">
              <p className="text-2xl font-bold">{achievements.length - earnedCount}</p>
              <p className="text-xs opacity-90">{t('lockedBadges') || 'Locked'}</p>
            </div>
            <div className="rounded-xl bg-white/20 p-3 text-center backdrop-blur-sm">
              <p className="text-2xl font-bold">{totalPoints}</p>
              <p className="text-xs opacity-90">{t('points') || 'Points'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="sticky top-0 z-10 bg-gray-50 px-4 py-3 dark:bg-gray-950">
        <div className="mx-auto max-w-2xl">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={cn(
                  'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  cat.id === 'all'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {achievements.map((achievement) => {
              const Icon = iconMap[achievement.icon];
              const hasProgress = !achievement.earned && achievement.progress !== undefined;
              const progressPercent = hasProgress
                ? Math.round((achievement.progress! / achievement.target!) * 100)
                : 0;

              return (
                <div
                  key={achievement.id}
                  className={cn(
                    'relative rounded-xl border p-4 transition-all',
                    achievement.earned
                      ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/30'
                      : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                  )}
                >
                  {/* Badge Icon */}
                  <div className="flex justify-center">
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-full transition-all',
                        achievement.earned
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                      )}
                    >
                      {achievement.earned ? (
                        <Icon className="h-7 w-7" />
                      ) : (
                        <Lock className="h-6 w-6" />
                      )}
                    </div>
                  </div>

                  {/* Badge Info */}
                  <div className="mt-3 text-center">
                    <h3
                      className={cn(
                        'text-sm font-semibold',
                        achievement.earned
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-gray-500 dark:text-gray-400'
                      )}
                    >
                      {achievement.name}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {achievement.description}
                    </p>
                  </div>

                  {/* Points */}
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <Star className={cn('h-3 w-3', achievement.earned ? 'text-amber-500' : 'text-gray-300')} />
                    <span
                      className={cn(
                        'text-xs font-medium',
                        achievement.earned ? 'text-amber-600' : 'text-gray-400'
                      )}
                    >
                      {achievement.points} {t('points') || 'pts'}
                    </span>
                  </div>

                  {/* Earned Date or Progress */}
                  {achievement.earned ? (
                    <div className="mt-2 flex items-center justify-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle className="h-3 w-3" />
                      <span>{achievement.earnedDate}</span>
                    </div>
                  ) : hasProgress ? (
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-center text-xs text-gray-500">
                        {achievement.progress}/{achievement.target}
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Motivational Card */}
          <div className="mt-6 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-indigo-50 p-4 dark:border-brand-800 dark:from-brand-950/30 dark:to-indigo-950/30">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
                <Trophy className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {t('keepGoing') || 'Keep Going!'}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  You&apos;re {achievements.length - earnedCount} achievements away from completing
                  your collection. Keep tracking your vitals and staying healthy!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
