'use client';

import { useEffect } from 'react';
import { Button } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslations('errors');
  const tCommon = useTranslations('common');

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center background-primary">
      <div className="text-center">
        <h2 className="text-h2 text-primary mb-4">{t('pageTitle')}</h2>
        <p className="text-secondary mb-6">{error.message || t('unexpected')}</p>
        <Button onClick={() => reset()}>{tCommon.t('tryAgain')}</Button>
      </div>
    </div>
  );
}
