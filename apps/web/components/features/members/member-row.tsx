'use client';

import { useState } from 'react';
import { MoreVertical, Shield, User as UserIcon, UserX, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { User } from '@/lib/api/users';
import { Role } from '@/lib/api/roles';

interface MemberRowProps {
  member: User;
  isCurrentUser: boolean;
  roles: Role[];
  onChangeRole: (member: User) => void;
  onToggleStatus: (member: User) => void;
  onRemove: (member: User) => void;
  canManageMembers: boolean;
}

export function MemberRow({
  member,
  isCurrentUser,
  roles,
  onChangeRole,
  onToggleStatus,
  onRemove,
  canManageMembers,
}: MemberRowProps) {
  const { t } = useTranslations('members');
  const [showMenu, setShowMenu] = useState(false);

  const memberName = `${member.firstName} ${member.lastName}`;
  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();

  return (
    <tr className="hover:bg-gray-50">
      {/* Member */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-medium">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {memberName}
              </p>
              {isCurrentUser && (
                <span className="text-xs text-gray-500">{t('you')}</span>
              )}
            </div>
            <p className="text-sm text-gray-600 truncate">{member.email}</p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-900">{member.role.name}</span>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            member.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {member.isActive ? t('filters.active') : t('filters.inactive')}
        </span>
      </td>

      {/* Joined */}
      <td className="px-6 py-4 text-sm text-gray-600">
        {new Date(member.joinedAt || member.createdAt).toLocaleDateString()}
      </td>

      {/* Last Active */}
      <td className="px-6 py-4 text-sm text-gray-600">
        {member.lastLoginAt
          ? formatDistanceToNow(new Date(member.lastLoginAt), { addSuffix: true })
          : 'Never'}
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        {canManageMembers && !isCurrentUser && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="More actions"
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      onChangeRole(member);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Shield className="h-4 w-4 text-gray-400" />
                    {t('actions.changeRole')}
                  </button>

                  <button
                    onClick={() => {
                      onToggleStatus(member);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <UserX className="h-4 w-4 text-gray-400" />
                    {member.isActive ? t('actions.deactivate') : t('actions.activate')}
                  </button>

                  <div className="border-t border-gray-100 my-1" />

                  <button
                    onClick={() => {
                      onRemove(member);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('actions.remove')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
