# RPM RBAC Implementation Guide

## Overview

This document describes the Role-Based Access Control (RBAC) system for NirmiteeRPM, specifically designed for Remote Patient Monitoring workflows.

## RPM User Roles

The system supports 9 distinct user roles with granular permissions:

1. **PATIENT** - Access own data only
2. **CAREGIVER** - Access linked patients with consent
3. **CLINICAL_STAFF** - Access assigned patients, triage alerts
4. **PHYSICIAN** - Clinical decisions, all patients in care team
5. **CARE_COORDINATOR** - Case management, care plans
6. **BILLING_STAFF** - CPT codes, claims, time tracking (requires MFA)
7. **PROGRAM_ADMIN** - Analytics, program configuration
8. **IT_ADMIN** - System management, integrations (requires MFA)
9. **ORG_ADMIN** - Full organization access (requires MFA)

## Permission Scopes

Permissions follow a hierarchical scope pattern:

- `:own` - User can only access their own data
- `:linked` - Can access data for explicitly linked users (caregiver consent)
- `:assigned` - Can access data for assigned patients/cases
- `:all` - Can access all data in the organization

## Seeding Permissions

To seed RPM permissions and roles:

```bash
cd apps/api
pnpm ts-node prisma/seed-rpm-permissions.ts
```

This creates:
- 50+ granular permissions across modules (patients, vitals, alerts, care_plans, billing, devices, etc.)
- 9 system roles with appropriate permission assignments
- MFA requirement flags for sensitive roles

## Backend Usage

### Protecting Routes with Middleware

```typescript
import { authenticate } from '../middleware/auth-middleware';
import { requirePermission, requirePatientAccess } from '../middleware/permission-middleware';

// Require specific permission
router.get(
  '/alerts',
  authenticate,
  requirePermission('alerts:read:assigned', 'alerts:read:all'),
  async (req, res) => {
    // Handler code
  }
);

// Require patient access validation
router.get(
  '/patients/:patientId',
  authenticate,
  requirePatientAccess('patientId'),
  async (req, res) => {
    // Handler code - access already validated
  }
);

// Require ALL permissions
router.post(
  '/care-plans',
  authenticate,
  requireAllPermissions('care_plans:write:all', 'patients:read:all'),
  async (req, res) => {
    // Handler code
  }
);
```

### Using Permission Service

```typescript
import { permissionService } from '../services/permission-service';

// Check permission
const canRead = await permissionService.hasPermission(
  userId,
  organizationId,
  'patients:read:all'
);

// Validate patient access
const hasAccess = await permissionService.validatePatientAccess(
  { userId, organizationId, permissions },
  patientId
);

// Check and log access attempt
const granted = await permissionService.checkAndLogAccess(
  context,
  'vitals:read:assigned',
  'vital_reading',
  vitalId
);
```

## Frontend Usage

### Using Permission Hooks

```tsx
import { usePermission, useCanReadPatients, useCanManageAlerts } from '@/lib/auth/permissions';

function PatientDashboard() {
  const canReadAll = usePermission('patients:read:all');
  const { canReadAssigned } = useCanReadPatients();
  const { canAcknowledge, canEscalate } = useCanManageAlerts();

  if (!canReadAll && !canReadAssigned) {
    return <AccessDenied />;
  }

  return (
    <div>
      {canAcknowledge && <AcknowledgeButton />}
      {canEscalate && <EscalateButton />}
    </div>
  );
}
```

### Using Permission Components

```tsx
import { PermissionGate, RoleGate } from '@/components/providers/permission-provider';

function AlertsDashboard() {
  return (
    <div>
      {/* Show only if user has permission */}
      <PermissionGate permission="alerts:read:all">
        <AllAlertsPanel />
      </PermissionGate>

      {/* Show for multiple permissions (OR logic) */}
      <PermissionGate permission={['alerts:read:assigned', 'alerts:read:all']}>
        <MyAlertsPanel />
      </PermissionGate>

      {/* Require ALL permissions (AND logic) */}
      <PermissionGate
        permission={['alerts:write:all', 'alerts:escalate']}
        requireAll
      >
        <EscalateButton />
      </PermissionGate>

      {/* With fallback */}
      <PermissionGate
        permission="billing:read"
        fallback={<p>Billing access required</p>}
      >
        <BillingDashboard />
      </PermissionGate>

      {/* Role-based (prefer permissions) */}
      <RoleGate role={['PHYSICIAN', 'CLINICAL_STAFF']}>
        <ClinicalTools />
      </RoleGate>
    </div>
  );
}
```

### Permission Constants

```typescript
import { RPM_PERMISSIONS } from '@/lib/auth/permissions';

// Use constants for type safety
const canCreate = usePermission(RPM_PERMISSIONS.PATIENTS_WRITE_ALL);
const canViewBilling = usePermission(RPM_PERMISSIONS.BILLING_READ);
```

## Permission Matrix

### Patient Module
- `patients:read:own` - View own profile
- `patients:read:linked` - View linked patients (caregiver)
- `patients:read:assigned` - View assigned patients (clinical staff)
- `patients:read:all` - View all patients (physicians, admins)
- `patients:write:own` - Update own profile
- `patients:write:assigned` - Update assigned patients
- `patients:write:all` - Update any patient
- `patients:manage` - Full patient management

### Vitals Module
- `vitals:read:own` - View own vitals
- `vitals:read:linked` - View linked patient vitals
- `vitals:read:assigned` - View assigned patient vitals
- `vitals:read:all` - View all vitals
- `vitals:write:own` - Record own vitals
- `vitals:write:linked` - Record vitals for linked patients
- `vitals:write:assigned` - Record vitals for assigned patients

### Alerts Module
- `alerts:read:own` - View own alerts
- `alerts:read:linked` - View linked patient alerts
- `alerts:read:assigned` - View assigned patient alerts
- `alerts:read:all` - View all alerts
- `alerts:write:assigned` - Manage assigned patient alerts
- `alerts:write:all` - Manage all alerts
- `alerts:acknowledge` - Acknowledge alerts (triage)
- `alerts:escalate` - Escalate to physicians

### Care Plans Module
- `care_plans:read:own` - View own care plan
- `care_plans:read:linked` - View linked patient care plans
- `care_plans:read:assigned` - View assigned patient care plans
- `care_plans:read:all` - View all care plans
- `care_plans:write:assigned` - Update assigned care plans
- `care_plans:write:all` - Update all care plans

### Billing Module
- `billing:read` - View billing data (billing staff)
- `billing:write` - Manage billing and claims
- `billing:summary` - View billing summary (physicians)

### Other Modules
- `devices:*` - Device management
- `messages:*` - Messaging
- `time_tracking:*` - Billable time tracking
- `orders:*` - Medical orders (physicians)
- `program:*` - Program configuration
- `system:*` - System administration

## MFA Requirements

Roles requiring MFA (enforced via middleware):
- PHYSICIAN
- BILLING_STAFF
- IT_ADMIN
- ORG_ADMIN

## Audit Logging

All permission checks and access attempts are logged to `audit_logs` table:

```typescript
{
  userId: string;
  organizationId: string;
  action: string; // e.g., "access.patients:read:all"
  entity: string; // e.g., "patient", "vital_reading"
  entityId: string;
  metadata: {
    granted: boolean;
    path?: string;
    method?: string;
  };
  createdAt: Date;
}
```

## Migration Notes

### From Generic RBAC to RPM RBAC

Existing organizations can migrate by:

1. Run seed script to create RPM permissions
2. Map existing roles to new RPM roles
3. Assign users to appropriate RPM roles
4. Test permission boundaries thoroughly

### Patient Assignment

The system references future tables:
- `StaffAssignment` - Links clinical staff to patients
- `CaregiverLink` - Links caregivers to patients with consent

These tables need to be created for full patient-scoped access control.

## Security Considerations

1. **Organization Isolation**: All permission checks include `organizationId` validation
2. **Audit Logging**: All access attempts logged for HIPAA compliance
3. **MFA Enforcement**: Sensitive roles require multi-factor authentication
4. **Least Privilege**: Roles granted minimum permissions needed
5. **Scope Validation**: Patient-scoped access validated via assignments/consent

## Future Enhancements

- [ ] Implement StaffAssignment table for clinical staff assignments
- [ ] Implement CaregiverLink table for caregiver consent management
- [ ] Add MFA verification in `requireMFA()` middleware
- [ ] Add FeatureGate implementation with feature flags
- [ ] Add custom role creation UI for org admins
- [ ] Add permission inheritance for role hierarchies
- [ ] Add time-based access restrictions (e.g., business hours only)
