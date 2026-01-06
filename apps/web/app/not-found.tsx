'use client';

import Link from 'next/link';
import { Button } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';

export default function NotFound() {
  const { t } = useTranslations('errors.notFound');

  return (
    <div className="min-h-screen flex items-center justify-center background-primary">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-brand mb-4">{t('code')}</h1>
        <h2 className="text-h2 text-primary mb-4">{t('title')}</h2>
        <p className="text-secondary mb-6">
          {t('message')}
        </p>
        <Link href="/">
          <Button>{t('goHome')}</Button>
        </Link>
      </div>
    </div>
  );
}
