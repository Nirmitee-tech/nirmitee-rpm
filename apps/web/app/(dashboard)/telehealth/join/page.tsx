'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Video, ArrowRight } from 'lucide-react';

export default function JoinTelehealthPage() {
  const router = useRouter();
  const { t } = useTranslations('telehealth');
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim()) {
      setError('Please enter a session ID');
      return;
    }
    router.push(`/call/${sessionId.trim()}`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-[#12121a] rounded-2xl border border-[#E5E5E5] dark:border-[#1f1f2e] p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#745EE1] to-[#8B5CF6] flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#171717] dark:text-white">
              {t('joinSession') || 'Join Video Session'}
            </h1>
            <p className="text-sm text-[#737373] dark:text-gray-400 mt-2">
              {t('enterSessionId') || 'Enter the session ID to join the video call'}
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#171717] dark:text-white mb-2">
                Session ID
              </label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => {
                  setSessionId(e.target.value);
                  setError('');
                }}
                placeholder="e.g., cmk5abc123..."
                className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] dark:border-[#1f1f2e] bg-white dark:bg-[#1f1f2e] text-[#171717] dark:text-white placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#745EE1]/20 focus:border-[#745EE1]"
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-[#745EE1] to-[#8B5CF6] text-white font-medium hover:opacity-90 transition-opacity"
            >
              {t('joinCall') || 'Join Call'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 p-4 rounded-lg bg-[#F5F5F5] dark:bg-[#1f1f2e]">
            <p className="text-xs text-[#737373] dark:text-gray-400">
              <strong>Tip:</strong> Ask the provider for the session ID, or check your appointment details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
