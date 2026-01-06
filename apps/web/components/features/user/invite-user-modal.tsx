'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, Input } from '@nirmitee/ui';
import { Modal } from '@/components/ui/modal';
import { invitationsApi, rolesApi, Role } from '@/lib/api';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteUserModal({ isOpen, onClose, onSuccess }: InviteUserModalProps) {
  const { t } = useTranslations('modals.inviteUser');
  const tCommon = useTranslations('common');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoadingRoles(true);
      rolesApi.list()
        .then(setRoles)
        .catch(console.error)
        .finally(() => setLoadingRoles(false));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !roleId) {
      setError(t('fillAllFields'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await invitationsApi.send({ email, roleId });
      setEmail('');
      setRoleId('');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRoleId('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('title')}
      description={t('subtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#171717] dark:text-white">
            {t('email')}
          </label>
          <Input
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#171717] dark:text-white">
            {t('role')}
          </label>
          {loadingRoles ? (
            <div className="flex items-center gap-2 py-2 text-sm text-[#737373]">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('loadingRoles')}
            </div>
          ) : (
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] text-[#171717] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#745EE1]/20 focus:border-[#745EE1]"
              required
            >
              <option value="">{t('selectRole')}</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            {tCommon.t('cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('sending')}
              </>
            ) : (
              t('sendInvitation')
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
