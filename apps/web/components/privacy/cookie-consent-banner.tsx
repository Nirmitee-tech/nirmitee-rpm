'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Cookie, Settings } from 'lucide-react';
import Link from 'next/link';

interface ConsentPreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  thirdParty: boolean;
}

export function CookieConsentBanner() {
  const { t } = useTranslations('privacy.cookieConsent');
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    thirdParty: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consentGiven = localStorage.getItem('cookie-consent');
    if (!consentGiven) {
      // Show banner after a short delay
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const savePreferences = async (prefs: ConsentPreferences) => {
    try {
      // Save to localStorage
      localStorage.setItem('cookie-consent', JSON.stringify(prefs));
      localStorage.setItem('cookie-consent-timestamp', new Date().toISOString());

      // If user is authenticated, save to backend
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/v1/privacy/consent', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(prefs),
        });
      }

      setIsVisible(false);
    } catch (error) {
      console.error('Failed to save consent preferences:', error);
    }
  };

  const handleAcceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      marketing: true,
      thirdParty: true,
    });
  };

  const handleRejectNonEssential = () => {
    savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
      thirdParty: false,
    });
  };

  const handleSaveCustom = () => {
    savePreferences(preferences);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Banner */}
      <Card className="relative w-full max-w-2xl p-6 shadow-xl">
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <Cookie className="h-8 w-8 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">{t('title')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('description')}{' '}
              <Link href="/legal/cookies" className="text-blue-600 hover:underline">
                {t('learnMore')}
              </Link>
            </p>

            {showCustomize && (
              <div className="space-y-3 mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t('essential')}</p>
                    <p className="text-xs text-gray-500">{t('essentialDesc')}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t('analytics')}</p>
                    <p className="text-xs text-gray-500">{t('analyticsDesc')}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) =>
                      setPreferences({ ...preferences, analytics: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t('marketing')}</p>
                    <p className="text-xs text-gray-500">{t('marketingDesc')}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) =>
                      setPreferences({ ...preferences, marketing: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t('thirdParty')}</p>
                    <p className="text-xs text-gray-500">{t('thirdPartyDesc')}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.thirdParty}
                    onChange={(e) =>
                      setPreferences({ ...preferences, thirdParty: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {showCustomize ? (
                <>
                  <Button onClick={handleSaveCustom} className="flex-1">
                    {t('savePreferences')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCustomize(false)}
                    className="flex-1"
                  >
                    {t('back')}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleAcceptAll} className="flex-1">
                    {t('acceptAll')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRejectNonEssential}
                    className="flex-1"
                  >
                    {t('rejectNonEssential')}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowCustomize(true)}
                    className="flex-1"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {t('customize')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
