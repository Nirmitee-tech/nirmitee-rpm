'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, authApi, User, Organization, LoginData, SignupData } from '../api';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (data: LoginData) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    organization: null,
    permissions: [],
    isLoading: true,
    isAuthenticated: false,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = api.getToken();
      if (!token) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // Get user info from token
        const stored = localStorage.getItem('auth_state');
        if (stored) {
          const parsed = JSON.parse(stored);
          setState({
            user: parsed.user,
            organization: parsed.organization,
            permissions: parsed.permissions || [],
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          // Token exists but no stored state - clear and redirect to login
          api.setToken(null);
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        api.setToken(null);
        localStorage.removeItem('auth_state');
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (data: LoginData) => {
    const response = await authApi.login(data);

    api.setToken(response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);

    const authState = {
      user: response.user,
      organization: response.organization,
      permissions: [], // Will be loaded from role
    };
    localStorage.setItem('auth_state', JSON.stringify(authState));

    setState({
      user: response.user,
      organization: response.organization,
      permissions: [],
      isLoading: false,
      isAuthenticated: true,
    });

    router.push('/dashboard');
  }, [router]);

  const signup = useCallback(async (data: SignupData) => {
    const response = await authApi.signup(data);

    api.setToken(response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);

    const authState = {
      user: response.user,
      organization: response.organization,
      permissions: [],
    };
    localStorage.setItem('auth_state', JSON.stringify(authState));

    setState({
      user: response.user,
      organization: response.organization,
      permissions: [],
      isLoading: false,
      isAuthenticated: true,
    });

    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await authApi.logout(refreshToken || undefined);
    } catch {
      // Ignore logout errors
    }

    api.setToken(null);
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('auth_state');

    setState({
      user: null,
      organization: null,
      permissions: [],
      isLoading: false,
      isAuthenticated: false,
    });

    router.push('/login');
  }, [router]);

  const switchOrganization = useCallback(async (orgId: string) => {
    const { organizationsApi } = await import('../api/organizations');
    const response = await organizationsApi.switch(orgId);

    const newState = {
      ...state,
      organization: {
        ...response.organization,
        role: response.role.name,
      },
      permissions: response.role.permissions,
    };

    localStorage.setItem('auth_state', JSON.stringify({
      user: state.user,
      organization: newState.organization,
      permissions: newState.permissions,
    }));

    setState((prev) => ({
      ...prev,
      organization: newState.organization,
      permissions: newState.permissions,
    }));

    // Refresh the page to reload data for new org
    router.refresh();
  }, [state, router]);

  const hasPermission = useCallback((permission: string) => {
    return state.permissions.includes(permission);
  }, [state.permissions]);

  const hasAnyPermission = useCallback((...permissions: string[]) => {
    return permissions.some((p) => state.permissions.includes(p));
  }, [state.permissions]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        logout,
        switchOrganization,
        hasPermission,
        hasAnyPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function usePermission(permission: string) {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

export function useAnyPermission(...permissions: string[]) {
  const { hasAnyPermission } = useAuth();
  return hasAnyPermission(...permissions);
}
