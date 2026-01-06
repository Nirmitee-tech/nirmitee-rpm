'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { rolesApi, Role, PermissionsByModule } from '@/lib/api';
import { CreateRoleModal } from '@/components/features/role/create-role-modal';

function RoleCard({ role, permissions, onEdit }: { role: Role; permissions: PermissionsByModule; onEdit: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const rolePermissionCodes = role.permissions?.map(p => p.code) || [];
  const totalPermissions = Object.values(permissions).flat().length;
  const permissionCount = rolePermissionCodes.length;

  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#745EE1]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#745EE1]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#171717] dark:text-white">{role.name}</h3>
                {role.isSystem && (
                  <span className="px-2 py-0.5 text-xs bg-[#F5F5F5] dark:bg-[#171717] text-[#737373] rounded">
                    System
                  </span>
                )}
              </div>
              <p className="text-sm text-[#737373]">{role.description}</p>
            </div>
          </div>
          {!role.isSystem && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 hover:bg-[#F5F5F5] dark:hover:bg-[#171717] rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-[#737373]" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-10 w-48 bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-lg shadow-lg py-1 z-20">
                    <button
                      onClick={() => { setMenuOpen(false); onEdit(); }}
                      className="w-full px-4 py-2 text-left text-sm text-[#171717] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#171717] flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Role
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete Role
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-[#737373]">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{role.memberCount} members</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            <span>{permissionCount}/{totalPermissions} permissions</span>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E5E5E5] dark:border-[#212121]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-6 py-3 flex items-center justify-between text-sm text-[#737373] hover:bg-[#F5F5F5] dark:hover:bg-[#171717] transition-colors"
        >
          <span>View Permissions</span>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="px-6 pb-4 space-y-3">
            {Object.entries(permissions).map(([module, perms]) => (
              <div key={module} className="space-y-1">
                <div className="text-xs font-medium text-[#737373] uppercase">{module}</div>
                <div className="flex flex-wrap gap-1.5">
                  {perms.map((perm) => {
                    const hasPermission = rolePermissionCodes.includes(perm.code);
                    return (
                      <div
                        key={perm.code}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          hasPermission
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : 'bg-[#F5F5F5] dark:bg-[#171717] text-[#737373]'
                        }`}
                      >
                        {hasPermission ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {perm.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RolesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionsByModule>({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        rolesApi.list(),
        rolesApi.listPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#171717] dark:text-white">Roles & Permissions</h1>
          <p className="text-[#737373] mt-1">Manage access control and user permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#745EE1] text-white rounded-lg hover:bg-[#5D4AB8] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Role
        </button>

        <CreateRoleModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchData}
        />
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-lg text-[#171717] dark:text-white placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-[#745EE1]/20 focus:border-[#745EE1]"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#745EE1]" />
        </div>
      ) : filteredRoles.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRoles.map((role) => (
            <RoleCard key={role.id} role={role} permissions={permissions} onEdit={() => {}} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-[#737373] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#171717] dark:text-white mb-2">No roles found</h3>
          <p className="text-[#737373]">
            {searchQuery ? 'Try adjusting your search' : 'Create your first custom role'}
          </p>
        </div>
      )}
    </div>
  );
}
