'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, MoreHorizontal, Mail, Shield, Loader2, UserPlus } from 'lucide-react';
import { Button, Input, Badge } from '@nirmitee/ui';
import { usersApi, ListUsersResponse } from '@/lib/api';
import { InviteUserModal } from '@/components/features/user/invite-user-modal';
import { useTranslations } from '@/lib/i18n/i18n-context';

const statusColors = {
  ACTIVE: 'success',
  INACTIVE: 'gray',
  SUSPENDED: 'danger',
  PENDING: 'warning',
} as const;

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ListUsersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { t } = useTranslations('users');
  const { t: tCommon } = useTranslations('common');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await usersApi.list({ page, search: searchQuery || undefined });
      setData(result);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [fetchUsers]);

  const users = data?.users || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#171717] dark:text-white">{t('title')}</h1>
          <p className="text-[#737373] mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t('inviteUser')}
        </Button>

        <InviteUserModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={fetchUsers}
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder={t('searchPlaceholder')}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">{t('filters.allRoles')}</Button>
            <Button variant="outline" size="sm">{t('filters.allStatus')}</Button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="h-12 w-12 text-[#737373] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#171717] dark:text-white mb-2">{t('empty.title')}</h3>
            <p className="text-[#737373]">
              {searchQuery ? t('empty.searchMessage') : t('empty.defaultMessage')}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E5E5] dark:border-[#212121]">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[#171717] dark:text-white">{t('table.user')}</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[#171717] dark:text-white">{t('table.role')}</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[#171717] dark:text-white">{t('table.status')}</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[#171717] dark:text-white">{t('table.joined')}</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-[#171717] dark:text-white">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[#E5E5E5] dark:border-[#212121] last:border-0 hover:bg-gray-50 dark:hover:bg-[#171717]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#745EE1]/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-[#745EE1]">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#171717] dark:text-white">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-[#737373]">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-[#737373]" />
                          <Badge variant="default" className="capitalize">
                            {user.role?.name || 'Member'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusColors[user.status as keyof typeof statusColors] || 'gray'} className="capitalize">
                          {user.status?.toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#737373]">
                        {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E5E5] dark:border-[#212121]">
                <div className="text-sm text-[#737373]">
                  {t('pagination.showing')} {users.length} {tCommon('of')} {pagination.total} {t('pagination.users')}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    {t('pagination.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    {t('pagination.next')}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
