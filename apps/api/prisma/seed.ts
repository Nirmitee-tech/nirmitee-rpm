import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import seedRPM from './seed-rpm';

const prisma = new PrismaClient();

// All permissions for the system
const PERMISSIONS = [
  // Dashboard
  { code: 'dashboard:view', name: 'View Dashboard', module: 'dashboard', action: 'view', description: 'Access to dashboard and overview' },

  // Users
  { code: 'users:read', name: 'View Users', module: 'users', action: 'read', description: 'View user list and details' },
  { code: 'users:write', name: 'Create/Edit Users', module: 'users', action: 'write', description: 'Create and edit users' },
  { code: 'users:delete', name: 'Delete Users', module: 'users', action: 'delete', description: 'Remove users from organization' },
  { code: 'users:manage', name: 'Manage Users', module: 'users', action: 'manage', description: 'Full user management access' },

  // Teams
  { code: 'teams:read', name: 'View Teams', module: 'teams', action: 'read', description: 'View team list and details' },
  { code: 'teams:write', name: 'Create/Edit Teams', module: 'teams', action: 'write', description: 'Create and edit teams' },
  { code: 'teams:delete', name: 'Delete Teams', module: 'teams', action: 'delete', description: 'Delete teams' },
  { code: 'teams:manage', name: 'Manage Teams', module: 'teams', action: 'manage', description: 'Full team management access' },

  // Roles & Permissions
  { code: 'roles:read', name: 'View Roles', module: 'roles', action: 'read', description: 'View roles and permissions' },
  { code: 'roles:write', name: 'Create/Edit Roles', module: 'roles', action: 'write', description: 'Create and edit roles' },
  { code: 'roles:delete', name: 'Delete Roles', module: 'roles', action: 'delete', description: 'Delete custom roles' },
  { code: 'roles:manage', name: 'Manage Roles', module: 'roles', action: 'manage', description: 'Full role management access' },

  // Reports
  { code: 'reports:read', name: 'View Reports', module: 'reports', action: 'read', description: 'View reports' },
  { code: 'reports:write', name: 'Create Reports', module: 'reports', action: 'write', description: 'Create and export reports' },

  // Analytics
  { code: 'analytics:read', name: 'View Analytics', module: 'analytics', action: 'read', description: 'Access analytics dashboard' },

  // Security
  { code: 'security:read', name: 'View Security', module: 'security', action: 'read', description: 'View security settings and audit logs' },
  { code: 'security:manage', name: 'Manage Security', module: 'security', action: 'manage', description: 'Manage security settings' },

  // Settings
  { code: 'settings:read', name: 'View Settings', module: 'settings', action: 'read', description: 'View organization settings' },
  { code: 'settings:write', name: 'Edit Settings', module: 'settings', action: 'write', description: 'Edit organization settings' },

  // Organization
  { code: 'organization:read', name: 'View Organization', module: 'organization', action: 'read', description: 'View organization info' },
  { code: 'organization:write', name: 'Edit Organization', module: 'organization', action: 'write', description: 'Edit organization details' },
  { code: 'organization:manage', name: 'Manage Organization', module: 'organization', action: 'manage', description: 'Full organization management' },

  // RPM - Patients
  { code: 'patients:read', name: 'View Patients', module: 'patients', action: 'read', description: 'View patient list and details' },
  { code: 'patients:write', name: 'Create/Edit Patients', module: 'patients', action: 'write', description: 'Create and edit patient records' },
  { code: 'patients:delete', name: 'Delete Patients', module: 'patients', action: 'delete', description: 'Remove patient records' },
  { code: 'patients:manage', name: 'Manage Patients', module: 'patients', action: 'manage', description: 'Full patient management access' },

  // RPM - Vital Readings
  { code: 'vitals:read', name: 'View Vitals', module: 'vitals', action: 'read', description: 'View patient vital signs' },
  { code: 'vitals:write', name: 'Record Vitals', module: 'vitals', action: 'write', description: 'Record vital signs data' },

  // RPM - Alerts
  { code: 'alerts:read', name: 'View Alerts', module: 'alerts', action: 'read', description: 'View patient alerts' },
  { code: 'alerts:write', name: 'Manage Alerts', module: 'alerts', action: 'write', description: 'Acknowledge and resolve alerts' },
  { code: 'alerts:escalate', name: 'Escalate Alerts', module: 'alerts', action: 'escalate', description: 'Escalate alerts to physicians' },

  // RPM - Care Plans
  { code: 'careplans:read', name: 'View Care Plans', module: 'careplans', action: 'read', description: 'View patient care plans' },
  { code: 'careplans:write', name: 'Create/Edit Care Plans', module: 'careplans', action: 'write', description: 'Create and edit care plans' },
  { code: 'careplans:approve', name: 'Approve Care Plans', module: 'careplans', action: 'approve', description: 'Approve care plans (physician only)' },

  // RPM - Devices
  { code: 'devices:read', name: 'View Devices', module: 'devices', action: 'read', description: 'View medical devices' },
  { code: 'devices:write', name: 'Manage Devices', module: 'devices', action: 'write', description: 'Assign and manage devices' },

  // RPM - Billing
  { code: 'billing:read', name: 'View Billing', module: 'billing', action: 'read', description: 'View billing records' },
  { code: 'billing:write', name: 'Manage Billing', module: 'billing', action: 'write', description: 'Create and submit billing claims' },

  // RPM - Global permissions
  { code: 'rpm:read', name: 'RPM Read Access', module: 'rpm', action: 'read', description: 'Read access to RPM features' },
  { code: 'rpm:manage', name: 'RPM Full Management', module: 'rpm', action: 'manage', description: 'Full management access to all RPM features' },

  // Master Data
  { code: 'master-data:read', name: 'View Master Data', module: 'master-data', action: 'read', description: 'View master data records' },
  { code: 'master-data:write', name: 'Manage Master Data', module: 'master-data', action: 'write', description: 'Create and edit master data' },
];

// Default role templates with their permissions
const ROLE_TEMPLATES = {
  Owner: {
    description: 'Full access to all features',
    permissions: PERMISSIONS.map((p) => p.code), // All permissions
  },
  Admin: {
    description: 'Administrative access',
    permissions: [
      'dashboard:view',
      'users:read', 'users:write', 'users:manage',
      'teams:read', 'teams:write', 'teams:manage',
      'roles:read',
      'reports:read', 'reports:write',
      'analytics:read',
      'settings:read', 'settings:write',
      'organization:read',
    ],
  },
  Manager: {
    description: 'Team management access',
    permissions: [
      'dashboard:view',
      'users:read',
      'teams:read', 'teams:write',
      'reports:read',
      'analytics:read',
    ],
  },
  Member: {
    description: 'Standard member access',
    permissions: [
      'dashboard:view',
      'users:read',
      'teams:read',
      'reports:read',
    ],
  },
  Viewer: {
    description: 'Read-only access',
    permissions: ['dashboard:view'],
  },
};

async function seedPermissions() {
  console.log('Seeding permissions...');

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: perm,
      create: perm,
    });
  }

  console.log(`✓ Seeded ${PERMISSIONS.length} permissions`);
}

async function seedDemoOrganization() {
  console.log('Seeding demo organization...');

  // Create demo user
  const passwordHash = await bcrypt.hash('demo123456', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'User',
      emailVerified: true,
    },
  });

  // Create demo organization
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      settings: {
        theme: 'light',
        notifications: true,
      },
    },
  });

  // Create roles for the organization
  const permissions = await prisma.permission.findMany();
  const permissionMap = new Map(permissions.map((p) => [p.code, p.id]));

  for (const [roleName, roleData] of Object.entries(ROLE_TEMPLATES)) {
    const role = await prisma.role.upsert({
      where: {
        name_organizationId: {
          name: roleName,
          organizationId: demoOrg.id,
        },
      },
      update: { description: roleData.description },
      create: {
        name: roleName,
        description: roleData.description,
        organizationId: demoOrg.id,
        isSystem: roleName === 'Owner' || roleName === 'Admin' || roleName === 'Member' || roleName === 'Viewer',
      },
    });

    // Delete existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Create role permissions
    const rolePermissions = roleData.permissions
      .map((code) => permissionMap.get(code))
      .filter((id): id is string => !!id)
      .map((permissionId) => ({
        roleId: role.id,
        permissionId,
      }));

    await prisma.rolePermission.createMany({
      data: rolePermissions,
      skipDuplicates: true,
    });

    // Add demo user as owner
    if (roleName === 'Owner') {
      await prisma.organizationMember.upsert({
        where: {
          userId_organizationId: {
            userId: demoUser.id,
            organizationId: demoOrg.id,
          },
        },
        update: { roleId: role.id },
        create: {
          userId: demoUser.id,
          organizationId: demoOrg.id,
          roleId: role.id,
          status: 'ACTIVE',
        },
      });
    }
  }

  // Create demo teams
  const teams = [
    { name: 'Engineering', description: 'Core product development team' },
    { name: 'Design', description: 'UI/UX and brand design' },
    { name: 'Marketing', description: 'Growth and marketing initiatives' },
    { name: 'Sales', description: 'Sales and business development' },
  ];

  for (const teamData of teams) {
    await prisma.team.upsert({
      where: {
        name_organizationId: {
          name: teamData.name,
          organizationId: demoOrg.id,
        },
      },
      update: { description: teamData.description },
      create: {
        name: teamData.name,
        description: teamData.description,
        organizationId: demoOrg.id,
      },
    });
  }

  console.log('✓ Seeded demo organization with roles and teams');
  console.log(`  Demo login: demo@example.com / demo123456`);
}

async function main() {
  console.log('Starting database seed...\n');

  await seedPermissions();
  await seedDemoOrganization();

  // Seed RPM data if --rpm flag is passed
  if (process.argv.includes('--rpm')) {
    console.log('\n🏥 Seeding RPM data...');
    await seedRPM();
  }

  console.log('\n✓ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
