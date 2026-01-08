'use client';

import { Send } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';

export default function MyMessagesPage() {
  const { t } = useTranslations('patient.messages');

  // Mock messages
  const mockMessages = [
    {
      id: '1',
      sender: 'Dr. Sarah Johnson',
      senderType: 'careTeam' as const,
      message: 'Your blood pressure readings look great! Keep up the good work.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: '2',
      sender: 'You',
      senderType: 'patient' as const,
      message: 'Thank you doctor! I have been following the diet plan.',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: '3',
      sender: 'Nurse Emily',
      senderType: 'careTeam' as const,
      message: 'Reminder: Please take your morning medication.',
      timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000),
      read: false,
    },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col p-4">
      {/* Header */}
      <h1 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
        {t('title')}
      </h1>

      {/* Messages List */}
      <div className="flex-1 space-y-3 overflow-auto rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        {mockMessages.length > 0 ? (
          mockMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderType === 'patient' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.senderType === 'patient'
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                }`}
              >
                <p className="mb-1 text-xs font-medium opacity-80">
                  {message.senderType === 'patient' ? t('you') : message.sender}
                </p>
                <p className="text-sm">{message.message}</p>
                <p className="mt-1 text-[10px] opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('noMessages')}
            </p>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          placeholder={t('typeMessage')}
          className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          type="button"
          className="flex h-[44px] w-[44px] items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 dark:bg-brand-500"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
