'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Trash2, FileText, Shield, Cookie, AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/toast';
import { apiClient } from '@/lib/api';

interface ConsentPreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  thirdParty: boolean;
}

interface ExportRequest {
  id: string;
  status: string;
  format: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

interface DeletionRequest {
  id: string;
  status: string;
  scheduledFor: string;
  daysRemaining: number;
  canCancel: boolean;
}

export default function PrivacySettingsPage() {
  const { t } = useTranslations('privacy');
  const [loading, setLoading] = useState(true);
  const [consents, setConsents] = useState<ConsentPreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    thirdParty: false,
  });
  const [exportRequests, setExportRequests] = useState<ExportRequest[]>([]);
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [consentsData, exportsData, deletionData] = await Promise.all([
        apiClient.get<ConsentPreferences>('/api/v1/privacy/consent'),
        apiClient.get<ExportRequest[]>('/api/v1/privacy/export-requests'),
        apiClient.get<DeletionRequest | null>('/api/v1/privacy/delete-request/status'),
      ]);

      if (consentsData) setConsents(consentsData);
      if (exportsData) setExportRequests(exportsData);
      if (deletionData) setDeletionRequest(deletionData);
    } catch (error) {
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleConsentUpdate = async (updates: Partial<ConsentPreferences>) => {
    try {
      await apiClient.put('/api/v1/privacy/consent', updates);
      setConsents({ ...consents, ...updates });
      toast.success(t('consentUpdated'));
    } catch (error) {
      toast.error(t('consentUpdateFailed'));
    }
  };

  const handleRequestExport = async (format: 'JSON' | 'ZIP' = 'ZIP') => {
    try {
      await apiClient.post('/api/v1/privacy/export-request', { format });
      toast.success(t('exportRequested'));
      loadData();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('already in progress')) {
        toast.error(t('exportAlreadyInProgress'));
      } else {
        toast.error(t('exportRequestFailed'));
      }
    }
  };

  const handleDownloadExport = async (requestId: string) => {
    try {
      const response = await fetch(`/api/v1/privacy/export-request/${requestId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('exportDownloaded'));
    } catch (error) {
      toast.error(t('exportDownloadFailed'));
    }
  };

  const handleRequestDeletion = async () => {
    try {
      await apiClient.post('/api/v1/privacy/delete-request', {
        reason: 'User requested account deletion',
      });
      toast.success(t('deletionRequested'));
      setShowDeleteConfirm(false);
      loadData();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('already pending')) {
        toast.error(t('deletionAlreadyPending'));
      } else {
        toast.error(t('deletionRequestFailed'));
      }
    }
  };

  const handleCancelDeletion = async () => {
    if (!deletionRequest) return;

    try {
      await apiClient.post(`/api/v1/privacy/delete-request/${deletionRequest.id}/cancel`);
      toast.success(t('deletionCancelled'));
      loadData();
    } catch (error) {
      toast.error(t('deletionCancelFailed'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      {/* Cookie Consent Settings */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <Cookie className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2">{t('cookieConsent.title')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('cookieConsent.description')}
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="font-medium">{t('cookieConsent.essential')}</p>
                  <p className="text-sm text-gray-500">{t('cookieConsent.essentialDesc')}</p>
                </div>
                <input type="checkbox" checked={true} disabled className="h-5 w-5" />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="font-medium">{t('cookieConsent.analytics')}</p>
                  <p className="text-sm text-gray-500">{t('cookieConsent.analyticsDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={consents.analytics}
                  onChange={(e) => handleConsentUpdate({ analytics: e.target.checked })}
                  className="h-5 w-5"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="font-medium">{t('cookieConsent.marketing')}</p>
                  <p className="text-sm text-gray-500">{t('cookieConsent.marketingDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={consents.marketing}
                  onChange={(e) => handleConsentUpdate({ marketing: e.target.checked })}
                  className="h-5 w-5"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="font-medium">{t('cookieConsent.thirdParty')}</p>
                  <p className="text-sm text-gray-500">{t('cookieConsent.thirdPartyDesc')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={consents.thirdParty}
                  onChange={(e) => handleConsentUpdate({ thirdParty: e.target.checked })}
                  className="h-5 w-5"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Data Export */}
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <Download className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2">{t('dataExport.title')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('dataExport.description')}
            </p>

            <Button onClick={() => handleRequestExport('ZIP')} className="mb-4">
              <Download className="h-4 w-4 mr-2" />
              {t('dataExport.requestExport')}
            </Button>

            {exportRequests.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">{t('dataExport.previousExports')}</h3>
                {exportRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t(`dataExport.status.${request.status.toLowerCase()}`)}
                      </p>
                    </div>
                    {request.status === 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadExport(request.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {t('dataExport.download')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Account Deletion */}
      <Card className="p-6 border-red-200 dark:border-red-900">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2 text-red-600">{t('deleteAccount.title')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('deleteAccount.description')}
            </p>

            {deletionRequest && deletionRequest.status === 'PENDING' ? (
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                <p className="font-medium text-red-900 dark:text-red-100 mb-2">
                  {t('deleteAccount.pendingDeletion')}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                  {t('deleteAccount.scheduledFor', {
                    date: new Date(deletionRequest.scheduledFor).toLocaleDateString(),
                    days: deletionRequest.daysRemaining,
                  })}
                </p>
                {deletionRequest.canCancel && (
                  <Button variant="outline" onClick={handleCancelDeletion}>
                    {t('deleteAccount.cancelDeletion')}
                  </Button>
                )}
              </div>
            ) : (
              <>
                {!showDeleteConfirm ? (
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('deleteAccount.requestDeletion')}
                  </Button>
                ) : (
                  <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                    <p className="font-medium text-red-900 dark:text-red-100 mb-4">
                      {t('deleteAccount.confirmPrompt')}
                    </p>
                    <div className="flex gap-3">
                      <Button variant="danger" onClick={handleRequestDeletion}>
                        {t('deleteAccount.confirmDelete')}
                      </Button>
                      <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
