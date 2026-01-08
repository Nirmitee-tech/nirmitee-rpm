'use client';

import { Phone, MessageCircle, Mail } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';

export default function MyCareTeamPage() {
  const { t } = useTranslations('patient.careTeam');

  // Mock care team members
  const mockCareTeam = [
    {
      id: '1',
      name: 'Dr. Sarah Johnson',
      role: 'primaryPhysician',
      specialty: 'Cardiology',
      phone: '(555) 123-4567',
      email: 'sjohnson@hospital.com',
      avatar: null,
    },
    {
      id: '2',
      name: 'Emily Chen',
      role: 'nurse',
      specialty: 'Registered Nurse',
      phone: '(555) 234-5678',
      email: 'echen@hospital.com',
      avatar: null,
    },
    {
      id: '3',
      name: 'Dr. Michael Brown',
      role: 'specialist',
      specialty: 'Endocrinology',
      phone: '(555) 345-6789',
      email: 'mbrown@hospital.com',
      avatar: null,
    },
  ];

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {t('title')}
      </h1>

      {/* Care Team List */}
      <div className="space-y-3">
        {mockCareTeam.length > 0 ? (
          mockCareTeam.map((member) => (
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
                    <a
                      href={`tel:${member.phone}`}
                      className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500"
                    >
                      <Phone className="h-4 w-4" />
                      {t('callNow')}
                    </a>
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
