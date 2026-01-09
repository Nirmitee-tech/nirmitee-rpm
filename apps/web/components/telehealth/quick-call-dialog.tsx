'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { telehealthApi } from '@/lib/api/telehealth';
import { patientsApi } from '@/lib/api/patients';
import {
  Video,
  X,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  User,
  Search,
} from 'lucide-react';
import { cn } from '@nirmitee/ui';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

interface QuickCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickCallDialog({ isOpen, onClose }: QuickCallDialogProps) {
  const router = useRouter();
  const { t } = useTranslations('telehealth');
  const [step, setStep] = useState<'select' | 'ready'>('select');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    token: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch recent patients when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedPatient(null);
      setSearchQuery('');
      setError(null);
      setSessionData(null);
      setCopied(false);

      // Fetch recent patients (5 most recent)
      fetchPatients('');
    }
  }, [isOpen]);

  // Debounced search when query changes
  useEffect(() => {
    if (!isOpen) return;

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search immediately for short queries, but still fetch recent on empty
    if (searchQuery.length > 0 && searchQuery.length < 2) {
      return;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      fetchPatients(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, isOpen]);

  const fetchPatients = useCallback(async (query: string) => {
    setIsLoadingPatients(true);
    try {
      const response = await patientsApi.list({
        search: query || undefined,
        limit: query ? 20 : 5, // Show 5 recent when no search, 20 when searching
      });

      setPatients(response.patients.map(p => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
      })));
    } catch (err) {
      console.error('Failed to fetch patients:', err);
      setError(t('fetchError') || 'Failed to load patients');
    } finally {
      setIsLoadingPatients(false);
    }
  }, [t]);

  const handleStartCall = async () => {
    if (!selectedPatient) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await telehealthApi.quickCall(selectedPatient.id);
      setSessionData({
        sessionId: result.sessionId,
        token: result.token,
      });
      setStep('ready');
    } catch (err) {
      console.error('Failed to create quick call:', err);
      setError(err instanceof Error ? err.message : 'Failed to create call');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySessionId = async () => {
    if (!sessionData) return;
    await navigator.clipboard.writeText(sessionData.sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinCall = () => {
    if (!sessionData) return;
    router.push(`/call/${sessionData.sessionId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-[#12121a] rounded-2xl border border-[#E5E5E5] dark:border-[#1f1f2e] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5] dark:border-[#1f1f2e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#745EE1] to-[#8B5CF6] flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[#171717] dark:text-white">
                {step === 'select' ? (t('startCall') || 'Start Quick Call') : (t('callReady') || 'Call Ready')}
              </h2>
              <p className="text-xs text-[#737373]">
                {step === 'select'
                  ? (t('selectPatient') || 'Select a patient to call')
                  : (t('shareWithPatient') || 'Share this ID with the patient')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-[#1f1f2e] transition-colors"
          >
            <X className="w-5 h-5 text-[#737373]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === 'select' && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
                <input
                  type="text"
                  placeholder={t('searchPatients') || 'Search patients...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] bg-white dark:bg-[#1f1f2e] text-[#171717] dark:text-white placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#745EE1]/20"
                />
              </div>

              {/* Helper text */}
              {!searchQuery && patients.length > 0 && (
                <p className="text-xs text-[#737373] mb-2">
                  {t('recentPatients') || 'Recent patients'}
                </p>
              )}

              {/* Patient List */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {isLoadingPatients ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-[#745EE1] animate-spin" />
                  </div>
                ) : patients.length > 0 ? (
                  patients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                        selectedPatient?.id === patient.id
                          ? 'border-[#745EE1] bg-[#745EE1]/10'
                          : 'border-[#E5E5E5] dark:border-[#1f1f2e] hover:border-[#745EE1]/50'
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#F5F5F5] dark:bg-[#1f1f2e] flex items-center justify-center">
                        <User className="w-5 h-5 text-[#737373]" />
                      </div>
                      <span className="font-medium text-[#171717] dark:text-white">
                        {patient.firstName} {patient.lastName}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-[#737373]">
                      {searchQuery
                        ? (t('noPatientsFound') || 'No patients found')
                        : (t('noRecentPatients') || 'No recent patients')
                      }
                    </p>
                    {!searchQuery && (
                      <p className="text-xs text-[#737373] mt-1">
                        {t('searchToFind') || 'Type to search for patients'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </>
          )}

          {step === 'ready' && sessionData && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>

              <p className="text-[#171717] dark:text-white mb-4">
                {t('callCreated') || 'Your call is ready!'}
              </p>

              {/* Session ID */}
              <div className="p-4 rounded-lg bg-[#F5F5F5] dark:bg-[#1f1f2e] mb-4">
                <p className="text-xs text-[#737373] mb-2">{t('sessionId') || 'Session ID'}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-[#171717] dark:text-white break-all">
                    {sessionData.sessionId}
                  </code>
                  <button
                    onClick={handleCopySessionId}
                    className="p-2 rounded-lg hover:bg-white dark:hover:bg-[#12121a] transition-colors"
                    title={t('copySessionId') || 'Copy'}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-[#737373]" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-[#737373] mb-4">
                {t('patientJoinInstructions') || 'Share this ID with the patient. They can join at:'}<br />
                <code className="text-[#745EE1]">http://localhost:3000/telehealth/join</code>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-[#E5E5E5] dark:border-[#1f1f2e]">
          {step === 'select' && (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] text-[#171717] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#1f1f2e] transition-colors"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleStartCall}
                disabled={!selectedPatient || isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    {t('createCall') || 'Create Call'}
                  </>
                )}
              </button>
            </>
          )}

          {step === 'ready' && (
            <button
              onClick={handleJoinCall}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white hover:opacity-90 transition-opacity"
            >
              <Video className="w-4 h-4" />
              {t('joinCall') || 'Join Call Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
