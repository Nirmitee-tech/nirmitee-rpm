'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Square, RotateCcw, Clock, Timer, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogTimePanelProps {
  patientId: string;
  patientPhone?: string;
  onAddTimeLog?: (minutes: number) => void;
  onCallPatient?: () => void;
  className?: string;
}

// Digit component for clean number display
function TimerDigit({ value, isRunning }: { value: string; isRunning: boolean }) {
  return (
    <div className={cn(
      "relative flex items-center justify-center w-7 h-9 rounded transition-all duration-300",
      isRunning
        ? "bg-[#745EE1] text-white shadow-md shadow-[#745EE1]/30"
        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
    )}>
      <span className="text-base font-semibold tabular-nums">{value}</span>
      {isRunning && (
        <div className="absolute inset-0 rounded bg-gradient-to-t from-black/10 to-transparent" />
      )}
    </div>
  );
}

// Success celebration component
function SuccessCelebration({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 dark:bg-gray-900/95 rounded-lg z-10 animate-in fade-in duration-300">
      <div className="relative">
        <CheckCircle2 className="w-12 h-12 text-green-500 animate-in zoom-in duration-500" />
        <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-400 animate-pulse" />
        <Sparkles className="absolute -bottom-1 -left-1 w-4 h-4 text-yellow-400 animate-pulse delay-150" />
      </div>
      <p className="mt-2 text-sm font-semibold text-green-600 dark:text-green-400">Time Logged!</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">Successfully saved</p>
    </div>
  );
}

export function LogTimePanel({
  patientId,
  patientPhone,
  onAddTimeLog,
  onCallPatient,
  className,
}: LogTimePanelProps) {
  const { t } = useTranslations('patientDetail');
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedMinutes, setSavedMinutes] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prevSeconds) => prevSeconds + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const formatTime = (totalSeconds: number): { hours: string; minutes: string; secs: string } => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      secs: secs.toString().padStart(2, '0'),
    };
  };

  const handleStartStop = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
  };

  const handleSuccessComplete = useCallback(() => {
    setShowSuccess(false);
  }, []);

  const handleAddTimeLog = async () => {
    if (seconds < 60) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/patients/${patientId}/time-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          durationSeconds: seconds,
          type: 'INTERACTION',
          notes: 'Patient interaction time logged from timer',
        }),
      });

      if (!response.ok) throw new Error('Failed to log time');

      await response.json();

      const mins = Math.floor(seconds / 60);
      setSavedMinutes(mins);
      setShowSuccess(true);

      if (onAddTimeLog) onAddTimeLog(mins);

      handleReset();
    } catch (error) {
      console.error('Error logging time:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const time = formatTime(seconds);
  const canSave = seconds >= 60;

  return (
    <Card className={cn('w-full h-full relative overflow-hidden', className)}>
      {showSuccess && <SuccessCelebration onComplete={handleSuccessComplete} />}

      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-[#745EE1]" />
          {t('logTime')}
        </CardTitle>
        {isRunning && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-[10px] text-green-700 dark:text-green-400 font-medium">
            <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
            REC
          </span>
        )}
      </CardHeader>

      <CardContent className="px-3 pb-2 pt-0 space-y-2">
        {/* Timer Display - Compact digital clock */}
        <div className={cn(
          "relative rounded-lg p-2 transition-all duration-500",
          isRunning
            ? "bg-gradient-to-br from-[#745EE1]/5 via-[#8B5CF6]/5 to-[#A78BFA]/5 dark:from-[#745EE1]/15 dark:via-[#8B5CF6]/15 dark:to-[#A78BFA]/15"
            : "bg-gray-50 dark:bg-gray-800/30"
        )}>
          <div className="flex items-center justify-center gap-1">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <div className="flex gap-px">
                <TimerDigit value={time.hours[0]} isRunning={isRunning} />
                <TimerDigit value={time.hours[1]} isRunning={isRunning} />
              </div>
              <span className="text-[8px] font-medium text-gray-400 uppercase mt-0.5">hrs</span>
            </div>

            {/* Separator */}
            <div className="flex flex-col gap-1 mb-3">
              <span className={cn(
                "w-1 h-1 rounded-full transition-colors duration-300",
                isRunning ? "bg-[#745EE1] animate-pulse" : "bg-gray-300 dark:bg-gray-600"
              )} />
              <span className={cn(
                "w-1 h-1 rounded-full transition-colors duration-300",
                isRunning ? "bg-[#745EE1] animate-pulse" : "bg-gray-300 dark:bg-gray-600"
              )} />
            </div>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <div className="flex gap-px">
                <TimerDigit value={time.minutes[0]} isRunning={isRunning} />
                <TimerDigit value={time.minutes[1]} isRunning={isRunning} />
              </div>
              <span className="text-[8px] font-medium text-gray-400 uppercase mt-0.5">min</span>
            </div>

            {/* Separator */}
            <div className="flex flex-col gap-1 mb-3">
              <span className={cn(
                "w-1 h-1 rounded-full transition-colors duration-300",
                isRunning ? "bg-[#745EE1] animate-pulse" : "bg-gray-300 dark:bg-gray-600"
              )} />
              <span className={cn(
                "w-1 h-1 rounded-full transition-colors duration-300",
                isRunning ? "bg-[#745EE1] animate-pulse" : "bg-gray-300 dark:bg-gray-600"
              )} />
            </div>

            {/* Seconds */}
            <div className="flex flex-col items-center">
              <div className="flex gap-px">
                <TimerDigit value={time.secs[0]} isRunning={isRunning} />
                <TimerDigit value={time.secs[1]} isRunning={isRunning} />
              </div>
              <span className="text-[8px] font-medium text-gray-400 uppercase mt-0.5">sec</span>
            </div>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            onClick={handleStartStop}
            size="sm"
            className={cn(
              "flex-1 h-8 text-xs font-medium transition-all duration-300 shadow-sm",
              isRunning
                ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-500/25"
                : "bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] hover:from-[#6249d1] hover:to-[#7C4DFF] text-white shadow-[#745EE1]/25"
            )}
          >
            {isRunning ? (
              <>
                <Square className="w-3 h-3 mr-1 fill-current" />
                {t('stop')}
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1 fill-current" />
                {t('start')}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={seconds === 0}
            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={t('reset') || 'Reset'}
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>

        {/* Save Button */}
        {seconds > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddTimeLog}
            disabled={!canSave || isSaving}
            className={cn(
              "w-full h-7 text-[11px] font-medium transition-all duration-300",
              canSave
                ? "bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                : "opacity-60"
            )}
          >
            <Clock className="w-3 h-3 mr-1" />
            {isSaving
              ? (t('saving') || 'Saving...')
              : canSave
                ? (t('saveTimeLog') || 'Save')
                : (t('minOneMinute') || 'Min 1 min')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
