/**
 * Comprehensive RPM Demo Data Seeder
 * Creates 25 diverse patients with various use cases for demo purposes
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to generate random date in range
const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Helper to get date N days ago
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

async function seedComprehensive() {
  console.log('🏥 Starting comprehensive RPM data seeding...\n');

  try {
    // Get organization - use nirmitee.io org or fall back to first available
    let org = await prisma.organization.findFirst({
      where: { name: 'nirmitee.io' },
    });

    if (!org) {
      org = await prisma.organization.findFirst({
        where: { slug: 'demo-org' },
      });
    }

    if (!org) {
      console.error('❌ Organization not found. Run main seed first: pnpm db:seed');
      return;
    }

    console.log(`Using organization: ${org.name}\n`);

    // ========================================
    // 1. SEED MASTER DATA
    // ========================================
    console.log('📦 Seeding Master Data...');

    // Medical Conditions
    const conditions = [
      { code: 'HTN', name: 'Hypertension', category: 'Cardiovascular', icdCode: 'I10' },
      { code: 'DM2', name: 'Type 2 Diabetes', category: 'Endocrine', icdCode: 'E11.9' },
      { code: 'CHF', name: 'Congestive Heart Failure', category: 'Cardiovascular', icdCode: 'I50.9' },
      { code: 'COPD', name: 'Chronic Obstructive Pulmonary Disease', category: 'Respiratory', icdCode: 'J44.9' },
      { code: 'CKD', name: 'Chronic Kidney Disease', category: 'Renal', icdCode: 'N18.9' },
      { code: 'AFib', name: 'Atrial Fibrillation', category: 'Cardiovascular', icdCode: 'I48.91' },
      { code: 'OBESITY', name: 'Obesity', category: 'Metabolic', icdCode: 'E66.9' },
      { code: 'ASTHMA', name: 'Asthma', category: 'Respiratory', icdCode: 'J45.909' },
      { code: 'CAD', name: 'Coronary Artery Disease', category: 'Cardiovascular', icdCode: 'I25.10' },
      { code: 'OSA', name: 'Obstructive Sleep Apnea', category: 'Sleep', icdCode: 'G47.33' },
    ];

    for (const condition of conditions) {
      await prisma.medicalCondition.upsert({
        where: { organizationId_code: { organizationId: org.id, code: condition.code } },
        update: condition,
        create: { ...condition, organizationId: org.id, sortOrder: conditions.indexOf(condition) },
      });
    }
    console.log(`  ✓ Created ${conditions.length} medical conditions`);

    // Insurance Providers
    const insurers = [
      { code: 'MEDICARE', name: 'Medicare', payerId: 'CMS', phone: '1-800-633-4227' },
      { code: 'BCBS', name: 'Blue Cross Blue Shield', payerId: 'BCBS001', phone: '1-800-262-2583' },
      { code: 'AETNA', name: 'Aetna', payerId: 'AETNA01', phone: '1-800-872-3862' },
      { code: 'UNITED', name: 'UnitedHealthcare', payerId: 'UHC001', phone: '1-800-328-5979' },
      { code: 'CIGNA', name: 'Cigna', payerId: 'CIGNA01', phone: '1-800-997-1654' },
      { code: 'HUMANA', name: 'Humana', payerId: 'HUM001', phone: '1-800-457-4708' },
      { code: 'KAISER', name: 'Kaiser Permanente', payerId: 'KP001', phone: '1-800-464-4000' },
      { code: 'MEDICAID', name: 'Medicaid', payerId: 'MCAID', phone: '1-800-633-4227' },
    ];

    for (const insurer of insurers) {
      await prisma.insuranceProvider.upsert({
        where: { organizationId_code: { organizationId: org.id, code: insurer.code } },
        update: insurer,
        create: { ...insurer, organizationId: org.id, sortOrder: insurers.indexOf(insurer) },
      });
    }
    console.log(`  ✓ Created ${insurers.length} insurance providers`);

    // Fetch the actual insurance provider records with IDs
    const insurerRecords = await prisma.insuranceProvider.findMany({
      where: { organizationId: org.id },
    });

    // Device Models
    const deviceModels = [
      { code: 'OMRON_BP786N', name: 'Omron Evolv BP Monitor', manufacturer: 'Omron', modelNumber: 'BP786N', category: 'Blood Pressure' },
      { code: 'OMRON_HEM7361T', name: 'Omron Platinum BP Monitor', manufacturer: 'Omron', modelNumber: 'HEM-7361T', category: 'Blood Pressure' },
      { code: 'WITHINGS_BPM', name: 'Withings BPM Connect', manufacturer: 'Withings', modelNumber: 'BPM Connect', category: 'Blood Pressure' },
      { code: 'OMRON_HN290T', name: 'Omron Digital Scale', manufacturer: 'Omron', modelNumber: 'HN-290T', category: 'Weight' },
      { code: 'WITHINGS_BODY', name: 'Withings Body+ Scale', manufacturer: 'Withings', modelNumber: 'Body+', category: 'Weight' },
      { code: 'DEXCOM_G7', name: 'Dexcom G7 CGM', manufacturer: 'Dexcom', modelNumber: 'G7', category: 'Glucose' },
      { code: 'ACCUCHEK_GUIDE', name: 'Accu-Chek Guide', manufacturer: 'Roche', modelNumber: 'Guide', category: 'Glucose' },
      { code: 'FREESTYLE_LIBRE3', name: 'FreeStyle Libre 3', manufacturer: 'Abbott', modelNumber: 'Libre 3', category: 'Glucose' },
      { code: 'NONIN_3150', name: 'Nonin Pulse Oximeter', manufacturer: 'Nonin', modelNumber: '3150', category: 'Pulse Oximeter' },
      { code: 'MASIMO_MIGHTYSAT', name: 'Masimo MightySat', manufacturer: 'Masimo', modelNumber: 'MightySat Rx', category: 'Pulse Oximeter' },
      { code: 'BRAUN_THERMOSCAN7', name: 'Braun ThermoScan 7', manufacturer: 'Braun', modelNumber: 'IRT6520', category: 'Thermometer' },
      { code: 'IHEALTH_PT3', name: 'iHealth No-Touch Thermometer', manufacturer: 'iHealth', modelNumber: 'PT3', category: 'Thermometer' },
    ];

    for (const model of deviceModels) {
      await prisma.deviceModel.upsert({
        where: { organizationId_code: { organizationId: org.id, code: model.code } },
        update: model,
        create: { ...model, organizationId: org.id, sortOrder: deviceModels.indexOf(model) },
      });
    }
    console.log(`  ✓ Created ${deviceModels.length} device models`);

    // ========================================
    // 2. CREATE CARE TEAM
    // ========================================
    console.log('\n👨‍⚕️ Creating Care Team...');

    const physicians = await Promise.all([
      prisma.user.upsert({
        where: { email: 'dr.sarah.johnson@clinic.com' },
        update: {},
        create: { email: 'dr.sarah.johnson@clinic.com', firstName: 'Sarah', lastName: 'Johnson', passwordHash: '$2a$10$demo', emailVerified: true },
      }),
      prisma.user.upsert({
        where: { email: 'dr.michael.chen@clinic.com' },
        update: {},
        create: { email: 'dr.michael.chen@clinic.com', firstName: 'Michael', lastName: 'Chen', passwordHash: '$2a$10$demo', emailVerified: true },
      }),
      prisma.user.upsert({
        where: { email: 'dr.emily.rodriguez@clinic.com' },
        update: {},
        create: { email: 'dr.emily.rodriguez@clinic.com', firstName: 'Emily', lastName: 'Rodriguez', passwordHash: '$2a$10$demo', emailVerified: true },
      }),
    ]);
    console.log(`  ✓ Created ${physicians.length} physicians`);

    const nurses = await Promise.all([
      prisma.user.upsert({
        where: { email: 'nurse.mary.williams@clinic.com' },
        update: {},
        create: { email: 'nurse.mary.williams@clinic.com', firstName: 'Mary', lastName: 'Williams', passwordHash: '$2a$10$demo', emailVerified: true },
      }),
      prisma.user.upsert({
        where: { email: 'nurse.james.brown@clinic.com' },
        update: {},
        create: { email: 'nurse.james.brown@clinic.com', firstName: 'James', lastName: 'Brown', passwordHash: '$2a$10$demo', emailVerified: true },
      }),
      prisma.user.upsert({
        where: { email: 'nurse.lisa.garcia@clinic.com' },
        update: {},
        create: { email: 'nurse.lisa.garcia@clinic.com', firstName: 'Lisa', lastName: 'Garcia', passwordHash: '$2a$10$demo', emailVerified: true },
      }),
    ]);
    console.log(`  ✓ Created ${nurses.length} nurses`);

    // ========================================
    // 3. DEFINE PATIENT USE CASES
    // ========================================
    const patientProfiles = [
      // USE CASE 1-5: Critical/High Priority Patients
      { firstName: 'Robert', lastName: 'Anderson', email: 'robert.anderson@patient.com', dob: '1948-03-15', conditions: ['HTN', 'CHF', 'AFib'], insurance: 'MEDICARE', status: 'ACTIVE', enrolledDaysAgo: 90, useCase: 'CRITICAL_BP_ALERT', gender: 'M' },
      { firstName: 'Margaret', lastName: 'Thompson', email: 'margaret.thompson@patient.com', dob: '1952-07-22', conditions: ['DM2', 'CKD'], insurance: 'MEDICARE', status: 'ACTIVE', enrolledDaysAgo: 60, useCase: 'CRITICAL_GLUCOSE', gender: 'F' },
      { firstName: 'William', lastName: 'Davis', email: 'william.davis@patient.com', dob: '1956-11-08', conditions: ['COPD', 'CHF'], insurance: 'BCBS', status: 'ACTIVE', enrolledDaysAgo: 45, useCase: 'LOW_SPO2', gender: 'M' },
      { firstName: 'Patricia', lastName: 'Miller', email: 'patricia.miller@patient.com', dob: '1960-04-30', conditions: ['CHF', 'CKD', 'DM2'], insurance: 'AETNA', status: 'ACTIVE', enrolledDaysAgo: 120, useCase: 'WEIGHT_GAIN_ALERT', gender: 'F' },
      { firstName: 'James', lastName: 'Wilson', email: 'james.wilson@patient.com', dob: '1945-09-12', conditions: ['HTN', 'CAD', 'AFib'], insurance: 'MEDICARE', status: 'ACTIVE', enrolledDaysAgo: 180, useCase: 'MULTIPLE_ALERTS', gender: 'M' },

      // USE CASE 6-10: Well-Controlled Patients (Good Outcomes)
      { firstName: 'Linda', lastName: 'Martinez', email: 'linda.martinez@patient.com', dob: '1965-02-18', conditions: ['HTN', 'DM2'], insurance: 'UNITED', status: 'ACTIVE', enrolledDaysAgo: 150, useCase: 'WELL_CONTROLLED', gender: 'F' },
      { firstName: 'David', lastName: 'Garcia', email: 'david.garcia@patient.com', dob: '1958-06-25', conditions: ['DM2'], insurance: 'CIGNA', status: 'ACTIVE', enrolledDaysAgo: 200, useCase: 'EXCELLENT_COMPLIANCE', gender: 'M' },
      { firstName: 'Susan', lastName: 'Brown', email: 'susan.brown@patient.com', dob: '1970-12-03', conditions: ['HTN'], insurance: 'HUMANA', status: 'ACTIVE', enrolledDaysAgo: 90, useCase: 'IMPROVING_TRENDS', gender: 'F' },
      { firstName: 'Richard', lastName: 'Taylor', email: 'richard.taylor@patient.com', dob: '1962-08-14', conditions: ['COPD', 'ASTHMA'], insurance: 'KAISER', status: 'ACTIVE', enrolledDaysAgo: 75, useCase: 'STABLE_RESPIRATORY', gender: 'M' },
      { firstName: 'Barbara', lastName: 'Lee', email: 'barbara.lee@patient.com', dob: '1955-01-29', conditions: ['CHF'], insurance: 'BCBS', status: 'ACTIVE', enrolledDaysAgo: 100, useCase: 'GOAL_ACHIEVED', gender: 'F' },

      // USE CASE 11-15: Non-Compliant / At-Risk Patients
      { firstName: 'Charles', lastName: 'Harris', email: 'charles.harris@patient.com', dob: '1950-05-17', conditions: ['HTN', 'DM2', 'OBESITY'], insurance: 'MEDICAID', status: 'ACTIVE', enrolledDaysAgo: 60, useCase: 'MISSING_READINGS', gender: 'M' },
      { firstName: 'Jennifer', lastName: 'Clark', email: 'jennifer.clark@patient.com', dob: '1968-10-11', conditions: ['DM2'], insurance: 'AETNA', status: 'ACTIVE', enrolledDaysAgo: 45, useCase: 'DEVICE_NOT_SYNCING', gender: 'F' },
      { firstName: 'Thomas', lastName: 'Lewis', email: 'thomas.lewis@patient.com', dob: '1947-03-28', conditions: ['CHF', 'CKD'], insurance: 'MEDICARE', status: 'ACTIVE', enrolledDaysAgo: 30, useCase: 'LOW_ENGAGEMENT', gender: 'M' },
      { firstName: 'Elizabeth', lastName: 'Walker', email: 'elizabeth.walker@patient.com', dob: '1959-07-04', conditions: ['COPD'], insurance: 'UNITED', status: 'ACTIVE', enrolledDaysAgo: 80, useCase: 'INCONSISTENT_READINGS', gender: 'F' },
      { firstName: 'Joseph', lastName: 'Hall', email: 'joseph.hall@patient.com', dob: '1953-12-19', conditions: ['HTN', 'OSA'], insurance: 'CIGNA', status: 'ACTIVE', enrolledDaysAgo: 55, useCase: 'NEEDS_FOLLOWUP', gender: 'M' },

      // USE CASE 16-20: New Enrollees / Pending / Special Cases
      { firstName: 'Nancy', lastName: 'Allen', email: 'nancy.allen@patient.com', dob: '1972-04-08', conditions: ['HTN'], insurance: 'HUMANA', status: 'PENDING', enrolledDaysAgo: 5, useCase: 'NEW_ENROLLMENT', gender: 'F' },
      { firstName: 'Christopher', lastName: 'Young', email: 'christopher.young@patient.com', dob: '1964-09-23', conditions: ['DM2', 'HTN'], insurance: 'BCBS', status: 'DEVICE_PENDING', enrolledDaysAgo: 10, useCase: 'AWAITING_DEVICE', gender: 'M' },
      { firstName: 'Karen', lastName: 'King', email: 'karen.king@patient.com', dob: '1975-11-30', conditions: ['ASTHMA', 'OBESITY'], insurance: 'KAISER', status: 'ACTIVE', enrolledDaysAgo: 3, useCase: 'JUST_ENROLLED', gender: 'F' },
      { firstName: 'Daniel', lastName: 'Wright', email: 'daniel.wright@patient.com', dob: '1943-06-15', conditions: ['CHF', 'AFib', 'CKD'], insurance: 'MEDICARE', status: 'ACTIVE', enrolledDaysAgo: 365, useCase: 'LONG_TERM_PATIENT', gender: 'M' },
      { firstName: 'Michelle', lastName: 'Scott', email: 'michelle.scott@patient.com', dob: '1980-02-14', conditions: ['DM2'], insurance: 'AETNA', status: 'DISCHARGED', enrolledDaysAgo: 180, useCase: 'DISCHARGED', gender: 'F' },

      // USE CASE 21-25: Billing-Focused Cases
      { firstName: 'Steven', lastName: 'Green', email: 'steven.green@patient.com', dob: '1957-08-07', conditions: ['HTN', 'DM2'], insurance: 'UNITED', status: 'ACTIVE', enrolledDaysAgo: 35, useCase: 'BILLING_ELIGIBLE', gender: 'M' },
      { firstName: 'Dorothy', lastName: 'Adams', email: 'dorothy.adams@patient.com', dob: '1951-01-22', conditions: ['CHF'], insurance: 'MEDICARE', status: 'ACTIVE', enrolledDaysAgo: 28, useCase: 'NEAR_THRESHOLD', gender: 'F' },
      { firstName: 'Paul', lastName: 'Nelson', email: 'paul.nelson@patient.com', dob: '1966-05-11', conditions: ['COPD', 'HTN'], insurance: 'CIGNA', status: 'ACTIVE', enrolledDaysAgo: 40, useCase: 'HIGH_INTERACTION', gender: 'M' },
      { firstName: 'Sandra', lastName: 'Hill', email: 'sandra.hill@patient.com', dob: '1949-10-03', conditions: ['DM2', 'CKD', 'HTN'], insurance: 'MEDICAID', status: 'ACTIVE', enrolledDaysAgo: 65, useCase: 'COMPLEX_BILLING', gender: 'F' },
      { firstName: 'Andrew', lastName: 'Moore', email: 'andrew.moore@patient.com', dob: '1960-03-26', conditions: ['CAD', 'HTN'], insurance: 'BCBS', status: 'ACTIVE', enrolledDaysAgo: 50, useCase: 'CLAIM_SUBMITTED', gender: 'M' },
    ];

    // ========================================
    // 4. CREATE PATIENTS AND RELATED DATA
    // ========================================
    console.log('\n👥 Creating Patients and Related Data...\n');

    const createdPatients: any[] = [];

    for (let i = 0; i < patientProfiles.length; i++) {
      const profile = patientProfiles[i];
      const physicianIdx = i % physicians.length;
      const nurseIdx = i % nurses.length;

      console.log(`  Creating patient ${i + 1}/${patientProfiles.length}: ${profile.firstName} ${profile.lastName} (${profile.useCase})`);

      // Create user
      const user = await prisma.user.upsert({
        where: { email: profile.email },
        update: {},
        create: {
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          passwordHash: '$2a$10$demo',
          emailVerified: true,
        },
      });

      // Create patient
      const enrollmentDate = daysAgo(profile.enrolledDaysAgo);
      const patient = await prisma.patient.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          organizationId: org.id,
          dateOfBirth: new Date(profile.dob),
          phone: `+1-555-${String(1000 + i).padStart(4, '0')}`,
          address: {
            street: `${100 + i * 10} ${['Main', 'Oak', 'Maple', 'Pine', 'Cedar'][i % 5]} Street`,
            city: ['Boston', 'Cambridge', 'Somerville', 'Brookline', 'Newton'][i % 5],
            state: 'MA',
            zip: `0210${i % 10}`,
            country: 'USA',
          } as Prisma.InputJsonValue,
          conditions: profile.conditions,
          insuranceProviderId: insurerRecords.find(ins => ins.code === profile.insurance)?.id || insurerRecords[0].id,
          insurancePlanName: 'Standard Plan',
          insuranceMemberId: `${profile.insurance}-${String(100000 + i).slice(-6)}`,
          enrollmentStatus: profile.status as any,
          enrollmentDate: enrollmentDate,
          consentDate: profile.status === 'PENDING_CONSENT' ? null : enrollmentDate,
          primaryPhysicianId: physicians[physicianIdx].id,
          assignedClinicalStaffId: nurses[nurseIdx].id,
        },
      });

      createdPatients.push({ patient, profile, physician: physicians[physicianIdx], nurse: nurses[nurseIdx] });

      // Create devices based on conditions
      const patientDevices: any[] = [];
      if (profile.status !== 'PENDING_DEVICE' && profile.status !== 'PENDING_CONSENT') {
        // Blood pressure monitor for HTN, CHF, CAD, AFib
        if (profile.conditions.some(c => ['HTN', 'CHF', 'CAD', 'AFib'].includes(c))) {
          const device = await prisma.device.create({
            data: {
              patientId: patient.id,
              organizationId: org.id,
              type: 'BLOOD_PRESSURE_MONITOR',
              serialNumber: `BP-${patient.id.slice(-6)}-${Date.now().toString().slice(-4)}`,
              manufacturer: 'Omron',
              model: 'BP786N',
              status: profile.useCase === 'DEVICE_NOT_SYNCING' ? 'INACTIVE' : 'ACTIVE',
              lastSyncAt: profile.useCase === 'DEVICE_NOT_SYNCING' ? daysAgo(14) : new Date(),
            },
          });
          patientDevices.push(device);
        }

        // Glucose monitor for DM2
        if (profile.conditions.includes('DM2')) {
          const device = await prisma.device.create({
            data: {
              patientId: patient.id,
              organizationId: org.id,
              type: 'GLUCOSE_MONITOR',
              serialNumber: `GM-${patient.id.slice(-6)}-${Date.now().toString().slice(-4)}`,
              manufacturer: 'Dexcom',
              model: 'G7',
              status: 'ACTIVE',
              lastSyncAt: new Date(),
            },
          });
          patientDevices.push(device);
        }

        // Pulse oximeter for COPD, CHF, ASTHMA
        if (profile.conditions.some(c => ['COPD', 'CHF', 'ASTHMA'].includes(c))) {
          const device = await prisma.device.create({
            data: {
              patientId: patient.id,
              organizationId: org.id,
              type: 'PULSE_OXIMETER',
              serialNumber: `OX-${patient.id.slice(-6)}-${Date.now().toString().slice(-4)}`,
              manufacturer: 'Nonin',
              model: '3150',
              status: 'ACTIVE',
              lastSyncAt: new Date(),
            },
          });
          patientDevices.push(device);
        }

        // Weight scale for CHF, CKD, OBESITY
        if (profile.conditions.some(c => ['CHF', 'CKD', 'OBESITY'].includes(c))) {
          const device = await prisma.device.create({
            data: {
              patientId: patient.id,
              organizationId: org.id,
              type: 'WEIGHT_SCALE',
              serialNumber: `WS-${patient.id.slice(-6)}-${Date.now().toString().slice(-4)}`,
              manufacturer: 'Withings',
              model: 'Body+',
              status: 'ACTIVE',
              lastSyncAt: new Date(),
            },
          });
          patientDevices.push(device);
        }
      }

      // Create vital readings based on use case
      if (patientDevices.length > 0 && profile.status === 'ACTIVE') {
        await createVitalReadings(patient, patientDevices, profile, org.id);
      }

      // Create alerts based on use case
      await createAlerts(patient, profile, org.id, nurses[nurseIdx], physicians[physicianIdx]);

      // Create care plan
      if (profile.status === 'ACTIVE' && profile.useCase !== 'JUST_ENROLLED') {
        await createCarePlan(patient, profile, org.id, nurses[nurseIdx], physicians[physicianIdx]);
      }

      // Create billing records
      if (profile.enrolledDaysAgo >= 30 && profile.status === 'ACTIVE') {
        await createBillingRecords(patient, profile, org.id, nurses[nurseIdx], physicians[physicianIdx]);
      }
    }

    console.log(`\n✅ Created ${createdPatients.length} patients with complete data`);

    // ========================================
    // 5. SUMMARY
    // ========================================
    console.log('\n📊 Summary of Demo Data:');
    const stats = await Promise.all([
      prisma.patient.count({ where: { organizationId: org.id } }),
      prisma.device.count({ where: { organizationId: org.id } }),
      prisma.vitalReading.count({ where: { organizationId: org.id } }),
      prisma.alert.count({ where: { organizationId: org.id } }),
      prisma.carePlan.count({ where: { organizationId: org.id } }),
      prisma.billingRecord.count({ where: { organizationId: org.id } }),
    ]);

    console.log(`  • Patients: ${stats[0]}`);
    console.log(`  • Devices: ${stats[1]}`);
    console.log(`  • Vital Readings: ${stats[2]}`);
    console.log(`  • Alerts: ${stats[3]}`);
    console.log(`  • Care Plans: ${stats[4]}`);
    console.log(`  • Billing Records: ${stats[5]}`);

    console.log('\n🎉 Comprehensive seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

async function createVitalReadings(patient: any, devices: any[], profile: any, orgId: string) {
  const now = new Date();
  const readings: any[] = [];

  // Determine reading patterns based on use case
  let daysOfReadings = Math.min(profile.enrolledDaysAgo, 30);
  let readingsPerDay = 1;
  let skipProbability = 0;

  switch (profile.useCase) {
    case 'EXCELLENT_COMPLIANCE':
      readingsPerDay = 2;
      break;
    case 'MISSING_READINGS':
      skipProbability = 0.6;
      break;
    case 'LOW_ENGAGEMENT':
      skipProbability = 0.8;
      daysOfReadings = 10;
      break;
    case 'INCONSISTENT_READINGS':
      skipProbability = 0.4;
      break;
    case 'JUST_ENROLLED':
      daysOfReadings = 3;
      break;
    case 'DEVICE_NOT_SYNCING':
      daysOfReadings = 14;
      break;
  }

  for (let day = 0; day < daysOfReadings; day++) {
    if (Math.random() < skipProbability) continue;

    for (let reading = 0; reading < readingsPerDay; reading++) {
      const recordedAt = new Date(now);
      recordedAt.setDate(recordedAt.getDate() - day);
      recordedAt.setHours(8 + reading * 12, Math.floor(Math.random() * 60), 0, 0);

      for (const device of devices) {
        let values: any;
        let unit: string;
        let type: string;

        switch (device.type) {
          case 'BLOOD_PRESSURE_MONITOR':
            type = 'BLOOD_PRESSURE';
            const bpValues = generateBPValues(profile.useCase, day);
            values = bpValues;
            unit = 'mmHg';
            break;

          case 'GLUCOSE_MONITOR':
            type = 'BLOOD_GLUCOSE';
            values = { glucose: generateGlucoseValue(profile.useCase, day) };
            unit = 'mg/dL';
            break;

          case 'PULSE_OXIMETER':
            type = 'PULSE_OXIMETRY';
            values = generateSpO2Values(profile.useCase, day);
            unit = '%';
            break;

          case 'WEIGHT_SCALE':
            type = 'WEIGHT';
            values = { weight: generateWeightValue(profile.useCase, day, profile.conditions) };
            unit = 'lbs';
            break;

          default:
            continue;
        }

        readings.push(
          prisma.vitalReading.create({
            data: {
              patientId: patient.id,
              organizationId: orgId,
              deviceId: device.id,
              type: type as any,
              values: values as Prisma.InputJsonValue,
              unit,
              source: 'DEVICE',
              recordedAt,
            },
          })
        );
      }
    }
  }

  if (readings.length > 0) {
    await Promise.all(readings);
  }
}

function generateBPValues(useCase: string, dayIndex: number): { systolic: number; diastolic: number; pulse: number } {
  let baseSystolic = 125;
  let baseDiastolic = 80;

  switch (useCase) {
    case 'CRITICAL_BP_ALERT':
      baseSystolic = dayIndex === 0 ? 175 : 155;
      baseDiastolic = dayIndex === 0 ? 105 : 95;
      break;
    case 'WELL_CONTROLLED':
    case 'EXCELLENT_COMPLIANCE':
      baseSystolic = 118;
      baseDiastolic = 75;
      break;
    case 'IMPROVING_TRENDS':
      baseSystolic = 145 - dayIndex * 2;
      baseDiastolic = 90 - dayIndex;
      break;
    case 'MULTIPLE_ALERTS':
      baseSystolic = 160 + Math.floor(Math.random() * 20);
      baseDiastolic = 95 + Math.floor(Math.random() * 10);
      break;
    case 'GOAL_ACHIEVED':
      baseSystolic = 120;
      baseDiastolic = 78;
      break;
  }

  return {
    systolic: baseSystolic + Math.floor(Math.random() * 10) - 5,
    diastolic: baseDiastolic + Math.floor(Math.random() * 6) - 3,
    pulse: 70 + Math.floor(Math.random() * 20),
  };
}

function generateGlucoseValue(useCase: string, dayIndex: number): number {
  let base = 110;

  switch (useCase) {
    case 'CRITICAL_GLUCOSE':
      base = dayIndex === 0 ? 320 : 220;
      break;
    case 'WELL_CONTROLLED':
    case 'EXCELLENT_COMPLIANCE':
      base = 105;
      break;
    case 'IMPROVING_TRENDS':
      base = 180 - dayIndex * 3;
      break;
  }

  return base + Math.floor(Math.random() * 30) - 15;
}

function generateSpO2Values(useCase: string, dayIndex: number): { spo2: number; pulse: number } {
  let baseSpo2 = 96;

  switch (useCase) {
    case 'LOW_SPO2':
      baseSpo2 = dayIndex === 0 ? 86 : 90;
      break;
    case 'STABLE_RESPIRATORY':
      baseSpo2 = 95;
      break;
    case 'IMPROVING_TRENDS':
      baseSpo2 = 91 + Math.floor(dayIndex / 3);
      break;
  }

  return {
    spo2: Math.min(100, baseSpo2 + Math.floor(Math.random() * 4)),
    pulse: 75 + Math.floor(Math.random() * 15),
  };
}

function generateWeightValue(useCase: string, dayIndex: number, conditions: string[]): number {
  const hasObesity = conditions.includes('OBESITY');
  let baseWeight = hasObesity ? 250 : 175;

  switch (useCase) {
    case 'WEIGHT_GAIN_ALERT':
      baseWeight = baseWeight + (30 - dayIndex) * 0.5; // Gaining weight
      break;
    case 'IMPROVING_TRENDS':
      baseWeight = baseWeight + dayIndex * 0.3; // Losing weight going back in time
      break;
    case 'GOAL_ACHIEVED':
      baseWeight = hasObesity ? 220 : 165;
      break;
  }

  return Math.round((baseWeight + Math.random() * 2 - 1) * 10) / 10;
}

async function createAlerts(patient: any, profile: any, orgId: string, nurse: any, physician: any) {
  const alertsToCreate: any[] = [];

  switch (profile.useCase) {
    case 'CRITICAL_BP_ALERT':
      alertsToCreate.push({
        type: 'CRITICAL_VALUE',
        severity: 'CRITICAL',
        status: 'NEW',
        message: 'Critical: Blood pressure extremely elevated at 175/105 mmHg',
        metadata: { systolic: 175, diastolic: 105, threshold: { systolic: 160, diastolic: 100 } },
      });
      break;

    case 'CRITICAL_GLUCOSE':
      alertsToCreate.push({
        type: 'CRITICAL_VALUE',
        severity: 'CRITICAL',
        status: 'ACKNOWLEDGED',
        message: 'Critical: Blood glucose at 320 mg/dL - Immediate attention required',
        metadata: { glucose: 320, threshold: 250 },
        acknowledgedAt: daysAgo(0),
        acknowledgedById: nurse.id,
      });
      break;

    case 'LOW_SPO2':
      alertsToCreate.push({
        type: 'CRITICAL_VALUE',
        severity: 'CRITICAL',
        status: 'ESCALATED',
        message: 'Critical: Oxygen saturation dropped to 86%',
        metadata: { spo2: 86, threshold: 88 },
        acknowledgedAt: daysAgo(0),
        acknowledgedById: nurse.id,
        escalatedAt: daysAgo(0),
        escalatedToId: physician.id,
      });
      break;

    case 'WEIGHT_GAIN_ALERT':
      alertsToCreate.push({
        type: 'THRESHOLD_EXCEEDED',
        severity: 'SIGNIFICANT',
        status: 'NEW',
        message: 'Warning: Weight gain of 5 lbs in 7 days - possible fluid retention',
        metadata: { currentWeight: 195, previousWeight: 190, change: 5, days: 7 },
      });
      break;

    case 'MULTIPLE_ALERTS':
      alertsToCreate.push(
        {
          type: 'THRESHOLD_EXCEEDED',
          severity: 'SIGNIFICANT',
          status: 'ACKNOWLEDGED',
          message: 'Blood pressure elevated: 162/94 mmHg',
          metadata: { systolic: 162, diastolic: 94 },
          acknowledgedAt: daysAgo(1),
          acknowledgedById: nurse.id,
        },
        {
          type: 'MISSED_READING',
          severity: 'SIGNIFICANT',
          status: 'NEW',
          message: 'No readings received for 48 hours',
          metadata: { lastReadingAt: daysAgo(2).toISOString() },
        },
        {
          type: 'THRESHOLD_EXCEEDED',
          severity: 'CRITICAL',
          status: 'ESCALATED',
          message: 'Critical: Heart rate irregularity detected with elevated BP',
          metadata: { pulse: 110, irregular: true },
          acknowledgedAt: daysAgo(0),
          acknowledgedById: nurse.id,
          escalatedAt: daysAgo(0),
          escalatedToId: physician.id,
        }
      );
      break;

    case 'MISSING_READINGS':
      alertsToCreate.push({
        type: 'MISSED_READING',
        severity: 'SIGNIFICANT',
        status: 'NEW',
        message: 'Multiple missed readings this week - patient engagement declining',
        metadata: { missedDays: 4, totalDays: 7 },
      });
      break;

    case 'DEVICE_NOT_SYNCING':
      alertsToCreate.push({
        type: 'DEVICE_MALFUNCTION',
        severity: 'SIGNIFICANT',
        status: 'NEW',
        message: 'Blood pressure monitor has not synced for 14 days',
        metadata: { deviceType: 'BLOOD_PRESSURE_MONITOR', lastSyncDaysAgo: 14 },
      });
      break;

    case 'NEEDS_FOLLOWUP':
      alertsToCreate.push({
        type: 'SYSTEM_GENERATED',
        severity: 'INFORMATIONAL',
        status: 'NEW',
        message: 'Monthly care management call due',
        metadata: { reason: 'Monthly review', lastContactDaysAgo: 28 },
      });
      break;

    case 'WELL_CONTROLLED':
    case 'EXCELLENT_COMPLIANCE':
    case 'GOAL_ACHIEVED':
      // No active alerts - resolved history
      alertsToCreate.push({
        type: 'THRESHOLD_EXCEEDED',
        severity: 'SIGNIFICANT',
        status: 'RESOLVED',
        message: 'Blood pressure was slightly elevated - now resolved',
        metadata: { systolic: 142, diastolic: 88 },
        acknowledgedAt: daysAgo(10),
        acknowledgedById: nurse.id,
        resolvedAt: daysAgo(5),
                resolution: 'Patient adjusted medication timing, BP now well controlled',
      });
      break;
  }

  for (const alertData of alertsToCreate) {
    await prisma.alert.create({
      data: {
        patientId: patient.id,
        organizationId: orgId,
        assignedToId: nurse.id,
        ...alertData,
      },
    });
  }
}

async function createCarePlan(patient: any, profile: any, orgId: string, nurse: any, physician: any) {
  const goals: any[] = [];
  const thresholds: any = {};
  const medications: any[] = [];

  // Build goals and thresholds based on conditions
  if (profile.conditions.includes('HTN')) {
    goals.push({
      id: `goal-bp-${patient.id.slice(-6)}`,
      description: 'Maintain blood pressure below 140/90 mmHg',
      targetDate: daysAgo(-90).toISOString().split('T')[0],
      status: profile.useCase === 'GOAL_ACHIEVED' ? 'achieved' : 'in_progress',
    });
    thresholds.BLOOD_PRESSURE = {
      systolic: { min: 90, max: 140, critical: 160 },
      diastolic: { min: 60, max: 90, critical: 100 },
    };
    medications.push({ name: 'Lisinopril', dosage: '10mg', frequency: 'Daily' });
  }

  if (profile.conditions.includes('DM2')) {
    goals.push({
      id: `goal-glucose-${patient.id.slice(-6)}`,
      description: 'Maintain fasting blood glucose between 80-130 mg/dL',
      targetDate: daysAgo(-90).toISOString().split('T')[0],
      status: profile.useCase === 'EXCELLENT_COMPLIANCE' ? 'achieved' : 'in_progress',
    });
    thresholds.BLOOD_GLUCOSE = {
      glucose: { min: 70, max: 180, critical: 250 },
    };
    medications.push({ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' });
  }

  if (profile.conditions.some((c: string) => ['CHF', 'COPD'].includes(c))) {
    goals.push({
      id: `goal-spo2-${patient.id.slice(-6)}`,
      description: 'Maintain oxygen saturation above 92%',
      targetDate: daysAgo(-90).toISOString().split('T')[0],
      status: 'in_progress',
    });
    thresholds.PULSE_OXIMETRY = {
      spo2: { min: 92, critical: 88 },
    };
  }

  if (profile.conditions.includes('CHF')) {
    goals.push({
      id: `goal-weight-${patient.id.slice(-6)}`,
      description: 'Monitor weight daily - alert if gain > 3 lbs in 3 days',
      targetDate: daysAgo(-90).toISOString().split('T')[0],
      status: 'in_progress',
    });
    thresholds.WEIGHT = {
      weight: { max: 200, critical: 210 },
    };
    medications.push({ name: 'Furosemide', dosage: '40mg', frequency: 'Daily' });
  }

  await prisma.carePlan.create({
    data: {
      patientId: patient.id,
      organizationId: orgId,
      createdById: nurse.id,
      approvedById: physician.id,
      currentVersion: 1,
      status: 'ACTIVE',
      activatedAt: daysAgo(profile.enrolledDaysAgo - 2),
      versions: {
        create: {
          organizationId: orgId,
          version: 1,
          goals: goals as Prisma.InputJsonValue,
          vitalThresholds: thresholds as Prisma.InputJsonValue,
          medications: medications as Prisma.InputJsonValue,
          instructions: `Monitor vitals as prescribed. Contact care team if readings exceed thresholds. Take medications as directed.`,
          effectiveDate: daysAgo(profile.enrolledDaysAgo - 2),
        },
      },
    },
  });
}

async function createBillingRecords(patient: any, profile: any, orgId: string, nurse: any, physician: any) {
  let transmissionDays = 0;
  let interactionMinutes = 0;
  let status: 'PENDING' | 'ELIGIBLE' | 'SUBMITTED' | 'PAID' = 'PENDING';

  switch (profile.useCase) {
    case 'BILLING_ELIGIBLE':
    case 'EXCELLENT_COMPLIANCE':
      transmissionDays = 22;
      interactionMinutes = 35;
      status = 'ELIGIBLE';
      break;
    case 'NEAR_THRESHOLD':
      transmissionDays = 15;
      interactionMinutes = 18;
      status = 'PENDING';
      break;
    case 'HIGH_INTERACTION':
      transmissionDays = 25;
      interactionMinutes = 55;
      status = 'ELIGIBLE';
      break;
    case 'COMPLEX_BILLING':
      transmissionDays = 28;
      interactionMinutes = 65;
      status = 'SUBMITTED';
      break;
    case 'CLAIM_SUBMITTED':
      transmissionDays = 20;
      interactionMinutes = 30;
      status = 'PAID';
      break;
    case 'MISSING_READINGS':
    case 'LOW_ENGAGEMENT':
      transmissionDays = 8;
      interactionMinutes = 10;
      status = 'PENDING';
      break;
    default:
      transmissionDays = 16 + Math.floor(Math.random() * 10);
      interactionMinutes = 20 + Math.floor(Math.random() * 20);
      status = transmissionDays >= 16 ? 'ELIGIBLE' : 'PENDING';
  }

  const periodStart = daysAgo(30);
  const periodEnd = daysAgo(0);

  const activities: any[] = [];

  // Setup activity (99453) - one time
  if (profile.enrolledDaysAgo >= 30 && profile.enrolledDaysAgo <= 60) {
    activities.push({
      organizationId: orgId,
      cptCode: 'CPT_99453',
      performedById: nurse.id,
      performedAt: daysAgo(profile.enrolledDaysAgo),
      durationMinutes: 30,
      description: 'Initial device setup and patient education',
    });
  }

  // Device supply (99454)
  if (transmissionDays >= 16) {
    activities.push({
      organizationId: orgId,
      cptCode: 'CPT_99454',
      performedById: nurse.id,
      performedAt: periodEnd,
      description: `${transmissionDays} days of device data transmission`,
    });
  }

  // Treatment management (99457)
  if (interactionMinutes >= 20) {
    activities.push({
      organizationId: orgId,
      cptCode: 'CPT_99457',
      performedById: physician.id,
      performedAt: daysAgo(15),
      durationMinutes: Math.min(interactionMinutes, 39),
      description: 'Interactive communication and care management',
    });
  }

  // Additional management (99458)
  if (interactionMinutes >= 40) {
    activities.push({
      organizationId: orgId,
      cptCode: 'CPT_99458',
      performedById: physician.id,
      performedAt: daysAgo(7),
      durationMinutes: interactionMinutes - 39,
      description: 'Additional 20+ minutes of care management',
    });
  }

  await prisma.billingRecord.create({
    data: {
      patientId: patient.id,
      organizationId: orgId,
      periodStart,
      periodEnd,
      dataTransmissionDays: transmissionDays,
      interactionMinutes,
      status,
      claimId: status === 'SUBMITTED' || status === 'PAID' ? `CLM-${Date.now().toString().slice(-8)}` : null,
      claimSubmittedAt: status === 'SUBMITTED' || status === 'PAID' ? daysAgo(5) : null,
      paidAt: status === 'PAID' ? daysAgo(2) : null,
      amount: status === 'PAID' ? 156.0 : null,
      activities: {
        create: activities,
      },
    },
  });
}

// Run the seed
seedComprehensive()
  .then(() => {
    console.log('\n✨ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
