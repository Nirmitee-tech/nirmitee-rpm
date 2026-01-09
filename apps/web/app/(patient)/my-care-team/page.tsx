'use client';

import { useState, useEffect } from 'react';
import { Phone, MessageCircle, Mail, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { patientPortalApi, CareTeamMember } from '@/lib/api/patient-portal';

export default function MyCareTeamPage() {
  const { t } = useTranslations('patient.careTeam');
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCareTeam = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await patientPortalApi.getCareTeam();
      setCareTeam(response.data || []);
    } catch (err) {
      console.error('Failed to load care team:', err);
      setError('Failed to load care team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCareTeam();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#745EE1]" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Loading care team...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="mt-4 text-sm text-red-500">{error}</p>
          <button
            onClick={fetchCareTeam}
            className="mt-4 px-4 py-2 text-sm bg-[#745EE1] text-white rounded-lg hover:bg-[#6249d1]"
          >
            <RefreshCw className="h-4 w-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <button
          onClick={fetchCareTeam}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Care Team List */}
      <div className="space-y-3">
        {careTeam.length > 0 ? (
          careTeam.map((member) => (
            <div
              key={member.id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                  {member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {member.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t(member.role)} • {member.specialty}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500"
                      >
                        <Mail className="h-4 w-4" />
                        {t('sendEmail') || 'Email'}
                      </a>
                    )}
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {t('sendMessage')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('noTeam')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
