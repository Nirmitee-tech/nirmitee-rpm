'use client';

import { BookOpen, Video } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';

export default function EducationPage() {
  const { t } = useTranslations('patient.education');

  // Mock educational content
  const mockArticles = [
    {
      id: '1',
      title: 'Managing Your Blood Pressure',
      description: 'Learn effective strategies to keep your blood pressure in check',
      category: 'article',
      duration: '5 min read',
      thumbnail: null,
    },
    {
      id: '2',
      title: 'Healthy Eating for Heart Health',
      description: 'Discover heart-healthy foods and meal planning tips',
      category: 'article',
      duration: '7 min read',
      thumbnail: null,
    },
    {
      id: '3',
      title: 'Exercise Tips for Beginners',
      description: 'Safe and effective exercises to improve your health',
      category: 'video',
      duration: '10 min',
      thumbnail: null,
    },
  ];

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {t('title')}
      </h1>

      {/* Today's Tip */}
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950">
        <h2 className="mb-2 text-sm font-semibold text-brand-900 dark:text-brand-100">
          {t('todayTip')}
        </h2>
        <p className="text-sm text-brand-800 dark:text-brand-200">
          Stay hydrated by drinking at least 8 glasses of water daily. Proper hydration
          helps maintain healthy blood pressure levels.
        </p>
      </div>

      {/* Content List */}
      <div className="space-y-3">
        {mockArticles.length > 0 ? (
          mockArticles.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  {item.category === 'video' ? (
                    <Video className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {item.duration}
                    </span>
                    <button
                      type="button"
                      className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      {t('readMore')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('noContent')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
