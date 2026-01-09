'use client';

import { useState } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button } from '@nirmitee/ui';
import {
  X,
  Calendar,
  Clock,
  Mail,
  Video,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { telehealthApi } from '@/lib/api/telehealth';

interface ScheduleCallDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  patientEmail?: string;
  onScheduled?: () => void;
}

export function ScheduleCallDrawer({
  isOpen,
  onClose,
  patientId,
  patientName,
  patientEmail,
  onScheduled,
}: ScheduleCallDrawerProps) {
  const { t } = useTranslations('telehealth.scheduling');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [description, setDescription] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; emailSent?: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate || !scheduledTime) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      const response = await telehealthApi.scheduleSession({
        patientId,
        scheduledAt,
        description: description || undefined,
        sendEmail,
      });

      setResult({
        success: true,
        message: t('scheduleSuccess') || 'Video call scheduled successfully',
        emailSent: response.emailSent,
      });

      // Reset form
      setScheduledDate('');
      setScheduledTime('');
      setDescription('');

      if (onScheduled) onScheduled();

      // Close after 2 seconds
      setTimeout(() => {
        onClose();
        setResult(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to schedule call:', error);
      setResult({
        success: false,
        message: 'Failed to schedule call. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  // Get min date (today)
  const today = new Date().toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-[#12121a] shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#745EE1]/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#745EE1]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('title') || 'Schedule Video Call'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {patientName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {result ? (
            <div className={cn(
              'p-6 rounded-lg text-center',
              result.success
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
            )}>
              {result.success ? (
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              ) : (
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              )}
              <p className={cn(
                'text-lg font-medium',
                result.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
              )}>
                {result.message}
              </p>
              {result.emailSent && (
                <p className="text-sm text-green-600 dark:text-green-500 mt-2">
                  {t('emailSent') || 'Email invitation sent to patient'}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  {t('selectDateTime') || 'Select Date'}
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={today}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0f] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#745EE1]/30 focus:border-[#745EE1]"
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-2" />
                  {t('selectTime') || 'Select Time'}
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0f] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#745EE1]/30 focus:border-[#745EE1]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('description') || 'Description (optional)'}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Follow-up consultation, medication review..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0f] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#745EE1]/30 focus:border-[#745EE1] resize-none"
                />
              </div>

              {/* Send Email Option */}
              {patientEmail && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-[#745EE1] focus:ring-[#745EE1]"
                  />
                  <label htmlFor="sendEmail" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                      <Mail className="w-4 h-4 text-[#745EE1]" />
                      {t('notifyPatient') || 'Send email notification to patient'}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {patientEmail}
                    </p>
                  </label>
                </div>
              )}

              {/* Preview */}
              {scheduledDate && scheduledTime && (
                <div className="p-4 rounded-lg border border-[#745EE1]/20 bg-[#745EE1]/5">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-[#745EE1]" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('scheduledFor') || 'Scheduled for'}
                      </p>
                      <p className="text-sm text-[#745EE1]">
                        {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!scheduledDate || !scheduledTime || isSubmitting}
                className="w-full bg-[#745EE1] hover:bg-[#6350c9] text-white py-3"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('scheduling') || 'Scheduling...'}
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    {t('scheduleCall') || 'Schedule Call'}
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
