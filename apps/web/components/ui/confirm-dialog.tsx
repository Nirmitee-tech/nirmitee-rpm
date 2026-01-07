'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { useTranslations } from '@/lib/i18n/i18n-context';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslations('common');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (!isProcessing && !isLoading) {
      onOpenChange(false);
    }
  };

  // Handle Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !isProcessing && !isLoading) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, isProcessing, isLoading, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        onClose={!isProcessing && !isLoading ? handleCancel : undefined}
      >
        <DialogHeader>
          {variant === 'danger' && (
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-danger/10 p-3">
                <AlertTriangle className="h-6 w-6 text-danger" />
              </div>
            </div>
          )}
          <DialogTitle className="text-center">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-center">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing || isLoading}
          >
            {cancelText || t('cancel')}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'default'}
            onClick={handleConfirm}
            disabled={isProcessing || isLoading}
          >
            {isProcessing || isLoading
              ? t('loading')
              : confirmText || t('confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for using ConfirmDialog imperatively
export function useConfirmDialog() {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    title: string;
    description?: string;
    variant?: 'default' | 'danger';
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const confirm = React.useCallback(
    (options: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => {
      return new Promise<boolean>((resolve) => {
        setDialogState({
          open: true,
          title: options.title,
          description: options.description,
          variant: options.variant || 'default',
          onConfirm: async () => {
            await options.onConfirm();
            resolve(true);
          },
        });
      });
    },
    []
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!open) {
      setDialogState(null);
    }
  }, []);

  const dialog = dialogState ? (
    <ConfirmDialog
      open={dialogState.open}
      onOpenChange={handleOpenChange}
      onConfirm={dialogState.onConfirm}
      title={dialogState.title}
      description={dialogState.description}
      variant={dialogState.variant}
    />
  ) : null;

  return { confirm, dialog };
}
