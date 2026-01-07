'use client';

import { useState } from 'react';
import { Input } from '@nirmitee/ui';
import { cn } from '@nirmitee/ui';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
  disabled?: boolean;
}

const PRESET_COLORS = [
  '#745EE1', // Primary Purple
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
];

export function ColorPicker({ value, onChange, label, disabled = false }: ColorPickerProps) {
  const { t } = useTranslations('settings.branding');
  const [showPicker, setShowPicker] = useState(false);

  const handlePresetClick = (color: string) => {
    onChange(color);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-[#171717] dark:text-white mb-2">
        {label}
      </label>

      <div className="space-y-3">
        {/* Color Preview and Input */}
        <div className="flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-lg border-2 border-[#E5E5E5] dark:border-[#212121] shrink-0 cursor-pointer"
            style={{ backgroundColor: value }}
            onClick={() => !disabled && setShowPicker(!showPicker)}
          />
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#745EE1"
            disabled={disabled}
            className="flex-1"
          />
        </div>

        {/* Preset Colors */}
        {showPicker && (
          <div className="p-3 rounded-lg border border-[#E5E5E5] dark:border-[#212121] bg-white dark:bg-black">
            <p className="text-xs font-medium text-[#737373] mb-2">{t('presetColors')}</p>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handlePresetClick(color)}
                  className={cn(
                    "h-8 w-8 rounded-lg border-2 transition-all hover:scale-110",
                    value === color
                      ? "border-[#171717] dark:border-white"
                      : "border-transparent hover:border-[#E5E5E5]"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
