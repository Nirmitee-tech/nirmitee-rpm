-- CreateEnum
CREATE TYPE "OAuthProviderType" AS ENUM ('GOOGLE', 'MICROSOFT', 'GITHUB', 'OKTA', 'AUTH0', 'SAML');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "auth_providers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "provider" "OAuthProviderType" NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "tenantId" TEXT,
    "domain" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY['openid', 'email', 'profile']::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoProvision" BOOLEAN NOT NULL DEFAULT false,
    "defaultRoleId" TEXT,
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_auth_providers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "profile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_auth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_providers_provider_idx" ON "auth_providers"("provider");

-- CreateIndex
CREATE INDEX "auth_providers_enabled_idx" ON "auth_providers"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "auth_providers_organizationId_provider_key" ON "auth_providers"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "user_auth_providers_userId_idx" ON "user_auth_providers"("userId");

-- CreateIndex
CREATE INDEX "user_auth_providers_email_idx" ON "user_auth_providers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_providers_providerId_providerUserId_key" ON "user_auth_providers"("providerId", "providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_providers_userId_providerId_key" ON "user_auth_providers"("userId", "providerId");

-- AddForeignKey
ALTER TABLE "auth_providers" ADD CONSTRAINT "auth_providers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_providers" ADD CONSTRAINT "auth_providers_defaultRoleId_fkey" FOREIGN KEY ("defaultRoleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_auth_providers" ADD CONSTRAINT "user_auth_providers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_auth_providers" ADD CONSTRAINT "user_auth_providers_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "auth_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
