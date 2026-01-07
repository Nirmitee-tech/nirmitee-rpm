'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, Users } from 'lucide-react';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { useAuth } from '@/lib/auth/auth-context';
import { usersApi, User } from '@/lib/api/users';
import { rolesApi, Role } from '@/lib/api/roles';
import { MemberFilters } from '@/components/features/members/member-filters';
import { MemberList } from '@/components/features/members/member-list';
import { ChangeRoleModal } from '@/components/features/members/change-role-modal';
import { RemoveMemberModal } from '@/components/features/members/remove-member-modal';
import { toast } from 'sonner';

export default function MembersPage() {
  const { t } = useTranslations('members');
  const { user, hasPermission } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  // Permissions
  const canManageMembers = hasPermission('users.manage') || hasPermission('users.update');

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        usersApi.list({ limit: 1000 }),
        rolesApi.list(),
      ]);

      setMembers(usersResponse.users);
      setRoles(rolesResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
        const email = member.email.toLowerCase();
        if (!fullName.includes(query) && !email.includes(query)) {
          return false;
        }
      }

      // Role filter
      if (roleFilter && member.role.id !== roleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'active' && !member.isActive) {
        return false;
      }
      if (statusFilter === 'inactive' && member.isActive) {
        return false;
      }

      return true;
    });
  }, [members, searchQuery, roleFilter, statusFilter]);

  // Handlers
  const handleChangeRole = (member: User) => {
    setSelectedMember(member);
    setShowChangeRoleModal(true);
  };

  const handleToggleStatus = async (member: User) => {
    try {
      await usersApi.update(member.id, {
        isActive: !member.isActive,
      });

      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, isActive: !m.isActive } : m
        )
      );

      toast.success(
        member.isActive
          ? t('deactivate.success')
          : 'Member activated successfully'
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update member status'
      );
    }
  };

  const handleRemove = (member: User) => {
    setSelectedMember(member);
    setShowRemoveModal(true);
  };

  const confirmChangeRole = async (roleId: string) => {
    if (!selectedMember) return;

    try {
      await usersApi.updateRole(selectedMember.id, roleId);

      // Update local state
      const updatedRole = roles.find((r) => r.id === roleId);
      if (updatedRole) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === selectedMember.id
              ? {
                  ...m,
                  role: {
                    id: updatedRole.id,
                    name: updatedRole.name,
                  },
                }
              : m
          )
        );
      }

      toast.success(t('changeRole.success'));
    } catch (err) {
      throw err;
    }
  };

  const confirmRemove = async () => {
    if (!selectedMember) return;

    try {
      await usersApi.remove(selectedMember.id);

      // Remove from local state
      setMembers((prev) => prev.filter((m) => m.id !== selectedMember.id));

      toast.success(t('remove.success'));
    } catch (err) {
      throw err;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-sm text-gray-600 mt-1">{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900 mb-1">
                Failed to load members
              </h3>
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={loadData}
                className="mt-3 text-sm font-medium text-red-700 hover:text-red-800"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <>
          {/* Filters */}
          <MemberFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            roles={roles}
          />

          {/* Members Count */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing {filteredMembers.length} of {members.length} members
            </p>
          </div>

          {/* Members List */}
          <MemberList
            members={filteredMembers}
            currentUserId={user?.id || ''}
            roles={roles}
            onChangeRole={handleChangeRole}
            onToggleStatus={handleToggleStatus}
            onRemove={handleRemove}
            canManageMembers={canManageMembers}
          />
        </>
      )}

      {/* Modals */}
      {selectedMember && (
        <>
          <ChangeRoleModal
            isOpen={showChangeRoleModal}
            onClose={() => {
              setShowChangeRoleModal(false);
              setSelectedMember(null);
            }}
            member={selectedMember}
            roles={roles}
            onConfirm={confirmChangeRole}
          />

          <RemoveMemberModal
            isOpen={showRemoveModal}
            onClose={() => {
              setShowRemoveModal(false);
              setSelectedMember(null);
            }}
            member={selectedMember}
            onConfirm={confirmRemove}
          />
        </>
      )}
    </div>
  );
}
