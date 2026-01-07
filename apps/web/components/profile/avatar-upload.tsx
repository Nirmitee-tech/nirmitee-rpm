'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, Trash2, Camera } from 'lucide-react';
import { Button } from '@nirmitee/ui';
import { cn } from '@nirmitee/ui';
import { profileApi } from '@/lib/api/profile';
import { useTranslations } from '@/lib/i18n/i18n-context';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  userName: string;
  onAvatarUpdated?: (avatarUrl: string | null) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function AvatarUpload({ currentAvatar, userName, onAvatarUpdated }: AvatarUploadProps) {
  const { t } = useTranslations('settings.profile.avatar');
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    const names = userName.split(' ');
    return names.map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2) || '?';
  };

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t('invalidFileType');
    }
    if (file.size > MAX_FILE_SIZE) {
      return t('fileTooLarge');
    }
    return null;
  }, [t]);

  const handleFileSelect = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    try {
      setUploading(true);
      const result = await profileApi.uploadAvatar(file);

      // Update parent component
      if (onAvatarUpdated) {
        onAvatarUpdated(result.avatar || null);
      }

      // Clear preview after successful upload
      setTimeout(() => setPreview(null), 1000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || t('uploadFailed'));
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [t, onAvatarUpdated, validateFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = async () => {
    if (!currentAvatar) return;

    try {
      setUploading(true);
      setError('');
      await profileApi.removeAvatar();

      if (onAvatarUpdated) {
        onAvatarUpdated(null);
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || t('removeFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const displayAvatar = preview || currentAvatar;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* Avatar Display */}
        <div
          className={cn(
            "relative h-20 w-20 rounded-full shrink-0 overflow-hidden transition-all",
            isDragging && "ring-2 ring-[#745EE1] ring-offset-2"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={userName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[#745EE1] flex items-center justify-center">
              <span className="text-2xl font-medium text-white">{getInitials()}</span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}

          {/* Hover Overlay */}
          <button
            onClick={handleClick}
            disabled={uploading}
            className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center group"
          >
            <Camera className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClick}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('uploading')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {currentAvatar ? t('change') : t('upload')}
                </>
              )}
            </Button>

            {currentAvatar && !uploading && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('remove')}
              </Button>
            )}
          </div>
          <p className="text-xs text-[#737373] mt-2">{t('hint')}</p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-[#745EE1] bg-[#745EE1]/5"
            : "border-[#E5E5E5] dark:border-[#212121] hover:border-[#745EE1]/50"
        )}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-[#737373]" />
        <p className="text-sm font-medium text-[#171717] dark:text-white mb-1">
          {t('dropzone')}
        </p>
        <p className="text-xs text-[#737373]">
          {t('dropzoneHint')}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
