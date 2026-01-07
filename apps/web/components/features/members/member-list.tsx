'use client';

import { useTranslations } from '@/lib/i18n/i18n-context';
import { User } from '@/lib/api/users';
import { Role } from '@/lib/api/roles';
import { MemberRow } from './member-row';

interface MemberListProps {
  members: User[];
  currentUserId: string;
  roles: Role[];
  onChangeRole: (member: User) => void;
  onToggleStatus: (member: User) => void;
  onRemove: (member: User) => void;
  canManageMembers: boolean;
}

export function MemberList({
  members,
  currentUserId,
  roles,
  onChangeRole,
  onToggleStatus,
  onRemove,
  canManageMembers,
}: MemberListProps) {
  const { t } = useTranslations('members');

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">{t('noMembers')}</h3>
        <p className="text-sm text-gray-600">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('columns.member')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('columns.role')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('columns.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('columns.joined')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('columns.lastActive')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('columns.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isCurrentUser={member.id === currentUserId}
                roles={roles}
                onChangeRole={onChangeRole}
                onToggleStatus={onToggleStatus}
                onRemove={onRemove}
                canManageMembers={canManageMembers}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
