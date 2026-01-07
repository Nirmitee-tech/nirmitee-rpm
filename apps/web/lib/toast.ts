import { toast as sonnerToast } from 'sonner';

/**
 * Toast utility for displaying notifications
 * Uses sonner for toast notifications
 */

export const toast = {
  /**
   * Display a success toast notification
   */
  success: (message: string, description?: string) => {
    return sonnerToast.success(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Display an error toast notification
   */
  error: (message: string, description?: string) => {
    return sonnerToast.error(message, {
      description,
      duration: 5000,
    });
  },

  /**
   * Display an info toast notification
   */
  info: (message: string, description?: string) => {
    return sonnerToast.info(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Display a warning toast notification
   */
  warning: (message: string, description?: string) => {
    return sonnerToast.warning(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Display a loading toast notification
   * Returns an ID that can be used to dismiss or update the toast
   */
  loading: (message: string, description?: string) => {
    return sonnerToast.loading(message, {
      description,
    });
  },

  /**
   * Display a promise toast that updates based on promise state
   */
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return sonnerToast.promise(promise, options);
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },

  /**
   * Custom toast with custom content
   */
  custom: (message: string, options?: { description?: string; duration?: number }) => {
    return sonnerToast(message, {
      description: options?.description,
      duration: options?.duration || 4000,
    });
  },
};

/**
 * Example usage:
 *
 * // Success
 * toast.success('User created successfully');
 *
 * // Error
 * toast.error('Failed to create user', 'Please try again');
 *
 * // Loading
 * const toastId = toast.loading('Creating user...');
 * // Later dismiss it
 * toast.dismiss(toastId);
 *
 * // Promise
 * toast.promise(
 *   fetchData(),
 *   {
 *     loading: 'Loading data...',
 *     success: 'Data loaded!',
 *     error: 'Failed to load data'
 *   }
 * );
 */
