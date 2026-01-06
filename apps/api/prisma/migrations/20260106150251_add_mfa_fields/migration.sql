/*
  Warnings:

  - Added the required column `organizationId` to the `billable_activities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `care_plan_versions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `caregiver_links` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "billable_activities" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "care_plan_versions" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "caregiver_links" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mfaBackupCodes" TEXT[],
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaEnabledAt" TIMESTAMP(3),
ADD COLUMN     "mfaSecret" TEXT;

-- CreateIndex
CREATE INDEX "billable_activities_organizationId_idx" ON "billable_activities"("organizationId");

-- CreateIndex
CREATE INDEX "care_plan_versions_organizationId_idx" ON "care_plan_versions"("organizationId");

-- CreateIndex
CREATE INDEX "caregiver_links_organizationId_idx" ON "caregiver_links"("organizationId");
