'use client';

import { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { Button, Input } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface AuditFiltersProps {
  onFilterChange: (filters: {
    action?: string;
    entity?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
}

export function AuditFilters({ onFilterChange }: AuditFiltersProps) {
  const { t } = useTranslations('audit');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleFilterChange = () => {
    onFilterChange({
      action: action || undefined,
      entity: entity || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const handleClearFilters = () => {
    setAction('');
    setEntity('');
    setStartDate('');
    setEndDate('');
    onFilterChange({});
  };

  const hasActiveFilters = action || entity || startDate || endDate;

  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-[#E5E5E5] dark:border-[#212121] rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Action Filter */}
        <div>
          <label className="block text-sm font-medium text-[#171717] dark:text-white mb-2">
            {t('filters.action')}
          </label>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setTimeout(handleFilterChange, 0);
            }}
            className="w-full px-3 py-2 border border-[#E5E5E5] dark:border-[#212121] rounded-lg bg-white dark:bg-[#0a0a0a] text-[#171717] dark:text-white focus:ring-2 focus:ring-[#745EE1] focus:border-transparent"
          >
            <option value="">{t('filters.allActions')}</option>
            <option value="login">{t('actions.login')}</option>
            <option value="logout">{t('actions.logout')}</option>
            <option value="create">{t('actions.create')}</option>
            <option value="update">{t('actions.update')}</option>
            <option value="delete">{t('actions.delete')}</option>
            <option value="invite">{t('actions.invite')}</option>
            <option value="accept">{t('actions.accept')}</option>
            <option value="revoke">{t('actions.revoke')}</option>
            <option value="assign">{t('actions.assign')}</option>
            <option value="remove">{t('actions.remove')}</option>
            <option value="enable">{t('actions.enable')}</option>
            <option value="disable">{t('actions.disable')}</option>
          </select>
        </div>

        {/* Entity Filter */}
        <div>
          <label className="block text-sm font-medium text-[#171717] dark:text-white mb-2">
            {t('filters.entity')}
          </label>
          <select
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setTimeout(handleFilterChange, 0);
            }}
            className="w-full px-3 py-2 border border-[#E5E5E5] dark:border-[#212121] rounded-lg bg-white dark:bg-[#0a0a0a] text-[#171717] dark:text-white focus:ring-2 focus:ring-[#745EE1] focus:border-transparent"
          >
            <option value="">{t('filters.allEntities')}</option>
            <option value="user">{t('entities.user')}</option>
            <option value="team">{t('entities.team')}</option>
            <option value="role">{t('entities.role')}</option>
            <option value="organization">{t('entities.organization')}</option>
            <option value="invitation">{t('entities.invitation')}</option>
            <option value="session">{t('entities.session')}</option>
            <option value="permission">{t('entities.permission')}</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-[#171717] dark:text-white mb-2">
            {t('filters.startDate')}
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#737373]" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setTimeout(handleFilterChange, 0);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-[#171717] dark:text-white mb-2">
            {t('filters.endDate')}
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#737373]" />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setTimeout(handleFilterChange, 0);
              }}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-2" />
            {t('filters.clearFilters')}
          </Button>
        </div>
      )}
    </div>
  );
}
