'use client';

import { useState } from 'react';
import { ChevronDown, Check, Building2, Plus, X, Loader2 } from 'lucide-react';
import { cn, Button, Input } from '@nirmitee/ui';
import { useOrganization } from '@/components/providers/organization-provider';

export function OrgSwitcher() {
  const { currentOrg, organizations, setCurrentOrg, isLoading, createOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      setCreateError('Organization name is required');
      return;
    }

    if (!createOrganization) {
      setCreateError('Create organization function not available');
      return;
    }

    setIsCreating(true);
    setCreateError('');

    try {
      await createOrganization(newOrgName.trim());
      setNewOrgName('');
      setShowCreateModal(false);
      setIsOpen(false);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setCreateError(error.message || 'Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-10 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-transparent transition-colors"
      >
        <div className="h-7 w-7 rounded-lg bg-brand/10 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-brand" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">
            {currentOrg?.name}
          </span>
          <span className="text-xs text-gray-500 capitalize">{currentOrg?.role}</span>
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-gray-400 transition-transform shrink-0',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-lg shadow-lg z-20">
            <div className="px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wider font-medium">
              Organizations
            </div>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setCurrentOrg(org);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="h-7 w-7 rounded-lg bg-brand/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-brand" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">
                    {org.name}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{org.role}</span>
                </div>
                {currentOrg?.id === org.id && (
                  <Check className="h-4 w-4 text-brand shrink-0" />
                )}
              </button>
            ))}
            <div className="border-t border-gray-200 dark:border-[#333] mt-1 pt-1">
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">Create Organization</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowCreateModal(false);
              setNewOrgName('');
              setCreateError('');
            }}
          />
          <div className="relative bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create New Organization
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewOrgName('');
                  setCreateError('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Create a new workspace to organize your team and projects separately.
            </p>

            {createError && (
              <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {createError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organization Name
              </label>
              <Input
                type="text"
                placeholder="e.g., My Company"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCreating) {
                    handleCreateOrganization();
                  }
                }}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewOrgName('');
                  setCreateError('');
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateOrganization}
                disabled={isCreating || !newOrgName.trim()}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
