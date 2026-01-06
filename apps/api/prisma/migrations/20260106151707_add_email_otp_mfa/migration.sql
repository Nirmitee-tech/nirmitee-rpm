-- CreateEnum
CREATE TYPE "MfaMethod" AS ENUM ('TOTP', 'EMAIL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailOtpCode" TEXT,
ADD COLUMN     "emailOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "mfaMethod" "MfaMethod";
