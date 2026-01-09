'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n/i18n-context';
import {
  X,
  Calendar,
  Clock,
  Mail,
  Video,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { telehealthApi } from '@/lib/api/telehealth';
import { patientsApi, Patient } from '@/lib/api/patients';

interface ScheduleCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduled?: () => void;
}

export function ScheduleCallDialog({
  isOpen,
  onClose,
  onScheduled,
}: ScheduleCallDialogProps) {
  const { t } = useTranslations('telehealth.scheduling');
  const { t: tTele } = useTranslations('telehealth');
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [description, setDescription] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; emailSent?: boolean } | null>(null);

  // Search patients
  useEffect(() => {
    const searchPatients = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setPatients([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await patientsApi.list({ search: searchQuery, limit: 10 });
        setPatients(response.patients);
      } catch (error) {
        console.error('Failed to search patients:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchPatients, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !scheduledDate || !scheduledTime) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      const response = await telehealthApi.scheduleSession({
        patientId: selectedPatient.id,
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
      setSearchQuery('');
      setSelectedPatient(null);
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
        message: t('scheduleFailed') || 'Failed to schedule call. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setSearchQuery('');
    setSelectedPatient(null);
    onClose();
  };

  // Get min date (today)
  const today = new Date().toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-[#12121a] rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
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
                  {t('selectPatientAndTime') || 'Select a patient and time'}
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
          <div className="p-6">
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
                {/* Patient Search */}
                {!selectedPatient ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      {t('selectPatient') || 'Select Patient'}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={tTele('searchPatients') || 'Search patients by name...'}
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0f] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#745EE1]/30 focus:border-[#745EE1]"
                      />
                    </div>

                    {/* Search Results */}
                    {isSearching ? (
                      <div className="mt-2 p-4 text-center">
                        <Loader2 className="w-5 h-5 animate-spin text-[#745EE1] mx-auto" />
                      </div>
                    ) : patients.length > 0 ? (
                      <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        {patients.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => {
                              setSelectedPatient(patient);
                              setSearchQuery('');
                              setPatients([]);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#745EE1] to-[#8B5CF6] flex items-center justify-center">
                              <span className="text-white text-xs font-semibold">
                                {patient.firstName?.[0]}{patient.lastName?.[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {patient.firstName} {patient.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {patient.email}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : searchQuery.length >= 2 ? (
                      <p className="mt-2 text-sm text-gray-500 text-center py-4">
                        {t('noPatients') || 'No patients found'}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      {t('selectedPatient') || 'Selected Patient'}
                    </label>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-[#745EE1]/30 bg-[#745EE1]/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#745EE1] to-[#8B5CF6] flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {selectedPatient.firstName?.[0]}{selectedPatient.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {selectedPatient.firstName} {selectedPatient.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {selectedPatient.email}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPatient(null)}
                        className="text-sm text-[#745EE1] hover:underline"
                      >
                        {t('change') || 'Change'}
                      </button>
                    </div>
                  </div>
                )}

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
                    placeholder={t('descriptionPlaceholder') || 'Follow-up consultation, medication review...'}
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0f] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#745EE1]/30 focus:border-[#745EE1] resize-none"
                  />
                </div>

                {/* Send Email Option */}
                {selectedPatient?.email && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <input
                      type="checkbox"
                      id="sendEmailDialog"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-[#745EE1] focus:ring-[#745EE1]"
                    />
                    <label htmlFor="sendEmailDialog" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                        <Mail className="w-4 h-4 text-[#745EE1]" />
                        {t('notifyPatient') || 'Send email notification to patient'}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {selectedPatient.email}
                      </p>
                    </label>
                  </div>
                )}

                {/* Preview */}
                {selectedPatient && scheduledDate && scheduledTime && (
                  <div className="p-4 rounded-lg border border-[#745EE1]/20 bg-[#745EE1]/5">
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-[#745EE1]" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {t('scheduledFor') || 'Scheduled for'} {selectedPatient.firstName} {selectedPatient.lastName}
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
                <button
                  type="submit"
                  disabled={!selectedPatient || !scheduledDate || !scheduledTime || isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#745EE1] hover:bg-[#6350c9] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('scheduling') || 'Scheduling...'}
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      {t('scheduleCall') || 'Schedule Call'}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
