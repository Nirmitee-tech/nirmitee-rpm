'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { User } from '@/lib/api/users';
import { Role } from '@/lib/api/roles';

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: User;
  roles: Role[];
  onConfirm: (roleId: string) => Promise<void>;
}

export function ChangeRoleModal({
  isOpen,
  onClose,
  member,
  roles,
  onConfirm,
}: ChangeRoleModalProps) {
  const { t } = useTranslations('members.changeRole');
  const [selectedRoleId, setSelectedRoleId] = useState(member.role.id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedRoleId(member.role.id);
    setError(null);
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedRoleId === member.role.id) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(selectedRoleId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const currentRole = roles.find((r) => r.id === member.role.id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{t('title')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('description', { name: `${member.firstName} ${member.lastName}` })}
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Current Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('currentRole')}
              </label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-sm font-medium text-gray-900">{currentRole?.name}</span>
                {currentRole?.description && (
                  <p className="text-xs text-gray-600 mt-1">{currentRole.description}</p>
                )}
              </div>
            </div>

            {/* New Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('newRole')}
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                    {role.isSystem && ' (System)'}
                  </option>
                ))}
              </select>
              {selectedRole?.description && (
                <p className="text-xs text-gray-600 mt-2">{selectedRole.description}</p>
              )}
            </div>

            {/* Permission Differences */}
            {selectedRole && currentRole && selectedRoleId !== member.role.id && (
              <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="font-medium text-blue-900 mb-1">
                  {selectedRole.permissions.length} permissions
                </p>
                <p className="text-blue-800">
                  {selectedRole.permissions.length > currentRole.permissions.length
                    ? `+${selectedRole.permissions.length - currentRole.permissions.length} more permissions`
                    : selectedRole.permissions.length < currentRole.permissions.length
                    ? `-${currentRole.permissions.length - selectedRole.permissions.length} fewer permissions`
                    : 'Same permission count'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || selectedRoleId === member.role.id}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Changing...
                </>
              ) : (
                t('confirm')
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
