'use client';

import { useState } from 'react';
import { RefreshCw, Trash2, Mail } from 'lucide-react';
import { Button } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { Invitation, invitationsApi } from '@/lib/api/invitations';
import { InvitationStatusBadge } from './invitation-status-badge';
import { Modal } from '@/components/ui/modal';

interface InvitationTableProps {
  invitations: Invitation[];
  onRefresh: () => void;
  loading?: boolean;
}

export function InvitationTable({ invitations, onRefresh, loading = false }: InvitationTableProps) {
  const { t } = useTranslations('invitations');
  const tCommon = useTranslations('common');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState('');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('today');
    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) return t('daysAgo', { count: diffDays });

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatExpiryDate = (dateString: string, status: Invitation['status']) => {
    const expiryDate = new Date(dateString);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (status === 'EXPIRED' || diffMs < 0) {
      const expiredDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
      if (expiredDays === 0) return t('expiredToday');
      return t('expiredAgo', { time: `${expiredDays}d` });
    }

    if (diffDays > 0) return t('expiresIn', { time: `${diffDays}d` });
    if (diffHours > 0) return t('expiresIn', { time: `${diffHours}h` });
    return t('expiresIn', { time: '<1h' });
  };

  const handleResend = async (invitation: Invitation) => {
    setResendingId(invitation.id);
    setError('');
    try {
      await invitationsApi.resend(invitation.id);
      onRefresh();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || t('resendError'));
    } finally {
      setResendingId(null);
    }
  };

  const handleRevokeClick = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setShowRevokeModal(true);
  };

  const handleRevokeConfirm = async () => {
    if (!selectedInvitation) return;

    setRevokingId(selectedInvitation.id);
    setError('');
    try {
      await invitationsApi.revoke(selectedInvitation.id);
      setShowRevokeModal(false);
      setSelectedInvitation(null);
      onRefresh();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || t('revokeError'));
    } finally {
      setRevokingId(null);
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#F5F5F5] dark:bg-[#171717] flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 text-[#737373]" />
        </div>
        <h3 className="text-lg font-semibold text-[#171717] dark:text-white mb-2">
          {t('noInvitations')}
        </h3>
        <p className="text-sm text-[#737373] mb-6 max-w-md">
          {t('noInvitationsDescription')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-[#E5E5E5] dark:border-[#212121] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F5F5F5] dark:bg-[#171717] border-b border-[#E5E5E5] dark:border-[#212121]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                  {t('columns.email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                  {t('columns.role')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                  {t('columns.invitedBy')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                  {t('columns.sent')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                  {t('columns.expires')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#737373] uppercase tracking-wider">
                  {t('columns.status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[#737373] uppercase tracking-wider">
                  {t('columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-[#0a0a0a] divide-y divide-[#E5E5E5] dark:divide-[#212121]">
              {invitations.map((invitation) => (
                <tr key={invitation.id} className="hover:bg-[#F5F5F5] dark:hover:bg-[#171717] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[#171717] dark:text-white">
                      {invitation.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[#171717] dark:text-white">
                      {invitation.role.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[#171717] dark:text-white">
                      {invitation.invitedBy.firstName} {invitation.invitedBy.lastName}
                    </div>
                    <div className="text-xs text-[#737373]">
                      {invitation.invitedBy.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#737373]">
                    {formatDate(invitation.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#737373]">
                    {formatExpiryDate(invitation.expiresAt, invitation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <InvitationStatusBadge status={invitation.status} expiresAt={invitation.expiresAt} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {invitation.status === 'PENDING' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResend(invitation)}
                          disabled={resendingId === invitation.id}
                          className="h-8"
                        >
                          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${resendingId === invitation.id ? 'animate-spin' : ''}`} />
                          {resendingId === invitation.id ? t('actions.resending') : t('actions.resend')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeClick(invitation)}
                          disabled={revokingId === invitation.id}
                          className="h-8 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          {t('actions.revoke')}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      <Modal
        isOpen={showRevokeModal}
        onClose={() => {
          setShowRevokeModal(false);
          setSelectedInvitation(null);
        }}
        title={t('revokeConfirmTitle')}
        description={t('revokeConfirm')}
      >
        <div className="space-y-4">
          {selectedInvitation && (
            <div className="p-4 bg-[#F5F5F5] dark:bg-[#171717] rounded-lg">
              <div className="text-sm text-[#737373]">{t('columns.email')}</div>
              <div className="font-medium text-[#171717] dark:text-white">{selectedInvitation.email}</div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowRevokeModal(false);
                setSelectedInvitation(null);
              }}
              disabled={revokingId !== null}
            >
              {tCommon.t('cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleRevokeConfirm}
              disabled={revokingId !== null}
            >
              {revokingId ? t('actions.revoking') : t('actions.revoke')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
