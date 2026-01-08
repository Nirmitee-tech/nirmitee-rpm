'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, Button } from '@nirmitee/ui';
import {
  Mail,
  Phone,
  User,
  Play,
  Square,
  RotateCcw,
  Clock,
  Timer,
  CheckCircle2,
  MapPin,
  Calendar,
  Shield,
  AlertCircle,
  Activity,
  FileText,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface PatientInsurance {
  planName?: string | null;
  memberId?: string | null;
}

interface PatientInfoHeaderProps {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    mrn?: string;
    phone?: string;
    email?: string;
    address?: PatientAddress | null;
    insurance?: PatientInsurance | null;
    enrollmentStatus?: 'PENDING' | 'CONSENTED' | 'ACTIVE' | 'INACTIVE' | 'DISCHARGED';
    enrollmentDate?: string | null;
    emergencyContact?: string;
    emergencyPhone?: string;
  };
  className?: string;
  onAddTimeLog?: (minutes: number) => void;
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Tooltip wrapper component
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <div className="group relative inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-[10px] font-medium text-white bg-gray-900 dark:bg-gray-700 rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
      </div>
    </div>
  );
}

// Inline Timer Digit
function TimerDigit({ value, isRunning }: { value: string; isRunning: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-center w-5 h-6 rounded text-xs font-semibold tabular-nums transition-all",
      isRunning
        ? "bg-[#745EE1] text-white"
        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
    )}>
      {value}
    </div>
  );
}

// Status badge colors
const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONSENTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  DISCHARGED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function PatientInfoHeader({ patient, className, onAddTimeLog }: PatientInfoHeaderProps) {
  const { t } = useTranslations('patientDetail');
  const age = calculateAge(patient.dateOfBirth);
  const initials = getInitials(patient.firstName, patient.lastName);
  const status = patient.enrollmentStatus || 'ACTIVE';

  // Timer state
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return {
      minutes: mins.toString().padStart(2, '0'),
      secs: secs.toString().padStart(2, '0'),
    };
  };

  const handleStartStop = () => setIsRunning(!isRunning);
  const handleReset = () => { setIsRunning(false); setSeconds(0); };

  const handleSaveTime = async () => {
    if (seconds < 60) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/patients/${patient.id}/time-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          durationSeconds: seconds,
          type: 'INTERACTION',
          notes: 'Patient interaction time logged',
        }),
      });
      if (!response.ok) throw new Error('Failed to log time');
      const mins = Math.floor(seconds / 60);
      setShowSuccess(true);
      if (onAddTimeLog) onAddTimeLog(mins);
      handleReset();
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error logging time:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const time = formatTime(seconds);
  const canSave = seconds >= 60;

  // Format address
  const addressStr = patient.address
    ? [patient.address.city, patient.address.state].filter(Boolean).join(', ')
    : null;

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Left: Avatar with Status */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <Tooltip content={`${patient.firstName} ${patient.lastName}`}>
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#745EE1] to-[#8B5CF6] flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">{initials}</span>
              </div>
            </Tooltip>
            <Tooltip content={t(`status.${status.toLowerCase()}`) || status}>
              <span className={cn("px-2 py-0.5 text-[9px] font-semibold rounded-full", statusColors[status])}>
                {status}
              </span>
            </Tooltip>
          </div>

          {/* Center: Patient Details */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Name, DOB, Age, Gender */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {patient.firstName} {patient.lastName}
              </h1>
              <Tooltip content={t('dateOfBirth')}>
                <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(patient.dateOfBirth).toLocaleDateString()} ({age} {t('age')})
                </span>
              </Tooltip>
              <Tooltip content={t('gender')}>
                <Badge variant="gray" className="uppercase text-xs">{patient.gender}</Badge>
              </Tooltip>
            </div>

            {/* Row 2: Contact Info with Icons */}
            <div className="flex items-center gap-4 flex-wrap text-xs mb-2">
              {patient.mrn && (
                <Tooltip content={t('mrnTooltip') || 'Medical Record Number - Unique patient identifier'}>
                  <span className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">
                    <User className="w-3 h-3 text-gray-500" />
                    <span className="font-medium text-gray-500">{t('mrn')}:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{patient.mrn}</span>
                  </span>
                </Tooltip>
              )}
              {patient.phone && (
                <Tooltip content={t('phoneTooltip') || 'Click to call patient'}>
                  <a href={`tel:${patient.phone}`} className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                    <Phone className="w-3 h-3 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">{patient.phone}</span>
                  </a>
                </Tooltip>
              )}
              {patient.email && (
                <Tooltip content={t('emailTooltip') || 'Click to send email'}>
                  <a href={`mailto:${patient.email}`} className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors truncate max-w-[200px]">
                    <Mail className="w-3 h-3 text-blue-600" />
                    <span className="font-medium text-blue-700 dark:text-blue-400 truncate">{patient.email}</span>
                  </a>
                </Tooltip>
              )}
            </div>

            {/* Row 3: Additional Info */}
            <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500 dark:text-gray-400">
              {addressStr && (
                <Tooltip content={t('addressTooltip') || 'Patient location'}>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {addressStr}
                  </span>
                </Tooltip>
              )}
              {patient.insurance?.planName && (
                <Tooltip content={t('insuranceTooltip') || `Insurance: ${patient.insurance.planName}${patient.insurance.memberId ? ` (ID: ${patient.insurance.memberId})` : ''}`}>
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {patient.insurance.planName}
                  </span>
                </Tooltip>
              )}
              {patient.enrollmentDate && (
                <Tooltip content={t('enrollmentDateTooltip') || 'Date patient was enrolled in RPM program'}>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {t('enrolled')}: {new Date(patient.enrollmentDate).toLocaleDateString()}
                  </span>
                </Tooltip>
              )}
              {patient.emergencyContact && (
                <Tooltip content={t('emergencyTooltip') || `Emergency: ${patient.emergencyContact}${patient.emergencyPhone ? ` - ${patient.emergencyPhone}` : ''}`}>
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="w-3 h-3" />
                    {patient.emergencyContact}
                  </span>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Right: Timer Panel */}
          <div className="flex-shrink-0 flex flex-col items-end gap-2 pl-4 border-l border-gray-200 dark:border-gray-700">
            {/* Timer Label */}
            <Tooltip content={t('timerTooltip') || 'Track time spent with patient for billing'}>
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {t('interactionTime') || 'Interaction Time'}
              </span>
            </Tooltip>

            {showSuccess ? (
              <div className="flex items-center gap-1 text-green-600 py-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">{t('timeSaved') || 'Saved!'}</span>
              </div>
            ) : (
              <>
                {/* Timer Display */}
                <div className="flex items-center gap-0.5">
                  <Timer className={cn("w-4 h-4 mr-1", isRunning ? "text-[#745EE1]" : "text-gray-400")} />
                  <TimerDigit value={time.minutes[0]} isRunning={isRunning} />
                  <TimerDigit value={time.minutes[1]} isRunning={isRunning} />
                  <span className={cn("text-sm font-bold mx-0.5", isRunning ? "text-[#745EE1] animate-pulse" : "text-gray-400")}>:</span>
                  <TimerDigit value={time.secs[0]} isRunning={isRunning} />
                  <TimerDigit value={time.secs[1]} isRunning={isRunning} />
                </div>

                {/* Timer Controls */}
                <div className="flex items-center gap-1">
                  <Tooltip content={isRunning ? (t('stopTimer') || 'Stop timer') : (t('startTimer') || 'Start timer')}>
                    <Button
                      size="sm"
                      onClick={handleStartStop}
                      className={cn(
                        "h-7 w-7 p-0",
                        isRunning ? "bg-red-500 hover:bg-red-600" : "bg-[#745EE1] hover:bg-[#6249d1]"
                      )}
                    >
                      {isRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </Button>
                  </Tooltip>
                  <Tooltip content={t('resetTimer') || 'Reset timer'}>
                    <Button variant="outline" size="sm" onClick={handleReset} disabled={seconds === 0} className="h-7 w-7 p-0">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </Tooltip>
                  {seconds > 0 && (
                    <Tooltip content={canSave ? (t('saveTimeLog') || 'Save time log') : (t('minOneMinute') || 'Minimum 1 minute to save')}>
                      <Button
                        size="sm"
                        onClick={handleSaveTime}
                        disabled={!canSave || isSaving}
                        className={cn(
                          "h-7 px-2 text-[10px]",
                          canSave ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"
                        )}
                      >
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {isSaving ? '...' : canSave ? (t('save') || 'Save') : '< 1m'}
                      </Button>
                    </Tooltip>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
