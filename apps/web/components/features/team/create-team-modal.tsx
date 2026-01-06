'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, Input } from '@nirmitee/ui';
import { Modal } from '@/components/ui/modal';
import { teamsApi } from '@/lib/api';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateTeamModal({ isOpen, onClose, onSuccess }: CreateTeamModalProps) {
  const { t } = useTranslations('teams.modal');
  const tCommon = useTranslations('common');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Team name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await teamsApi.create({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('createTitle')}
      description={t('createSubtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#171717] dark:text-white">
            {t('name')}
          </label>
          <Input
            type="text"
            placeholder={t('namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#171717] dark:text-white">
            {t('description')}
          </label>
          <textarea
            placeholder={t('descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E5E5] dark:border-[#212121] bg-white dark:bg-[#0a0a0a] text-[#171717] dark:text-white placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#745EE1]/20 focus:border-[#745EE1] resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            {tCommon.t('cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('creating')}
              </>
            ) : (
              t('create')
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
