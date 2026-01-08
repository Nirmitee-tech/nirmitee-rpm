'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, Plus, Loader2, Search, X } from 'lucide-react';
import { cn } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { MasterDrawer, MasterType, MasterTypeMap } from './master-drawer';
import { api } from '@/lib/api/client';

// Base interface that all master types share
interface MasterOption {
  id: string;
  name: string;
  code?: string;
}

// Union type of all possible master data items
type MasterDataItem = MasterTypeMap[MasterType];

interface MasterSelectProps {
  masterType: MasterType;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  showSearch?: boolean;
  multiple?: boolean;
  addNewLabel?: string; // Custom label for "Add New" button
}

// API endpoints for each master type
const MASTER_API_ENDPOINTS: Record<MasterType, string> = {
  condition: '/api/master-data/conditions',
  insurance: '/api/master-data/insurance-providers',
  provider: '/api/master-data/external-providers',
  medication: '/api/master-data/medications',
  procedure: '/api/master-data/procedures',
  facility: '/api/master-data/facilities',
  device: '/api/master-data/device-models',
};

// Title keys for each master type
const MASTER_TITLES: Record<MasterType, string> = {
  condition: 'medicalCondition',
  insurance: 'insuranceProvider',
  provider: 'externalProvider',
  medication: 'medication',
  procedure: 'procedure',
  facility: 'facility',
  device: 'deviceModel',
};

export function MasterSelect({
  masterType,
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  className,
  showSearch = true,
  addNewLabel,
}: MasterSelectProps) {
  const { t } = useTranslations('settings.masters');
  const [isOpen, setIsOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [options, setOptions] = useState<MasterOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const endpoint = MASTER_API_ENDPOINTS[masterType];
  const titleKey = MASTER_TITLES[masterType];

  // Fetch options
  const fetchOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<MasterOption[]>(endpoint);
      setOptions(data);
    } catch (err) {
      console.error('Failed to fetch options:', err);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  // Filter options based on search
  const filteredOptions = options.filter(
    (opt) =>
      opt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected option
  const selectedOption = options.find((opt) => opt.id === value);

  // Handle option selection
  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Handle new item created
  const handleCreated = (newItem: MasterDataItem) => {
    // All master types have id and name, so they satisfy MasterOption
    const option: MasterOption = {
      id: newItem.id,
      name: newItem.name,
      code: 'code' in newItem ? newItem.code : undefined,
    };
    setOptions((prev) => [...prev, option]);
    onChange(newItem.id);
    setIsDrawerOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-900 dark:border-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
          error && 'border-red-500',
          !selectedOption && 'text-gray-400'
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.name : placeholder || t('select')}
        </span>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        ) : (
          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Search */}
          {showSearch && (
            <div className="p-2 border-b dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-8 pr-8 py-1.5 text-sm border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-brand"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options */}
          <div className="overflow-y-auto max-h-44">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                {t('noResults')}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={cn(
                    'w-full flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-800',
                    option.id === value && 'bg-brand/10 text-brand'
                  )}
                >
                  <span className="truncate">{option.name}</span>
                  {option.code && (
                    <span className="ml-2 text-xs text-gray-400 font-mono">{option.code}</span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Add New */}
          <div className="border-t dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsDrawerOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-brand hover:bg-brand/10 font-medium"
            >
              <Plus className="h-4 w-4" />
              {addNewLabel || `${t('addNew')} ${t(titleKey)}`}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Drawer */}
      <MasterDrawer
        masterType={masterType}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

export { MasterDrawer };
export type { MasterType };
