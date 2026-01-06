'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Organization, OrganizationContextValue } from '@nirmitee/types';
import { organizationsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';
import { api } from '@/lib/api/client';

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, organization: authOrg, switchOrganization } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const orgs = await organizationsApi.list();
        setOrganizations(orgs);

        // Set current org from auth context or find from list
        if (authOrg) {
          const found = orgs.find(o => o.id === authOrg.id);
          setCurrentOrg(found || orgs[0] || null);
        } else if (orgs.length > 0) {
          setCurrentOrg(orgs[0]);
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, [isAuthenticated, authOrg]);

  const handleSetCurrentOrg = useCallback(async (org: Organization) => {
    setCurrentOrg(org);
    await switchOrganization(org.id);
  }, [switchOrganization]);

  const refreshOrganizations = useCallback(async () => {
    try {
      const orgs = await organizationsApi.list();
      setOrganizations(orgs);
    } catch (error) {
      console.error('Failed to refresh organizations:', error);
    }
  }, []);

  const createOrganization = useCallback(async (name: string): Promise<Organization> => {
    const result = await organizationsApi.create({ name });

    // Update tokens with new org context
    api.setToken(result.accessToken);
    api.setRefreshToken(result.refreshToken);

    // Refresh the organizations list
    await refreshOrganizations();

    // Set the new org as current
    const newOrg: Organization = {
      id: result.organization.id,
      name: result.organization.name,
      slug: result.organization.slug,
      logo: result.organization.logo,
      role: result.role,
    };

    setCurrentOrg(newOrg);

    return newOrg;
  }, [refreshOrganizations]);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        organizations,
        setCurrentOrg: handleSetCurrentOrg,
        isLoading,
        refreshOrganizations,
        createOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}
