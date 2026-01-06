/**
 * RPM Seed Data
 * Seeds database with sample patients, devices, vital readings, and care plans
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRPM() {
  console.log('🏥 Starting RPM data seeding...');

  try {
    // Check if organization exists (use demo-org from main seed)
    const org = await prisma.organization.findFirst({
      where: { slug: 'demo-org' },
    });

    if (!org) {
      console.error('❌ Organization not found. Run main seed first: pnpm db:seed');
      return;
    }

    console.log(`✓ Using organization: ${org.name}`);

    // Find or create physician user
    let physicianUser = await prisma.user.findFirst({
      where: { email: 'physician@clinic.com' },
    });

    if (!physicianUser) {
      physicianUser = await prisma.user.create({
        data: {
          email: 'physician@clinic.com',
          firstName: 'Dr. Sarah',
          lastName: 'Johnson',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', // bcrypt hash
          emailVerified: true,
          isActive: true,
        },
      });
      console.log('✓ Created physician user');
    }

    // Find or create clinical staff user
    let clinicalStaff = await prisma.user.findFirst({
      where: { email: 'nurse@clinic.com' },
    });

    if (!clinicalStaff) {
      clinicalStaff = await prisma.user.create({
        data: {
          email: 'nurse@clinic.com',
          firstName: 'Emily',
          lastName: 'Chen',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
          emailVerified: true,
          isActive: true,
        },
      });
      console.log('✓ Created clinical staff user');
    }

    // Create patient users
    const patientUsers = await Promise.all([
      prisma.user.upsert({
        where: { email: 'john.smith@patient.com' },
        update: {},
        create: {
          email: 'john.smith@patient.com',
          firstName: 'John',
          lastName: 'Smith',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
          emailVerified: true,
          isActive: true,
        },
      }),
      prisma.user.upsert({
        where: { email: 'mary.wilson@patient.com' },
        update: {},
        create: {
          email: 'mary.wilson@patient.com',
          firstName: 'Mary',
          lastName: 'Wilson',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
          emailVerified: true,
          isActive: true,
        },
      }),
    ]);

    console.log(`✓ Created ${patientUsers.length} patient users`);

    // Create patients
    const patients = await Promise.all([
      prisma.patient.upsert({
        where: { userId: patientUsers[0].id },
        update: {},
        create: {
          userId: patientUsers[0].id,
          organizationId: org.id,
          dateOfBirth: new Date('1955-03-15'),
          phone: '+1-555-0101',
          address: {
            street: '123 Main St',
            city: 'Boston',
            state: 'MA',
            zip: '02101',
            country: 'USA',
          },
          conditions: ['HYPERTENSION', 'DIABETES_TYPE_2'],
          insuranceProvider: 'Medicare',
          insurancePolicyNumber: 'MED-123456',
          enrollmentStatus: 'ACTIVE',
          enrollmentDate: new Date('2026-01-01'),
          primaryPhysicianId: physicianUser.id,
          assignedClinicalStaffId: clinicalStaff.id,
        },
      }),
      prisma.patient.upsert({
        where: { userId: patientUsers[1].id },
        update: {},
        create: {
          userId: patientUsers[1].id,
          organizationId: org.id,
          dateOfBirth: new Date('1962-08-22'),
          phone: '+1-555-0102',
          address: {
            street: '456 Oak Ave',
            city: 'Cambridge',
            state: 'MA',
            zip: '02139',
            country: 'USA',
          },
          conditions: ['CONGESTIVE_HEART_FAILURE', 'COPD'],
          insuranceProvider: 'Blue Cross',
          insurancePolicyNumber: 'BC-987654',
          enrollmentStatus: 'ACTIVE',
          enrollmentDate: new Date('2026-01-02'),
          primaryPhysicianId: physicianUser.id,
          assignedClinicalStaffId: clinicalStaff.id,
        },
      }),
    ]);

    console.log(`✓ Created ${patients.length} patients`);

    // Create caregiver
    const caregiverUser = await prisma.user.upsert({
      where: { email: 'caregiver@family.com' },
      update: {},
      create: {
        email: 'caregiver@family.com',
        firstName: 'Robert',
        lastName: 'Smith',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        emailVerified: true,
        isActive: true,
      },
    });

    const caregiver = await prisma.caregiver.upsert({
      where: { userId: caregiverUser.id },
      update: {},
      create: {
        userId: caregiverUser.id,
        organizationId: org.id,
        phone: '+1-555-0103',
        relationship: 'Son',
      },
    });

    // Link caregiver to patient
    await prisma.caregiverLink.upsert({
      where: {
        patientId_caregiverId: {
          patientId: patients[0].id,
          caregiverId: caregiver.id,
        },
      },
      update: {},
      create: {
        patientId: patients[0].id,
        caregiverId: caregiver.id,
        organizationId: org.id,
        relationshipType: 'ADULT_CHILD',
        accessLevel: 'FULL_ACCESS',
        status: 'ACTIVE',
        consentGrantedAt: new Date(),
      },
    });

    console.log('✓ Created caregiver and linked to patient');

    // Create devices for patients
    const devices = await Promise.all([
      prisma.device.create({
        data: {
          patientId: patients[0].id,
          organizationId: org.id,
          type: 'BLOOD_PRESSURE_MONITOR',
          serialNumber: 'BP-SN-001234',
          manufacturer: 'Omron',
          model: 'BP7250',
          status: 'ACTIVE',
          lastSyncAt: new Date(),
        },
      }),
      prisma.device.create({
        data: {
          patientId: patients[0].id,
          organizationId: org.id,
          type: 'GLUCOSE_MONITOR',
          serialNumber: 'GM-SN-005678',
          manufacturer: 'Accu-Chek',
          model: 'Guide',
          status: 'ACTIVE',
          lastSyncAt: new Date(),
        },
      }),
      prisma.device.create({
        data: {
          patientId: patients[1].id,
          organizationId: org.id,
          type: 'PULSE_OXIMETER',
          serialNumber: 'OX-SN-009876',
          manufacturer: 'Nonin',
          model: '3230',
          status: 'ACTIVE',
          lastSyncAt: new Date(),
        },
      }),
      prisma.device.create({
        data: {
          patientId: patients[1].id,
          organizationId: org.id,
          type: 'WEIGHT_SCALE',
          serialNumber: 'WS-SN-054321',
          manufacturer: 'Withings',
          model: 'Body+',
          status: 'ACTIVE',
          lastSyncAt: new Date(),
        },
      }),
    ]);

    console.log(`✓ Created ${devices.length} devices`);

    // Create vital readings (last 7 days)
    const vitalReadings = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(8, 0, 0, 0);

      // Blood pressure for patient 1
      vitalReadings.push(
        prisma.vitalReading.create({
          data: {
            patientId: patients[0].id,
            organizationId: org.id,
            deviceId: devices[0].id,
            type: 'BLOOD_PRESSURE',
            values: {
              systolic: 130 + Math.floor(Math.random() * 20),
              diastolic: 80 + Math.floor(Math.random() * 10),
              pulse: 70 + Math.floor(Math.random() * 15),
            },
            unit: 'mmHg',
            source: 'DEVICE',
            recordedAt: date,
          },
        })
      );

      // Glucose for patient 1
      vitalReadings.push(
        prisma.vitalReading.create({
          data: {
            patientId: patients[0].id,
            organizationId: org.id,
            deviceId: devices[1].id,
            type: 'BLOOD_GLUCOSE',
            values: {
              glucose: 100 + Math.floor(Math.random() * 40),
            },
            unit: 'mg/dL',
            source: 'DEVICE',
            recordedAt: date,
          },
        })
      );

      // SpO2 for patient 2
      vitalReadings.push(
        prisma.vitalReading.create({
          data: {
            patientId: patients[1].id,
            organizationId: org.id,
            deviceId: devices[2].id,
            type: 'PULSE_OXIMETRY',
            values: {
              spo2: 92 + Math.floor(Math.random() * 6),
              pulse: 75 + Math.floor(Math.random() * 15),
            },
            unit: '%',
            source: 'DEVICE',
            recordedAt: date,
          },
        })
      );

      // Weight for patient 2
      vitalReadings.push(
        prisma.vitalReading.create({
          data: {
            patientId: patients[1].id,
            organizationId: org.id,
            deviceId: devices[3].id,
            type: 'WEIGHT',
            values: {
              weight: 180 + Math.floor(Math.random() * 5),
            },
            unit: 'lbs',
            source: 'DEVICE',
            recordedAt: date,
          },
        })
      );
    }

    await Promise.all(vitalReadings);
    console.log(`✓ Created ${vitalReadings.length} vital readings`);

    // Create alerts
    const alerts = await Promise.all([
      prisma.alert.create({
        data: {
          patientId: patients[0].id,
          organizationId: org.id,
          type: 'THRESHOLD_EXCEEDED',
          severity: 'SIGNIFICANT',
          status: 'ACKNOWLEDGED',
          message: 'Blood pressure reading elevated: 148/92',
          metadata: { systolic: 148, diastolic: 92 },
          assignedToId: clinicalStaff.id,
          acknowledgedAt: new Date(),
          acknowledgedById: clinicalStaff.id,
        },
      }),
      prisma.alert.create({
        data: {
          patientId: patients[1].id,
          organizationId: org.id,
          type: 'CRITICAL_VALUE',
          severity: 'CRITICAL',
          status: 'ESCALATED',
          message: 'Low oxygen saturation: 89%',
          metadata: { spo2: 89 },
          assignedToId: clinicalStaff.id,
          escalatedToId: physicianUser.id,
          acknowledgedAt: new Date(),
          acknowledgedById: clinicalStaff.id,
          escalatedAt: new Date(),
        },
      }),
    ]);

    console.log(`✓ Created ${alerts.length} alerts`);

    // Create care plans
    const carePlans = await Promise.all([
      prisma.carePlan.create({
        data: {
          patientId: patients[0].id,
          organizationId: org.id,
          createdById: clinicalStaff.id,
          approvedById: physicianUser.id,
          currentVersion: 1,
          status: 'ACTIVE',
          activatedAt: new Date(),
          versions: {
            create: {
              organizationId: org.id,
              version: 1,
              goals: [
                {
                  id: 'goal1',
                  description: 'Maintain blood pressure below 140/90',
                  targetDate: '2026-06-01',
                },
                {
                  id: 'goal2',
                  description: 'Achieve HbA1c below 7.0%',
                  targetDate: '2026-06-01',
                },
              ],
              vitalThresholds: {
                BLOOD_PRESSURE: {
                  systolic: { min: 90, max: 140, critical: 160 },
                  diastolic: { min: 60, max: 90, critical: 100 },
                },
                BLOOD_GLUCOSE: {
                  glucose: { min: 70, max: 180, critical: 250 },
                },
              },
              medications: [
                { name: 'Lisinopril', dosage: '10mg', frequency: 'Daily' },
                { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
              ],
              instructions: 'Monitor BP and glucose daily. Report readings outside thresholds.',
              effectiveDate: new Date('2026-01-01'),
            },
          },
        },
      }),
      prisma.carePlan.create({
        data: {
          patientId: patients[1].id,
          organizationId: org.id,
          createdById: clinicalStaff.id,
          approvedById: physicianUser.id,
          currentVersion: 1,
          status: 'ACTIVE',
          activatedAt: new Date(),
          versions: {
            create: {
              organizationId: org.id,
              version: 1,
              goals: [
                {
                  id: 'goal1',
                  description: 'Maintain SpO2 above 92%',
                  targetDate: '2026-06-01',
                },
                {
                  id: 'goal2',
                  description: 'Reduce shortness of breath episodes',
                  targetDate: '2026-06-01',
                },
              ],
              vitalThresholds: {
                PULSE_OXIMETRY: {
                  spo2: { min: 92, critical: 88 },
                },
                WEIGHT: {
                  weight: { max: 190, critical: 195 },
                },
              },
              medications: [
                { name: 'Furosemide', dosage: '40mg', frequency: 'Daily' },
                { name: 'Carvedilol', dosage: '12.5mg', frequency: 'Twice daily' },
              ],
              instructions: 'Monitor weight and oxygen daily. Call if SOB worsens.',
              effectiveDate: new Date('2026-01-02'),
            },
          },
        },
      }),
    ]);

    console.log(`✓ Created ${carePlans.length} care plans`);

    // Create billing records
    const billingRecords = await Promise.all([
      prisma.billingRecord.create({
        data: {
          patientId: patients[0].id,
          organizationId: org.id,
          periodStart: new Date('2026-01-01'),
          periodEnd: new Date('2026-01-31'),
          dataTransmissionDays: 20,
          interactionMinutes: 25,
          status: 'ELIGIBLE',
          activities: {
            create: [
              {
                organizationId: org.id,
                cptCode: 'CPT_99453',
                performedById: clinicalStaff.id,
                performedAt: new Date('2026-01-01'),
                durationMinutes: 30,
                description: 'Initial device setup and patient education',
              },
              {
                organizationId: org.id,
                cptCode: 'CPT_99454',
                performedById: clinicalStaff.id,
                performedAt: new Date('2026-01-31'),
                description: '20 days of data transmission',
              },
              {
                organizationId: org.id,
                cptCode: 'CPT_99457',
                performedById: physicianUser.id,
                performedAt: new Date('2026-01-15'),
                durationMinutes: 25,
                description: 'Monthly care management interaction',
              },
            ],
          },
        },
      }),
    ]);

    console.log(`✓ Created ${billingRecords.length} billing records`);

    console.log('✅ RPM data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding RPM data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedRPM()
    .then(() => {
      console.log('🎉 RPM seeding finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 RPM seeding failed:', error);
      process.exit(1);
    });
}

export default seedRPM;
