'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  X,
  User,
  Activity,
  Clock,
  ArrowRight,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { formatDistanceToNow } from 'date-fns';

interface CriticalAlert {
  id: string;
  patientId: string;
  patientName: string;
  severity: 'CRITICAL' | 'SIGNIFICANT' | 'INFORMATIONAL';
  title: string;
  message: string;
  vitalType?: string;
  status: string;
  escalationLevel: number;
  createdAt: string;
}

interface CriticalAlertPopupProps {
  alerts: CriticalAlert[];
  onDismiss: (alertId: string) => void;
  onDismissAll: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export function CriticalAlertPopup({
  alerts,
  onDismiss,
  onDismissAll,
  soundEnabled = true,
  onToggleSound,
}: CriticalAlertPopupProps) {
  const { t } = useTranslations('dashboard.realtime');
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Show/hide popup based on alerts
  useEffect(() => {
    if (alerts.length > 0) {
      setIsVisible(true);
      setCurrentIndex(0);

      // Play sound if enabled
      if (soundEnabled && typeof window !== 'undefined') {
        try {
          const audio = new Audio('/sounds/critical-alert.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {
            // Ignore autoplay errors
          });
        } catch {
          // Audio not supported
        }
      }
    } else {
      setIsVisible(false);
    }
  }, [alerts.length, soundEnabled]);

  if (!isVisible || alerts.length === 0) {
    return null;
  }

  const currentAlert = alerts[currentIndex];
  const hasMultiple = alerts.length > 1;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % alerts.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + alerts.length) % alerts.length);
  };

  const handleDismissCurrent = () => {
    onDismiss(currentAlert.id);
    if (currentIndex >= alerts.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsVisible(false)}
      />

      {/* Alert Card */}
      <div className="relative w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
        <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-2xl border-2 border-red-500 overflow-hidden">
          {/* Header */}
          <div className="bg-red-500 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              <span className="font-semibold">{t('criticalAlert')}</span>
              {hasMultiple && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/20">
                  {currentIndex + 1} / {alerts.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onToggleSound && (
                <button
                  onClick={onToggleSound}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                  title={soundEnabled ? t('muteSound') : t('enableSound')}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-white" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-white" />
                  )}
                </button>
              )}
              <button
                onClick={() => setIsVisible(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {currentAlert.title}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 mb-4">{currentAlert.message}</p>

            {/* Patient Info */}
            <div className="flex flex-wrap gap-4 mb-4 text-sm">
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <User className="h-4 w-4" />
                <span>{currentAlert.patientName}</span>
              </div>
              {currentAlert.vitalType && (
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Activity className="h-4 w-4" />
                  <span>{currentAlert.vitalType}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(currentAlert.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Escalation Level */}
            {currentAlert.escalationLevel > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  {t('escalationLevel', { level: currentAlert.escalationLevel })}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Link href={`/patients/${currentAlert.patientId}`}>
                <Button variant="default" size="sm">
                  {t('viewPatient')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

              <Button variant="outline" size="sm" onClick={handleDismissCurrent}>
                {t('dismiss')}
              </Button>

              {hasMultiple && (
                <Button variant="ghost" size="sm" onClick={onDismissAll}>
                  {t('dismissAll')}
                </Button>
              )}
            </div>
          </div>

          {/* Navigation for multiple alerts */}
          {hasMultiple && (
            <div className="px-6 pb-4 flex items-center justify-between">
              <button
                onClick={handlePrevious}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ← {t('previous')}
              </button>
              <div className="flex gap-1">
                {alerts.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentIndex
                        ? 'bg-red-500'
                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleNext}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {t('next')} →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
