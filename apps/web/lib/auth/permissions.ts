/**
 * Permission utilities for RPM RBAC
 * Client-side permission checking and helpers
 */

import { useAuth } from './auth-context';

/**
 * RPM Permission constants
 * Matches backend permission codes
 */
export const RPM_PERMISSIONS = {
  // Patients
  PATIENTS_READ_OWN: 'patients:read:own',
  PATIENTS_READ_LINKED: 'patients:read:linked',
  PATIENTS_READ_ASSIGNED: 'patients:read:assigned',
  PATIENTS_READ_ALL: 'patients:read:all',
  PATIENTS_WRITE_OWN: 'patients:write:own',
  PATIENTS_WRITE_ASSIGNED: 'patients:write:assigned',
  PATIENTS_WRITE_ALL: 'patients:write:all',
  PATIENTS_MANAGE: 'patients:manage',

  // Vitals
  VITALS_READ_OWN: 'vitals:read:own',
  VITALS_READ_LINKED: 'vitals:read:linked',
  VITALS_READ_ASSIGNED: 'vitals:read:assigned',
  VITALS_READ_ALL: 'vitals:read:all',
  VITALS_WRITE_OWN: 'vitals:write:own',
  VITALS_WRITE_LINKED: 'vitals:write:linked',
  VITALS_WRITE_ASSIGNED: 'vitals:write:assigned',

  // Alerts
  ALERTS_READ_OWN: 'alerts:read:own',
  ALERTS_READ_LINKED: 'alerts:read:linked',
  ALERTS_READ_ASSIGNED: 'alerts:read:assigned',
  ALERTS_READ_ALL: 'alerts:read:all',
  ALERTS_WRITE_ASSIGNED: 'alerts:write:assigned',
  ALERTS_WRITE_ALL: 'alerts:write:all',
  ALERTS_ACKNOWLEDGE: 'alerts:acknowledge',
  ALERTS_ESCALATE: 'alerts:escalate',

  // Care Plans
  CARE_PLANS_READ_OWN: 'care_plans:read:own',
  CARE_PLANS_READ_LINKED: 'care_plans:read:linked',
  CARE_PLANS_READ_ASSIGNED: 'care_plans:read:assigned',
  CARE_PLANS_READ_ALL: 'care_plans:read:all',
  CARE_PLANS_WRITE_ASSIGNED: 'care_plans:write:assigned',
  CARE_PLANS_WRITE_ALL: 'care_plans:write:all',

  // Billing
  BILLING_READ: 'billing:read',
  BILLING_WRITE: 'billing:write',
  BILLING_SUMMARY: 'billing:summary',

  // Devices
  DEVICES_READ_OWN: 'devices:read:own',
  DEVICES_READ_ASSIGNED: 'devices:read:assigned',
  DEVICES_READ_ALL: 'devices:read:all',
  DEVICES_WRITE_ASSIGNED: 'devices:write:assigned',
  DEVICES_MANAGE: 'devices:manage',

  // Messages
  MESSAGES_READ_OWN: 'messages:read:own',
  MESSAGES_READ_ASSIGNED: 'messages:read:assigned',
  MESSAGES_WRITE: 'messages:write',

  // Time Tracking
  TIME_TRACKING_WRITE: 'time_tracking:write',
  TIME_TRACKING_READ: 'time_tracking:read',

  // Orders
  ORDERS_WRITE: 'orders:write',
  ORDERS_READ: 'orders:read',

  // Program Admin
  PROGRAM_CONFIGURE: 'program:configure',
  PROGRAM_ANALYTICS: 'program:analytics',

  // System Admin
  SYSTEM_USERS: 'system:users',
  SYSTEM_INTEGRATIONS: 'system:integrations',
  SYSTEM_AUDIT: 'system:audit',
} as const;

/**
 * RPM Role types
 */
export type RpmRole =
  | 'PATIENT'
  | 'CAREGIVER'
  | 'CLINICAL_STAFF'
  | 'PHYSICIAN'
  | 'CARE_COORDINATOR'
  | 'BILLING_STAFF'
  | 'PROGRAM_ADMIN'
  | 'IT_ADMIN'
  | 'ORG_ADMIN';

/**
 * Hook to check if user has specific permission
 */
export function usePermission(permission: string): boolean {
  const { permissions } = useAuth();
  return permissions.includes(permission);
}

/**
 * Hook to check if user has ANY of the specified permissions
 */
export function useAnyPermission(...permissionCodes: string[]): boolean {
  const { permissions } = useAuth();
  return permissionCodes.some(code => permissions.includes(code));
}

/**
 * Hook to check if user has ALL of the specified permissions
 */
export function useAllPermissions(...permissionCodes: string[]): boolean {
  const { permissions } = useAuth();
  return permissionCodes.every(code => permissions.includes(code));
}

/**
 * Check if user can read patient data
 */
export function useCanReadPatients(): {
  canReadOwn: boolean;
  canReadLinked: boolean;
  canReadAssigned: boolean;
  canReadAll: boolean;
} {
  const { permissions } = useAuth();

  return {
    canReadOwn: permissions.includes(RPM_PERMISSIONS.PATIENTS_READ_OWN),
    canReadLinked: permissions.includes(RPM_PERMISSIONS.PATIENTS_READ_LINKED),
    canReadAssigned: permissions.includes(RPM_PERMISSIONS.PATIENTS_READ_ASSIGNED),
    canReadAll: permissions.includes(RPM_PERMISSIONS.PATIENTS_READ_ALL),
  };
}

/**
 * Check if user can write patient data
 */
export function useCanWritePatients(): {
  canWriteOwn: boolean;
  canWriteAssigned: boolean;
  canWriteAll: boolean;
  canManage: boolean;
} {
  const { permissions } = useAuth();

  return {
    canWriteOwn: permissions.includes(RPM_PERMISSIONS.PATIENTS_WRITE_OWN),
    canWriteAssigned: permissions.includes(RPM_PERMISSIONS.PATIENTS_WRITE_ASSIGNED),
    canWriteAll: permissions.includes(RPM_PERMISSIONS.PATIENTS_WRITE_ALL),
    canManage: permissions.includes(RPM_PERMISSIONS.PATIENTS_MANAGE),
  };
}

/**
 * Check if user can manage alerts
 */
export function useCanManageAlerts(): {
  canRead: boolean;
  canWrite: boolean;
  canAcknowledge: boolean;
  canEscalate: boolean;
} {
  const { permissions } = useAuth();

  return {
    canRead: useAnyPermission(
      RPM_PERMISSIONS.ALERTS_READ_OWN,
      RPM_PERMISSIONS.ALERTS_READ_LINKED,
      RPM_PERMISSIONS.ALERTS_READ_ASSIGNED,
      RPM_PERMISSIONS.ALERTS_READ_ALL
    ),
    canWrite: useAnyPermission(
      RPM_PERMISSIONS.ALERTS_WRITE_ASSIGNED,
      RPM_PERMISSIONS.ALERTS_WRITE_ALL
    ),
    canAcknowledge: permissions.includes(RPM_PERMISSIONS.ALERTS_ACKNOWLEDGE),
    canEscalate: permissions.includes(RPM_PERMISSIONS.ALERTS_ESCALATE),
  };
}

/**
 * Check if user has billing permissions
 */
export function useCanAccessBilling(): {
  canRead: boolean;
  canWrite: boolean;
  canViewSummary: boolean;
} {
  const { permissions } = useAuth();

  return {
    canRead: permissions.includes(RPM_PERMISSIONS.BILLING_READ),
    canWrite: permissions.includes(RPM_PERMISSIONS.BILLING_WRITE),
    canViewSummary: permissions.includes(RPM_PERMISSIONS.BILLING_SUMMARY),
  };
}

/**
 * Check if user is in specific role
 * Note: This is a helper - prefer permission-based checks
 */
export function useHasRole(roleName: RpmRole): boolean {
  const { organization } = useAuth();
  return organization?.role === roleName;
}

/**
 * Check if user is a patient
 */
export function useIsPatient(): boolean {
  return useHasRole('PATIENT');
}

/**
 * Check if user is a caregiver
 */
export function useIsCaregiver(): boolean {
  return useHasRole('CAREGIVER');
}

/**
 * Check if user is clinical staff
 */
export function useIsClinicalStaff(): boolean {
  return useHasRole('CLINICAL_STAFF');
}

/**
 * Check if user is a physician
 */
export function useIsPhysician(): boolean {
  return useHasRole('PHYSICIAN');
}

/**
 * Check if user is admin (any admin role)
 */
export function useIsAdmin(): boolean {
  return useAnyPermission(
    RPM_PERMISSIONS.PROGRAM_CONFIGURE,
    RPM_PERMISSIONS.SYSTEM_USERS
  );
}

/**
 * Get permission scope for a module
 * Returns 'own' | 'linked' | 'assigned' | 'all' | null
 */
export function usePermissionScope(module: 'patients' | 'vitals' | 'alerts' | 'care_plans'): string | null {
  const { permissions } = useAuth();

  const scopeOrder = ['all', 'assigned', 'linked', 'own'];

  for (const scope of scopeOrder) {
    if (permissions.includes(`${module}:read:${scope}`)) {
      return scope;
    }
  }

  return null;
}

/**
 * Permission-based conditional rendering helper
 */
export function checkPermission(permissions: string[], required: string | string[]): boolean {
  if (Array.isArray(required)) {
    return required.some(perm => permissions.includes(perm));
  }
  return permissions.includes(required);
}

/**
 * Get user's highest permission level
 * Returns 'admin' | 'physician' | 'clinical' | 'caregiver' | 'patient' | 'none'
 */
export function useUserLevel(): 'admin' | 'physician' | 'clinical' | 'caregiver' | 'patient' | 'none' {
  const { permissions } = useAuth();

  if (permissions.includes(RPM_PERMISSIONS.SYSTEM_USERS) ||
      permissions.includes(RPM_PERMISSIONS.PROGRAM_CONFIGURE)) {
    return 'admin';
  }

  if (permissions.includes(RPM_PERMISSIONS.ORDERS_WRITE) ||
      permissions.includes(RPM_PERMISSIONS.CARE_PLANS_WRITE_ALL)) {
    return 'physician';
  }

  if (permissions.includes(RPM_PERMISSIONS.ALERTS_ACKNOWLEDGE) ||
      permissions.includes(RPM_PERMISSIONS.PATIENTS_READ_ASSIGNED)) {
    return 'clinical';
  }

  if (permissions.includes(RPM_PERMISSIONS.PATIENTS_READ_LINKED)) {
    return 'caregiver';
  }

  if (permissions.includes(RPM_PERMISSIONS.PATIENTS_READ_OWN)) {
    return 'patient';
  }

  return 'none';
}
