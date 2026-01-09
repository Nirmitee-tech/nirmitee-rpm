import { prisma } from '../src/utils/prisma';
import * as bcrypt from 'bcryptjs';

async function createTestUsers() {
  const orgId = 'cmk2q9vzc0002fd8o3uh7zzrt'; // nirmitee.io
  const passwordHash = await bcrypt.hash('test123', 10);

  // Get Admin and Member roles for this org
  const adminRole = await prisma.role.findFirst({
    where: { organizationId: orgId, name: 'Admin' },
  });
  const memberRole = await prisma.role.findFirst({
    where: { organizationId: orgId, name: 'Member' },
  });

  if (!adminRole || !memberRole) {
    console.error('Could not find Admin or Member roles for org:', orgId);
    return;
  }

  // Create provider user
  const provider = await prisma.user.upsert({
    where: { email: 'provider@nirmitee.io' },
    update: { passwordHash },
    create: {
      email: 'provider@nirmitee.io',
      firstName: 'Dr. Test',
      lastName: 'Provider',
      passwordHash,
      emailVerified: true,
      isActive: true,
    },
  });

  // Add provider to organization as Admin
  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        organizationId: orgId,
        userId: provider.id,
      },
    },
    update: {},
    create: {
      organizationId: orgId,
      userId: provider.id,
      roleId: adminRole.id,
    },
  });

  // Create patient user
  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@nirmitee.io' },
    update: { passwordHash },
    create: {
      email: 'patient@nirmitee.io',
      firstName: 'Test',
      lastName: 'Patient',
      passwordHash,
      emailVerified: true,
      isActive: true,
    },
  });

  // Add patient user to organization as Member
  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        organizationId: orgId,
        userId: patientUser.id,
      },
    },
    update: {},
    create: {
      organizationId: orgId,
      userId: patientUser.id,
      roleId: memberRole.id,
    },
  });

  // Check if patient record exists for this user
  const existingPatient = await prisma.patient.findUnique({
    where: { userId: patientUser.id },
  });

  let patient;
  if (existingPatient) {
    patient = existingPatient;
  } else {
    // Create patient record
    patient = await prisma.patient.create({
      data: {
        organizationId: orgId,
        userId: patientUser.id,
        dateOfBirth: new Date('1980-01-15'),
        phone: '+1234567890',
        enrollmentStatus: 'ACTIVE',
      },
    });
  }

  console.log('');
  console.log('✅ Created test users in nirmitee.io:');
  console.log('');
  console.log('   Provider: provider@nirmitee.io / test123');
  console.log('   Patient:  patient@nirmitee.io / test123');
  console.log('');
  console.log('   Patient ID:', patient.id);
  console.log('');

  await prisma.$disconnect();
}

createTestUsers().catch(console.error);
