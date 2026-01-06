/**
 * RPM Permission Seeding
 * Seeds RPM-specific permissions and role assignments
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// RPM Permission Definitions
export const RPM_PERMISSIONS = [
  // Patients module
  { code: 'patients:read:own', name: 'View Own Patient Data', module: 'patients', action: 'read', description: 'Patient can view their own data' },
  { code: 'patients:read:linked', name: 'View Linked Patients', module: 'patients', action: 'read', description: 'Caregiver can view linked patients with consent' },
  { code: 'patients:read:assigned', name: 'View Assigned Patients', module: 'patients', action: 'read', description: 'Clinical staff can view assigned patients' },
  { code: 'patients:read:all', name: 'View All Patients', module: 'patients', action: 'read', description: 'View all patients in organization' },
  { code: 'patients:write:own', name: 'Update Own Patient Profile', module: 'patients', action: 'write', description: 'Patient can update limited profile fields' },
  { code: 'patients:write:assigned', name: 'Update Assigned Patients', module: 'patients', action: 'write', description: 'Update assigned patient records' },
  { code: 'patients:write:all', name: 'Update All Patients', module: 'patients', action: 'write', description: 'Update any patient record' },
  { code: 'patients:manage', name: 'Manage Patients', module: 'patients', action: 'manage', description: 'Full patient management including enrollment' },

  // Vitals module
  { code: 'vitals:read:own', name: 'View Own Vitals', module: 'vitals', action: 'read', description: 'View own vital signs' },
  { code: 'vitals:read:linked', name: 'View Linked Patient Vitals', module: 'vitals', action: 'read', description: 'View vitals for linked patients' },
  { code: 'vitals:read:assigned', name: 'View Assigned Patient Vitals', module: 'vitals', action: 'read', description: 'View vitals for assigned patients' },
  { code: 'vitals:read:all', name: 'View All Patient Vitals', module: 'vitals', action: 'read', description: 'View all patient vitals' },
  { code: 'vitals:write:own', name: 'Record Own Vitals', module: 'vitals', action: 'write', description: 'Submit own vital readings' },
  { code: 'vitals:write:linked', name: 'Record Linked Patient Vitals', module: 'vitals', action: 'write', description: 'Submit vitals on behalf of linked patients' },
  { code: 'vitals:write:assigned', name: 'Record Assigned Patient Vitals', module: 'vitals', action: 'write', description: 'Record vitals for assigned patients' },

  // Alerts module
  { code: 'alerts:read:own', name: 'View Own Alerts', module: 'alerts', action: 'read', description: 'View own alerts' },
  { code: 'alerts:read:linked', name: 'View Linked Patient Alerts', module: 'alerts', action: 'read', description: 'View alerts for linked patients' },
  { code: 'alerts:read:assigned', name: 'View Assigned Patient Alerts', module: 'alerts', action: 'read', description: 'View alerts for assigned patients' },
  { code: 'alerts:read:all', name: 'View All Alerts', module: 'alerts', action: 'read', description: 'View all alerts in organization' },
  { code: 'alerts:write:assigned', name: 'Manage Assigned Patient Alerts', module: 'alerts', action: 'write', description: 'Acknowledge and resolve alerts for assigned patients' },
  { code: 'alerts:write:all', name: 'Manage All Alerts', module: 'alerts', action: 'write', description: 'Manage all alerts' },
  { code: 'alerts:acknowledge', name: 'Acknowledge Alerts', module: 'alerts', action: 'acknowledge', description: 'Acknowledge alerts for triage' },
  { code: 'alerts:escalate', name: 'Escalate Alerts', module: 'alerts', action: 'escalate', description: 'Escalate alerts to physicians' },

  // Care Plans module
  { code: 'care_plans:read:own', name: 'View Own Care Plan', module: 'care_plans', action: 'read', description: 'View own care plan' },
  { code: 'care_plans:read:linked', name: 'View Linked Patient Care Plans', module: 'care_plans', action: 'read', description: 'View care plans for linked patients' },
  { code: 'care_plans:read:assigned', name: 'View Assigned Patient Care Plans', module: 'care_plans', action: 'read', description: 'View care plans for assigned patients' },
  { code: 'care_plans:read:all', name: 'View All Care Plans', module: 'care_plans', action: 'read', description: 'View all care plans' },
  { code: 'care_plans:write:assigned', name: 'Update Assigned Patient Care Plans', module: 'care_plans', action: 'write', description: 'Update care plans for assigned patients' },
  { code: 'care_plans:write:all', name: 'Update All Care Plans', module: 'care_plans', action: 'write', description: 'Create and modify all care plans' },

  // Billing module
  { code: 'billing:read', name: 'View Billing Data', module: 'billing', action: 'read', description: 'View billing records and claims' },
  { code: 'billing:write', name: 'Manage Billing', module: 'billing', action: 'write', description: 'Create and submit billing claims' },
  { code: 'billing:summary', name: 'View Billing Summary', module: 'billing', action: 'read', description: 'View billing summary (physician)' },

  // Devices module
  { code: 'devices:read:own', name: 'View Own Devices', module: 'devices', action: 'read', description: 'View own device assignments' },
  { code: 'devices:read:assigned', name: 'View Assigned Patient Devices', module: 'devices', action: 'read', description: 'View devices for assigned patients' },
  { code: 'devices:read:all', name: 'View All Devices', module: 'devices', action: 'read', description: 'View all device inventory' },
  { code: 'devices:write:assigned', name: 'Manage Assigned Patient Devices', module: 'devices', action: 'write', description: 'Order/configure devices for assigned patients' },
  { code: 'devices:manage', name: 'Manage Device Inventory', module: 'devices', action: 'manage', description: 'Full device inventory management' },

  // Messages module
  { code: 'messages:read:own', name: 'View Own Messages', module: 'messages', action: 'read', description: 'View own messages' },
  { code: 'messages:read:assigned', name: 'View Assigned Patient Messages', module: 'messages', action: 'read', description: 'View messages for assigned patients' },
  { code: 'messages:write', name: 'Send Messages', module: 'messages', action: 'write', description: 'Send messages to care team/patients' },

  // Time Tracking module
  { code: 'time_tracking:write', name: 'Log Billable Time', module: 'time_tracking', action: 'write', description: 'Log billable interaction time' },
  { code: 'time_tracking:read', name: 'View Time Logs', module: 'time_tracking', action: 'read', description: 'View time tracking logs' },

  // Orders module
  { code: 'orders:write', name: 'Create Medical Orders', module: 'orders', action: 'write', description: 'Create treatment orders and prescriptions' },
  { code: 'orders:read', name: 'View Medical Orders', module: 'orders', action: 'read', description: 'View treatment orders' },

  // Program Admin module
  { code: 'program:configure', name: 'Configure Program Settings', module: 'program', action: 'configure', description: 'Configure RPM program workflows and thresholds' },
  { code: 'program:analytics', name: 'View Program Analytics', module: 'program', action: 'read', description: 'View program-wide analytics and reports' },

  // System Admin module
  { code: 'system:users', name: 'Manage System Users', module: 'system', action: 'manage', description: 'User provisioning and management' },
  { code: 'system:integrations', name: 'Manage Integrations', module: 'system', action: 'manage', description: 'EHR and device integrations' },
  { code: 'system:audit', name: 'View Audit Logs', module: 'system', action: 'read', description: 'Access system audit logs' },
];

// RPM Role Definitions with MFA requirements
export const RPM_ROLES = [
  {
    name: 'PATIENT',
    description: 'Patient with access to own data only',
    requiresMFA: false,
    permissions: [
      'patients:read:own',
      'vitals:write:own',
      'vitals:read:own',
      'alerts:read:own',
      'care_plans:read:own',
      'devices:read:own',
      'messages:read:own',
      'messages:write',
    ],
  },
  {
    name: 'CAREGIVER',
    description: 'Family member or caregiver with consent-based access to linked patients',
    requiresMFA: false,
    permissions: [
      'patients:read:linked',
      'vitals:read:linked',
      'vitals:write:linked',
      'alerts:read:linked',
      'care_plans:read:linked',
      'messages:read:own',
      'messages:write',
    ],
  },
  {
    name: 'CLINICAL_STAFF',
    description: 'RNs, LPNs, MAs - triage alerts and patient contact',
    requiresMFA: false,
    permissions: [
      'patients:read:assigned',
      'patients:write:assigned',
      'vitals:read:assigned',
      'vitals:write:assigned',
      'alerts:read:assigned',
      'alerts:write:assigned',
      'alerts:acknowledge',
      'care_plans:read:assigned',
      'devices:read:assigned',
      'devices:write:assigned',
      'messages:read:assigned',
      'messages:write',
      'time_tracking:write',
    ],
  },
  {
    name: 'PHYSICIAN',
    description: 'MDs, DOs, NPs, PAs - clinical decisions and supervision',
    requiresMFA: true,
    permissions: [
      'patients:read:all',
      'patients:write:all',
      'vitals:read:all',
      'alerts:read:all',
      'alerts:write:all',
      'alerts:escalate',
      'care_plans:read:all',
      'care_plans:write:all',
      'devices:read:all',
      'orders:write',
      'orders:read',
      'messages:read:assigned',
      'messages:write',
      'time_tracking:write',
      'billing:summary',
    ],
  },
  {
    name: 'CARE_COORDINATOR',
    description: 'Case managers - complex care coordination',
    requiresMFA: false,
    permissions: [
      'patients:read:assigned',
      'patients:write:assigned',
      'vitals:read:assigned',
      'alerts:read:assigned',
      'care_plans:read:all',
      'care_plans:write:assigned',
      'devices:read:assigned',
      'messages:read:assigned',
      'messages:write',
      'orders:read',
    ],
  },
  {
    name: 'BILLING_STAFF',
    description: 'Billing specialists and revenue cycle staff',
    requiresMFA: true,
    permissions: [
      'billing:read',
      'billing:write',
      'time_tracking:read',
    ],
  },
  {
    name: 'PROGRAM_ADMIN',
    description: 'Clinical program managers and operations leaders',
    requiresMFA: false,
    permissions: [
      'patients:read:all',
      'program:configure',
      'program:analytics',
      'alerts:read:all',
      'billing:read',
      'system:audit',
    ],
  },
  {
    name: 'IT_ADMIN',
    description: 'System administrators and security engineers',
    requiresMFA: true,
    permissions: [
      'system:users',
      'system:integrations',
      'system:audit',
      'program:configure',
    ],
  },
  {
    name: 'ORG_ADMIN',
    description: 'Full organization administrative access',
    requiresMFA: true,
    permissions: [
      // All permissions
      ...RPM_PERMISSIONS.map(p => p.code),
    ],
  },
];

/**
 * Seed RPM permissions and roles
 * Can be run multiple times (upsert behavior)
 */
export async function seedRpmPermissions(organizationId?: string) {
  console.log('🌱 Seeding RPM permissions...');

  // 1. Create/Update Permissions
  const permissionMap = new Map<string, string>();

  for (const perm of RPM_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        description: perm.description,
        module: perm.module,
        action: perm.action,
      },
      create: {
        code: perm.code,
        name: perm.name,
        description: perm.description,
        module: perm.module,
        action: perm.action,
      },
    });
    permissionMap.set(perm.code, permission.id);
  }

  console.log(`✓ Created/updated ${RPM_PERMISSIONS.length} permissions`);

  // 2. Create/Update Roles (system roles or org-specific)
  for (const roleData of RPM_ROLES) {
    const role = await prisma.role.upsert({
      where: {
        name_organizationId: {
          name: roleData.name,
          organizationId: organizationId || null,
        },
      },
      update: {
        description: roleData.description,
      },
      create: {
        name: roleData.name,
        description: roleData.description,
        organizationId: organizationId || null,
        isSystem: !organizationId, // System role if no org specified
      },
    });

    // 3. Assign permissions to role
    // First, remove existing permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Then add new permissions
    const rolePermissions = roleData.permissions
      .map(code => permissionMap.get(code))
      .filter(Boolean) as string[];

    await prisma.rolePermission.createMany({
      data: rolePermissions.map(permissionId => ({
        roleId: role.id,
        permissionId,
      })),
    });

    console.log(`✓ Role ${roleData.name}: ${rolePermissions.length} permissions`);
  }

  console.log('✅ RPM permissions seeded successfully');
}

/**
 * Main seed function
 */
async function main() {
  try {
    await seedRpmPermissions();
  } catch (error) {
    console.error('❌ Error seeding RPM permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
