'use client';

import { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Button, Input } from '@nirmitee/ui';
import { Modal } from '@/components/ui/modal';
import { rolesApi, PermissionsByModule } from '@/lib/api';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateRoleModal({ isOpen, onClose, onSuccess }: CreateRoleModalProps) {
  const { t } = useTranslations('roles.modal');
  const tCommon = useTranslations('common');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<PermissionsByModule>({});
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoadingPermissions(true);
      rolesApi.listPermissions()
        .then(setPermissions)
        .catch(console.error)
        .finally(() => setLoadingPermissions(false));
    }
  }, [isOpen]);

  const togglePermission = (code: string) => {
    setSelectedPermissions(prev =>
      prev.includes(code)
        ? prev.filter(p => p !== code)
        : [...prev, code]
    );
  };

  const toggleModule = (module: string) => {
    const moduleCodes = permissions[module].map(p => p.code);
    const allSelected = moduleCodes.every(code => selectedPermissions.includes(code));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !moduleCodes.includes(p)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...moduleCodes])]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Role name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await rolesApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        permissions: selectedPermissions,
      });
      setName('');
      setDescription('');
      setSelectedPermissions([]);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to create role');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setSelectedPermissions([]);
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('createTitle')}
      description={t('createSubtitle')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
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
            <Input
              type="text"
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#171717] dark:text-white">
            {t('permissions')}
          </label>

          {loadingPermissions ? (
            <div className="flex items-center gap-2 py-4 text-sm text-[#737373]">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('loadingPermissions')}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-3 border border-[#E5E5E5] dark:border-[#212121] rounded-lg p-3">
              {Object.entries(permissions).map(([module, perms]) => {
                const moduleCodes = perms.map(p => p.code);
                const selectedCount = moduleCodes.filter(c => selectedPermissions.includes(c)).length;
                const allSelected = selectedCount === moduleCodes.length;

                return (
                  <div key={module} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleModule(module)}
                      className="flex items-center gap-2 text-xs font-semibold text-[#737373] uppercase tracking-wider hover:text-[#745EE1] transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        allSelected
                          ? 'bg-[#745EE1] border-[#745EE1]'
                          : selectedCount > 0
                          ? 'bg-[#745EE1]/50 border-[#745EE1]'
                          : 'border-[#E5E5E5] dark:border-[#212121]'
                      }`}>
                        {(allSelected || selectedCount > 0) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      {module} ({selectedCount}/{perms.length})
                    </button>
                    <div className="flex flex-wrap gap-2 pl-6">
                      {perms.map((perm) => {
                        const isSelected = selectedPermissions.includes(perm.code);
                        return (
                          <button
                            key={perm.code}
                            type="button"
                            onClick={() => togglePermission(perm.code)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                              isSelected
                                ? 'bg-[#745EE1] text-white'
                                : 'bg-[#F5F5F5] dark:bg-[#171717] text-[#737373] hover:bg-[#E5E5E5] dark:hover:bg-[#212121]'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            {perm.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-[#737373]">
            {selectedPermissions.length} {t('permissionsSelected')}
          </p>
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
