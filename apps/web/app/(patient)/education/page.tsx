'use client';

import { BookOpen, Video } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';

// Educational content will come from API when implemented
// For now, show empty state

interface EducationalContent {
  id: string;
  title: string;
  description: string;
  category: 'article' | 'video';
  duration: string;
  thumbnail: string | null;
}

export default function EducationPage() {
  const { t } = useTranslations('patient.education');

  // Empty array - will be populated from API when available
  const articles: EducationalContent[] = [];

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {t('title')}
      </h1>

      {/* Content List */}
      <div className="space-y-3">
        {articles.length > 0 ? (
          articles.map((item) => (
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
            <BookOpen className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('noContent')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t('noContentHint') || 'Educational content will be available soon.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
