'use client';

import { useState, useMemo } from 'react';
import {
  BookOpen,
  Video,
  Search,
  Heart,
  Droplets,
  Scale,
  Wind,
  Pill,
  Apple,
  Brain,
  ChevronRight,
  CheckCircle,
  Clock,
  Star,
  Trophy,
  Filter,
} from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { cn } from '@/lib/utils';

type ContentCategory = 'all' | 'blood-pressure' | 'diabetes' | 'weight' | 'heart' | 'respiratory' | 'medications' | 'nutrition';
type ContentType = 'all' | 'article' | 'video';

interface EducationalContent {
  id: string;
  title: string;
  description: string;
  category: ContentCategory;
  type: 'article' | 'video';
  duration: string;
  thumbnail: string | null;
  completed: boolean;
  featured: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Demo educational content
const DEMO_CONTENT: EducationalContent[] = [
  // Blood Pressure
  {
    id: 'bp-1',
    title: 'Understanding Your Blood Pressure Numbers',
    description: 'Learn what systolic and diastolic readings mean and why they matter for your health.',
    category: 'blood-pressure',
    type: 'article',
    duration: '5 min read',
    thumbnail: null,
    completed: true,
    featured: true,
    difficulty: 'beginner',
  },
  {
    id: 'bp-2',
    title: 'How to Measure Blood Pressure Accurately',
    description: 'Step-by-step guide to getting accurate readings at home every time.',
    category: 'blood-pressure',
    type: 'video',
    duration: '8 min watch',
    thumbnail: null,
    completed: true,
    featured: false,
    difficulty: 'beginner',
  },
  {
    id: 'bp-3',
    title: 'Foods That Help Lower Blood Pressure',
    description: 'Discover the DASH diet and heart-healthy foods that naturally reduce hypertension.',
    category: 'blood-pressure',
    type: 'article',
    duration: '7 min read',
    thumbnail: null,
    completed: false,
    featured: true,
    difficulty: 'intermediate',
  },
  // Diabetes
  {
    id: 'db-1',
    title: 'Blood Sugar Basics: What You Need to Know',
    description: 'Understanding glucose levels, A1C, and what the numbers mean for your diabetes management.',
    category: 'diabetes',
    type: 'article',
    duration: '6 min read',
    thumbnail: null,
    completed: true,
    featured: true,
    difficulty: 'beginner',
  },
  {
    id: 'db-2',
    title: 'Carb Counting Made Simple',
    description: 'Master the basics of counting carbohydrates to better manage your blood sugar.',
    category: 'diabetes',
    type: 'video',
    duration: '12 min watch',
    thumbnail: null,
    completed: false,
    featured: false,
    difficulty: 'intermediate',
  },
  {
    id: 'db-3',
    title: 'Exercise & Diabetes: A Complete Guide',
    description: 'Safe exercise tips and how physical activity affects your blood sugar levels.',
    category: 'diabetes',
    type: 'article',
    duration: '8 min read',
    thumbnail: null,
    completed: false,
    featured: false,
    difficulty: 'intermediate',
  },
  // Weight Management
  {
    id: 'wt-1',
    title: 'Setting Realistic Weight Goals',
    description: 'Learn how to set achievable weight management goals that stick.',
    category: 'weight',
    type: 'article',
    duration: '5 min read',
    thumbnail: null,
    completed: false,
    featured: false,
    difficulty: 'beginner',
  },
  {
    id: 'wt-2',
    title: 'Portion Control Techniques',
    description: 'Visual guides and practical tips for managing portion sizes without counting calories.',
    category: 'weight',
    type: 'video',
    duration: '10 min watch',
    thumbnail: null,
    completed: false,
    featured: true,
    difficulty: 'beginner',
  },
  // Heart Health
  {
    id: 'hh-1',
    title: 'Understanding Your Heart Rate',
    description: 'What is a healthy heart rate and what can affect it throughout the day.',
    category: 'heart',
    type: 'article',
    duration: '4 min read',
    thumbnail: null,
    completed: true,
    featured: false,
    difficulty: 'beginner',
  },
  {
    id: 'hh-2',
    title: 'Warning Signs: When to Seek Help',
    description: 'Recognize the symptoms that require immediate medical attention.',
    category: 'heart',
    type: 'video',
    duration: '6 min watch',
    thumbnail: null,
    completed: false,
    featured: true,
    difficulty: 'beginner',
  },
  // Respiratory
  {
    id: 'rp-1',
    title: 'Oxygen Saturation: What SpO2 Means',
    description: 'Understanding your pulse oximeter readings and when levels are concerning.',
    category: 'respiratory',
    type: 'article',
    duration: '5 min read',
    thumbnail: null,
    completed: false,
    featured: false,
    difficulty: 'beginner',
  },
  {
    id: 'rp-2',
    title: 'Breathing Exercises for Better Health',
    description: 'Simple breathing techniques to improve lung capacity and reduce stress.',
    category: 'respiratory',
    type: 'video',
    duration: '15 min watch',
    thumbnail: null,
    completed: false,
    featured: false,
    difficulty: 'intermediate',
  },
  // Medications
  {
    id: 'md-1',
    title: 'Managing Multiple Medications Safely',
    description: 'Tips for organizing your medications and avoiding dangerous interactions.',
    category: 'medications',
    type: 'article',
    duration: '6 min read',
    thumbnail: null,
    completed: false,
    featured: true,
    difficulty: 'intermediate',
  },
  {
    id: 'md-2',
    title: 'Understanding Your Prescription Labels',
    description: 'Decode the abbreviations and instructions on your medication bottles.',
    category: 'medications',
    type: 'video',
    duration: '7 min watch',
    thumbnail: null,
    completed: false,
    featured: false,
    difficulty: 'beginner',
  },
  // Nutrition
  {
    id: 'nt-1',
    title: 'Reading Nutrition Labels Like a Pro',
    description: 'Make informed food choices by understanding what\'s really in your food.',
    category: 'nutrition',
    type: 'article',
    duration: '8 min read',
    thumbnail: null,
    completed: false,
    featured: false,
    difficulty: 'beginner',
  },
  {
    id: 'nt-2',
    title: 'Meal Planning for Better Health',
    description: 'Weekly meal planning strategies that save time and improve nutrition.',
    category: 'nutrition',
    type: 'video',
    duration: '12 min watch',
    thumbnail: null,
    completed: false,
    featured: true,
    difficulty: 'intermediate',
  },
];

const CATEGORIES = [
  { id: 'all', icon: BookOpen, color: 'gray' },
  { id: 'blood-pressure', icon: Droplets, color: 'red' },
  { id: 'diabetes', icon: Droplets, color: 'purple' },
  { id: 'weight', icon: Scale, color: 'green' },
  { id: 'heart', icon: Heart, color: 'pink' },
  { id: 'respiratory', icon: Wind, color: 'blue' },
  { id: 'medications', icon: Pill, color: 'orange' },
  { id: 'nutrition', icon: Apple, color: 'emerald' },
] as const;

export default function EducationPage() {
  const { t } = useTranslations('patient.education');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory>('all');
  const [selectedType, setSelectedType] = useState<ContentType>('all');
  const [completedItems, setCompletedItems] = useState<Set<string>>(
    new Set(DEMO_CONTENT.filter(c => c.completed).map(c => c.id))
  );

  const filteredContent = useMemo(() => {
    return DEMO_CONTENT.filter(item => {
      const matchesSearch = searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesType = selectedType === 'all' || item.type === selectedType;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [searchQuery, selectedCategory, selectedType]);

  const featuredContent = DEMO_CONTENT.filter(item => item.featured);

  const completionPercentage = Math.round((completedItems.size / DEMO_CONTENT.length) * 100);

  const toggleCompleted = (id: string) => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getCategoryColor = (category: ContentCategory) => {
    const colors: Record<string, string> = {
      'blood-pressure': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      'diabetes': 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      'weight': 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      'heart': 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
      'respiratory': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      'medications': 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
      'nutrition': 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    };
    return colors[category] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  };

  const getCategoryIcon = (category: ContentCategory) => {
    const icons: Record<string, React.ElementType> = {
      'blood-pressure': Droplets,
      'diabetes': Droplets,
      'weight': Scale,
      'heart': Heart,
      'respiratory': Wind,
      'medications': Pill,
      'nutrition': Apple,
    };
    return icons[category] || BookOpen;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header with Progress */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 px-4 pb-6 pt-4 text-white">
        <h1 className="text-xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-sm text-purple-100">{t('subtitle') || 'Learn to manage your health better'}</p>

        {/* Progress Card */}
        <div className="mt-4 rounded-xl bg-white/15 backdrop-blur p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-100">{t('progress') || 'Your Progress'}</p>
                <p className="text-2xl font-bold">{completionPercentage}%</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-200">{t('completed') || 'Completed'}</p>
              <p className="text-lg font-semibold">{completedItems.size}/{DEMO_CONTENT.length}</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 -mt-2 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder') || 'Search articles & videos...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as ContentCategory)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  isSelected
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(`categories.${cat.id}`) || cat.id.replace('-', ' ')}
              </button>
            );
          })}
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          {(['all', 'article', 'video'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                selectedType === type
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
              )}
            >
              {type === 'video' && <Video className="h-3.5 w-3.5" />}
              {type === 'article' && <BookOpen className="h-3.5 w-3.5" />}
              {type === 'all' && <Filter className="h-3.5 w-3.5" />}
              {t(`types.${type}`) || type}
            </button>
          ))}
        </div>

        {/* Featured Section */}
        {selectedCategory === 'all' && selectedType === 'all' && searchQuery === '' && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
              <Star className="h-4 w-4 text-amber-500" />
              {t('featured') || 'Featured'}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {featuredContent.map((item) => {
                const CategoryIcon = getCategoryIcon(item.category);
                const isCompleted = completedItems.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex-shrink-0 w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-start justify-between">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', getCategoryColor(item.category))}>
                        <CategoryIcon className="h-3 w-3" />
                        {t(`categories.${item.category}`) || item.category}
                      </span>
                      {isCompleted && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      {item.type === 'video' ? <Video className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
                      <span>{item.duration}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {selectedCategory !== 'all'
              ? t(`categories.${selectedCategory}`) || selectedCategory
              : t('allContent') || 'All Content'
            }
            <span className="ml-2 text-xs font-normal text-gray-500">({filteredContent.length})</span>
          </h2>

          {filteredContent.length > 0 ? (
            <div className="space-y-2">
              {filteredContent.map((item) => {
                const CategoryIcon = getCategoryIcon(item.category);
                const isCompleted = completedItems.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleCompleted(item.id)}
                    className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:shadow-md active:scale-[0.99] dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                        getCategoryColor(item.category)
                      )}>
                        {item.type === 'video' ? (
                          <Video className="h-5 w-5" />
                        ) : (
                          <BookOpen className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={cn(
                            'text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2',
                            isCompleted && 'line-through opacity-60'
                          )}>
                            {item.title}
                          </h3>
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {item.description}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.duration}
                          </span>
                          <span className={cn(
                            'rounded-full px-2 py-0.5',
                            item.difficulty === 'beginner' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                            item.difficulty === 'intermediate' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                            item.difficulty === 'advanced' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          )}>
                            {t(`difficulty.${item.difficulty}`) || item.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
              <Brain className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('noResults') || 'No content found'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {t('noResultsHint') || 'Try adjusting your filters'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
