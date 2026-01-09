/**
 * Demo Seed Data for NirmiteeRPM
 * Creates comprehensive demo data for customer demonstrations
 * Run with: npx ts-node prisma/seed-demo.ts
 */

import { PrismaClient, EnrollmentStatus, VitalType, DataSource, AlertSeverity, MedicationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Demo patients data - diverse conditions and demographics
const DEMO_PATIENTS = [
  {
    firstName: 'Robert', lastName: 'Anderson', email: 'robert.anderson@demo.com',
    dob: '1952-03-15', gender: 'Male', phone: '+1-555-1001',
    conditions: ['HYPERTENSION', 'DIABETES_TYPE_2', 'OBESITY'],
    insurance: { provider: 'Medicare', plan: 'Part B', memberId: 'MED-001' },
    status: 'ACTIVE' as EnrollmentStatus,
  },
  {
    firstName: 'Margaret', lastName: 'Chen', email: 'margaret.chen@demo.com',
    dob: '1958-07-22', gender: 'Female', phone: '+1-555-1002',
    conditions: ['CONGESTIVE_HEART_FAILURE', 'ATRIAL_FIBRILLATION'],
    insurance: { provider: 'Blue Cross', plan: 'PPO Gold', memberId: 'BC-002' },
    status: 'ACTIVE' as EnrollmentStatus,
  },
  {
    firstName: 'James', lastName: 'Williams', email: 'james.williams@demo.com',
    dob: '1965-11-08', gender: 'Male', phone: '+1-555-1003',
    conditions: ['COPD', 'DIABETES_TYPE_2'],
    insurance: { provider: 'Aetna', plan: 'Choice POS', memberId: 'AET-003' },
    status: 'ACTIVE' as EnrollmentStatus,
  },
  {
    firstName: 'Patricia', lastName: 'Davis', email: 'patricia.davis@demo.com',
    dob: '1948-02-28', gender: 'Female', phone: '+1-555-1004',
    conditions: ['HYPERTENSION', 'CHRONIC_KIDNEY_DISEASE'],
    insurance: { provider: 'Medicare', plan: 'Advantage', memberId: 'MED-004' },
    status: 'ACTIVE' as EnrollmentStatus,
  },
  {
    firstName: 'Michael', lastName: 'Johnson', email: 'michael.johnson@demo.com',
    dob: '1970-09-12', gender: 'Male', phone: '+1-555-1005',
    conditions: ['DIABETES_TYPE_1', 'HYPERTENSION'],
    insurance: { provider: 'United Health', plan: 'Choice Plus', memberId: 'UH-005' },
    status: 'ACTIVE' as EnrollmentStatus,
  },
  {
    firstName: 'Elizabeth', lastName: 'Martinez', email: 'elizabeth.martinez@demo.com',
    dob: '1955-05-20', gender: 'Female', phone: '+1-555-1006',
    conditions: ['CONGESTIVE_HEART_FAILURE', 'DIABETES_TYPE_2', 'HYPERTENSION'],
    insurance: { provider: 'Cigna', plan: 'Open Access Plus', memberId: 'CIG-006' },
    status: 'ACTIVE' as EnrollmentStatus,
  },
  {
    firstName: 'William', lastName: 'Brown', email: 'william.brown@demo.com',
    dob: '1960-12-03', gender: 'Male', phone: '+1-555-1007',
    conditions: ['COPD', 'ASTHMA'],
    insurance: { provider: 'Humana', plan: 'Gold Plus', memberId: 'HUM-007' },
    status: 'ACTIVE' as EnrollmentStatus,
  },
  {
    firstName: 'Dorothy', lastName: 'Wilson', email: 'dorothy.wilson@demo.com',
    dob: '1945-08-17', gender: 'Female', phone: '+1-555-1008',
    conditions: ['HYPERTENSION', 'OSTEOARTHRITIS', 'DIABETES_TYPE_2'],
    insurance: { provider: 'Medicare', plan: 'Part B', memberId: 'MED-008' },
    status: 'ACTIVE' as EnrollmentStatus,
  },
  {
    firstName: 'Richard', lastName: 'Taylor', email: 'richard.taylor@demo.com',
    dob: '1968-04-25', gender: 'Male', phone: '+1-555-1009',
    conditions: ['CHRONIC_KIDNEY_DISEASE', 'HYPERTENSION', 'DIABETES_TYPE_2'],
    insurance: { provider: 'Anthem', plan: 'Blue Cross', memberId: 'ANT-009' },
    status: 'ACTIVE' as EnrollmentStatus,
  },
  {
    firstName: 'Susan', lastName: 'Moore', email: 'susan.moore@demo.com',
    dob: '1972-01-30', gender: 'Female', phone: '+1-555-1010',
    conditions: ['OBESITY', 'SLEEP_APNEA', 'HYPERTENSION'],
    insurance: { provider: 'Kaiser', plan: 'Permanente', memberId: 'KAI-010' },
    status: 'ACTIVE' as EnrollmentStatus,
  },
  // Pending/Consented patients for enrollment demo
  {
    firstName: 'Thomas', lastName: 'Garcia', email: 'thomas.garcia@demo.com',
    dob: '1963-06-14', gender: 'Male', phone: '+1-555-1011',
    conditions: ['DIABETES_TYPE_2'],
    insurance: { provider: 'Blue Shield', plan: 'Silver', memberId: 'BS-011' },
    status: 'CONSENTED' as EnrollmentStatus,
  },
  {
    firstName: 'Nancy', lastName: 'Lee', email: 'nancy.lee@demo.com',
    dob: '1975-10-05', gender: 'Female', phone: '+1-555-1012',
    conditions: ['HYPERTENSION', 'ANXIETY'],
    insurance: { provider: 'Cigna', plan: 'Bronze', memberId: 'CIG-012' },
    status: 'PENDING' as EnrollmentStatus,
  },
];

// Generate realistic vital readings
function generateVitalReadings(
  patientId: string,
  orgId: string,
  deviceId: string | null,
  vitalType: VitalType,
  days: number,
  baseValues: Record<string, number>,
  variance: Record<string, number>,
  criticalChance: number = 0.05,
  warningChance: number = 0.15
) {
  const readings = [];
  const now = new Date();

  for (let day = 0; day < days; day++) {
    // Some days have multiple readings
    const readingsPerDay = Math.random() < 0.3 ? 2 : 1;

    for (let r = 0; r < readingsPerDay; r++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(r === 0 ? 8 : 18, Math.floor(Math.random() * 60), 0, 0);

      const values: Record<string, number> = {};
      let isCritical = Math.random() < criticalChance;
      let isWarning = !isCritical && Math.random() < warningChance;

      for (const [key, base] of Object.entries(baseValues)) {
        let value = base + (Math.random() - 0.5) * 2 * (variance[key] || 5);

        // Occasionally generate warning/critical values
        if (isCritical) {
          value = base + (variance[key] || 10) * 2 * (Math.random() > 0.5 ? 1 : -1);
        } else if (isWarning) {
          value = base + (variance[key] || 10) * 1.2 * (Math.random() > 0.5 ? 1 : -1);
        }

        values[key] = Math.round(value);
      }

      readings.push({
        patientId,
        organizationId: orgId,
        deviceId,
        type: vitalType,
        values,
        unit: getUnit(vitalType),
        source: deviceId ? DataSource.DEVICE : DataSource.MANUAL,
        recordedAt: date,
      });
    }
  }

  return readings;
}

function getUnit(type: VitalType): string {
  switch (type) {
    case 'BLOOD_PRESSURE': return 'mmHg';
    case 'WEIGHT': return 'lbs';
    case 'BLOOD_GLUCOSE': return 'mg/dL';
    case 'PULSE_OXIMETRY': return '%';
    case 'HEART_RATE': return 'bpm';
    case 'TEMPERATURE': return '°F';
    default: return '';
  }
}

// Medications for different conditions
const MEDICATIONS_BY_CONDITION: Record<string, Array<{name: string; dosage: string; frequency: string; instructions?: string}>> = {
  'HYPERTENSION': [
    { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', instructions: 'Take in the morning' },
    { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', instructions: 'Can be taken with or without food' },
    { name: 'Metoprolol', dosage: '25mg', frequency: 'Twice daily', instructions: 'Take with meals' },
  ],
  'DIABETES_TYPE_2': [
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', instructions: 'Take with meals' },
    { name: 'Glipizide', dosage: '5mg', frequency: 'Once daily', instructions: 'Take 30 min before breakfast' },
    { name: 'Jardiance', dosage: '10mg', frequency: 'Once daily', instructions: 'Take in the morning' },
  ],
  'DIABETES_TYPE_1': [
    { name: 'Insulin Glargine', dosage: '20 units', frequency: 'Once daily at bedtime', instructions: 'Inject subcutaneously' },
    { name: 'Insulin Lispro', dosage: 'Per sliding scale', frequency: 'Before meals', instructions: 'Check blood sugar before dosing' },
  ],
  'CONGESTIVE_HEART_FAILURE': [
    { name: 'Furosemide', dosage: '40mg', frequency: 'Once daily', instructions: 'Take in the morning' },
    { name: 'Carvedilol', dosage: '12.5mg', frequency: 'Twice daily', instructions: 'Take with food' },
    { name: 'Spironolactone', dosage: '25mg', frequency: 'Once daily', instructions: 'Monitor potassium levels' },
  ],
  'COPD': [
    { name: 'Spiriva', dosage: '18mcg', frequency: 'Once daily', instructions: 'Use HandiHaler device' },
    { name: 'Albuterol', dosage: '2 puffs', frequency: 'Every 4-6 hours as needed', instructions: 'Rescue inhaler' },
    { name: 'Fluticasone/Salmeterol', dosage: '250/50', frequency: 'Twice daily', instructions: 'Rinse mouth after use' },
  ],
  'CHRONIC_KIDNEY_DISEASE': [
    { name: 'Sodium Bicarbonate', dosage: '650mg', frequency: 'Three times daily', instructions: 'Take with meals' },
    { name: 'Epoetin Alfa', dosage: '10000 units', frequency: 'Weekly', instructions: 'Inject subcutaneously' },
  ],
};

async function seedDemo() {
  console.log('🚀 Starting comprehensive demo data seeding...\n');

  try {
    // Get or create demo organization
    let org = await prisma.organization.findFirst({
      where: { slug: 'demo-org' },
    });

    if (!org) {
      console.error('❌ Demo organization not found. Run main seed first: pnpm db:seed');
      return;
    }

    console.log(`📍 Using organization: ${org.name}\n`);

    // Hash password for all demo users
    const passwordHash = await bcrypt.hash('password123', 10);

    // Create/get physician
    const physician = await prisma.user.upsert({
      where: { email: 'dr.smith@demo.com' },
      update: {},
      create: {
        email: 'dr.smith@demo.com',
        firstName: 'Dr. Sarah',
        lastName: 'Smith',
        passwordHash,
        emailVerified: true,
        isActive: true,
      },
    });

    // Create/get clinical staff (Care Manager)
    const careManager = await prisma.user.upsert({
      where: { email: 'nurse.johnson@demo.com' },
      update: {},
      create: {
        email: 'nurse.johnson@demo.com',
        firstName: 'Emily',
        lastName: 'Johnson',
        passwordHash,
        emailVerified: true,
        isActive: true,
      },
    });

    // Create another nurse for variety
    const nurse2 = await prisma.user.upsert({
      where: { email: 'nurse.williams@demo.com' },
      update: {},
      create: {
        email: 'nurse.williams@demo.com',
        firstName: 'Michael',
        lastName: 'Williams',
        passwordHash,
        emailVerified: true,
        isActive: true,
      },
    });

    console.log('✓ Created/verified clinical staff users\n');

    // Create patients
    const createdPatients: Array<{ patient: any; user: any; data: typeof DEMO_PATIENTS[0] }> = [];

    for (const patientData of DEMO_PATIENTS) {
      const user = await prisma.user.upsert({
        where: { email: patientData.email },
        update: {},
        create: {
          email: patientData.email,
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          passwordHash,
          emailVerified: true,
          isActive: true,
        },
      });

      const enrollmentDate = patientData.status === 'ACTIVE'
        ? new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) // Random date in last 60 days
        : null;

      const patient = await prisma.patient.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          organizationId: org.id,
          dateOfBirth: new Date(patientData.dob),
          phone: patientData.phone,
          address: {
            street: `${Math.floor(Math.random() * 9000) + 1000} Main Street`,
            city: ['Boston', 'Cambridge', 'Brookline', 'Newton', 'Somerville'][Math.floor(Math.random() * 5)],
            state: 'MA',
            zip: `0${Math.floor(Math.random() * 9000) + 1000}`,
            country: 'USA',
          },
          conditions: patientData.conditions,
          insuranceProviderId: patientData.insurance.provider,
          insurancePlanName: patientData.insurance.plan,
          insuranceMemberId: patientData.insurance.memberId,
          enrollmentStatus: patientData.status,
          enrollmentDate,
          consentDate: enrollmentDate ? new Date(enrollmentDate.getTime() - 7 * 24 * 60 * 60 * 1000) : null,
          primaryPhysicianId: physician.id,
          assignedClinicalStaffId: Math.random() > 0.5 ? careManager.id : nurse2.id,
        },
      });

      createdPatients.push({ patient, user, data: patientData });
    }

    console.log(`✓ Created ${createdPatients.length} patients\n`);

    // Create devices and vital readings for active patients
    let totalReadings = 0;

    for (const { patient, data } of createdPatients) {
      if (data.status !== 'ACTIVE') continue;

      // Create devices based on conditions
      const devices: any[] = [];

      if (data.conditions.includes('HYPERTENSION') || data.conditions.includes('CONGESTIVE_HEART_FAILURE')) {
        const device = await prisma.device.create({
          data: {
            patientId: patient.id,
            organizationId: org.id,
            type: 'BLOOD_PRESSURE_MONITOR',
            serialNumber: `BP-${patient.id.slice(-6)}`,
            manufacturer: 'Omron',
            model: 'BP7350',
            status: 'ACTIVE',
            lastSyncAt: new Date(),
          },
        });
        devices.push({ device, type: 'BLOOD_PRESSURE' });
      }

      if (data.conditions.includes('DIABETES_TYPE_1') || data.conditions.includes('DIABETES_TYPE_2')) {
        const device = await prisma.device.create({
          data: {
            patientId: patient.id,
            organizationId: org.id,
            type: 'GLUCOSE_MONITOR',
            serialNumber: `GM-${patient.id.slice(-6)}`,
            manufacturer: 'Dexcom',
            model: 'G6',
            status: 'ACTIVE',
            lastSyncAt: new Date(),
          },
        });
        devices.push({ device, type: 'BLOOD_GLUCOSE' });
      }

      if (data.conditions.includes('COPD') || data.conditions.includes('CONGESTIVE_HEART_FAILURE')) {
        const device = await prisma.device.create({
          data: {
            patientId: patient.id,
            organizationId: org.id,
            type: 'PULSE_OXIMETER',
            serialNumber: `OX-${patient.id.slice(-6)}`,
            manufacturer: 'Nonin',
            model: '3150',
            status: 'ACTIVE',
            lastSyncAt: new Date(),
          },
        });
        devices.push({ device, type: 'PULSE_OXIMETRY' });
      }

      if (data.conditions.includes('OBESITY') || data.conditions.includes('CONGESTIVE_HEART_FAILURE')) {
        const device = await prisma.device.create({
          data: {
            patientId: patient.id,
            organizationId: org.id,
            type: 'WEIGHT_SCALE',
            serialNumber: `WS-${patient.id.slice(-6)}`,
            manufacturer: 'Withings',
            model: 'Body+',
            status: 'ACTIVE',
            lastSyncAt: new Date(),
          },
        });
        devices.push({ device, type: 'WEIGHT' });
      }

      // Generate vital readings (30 days)
      const allReadings: any[] = [];

      for (const { device, type } of devices) {
        let readings: any[] = [];

        switch (type) {
          case 'BLOOD_PRESSURE':
            readings = generateVitalReadings(
              patient.id, org.id, device.id,
              VitalType.BLOOD_PRESSURE, 30,
              { systolic: 128, diastolic: 82, pulse: 72 },
              { systolic: 12, diastolic: 8, pulse: 8 },
              0.08, 0.18
            );
            break;

          case 'BLOOD_GLUCOSE':
            readings = generateVitalReadings(
              patient.id, org.id, device.id,
              VitalType.BLOOD_GLUCOSE, 30,
              { glucose: 120 },
              { glucose: 30 },
              0.1, 0.2
            );
            break;

          case 'PULSE_OXIMETRY':
            readings = generateVitalReadings(
              patient.id, org.id, device.id,
              VitalType.PULSE_OXIMETRY, 30,
              { spo2: 96, pulse: 75 },
              { spo2: 3, pulse: 10 },
              0.05, 0.12
            );
            break;

          case 'WEIGHT':
            readings = generateVitalReadings(
              patient.id, org.id, device.id,
              VitalType.WEIGHT, 30,
              { weight: 185 },
              { weight: 3 },
              0.02, 0.08
            );
            break;
        }

        allReadings.push(...readings);
      }

      // Insert readings in batches
      if (allReadings.length > 0) {
        await prisma.vitalReading.createMany({
          data: allReadings,
        });
        totalReadings += allReadings.length;
      }

      // Create medications based on conditions
      for (const condition of data.conditions) {
        const meds = MEDICATIONS_BY_CONDITION[condition] || [];
        for (const med of meds) {
          await prisma.patientMedication.create({
            data: {
              patientId: patient.id,
              organizationId: org.id,
              name: med.name,
              dosage: med.dosage,
              frequency: med.frequency,
              instructions: med.instructions,
              status: MedicationStatus.ACTIVE,
              startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Started 90 days ago
              prescribedBy: `Dr. ${physician.lastName}`,
              prescribedDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          });
        }
      }
    }

    console.log(`✓ Created ${totalReadings} vital readings (30 days history)\n`);

    // Create sample alerts for demo
    const activePatients = createdPatients.filter(p => p.data.status === 'ACTIVE');

    // Critical alert (most recent)
    const criticalPatient = activePatients[0];
    await prisma.alert.create({
      data: {
        patientId: criticalPatient.patient.id,
        organizationId: org.id,
        type: 'CRITICAL_VALUE',
        severity: AlertSeverity.CRITICAL,
        status: 'NEW',
        message: `Critical blood pressure reading: 178/105 mmHg`,
        metadata: { systolic: 178, diastolic: 105, pulse: 88 },
        assignedToId: careManager.id,
      },
    });

    // Warning alerts
    await prisma.alert.create({
      data: {
        patientId: activePatients[1].patient.id,
        organizationId: org.id,
        type: 'THRESHOLD_EXCEEDED',
        severity: AlertSeverity.SIGNIFICANT,
        status: 'ACKNOWLEDGED',
        message: `Elevated blood glucose: 245 mg/dL`,
        metadata: { glucose: 245 },
        assignedToId: careManager.id,
        acknowledgedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        acknowledgedById: careManager.id,
      },
    });

    await prisma.alert.create({
      data: {
        patientId: activePatients[2].patient.id,
        organizationId: org.id,
        type: 'THRESHOLD_EXCEEDED',
        severity: AlertSeverity.SIGNIFICANT,
        status: 'ESCALATED',
        message: `Low oxygen saturation: 89%`,
        metadata: { spo2: 89, pulse: 92 },
        assignedToId: careManager.id,
        escalatedToId: physician.id,
        acknowledgedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        acknowledgedById: careManager.id,
        escalatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
    });

    // Resolved alert (for history)
    await prisma.alert.create({
      data: {
        patientId: activePatients[3].patient.id,
        organizationId: org.id,
        type: 'THRESHOLD_EXCEEDED',
        severity: AlertSeverity.SIGNIFICANT,
        status: 'RESOLVED',
        message: `Weight gain of 4 lbs in 3 days`,
        metadata: { weight: 192, previousWeight: 188 },
        assignedToId: careManager.id,
        acknowledgedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        acknowledgedById: careManager.id,
        resolvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        resolution: 'Patient contacted. Adjusted medication and advised dietary changes.',
      },
    });

    console.log('✓ Created sample alerts\n');

    // Create care plans for some patients
    for (let i = 0; i < 5; i++) {
      const p = activePatients[i];
      await prisma.carePlan.create({
        data: {
          patientId: p.patient.id,
          organizationId: org.id,
          createdById: careManager.id,
          approvedById: physician.id,
          currentVersion: 1,
          status: 'ACTIVE',
          activatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          versions: {
            create: {
              organizationId: org.id,
              version: 1,
              goals: p.data.conditions.map((c, idx) => ({
                id: `goal-${idx}`,
                description: getGoalForCondition(c),
                targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
              })),
              vitalThresholds: {},
              medications: [],
              instructions: `Monitor vitals daily. Report any symptoms immediately. Follow up in 30 days.`,
              effectiveDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
      });
    }

    console.log('✓ Created care plans\n');

    // Create messaging conversations
    for (let i = 0; i < 3; i++) {
      const p = activePatients[i];
      const conversation = await prisma.conversation.create({
        data: {
          organizationId: org.id,
          patientId: p.patient.id,
          subject: `Care coordination - ${p.data.firstName} ${p.data.lastName}`,
          status: 'ACTIVE',
          lastMessageAt: new Date(),
          participants: {
            create: [
              { userId: p.user.id, organizationId: org.id, role: 'PATIENT' },
              { userId: careManager.id, organizationId: org.id, role: 'STAFF' },
            ],
          },
        },
      });

      // Add some messages
      const messages = [
        { senderId: careManager.id, content: `Hi ${p.data.firstName}, how are you feeling today?`, role: 'STAFF' },
        { senderId: p.user.id, content: `I'm doing okay. Blood pressure was a bit high this morning.`, role: 'PATIENT' },
        { senderId: careManager.id, content: `I see that in your readings. Did you take your medication today?`, role: 'STAFF' },
        { senderId: p.user.id, content: `Yes, I took it at 8am as usual.`, role: 'PATIENT' },
        { senderId: careManager.id, content: `Good. Please continue to monitor and let me know if it stays elevated. We might need to adjust your dosage.`, role: 'STAFF' },
      ];

      let messageTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
      for (const msg of messages) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            organizationId: org.id,
            senderId: msg.senderId,
            senderName: msg.senderId === careManager.id ? 'Emily Johnson' : `${p.data.firstName} ${p.data.lastName}`,
            senderRole: msg.role,
            content: msg.content,
            messageType: 'TEXT',
            isRead: true,
            sentAt: messageTime,
          },
        });
        messageTime = new Date(messageTime.getTime() + 5 * 60 * 1000); // 5 min apart
      }
    }

    console.log('✓ Created sample conversations\n');

    // Create billing records showing CPT code eligibility
    for (const p of activePatients.slice(0, 5)) {
      const transmissionDays = Math.floor(Math.random() * 10) + 15; // 15-25 days
      const interactionMinutes = Math.floor(Math.random() * 20) + 15; // 15-35 minutes

      await prisma.billingRecord.create({
        data: {
          patientId: p.patient.id,
          organizationId: org.id,
          periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          periodEnd: new Date(),
          dataTransmissionDays: transmissionDays,
          interactionMinutes,
          status: transmissionDays >= 16 && interactionMinutes >= 20 ? 'ELIGIBLE' : 'PENDING',
          activities: {
            create: [
              {
                organizationId: org.id,
                cptCode: 'CPT_99453',
                performedById: careManager.id,
                performedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
                durationMinutes: 30,
                description: 'Initial device setup and patient education',
              },
            ],
          },
        },
      });
    }

    console.log('✓ Created billing records\n');

    // Create time logs for interaction minutes
    for (const p of activePatients.slice(0, 5)) {
      const logsCount = Math.floor(Math.random() * 3) + 2; // 2-4 logs

      for (let i = 0; i < logsCount; i++) {
        await prisma.timeLog.create({
          data: {
            patientId: p.patient.id,
            organizationId: org.id,
            userId: Math.random() > 0.5 ? careManager.id : nurse2.id,
            activityType: ['CHART_REVIEW', 'PHONE_CALL', 'CARE_COORDINATION', 'VITAL_REVIEW'][Math.floor(Math.random() * 4)],
            startTime: new Date(Date.now() - (Math.random() * 20 + 5) * 24 * 60 * 60 * 1000),
            durationMinutes: Math.floor(Math.random() * 10) + 5, // 5-15 minutes
            notes: 'Routine care management activity',
            isBillable: true,
          },
        });
      }
    }

    console.log('✓ Created time logs\n');

    // Create caregiver access for one patient (demo family portal)
    const patientWithCaregiver = activePatients[0];
    const caregiverUser = await prisma.user.upsert({
      where: { email: 'caregiver.demo@demo.com' },
      update: {},
      create: {
        email: 'caregiver.demo@demo.com',
        firstName: 'Jennifer',
        lastName: 'Anderson',
        passwordHash,
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
        phone: '+1-555-9001',
        relationship: 'Daughter',
      },
    });

    await prisma.caregiverLink.upsert({
      where: {
        patientId_caregiverId: {
          patientId: patientWithCaregiver.patient.id,
          caregiverId: caregiver.id,
        },
      },
      update: {},
      create: {
        patientId: patientWithCaregiver.patient.id,
        caregiverId: caregiver.id,
        organizationId: org.id,
        relationshipType: 'ADULT_CHILD',
        accessLevel: 'FULL_ACCESS',
        status: 'ACTIVE',
        consentGrantedAt: new Date(),
      },
    });

    console.log('✓ Created caregiver for family portal demo\n');

    // Summary
    console.log('═'.repeat(50));
    console.log('✅ DEMO DATA SEEDING COMPLETE!');
    console.log('═'.repeat(50));
    console.log(`
📊 Created:
   • ${createdPatients.length} patients (${activePatients.length} active, ${createdPatients.length - activePatients.length} pending/consented)
   • ${totalReadings} vital readings (30-day history)
   • 4 sample alerts (Critical, Warning, Escalated, Resolved)
   • 5 care plans
   • 3 messaging conversations
   • Billing records with CPT code tracking
   • Time logs for interaction minutes
   • 1 caregiver for family portal demo

🔐 Demo Login Credentials:
   Admin:      admin@example.com / password123
   Physician:  dr.smith@demo.com / password123
   Nurse:      nurse.johnson@demo.com / password123
   Patient:    robert.anderson@demo.com / password123
   Caregiver:  caregiver.demo@demo.com / password123
`);

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function getGoalForCondition(condition: string): string {
  const goals: Record<string, string> = {
    'HYPERTENSION': 'Maintain blood pressure below 140/90 mmHg',
    'DIABETES_TYPE_2': 'Achieve HbA1c below 7.0%',
    'DIABETES_TYPE_1': 'Maintain blood glucose in target range 80-180 mg/dL',
    'CONGESTIVE_HEART_FAILURE': 'Maintain weight within 2 lbs of dry weight',
    'COPD': 'Maintain SpO2 above 92%',
    'CHRONIC_KIDNEY_DISEASE': 'Maintain eGFR stability',
    'OBESITY': 'Achieve 5% body weight reduction',
    'ATRIAL_FIBRILLATION': 'Maintain heart rate below 100 bpm at rest',
    'ASTHMA': 'Reduce rescue inhaler use to <2x per week',
    'SLEEP_APNEA': 'Achieve CPAP compliance >4 hours/night',
    'OSTEOARTHRITIS': 'Improve mobility and reduce pain',
    'ANXIETY': 'Reduce anxiety symptoms and improve daily function',
  };
  return goals[condition] || 'Improve overall health outcomes';
}

// Run if called directly
seedDemo()
  .then(() => {
    console.log('🎉 Demo seeding finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Demo seeding failed:', error);
    process.exit(1);
  });
