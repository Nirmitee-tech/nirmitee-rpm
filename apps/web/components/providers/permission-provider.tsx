/**
 * Permission Provider Component
 * Provides permission-based conditional rendering
 */

'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

interface PermissionGateProps {
  /**
   * Required permission(s) - user must have at least one
   */
  permission: string | string[];

  /**
   * Content to render if user has permission
   */
  children: ReactNode;

  /**
   * Optional fallback content if permission denied
   */
  fallback?: ReactNode;

  /**
   * If true, user must have ALL permissions (AND logic)
   * Default: false (OR logic)
   */
  requireAll?: boolean;
}

/**
 * PermissionGate Component
 * Conditionally renders children based on user permissions
 *
 * @example
 * <PermissionGate permission="patients:read:all">
 *   <PatientList />
 * </PermissionGate>
 *
 * @example Multiple permissions (OR)
 * <PermissionGate permission={["alerts:read:assigned", "alerts:read:all"]}>
 *   <AlertsDashboard />
 * </PermissionGate>
 *
 * @example Multiple permissions (AND)
 * <PermissionGate
 *   permission={["patients:read:all", "patients:write:all"]}
 *   requireAll
 * >
 *   <PatientEditor />
 * </PermissionGate>
 *
 * @example With fallback
 * <PermissionGate
 *   permission="billing:read"
 *   fallback={<p>You don't have access to billing</p>}
 * >
 *   <BillingDashboard />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
  requireAll = false,
}: PermissionGateProps) {
  const { permissions } = useAuth();

  const permissionArray = Array.isArray(permission) ? permission : [permission];

  const hasPermission = requireAll
    ? permissionArray.every((perm) => permissions.includes(perm))
    : permissionArray.some((perm) => permissions.includes(perm));

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

interface RoleGateProps {
  /**
   * Required role(s) - user must have matching role
   */
  role: string | string[];

  /**
   * Content to render if user has role
   */
  children: ReactNode;

  /**
   * Optional fallback content if role doesn't match
   */
  fallback?: ReactNode;
}

/**
 * RoleGate Component
 * Conditionally renders children based on user role
 * Note: Prefer PermissionGate for fine-grained access control
 *
 * @example
 * <RoleGate role="PHYSICIAN">
 *   <PhysicianDashboard />
 * </RoleGate>
 *
 * @example Multiple roles
 * <RoleGate role={["PHYSICIAN", "CLINICAL_STAFF"]}>
 *   <ClinicalTools />
 * </RoleGate>
 */
export function RoleGate({ role, children, fallback = null }: RoleGateProps) {
  const { organization } = useAuth();

  if (!organization?.role) {
    return <>{fallback}</>;
  }

  const roleArray = Array.isArray(role) ? role : [role];
  const hasRole = roleArray.includes(organization.role);

  return hasRole ? <>{children}</> : <>{fallback}</>;
}

interface FeatureGateProps {
  /**
   * Feature flag name
   */
  feature: string;

  /**
   * Content to render if feature enabled
   */
  children: ReactNode;

  /**
   * Optional fallback content if feature disabled
   */
  fallback?: ReactNode;
}

/**
 * FeatureGate Component
 * Conditionally renders children based on feature flags
 * TODO: Implement feature flag service
 *
 * @example
 * <FeatureGate feature="telehealth">
 *   <VideoConsultButton />
 * </FeatureGate>
 */
export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  // TODO: Implement feature flag checking
  // For now, return children (all features enabled)
  console.warn('FeatureGate not implemented yet:', feature);
  return <>{children}</>;
}

interface PermissionButtonProps {
  /**
   * Required permission(s) to enable button
   */
  permission: string | string[];

  /**
   * Button content
   */
  children: ReactNode;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * Additional className
   */
  className?: string;

  /**
   * If true, user must have ALL permissions
   */
  requireAll?: boolean;

  /**
   * Disabled state tooltip message
   */
  disabledTooltip?: string;
}

/**
 * PermissionButton Component
 * Button that's automatically disabled if user lacks permission
 *
 * @example
 * <PermissionButton
 *   permission="patients:write:all"
 *   onClick={handleCreate}
 * >
 *   Create Patient
 * </PermissionButton>
 */
export function PermissionButton({
  permission,
  children,
  onClick,
  className = '',
  requireAll = false,
  disabledTooltip = 'You don\'t have permission for this action',
}: PermissionButtonProps) {
  const { permissions } = useAuth();

  const permissionArray = Array.isArray(permission) ? permission : [permission];

  const hasPermission = requireAll
    ? permissionArray.every((perm) => permissions.includes(perm))
    : permissionArray.some((perm) => permissions.includes(perm));

  return (
    <button
      onClick={hasPermission ? onClick : undefined}
      disabled={!hasPermission}
      className={className}
      title={!hasPermission ? disabledTooltip : undefined}
    >
      {children}
    </button>
  );
}

interface ConditionalPermissionProps {
  /**
   * Condition to check
   */
  condition: boolean;

  /**
   * Required permission if condition is true
   */
  permission: string | string[];

  /**
   * Content to render
   */
  children: ReactNode;

  /**
   * Fallback content
   */
  fallback?: ReactNode;
}

/**
 * ConditionalPermission Component
 * Combines condition + permission check
 *
 * @example Show edit button only for assigned patients
 * <ConditionalPermission
 *   condition={isAssignedToMe}
 *   permission="patients:write:assigned"
 * >
 *   <EditButton />
 * </ConditionalPermission>
 */
export function ConditionalPermission({
  condition,
  permission,
  children,
  fallback = null,
}: ConditionalPermissionProps) {
  const { permissions } = useAuth();

  if (!condition) {
    return <>{fallback}</>;
  }

  const permissionArray = Array.isArray(permission) ? permission : [permission];
  const hasPermission = permissionArray.some((perm) => permissions.includes(perm));

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hook to check if component should render
 */
export function useCanRender(permission: string | string[]): boolean {
  const { permissions } = useAuth();
  const permissionArray = Array.isArray(permission) ? permission : [permission];
  return permissionArray.some((perm) => permissions.includes(perm));
}
