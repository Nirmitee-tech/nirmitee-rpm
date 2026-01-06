'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UsersRound,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  Crown,
  Loader2
} from 'lucide-react';
import { teamsApi, ListTeamsResponse, Team } from '@/lib/api';
import { CreateTeamModal } from '@/components/features/team/create-team-modal';
import { useTranslations } from '@/lib/i18n/i18n-context';

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
}

function TeamCard({ team }: { team: Team }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const lead = team.members?.find(m => m.role === 'LEAD');
  const { t } = useTranslations('teams');
  const { t: tCommon } = useTranslations('common');

  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#745EE1]/10 flex items-center justify-center">
            <UsersRound className="w-6 h-6 text-[#745EE1]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#171717] dark:text-white">{team.name}</h3>
            <p className="text-sm text-[#737373]">{team.memberCount} {tCommon('members')}</p>
          </div>
        </div>
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
                <button className="w-full px-4 py-2 text-left text-sm text-[#171717] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#171717] flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  {t('actions.edit')}
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-[#171717] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#171717] flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  {t('actions.addMember')}
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  {t('actions.delete')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {team.description && (
        <p className="text-sm text-[#737373] mb-4">{team.description}</p>
      )}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex -space-x-2">
          {(team.members || []).slice(0, 4).map((member, index) => (
            <div
              key={member.id}
              className="w-8 h-8 rounded-full bg-[#745EE1]/10 border-2 border-white dark:border-[#0a0a0a] flex items-center justify-center text-xs font-medium text-[#745EE1]"
              style={{ zIndex: 4 - index }}
              title={`${member.firstName} ${member.lastName}`}
            >
              {getInitials(member.firstName, member.lastName)}
            </div>
          ))}
          {team.memberCount > 4 && (
            <div className="w-8 h-8 rounded-full bg-[#F5F5F5] dark:bg-[#171717] border-2 border-white dark:border-[#0a0a0a] flex items-center justify-center text-xs font-medium text-[#737373]">
              +{team.memberCount - 4}
            </div>
          )}
        </div>
      </div>

      {lead && (
        <div className="pt-4 border-t border-[#E5E5E5] dark:border-[#212121]">
          <div className="flex items-center gap-2 text-sm text-[#737373]">
            <Crown className="w-4 h-4 text-amber-500" />
            <span>{t('lead')} {lead.firstName} {lead.lastName}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ListTeamsResponse | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { t } = useTranslations('teams');

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const result = await teamsApi.list({ search: searchQuery || undefined });
      setData(result);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const debounce = setTimeout(fetchTeams, 300);
    return () => clearTimeout(debounce);
  }, [fetchTeams]);

  const teams = data?.teams || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#171717] dark:text-white">{t('title')}</h1>
          <p className="text-[#737373] mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#745EE1] text-white rounded-lg hover:bg-[#5D4AB8] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('createTeam')}
        </button>

        <CreateTeamModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchTeams}
        />
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
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
      ) : teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <UsersRound className="w-12 h-12 text-[#737373] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#171717] dark:text-white mb-2">{t('empty.title')}</h3>
          <p className="text-[#737373]">
            {searchQuery ? t('empty.searchMessage') : t('empty.defaultMessage')}
          </p>
        </div>
      )}
    </div>
  );
}
