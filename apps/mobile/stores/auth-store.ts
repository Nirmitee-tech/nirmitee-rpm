import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, User, Organization, LoginResponse } from '@/lib/api/auth';
import { apiClient } from '@/lib/api/client';
import { router } from 'expo-router';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requiresMfa: boolean;
  mfaSessionToken: string | null;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  verifyMfa: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  handleSessionExpired: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Register auth expiry handler with API client
  apiClient.setOnAuthExpired(() => {
    const { handleSessionExpired } = get();
    handleSessionExpired();
  });

  return {
    user: null,
    organization: null,
    isLoading: true,
    isAuthenticated: false,
    requiresMfa: false,
    mfaSessionToken: null,
    error: null,

    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        const response: LoginResponse = await authApi.login(email, password);

        if (response.requiresMfa) {
          set({
            isLoading: false,
            requiresMfa: true,
            mfaSessionToken: response.mfaSessionToken || null,
          });
          return false;
        }

        // Store user and organization data
        await Promise.all([
          AsyncStorage.setItem('user', JSON.stringify(response.user)),
          AsyncStorage.setItem('organization', JSON.stringify(response.organization)),
        ]);

        set({
          user: response.user,
          organization: response.organization,
          isAuthenticated: true,
          isLoading: false,
          requiresMfa: false,
          mfaSessionToken: null,
          error: null,
        });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        set({
          isLoading: false,
          error: message,
        });
        return false;
      }
    },

    verifyMfa: async (code: string) => {
      const { mfaSessionToken } = get();
      if (!mfaSessionToken) {
        set({ error: 'MFA session expired' });
        return false;
      }

      set({ isLoading: true, error: null });
      try {
        const response = await authApi.verifyMfa(mfaSessionToken, code);

        await Promise.all([
          AsyncStorage.setItem('user', JSON.stringify(response.user)),
        ]);

        set({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          requiresMfa: false,
          mfaSessionToken: null,
          error: null,
        });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'MFA verification failed';
        set({
          isLoading: false,
          error: message,
        });
        return false;
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        await authApi.logout();
      } catch (error) {
        // Ignore logout API errors - we're logging out anyway
        console.log('[Auth] Logout API error (ignored):', error);
      } finally {
        await apiClient.clearTokens();
        set({
          user: null,
          organization: null,
          isAuthenticated: false,
          isLoading: false,
          requiresMfa: false,
          mfaSessionToken: null,
          error: null,
        });
      }
    },

    checkAuth: async () => {
      set({ isLoading: true });
      try {
        // Check if we have stored tokens
        const [storedUser, storedOrg, accessToken] = await Promise.all([
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('organization'),
          apiClient.getAccessToken(),
        ]);

        if (!storedUser || !accessToken) {
          set({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            organization: null,
          });
          return;
        }

        // We have stored data and token - consider authenticated
        // Token validity will be checked on first API call
        set({
          user: JSON.parse(storedUser),
          organization: storedOrg ? JSON.parse(storedOrg) : null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('[Auth] Check auth error:', error);
        // Clear invalid auth state
        await apiClient.clearTokens();
        set({
          user: null,
          organization: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    },

    clearError: () => set({ error: null }),

    handleSessionExpired: () => {
      console.log('[Auth] Session expired, redirecting to login...');
      set({
        user: null,
        organization: null,
        isAuthenticated: false,
        isLoading: false,
        requiresMfa: false,
        mfaSessionToken: null,
        error: 'Session expired. Please log in again.',
      });
      // Navigate to login
      router.replace('/(auth)/login');
    },
  };
});

export default useAuthStore;
