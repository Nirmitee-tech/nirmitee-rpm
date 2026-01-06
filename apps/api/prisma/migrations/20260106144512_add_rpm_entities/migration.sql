-- CreateEnum
CREATE TYPE "PatientCondition" AS ENUM ('HYPERTENSION', 'CONGESTIVE_HEART_FAILURE', 'DIABETES_TYPE_1', 'DIABETES_TYPE_2', 'COPD', 'CHRONIC_KIDNEY_DISEASE', 'ARRHYTHMIA', 'PRE_DIABETES', 'OBESITY', 'ASTHMA', 'POST_COVID', 'POST_SURGICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('SPOUSE_PARTNER', 'ADULT_CHILD', 'PARENT', 'SIBLING', 'PROFESSIONAL_CAREGIVER', 'LEGAL_GUARDIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "CaregiverAccessLevel" AS ENUM ('VIEW_VITALS', 'VIEW_ALERTS', 'VIEW_CARE_PLAN', 'FULL_ACCESS');

-- CreateEnum
CREATE TYPE "CaregiverLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('BLOOD_PRESSURE_MONITOR', 'WEIGHT_SCALE', 'PULSE_OXIMETER', 'GLUCOSE_MONITOR', 'CONTINUOUS_GLUCOSE_MONITOR', 'THERMOMETER', 'ACTIVITY_TRACKER', 'ECG_MONITOR', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MALFUNCTIONING', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "VitalType" AS ENUM ('BLOOD_PRESSURE', 'WEIGHT', 'BLOOD_GLUCOSE', 'PULSE_OXIMETRY', 'HEART_RATE', 'TEMPERATURE', 'RESPIRATORY_RATE', 'BMI');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('DEVICE', 'MANUAL', 'EHR_IMPORT', 'CAREGIVER_ENTRY');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('THRESHOLD_EXCEEDED', 'TREND_CONCERNING', 'ADHERENCE_LOW', 'DEVICE_MALFUNCTION', 'MISSED_READING', 'CRITICAL_VALUE', 'SYSTEM_GENERATED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CRITICAL', 'SIGNIFICANT', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('NEW', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CarePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CPTCode" AS ENUM ('CPT_99453', 'CPT_99445', 'CPT_99454', 'CPT_99470', 'CPT_99457', 'CPT_99458');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'SUBMITTED', 'ACCEPTED', 'DENIED', 'PAID', 'APPEALED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ALERT_CRITICAL';
ALTER TYPE "NotificationType" ADD VALUE 'ALERT_SIGNIFICANT';
ALTER TYPE "NotificationType" ADD VALUE 'CARE_PLAN_UPDATED';

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,
    "address" JSONB,
    "conditions" "PatientCondition"[],
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "enrollmentStatus" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "enrollmentDate" TIMESTAMP(3),
    "primaryPhysicianId" TEXT,
    "assignedClinicalStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregivers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phone" TEXT,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caregivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_links" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "relationshipType" "RelationshipType" NOT NULL,
    "accessLevel" "CaregiverAccessLevel" NOT NULL DEFAULT 'VIEW_VITALS',
    "status" "CaregiverLinkStatus" NOT NULL DEFAULT 'PENDING',
    "consentGrantedAt" TIMESTAMP(3),
    "consentRevokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caregiver_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_readings" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deviceId" TEXT,
    "type" "VitalType" NOT NULL,
    "values" JSONB NOT NULL,
    "unit" TEXT NOT NULL,
    "source" "DataSource" NOT NULL DEFAULT 'DEVICE',
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vitalReadingId" TEXT,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'NEW',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "assignedToId" TEXT,
    "escalatedToId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plans" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "CarePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "activatedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_plan_versions" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "goals" JSONB NOT NULL,
    "vitalThresholds" JSONB NOT NULL,
    "medications" JSONB,
    "instructions" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "care_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_records" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dataTransmissionDays" INTEGER NOT NULL DEFAULT 0,
    "interactionMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "claimId" TEXT,
    "claimSubmittedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "amount" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billable_activities" (
    "id" TEXT NOT NULL,
    "billingRecordId" TEXT NOT NULL,
    "cptCode" "CPTCode" NOT NULL,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billable_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_userId_key" ON "patients"("userId");

-- CreateIndex
CREATE INDEX "patients_organizationId_idx" ON "patients"("organizationId");

-- CreateIndex
CREATE INDEX "patients_userId_idx" ON "patients"("userId");

-- CreateIndex
CREATE INDEX "patients_enrollmentStatus_idx" ON "patients"("enrollmentStatus");

-- CreateIndex
CREATE INDEX "patients_primaryPhysicianId_idx" ON "patients"("primaryPhysicianId");

-- CreateIndex
CREATE INDEX "patients_assignedClinicalStaffId_idx" ON "patients"("assignedClinicalStaffId");

-- CreateIndex
CREATE INDEX "patients_organizationId_enrollmentStatus_idx" ON "patients"("organizationId", "enrollmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "caregivers_userId_key" ON "caregivers"("userId");

-- CreateIndex
CREATE INDEX "caregivers_organizationId_idx" ON "caregivers"("organizationId");

-- CreateIndex
CREATE INDEX "caregivers_userId_idx" ON "caregivers"("userId");

-- CreateIndex
CREATE INDEX "caregiver_links_patientId_idx" ON "caregiver_links"("patientId");

-- CreateIndex
CREATE INDEX "caregiver_links_caregiverId_idx" ON "caregiver_links"("caregiverId");

-- CreateIndex
CREATE INDEX "caregiver_links_status_idx" ON "caregiver_links"("status");

-- CreateIndex
CREATE UNIQUE INDEX "caregiver_links_patientId_caregiverId_key" ON "caregiver_links"("patientId", "caregiverId");

-- CreateIndex
CREATE INDEX "devices_patientId_idx" ON "devices"("patientId");

-- CreateIndex
CREATE INDEX "devices_organizationId_idx" ON "devices"("organizationId");

-- CreateIndex
CREATE INDEX "devices_type_idx" ON "devices"("type");

-- CreateIndex
CREATE INDEX "devices_status_idx" ON "devices"("status");

-- CreateIndex
CREATE INDEX "devices_organizationId_patientId_idx" ON "devices"("organizationId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_serialNumber_key" ON "devices"("serialNumber");

-- CreateIndex
CREATE INDEX "vital_readings_patientId_idx" ON "vital_readings"("patientId");

-- CreateIndex
CREATE INDEX "vital_readings_organizationId_idx" ON "vital_readings"("organizationId");

-- CreateIndex
CREATE INDEX "vital_readings_type_idx" ON "vital_readings"("type");

-- CreateIndex
CREATE INDEX "vital_readings_recordedAt_idx" ON "vital_readings"("recordedAt");

-- CreateIndex
CREATE INDEX "vital_readings_deviceId_idx" ON "vital_readings"("deviceId");

-- CreateIndex
CREATE INDEX "vital_readings_patientId_recordedAt_idx" ON "vital_readings"("patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "vital_readings_organizationId_recordedAt_idx" ON "vital_readings"("organizationId", "recordedAt");

-- CreateIndex
CREATE INDEX "vital_readings_patientId_type_recordedAt_idx" ON "vital_readings"("patientId", "type", "recordedAt");

-- CreateIndex
CREATE INDEX "alerts_patientId_idx" ON "alerts"("patientId");

-- CreateIndex
CREATE INDEX "alerts_organizationId_idx" ON "alerts"("organizationId");

-- CreateIndex
CREATE INDEX "alerts_severity_idx" ON "alerts"("severity");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_type_idx" ON "alerts"("type");

-- CreateIndex
CREATE INDEX "alerts_assignedToId_idx" ON "alerts"("assignedToId");

-- CreateIndex
CREATE INDEX "alerts_escalatedToId_idx" ON "alerts"("escalatedToId");

-- CreateIndex
CREATE INDEX "alerts_createdAt_idx" ON "alerts"("createdAt");

-- CreateIndex
CREATE INDEX "alerts_organizationId_status_idx" ON "alerts"("organizationId", "status");

-- CreateIndex
CREATE INDEX "alerts_patientId_status_idx" ON "alerts"("patientId", "status");

-- CreateIndex
CREATE INDEX "alerts_assignedToId_status_idx" ON "alerts"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "care_plans_patientId_idx" ON "care_plans"("patientId");

-- CreateIndex
CREATE INDEX "care_plans_organizationId_idx" ON "care_plans"("organizationId");

-- CreateIndex
CREATE INDEX "care_plans_status_idx" ON "care_plans"("status");

-- CreateIndex
CREATE INDEX "care_plans_createdById_idx" ON "care_plans"("createdById");

-- CreateIndex
CREATE INDEX "care_plans_approvedById_idx" ON "care_plans"("approvedById");

-- CreateIndex
CREATE INDEX "care_plan_versions_carePlanId_idx" ON "care_plan_versions"("carePlanId");

-- CreateIndex
CREATE INDEX "care_plan_versions_effectiveDate_idx" ON "care_plan_versions"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "care_plan_versions_carePlanId_version_key" ON "care_plan_versions"("carePlanId", "version");

-- CreateIndex
CREATE INDEX "billing_records_patientId_idx" ON "billing_records"("patientId");

-- CreateIndex
CREATE INDEX "billing_records_organizationId_idx" ON "billing_records"("organizationId");

-- CreateIndex
CREATE INDEX "billing_records_status_idx" ON "billing_records"("status");

-- CreateIndex
CREATE INDEX "billing_records_periodStart_idx" ON "billing_records"("periodStart");

-- CreateIndex
CREATE INDEX "billing_records_periodEnd_idx" ON "billing_records"("periodEnd");

-- CreateIndex
CREATE INDEX "billing_records_organizationId_periodStart_idx" ON "billing_records"("organizationId", "periodStart");

-- CreateIndex
CREATE INDEX "billable_activities_billingRecordId_idx" ON "billable_activities"("billingRecordId");

-- CreateIndex
CREATE INDEX "billable_activities_cptCode_idx" ON "billable_activities"("cptCode");

-- CreateIndex
CREATE INDEX "billable_activities_performedById_idx" ON "billable_activities"("performedById");

-- CreateIndex
CREATE INDEX "billable_activities_performedAt_idx" ON "billable_activities"("performedAt");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_primaryPhysicianId_fkey" FOREIGN KEY ("primaryPhysicianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_assignedClinicalStaffId_fkey" FOREIGN KEY ("assignedClinicalStaffId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregivers" ADD CONSTRAINT "caregivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_links" ADD CONSTRAINT "caregiver_links_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_links" ADD CONSTRAINT "caregiver_links_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "caregivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_readings" ADD CONSTRAINT "vital_readings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_readings" ADD CONSTRAINT "vital_readings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_vitalReadingId_fkey" FOREIGN KEY ("vitalReadingId") REFERENCES "vital_readings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_escalatedToId_fkey" FOREIGN KEY ("escalatedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_plan_versions" ADD CONSTRAINT "care_plan_versions_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "care_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billable_activities" ADD CONSTRAINT "billable_activities_billingRecordId_fkey" FOREIGN KEY ("billingRecordId") REFERENCES "billing_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billable_activities" ADD CONSTRAINT "billable_activities_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
