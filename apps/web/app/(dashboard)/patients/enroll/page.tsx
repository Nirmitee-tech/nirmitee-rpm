'use client';

import { useTranslations } from '@/lib/i18n/i18n-context';
import { EnrollmentWizard } from '@/components/patients/enrollment-wizard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EnrollPatientPage() {
  const { t } = useTranslations('patients.enrollment');
  const { t: tCommon } = useTranslations('common');

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/patients"
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-xs text-gray-500">{t('subtitle')}</p>
          </div>
        </div>
      </div>
      <EnrollmentWizard />
    </div>
  );
}
