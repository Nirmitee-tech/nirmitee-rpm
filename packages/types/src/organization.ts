export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  role?: string;
  joinedAt?: string;
}

export interface OrganizationContextValue {
  currentOrg: Organization | null;
  organizations: Organization[];
  setCurrentOrg: (org: Organization) => void;
  isLoading: boolean;
  refreshOrganizations?: () => Promise<void>;
  createOrganization?: (name: string) => Promise<Organization>;
}
