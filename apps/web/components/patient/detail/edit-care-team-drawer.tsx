'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { patientsApi, type StaffMember } from '@/lib/api/patients';

interface CareTeamMember {
  id: string;
  name: string;
  role: string;
}

interface EditCareTeamDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  currentTeam: CareTeamMember[];
  onTeamUpdated: (team: CareTeamMember[]) => void;
}

export function EditCareTeamDrawer({
  isOpen,
  onClose,
  patientId,
  currentTeam,
  onTeamUpdated
}: EditCareTeamDrawerProps) {
  const { t } = useTranslations('patientDetail');
  const [team, setTeam] = useState<CareTeamMember[]>(currentTeam);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);

  useEffect(() => {
    setTeam(currentTeam);
  }, [currentTeam]);

  // Search staff when search input changes
  useEffect(() => {
    const searchStaff = async () => {
      if (!search.trim()) {
        setAvailableStaff([]);
        return;
      }

      try {
        const results = await patientsApi.searchStaff(search);
        setAvailableStaff(results);
      } catch (error) {
        console.error('Failed to search staff:', error);
        setAvailableStaff([]);
      }
    };

    const debounce = setTimeout(searchStaff, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const availableToAdd = availableStaff.filter(
    p => !team.some(t => t.id === p.id)
  );

  const handleAddMember = (provider: StaffMember) => {
    setTeam([...team, { id: provider.id, name: provider.name, role: provider.role }]);
  };

  const handleRemoveMember = (id: string) => {
    setTeam(team.filter(m => m.id !== id));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Find physician and CM from team
      const physician = team.find(m => m.role === 'Physician');
      const cm = team.find(m => m.role === 'CM' || m.role === 'Care Manager');

      await patientsApi.updateCareTeam(patientId, {
        primaryPhysicianId: physician?.id,
        assignedClinicalStaffId: cm?.id,
      });

      onTeamUpdated(team);
      onClose();
    } catch (error) {
      console.error('Failed to update care team:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold">{t('editCareTeam')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Current Team */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 mb-2">{t('currentTeam')}</p>
            {team.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{t('noTeamMembers')}</p>
            ) : (
              <div className="space-y-2">
                {team.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Members */}
          <div className="p-3">
            <p className="text-xs text-gray-500 mb-2">{t('addTeamMember')}</p>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchProviders')}
                className="pl-9 h-9"
              />
            </div>
            <div className="space-y-1">
              {availableToAdd.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleAddMember(provider)}
                  className="w-full text-left p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{provider.name}</p>
                    <p className="text-xs text-gray-500">{provider.role}</p>
                  </div>
                  <Plus className="w-4 h-4 text-brand" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9">
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="flex-1 h-9">
            {isLoading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
            {t('saveChanges')}
          </Button>
        </div>
      </div>
    </>
  );
}
