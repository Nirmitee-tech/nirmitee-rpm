import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';

interface ConsentUpdate {
  userId: string;
  consentType: 'ESSENTIAL' | 'ANALYTICS' | 'MARKETING' | 'THIRD_PARTY';
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
}

interface ConsentPreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  thirdParty: boolean;
}

export class ConsentService {
  /**
   * Update user consent preferences
   */
  static async updateConsent(data: ConsentUpdate): Promise<void> {
    const { userId, consentType, granted, ipAddress, userAgent } = data;

    const now = new Date();

    await prisma.consentRecord.upsert({
      where: {
        userId_consentType: {
          userId,
          consentType,
        },
      },
      create: {
        userId,
        consentType,
        granted,
        grantedAt: granted ? now : null,
        revokedAt: granted ? null : now,
        ipAddress,
        userAgent,
      },
      update: {
        granted,
        grantedAt: granted ? now : undefined,
        revokedAt: granted ? null : now,
        ipAddress,
        userAgent,
        updatedAt: now,
      },
    });
  }

  /**
   * Update multiple consent preferences at once
   */
  static async updateConsentPreferences(
    userId: string,
    preferences: Partial<ConsentPreferences>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const updates: ConsentUpdate[] = [];

    if (preferences.essential !== undefined) {
      updates.push({
        userId,
        consentType: 'ESSENTIAL',
        granted: preferences.essential,
        ipAddress,
        userAgent,
      });
    }

    if (preferences.analytics !== undefined) {
      updates.push({
        userId,
        consentType: 'ANALYTICS',
        granted: preferences.analytics,
        ipAddress,
        userAgent,
      });
    }

    if (preferences.marketing !== undefined) {
      updates.push({
        userId,
        consentType: 'MARKETING',
        granted: preferences.marketing,
        ipAddress,
        userAgent,
      });
    }

    if (preferences.thirdParty !== undefined) {
      updates.push({
        userId,
        consentType: 'THIRD_PARTY',
        granted: preferences.thirdParty,
        ipAddress,
        userAgent,
      });
    }

    // Update all consents in parallel
    await Promise.all(updates.map((update) => this.updateConsent(update)));
  }

  /**
   * Get user consent preferences
   */
  static async getConsentPreferences(userId: string): Promise<ConsentPreferences> {
    const records = await prisma.consentRecord.findMany({
      where: { userId },
    });

    // Default values - essential is always true
    const preferences: ConsentPreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      thirdParty: false,
    };

    // Update with actual values
    records.forEach((record) => {
      switch (record.consentType) {
        case 'ESSENTIAL':
          preferences.essential = record.granted;
          break;
        case 'ANALYTICS':
          preferences.analytics = record.granted;
          break;
        case 'MARKETING':
          preferences.marketing = record.granted;
          break;
        case 'THIRD_PARTY':
          preferences.thirdParty = record.granted;
          break;
      }
    });

    return preferences;
  }

  /**
   * Get consent history for a user
   */
  static async getConsentHistory(userId: string) {
    return prisma.consentRecord.findMany({
      where: { userId },
      select: {
        id: true,
        consentType: true,
        granted: true,
        grantedAt: true,
        revokedAt: true,
        ipAddress: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Check if user has granted specific consent
   */
  static async hasConsent(userId: string, consentType: 'ESSENTIAL' | 'ANALYTICS' | 'MARKETING' | 'THIRD_PARTY'): Promise<boolean> {
    const record = await prisma.consentRecord.findUnique({
      where: {
        userId_consentType: {
          userId,
          consentType,
        },
      },
    });

    // Essential consent is always granted
    if (consentType === 'ESSENTIAL') {
      return true;
    }

    return record?.granted ?? false;
  }

  /**
   * Revoke all non-essential consents
   */
  static async revokeAllNonEssential(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const now = new Date();

    await prisma.consentRecord.updateMany({
      where: {
        userId,
        consentType: {
          not: 'ESSENTIAL',
        },
      },
      data: {
        granted: false,
        revokedAt: now,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
      },
    });
  }

  /**
   * Initialize default consents for new user
   */
  static async initializeDefaultConsents(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const now = new Date();

    const consents = [
      { consentType: 'ESSENTIAL', granted: true },
      { consentType: 'ANALYTICS', granted: false },
      { consentType: 'MARKETING', granted: false },
      { consentType: 'THIRD_PARTY', granted: false },
    ] as const;

    await Promise.all(
      consents.map((consent) =>
        prisma.consentRecord.upsert({
          where: {
            userId_consentType: {
              userId,
              consentType: consent.consentType,
            },
          },
          create: {
            userId,
            consentType: consent.consentType,
            granted: consent.granted,
            grantedAt: consent.granted ? now : null,
            ipAddress,
            userAgent,
          },
          update: {},
        })
      )
    );
  }

  /**
   * Get consent statistics (for admin dashboard)
   */
  static async getConsentStatistics() {
    const stats = await prisma.consentRecord.groupBy({
      by: ['consentType', 'granted'],
      _count: true,
    });

    const result: Record<string, { granted: number; revoked: number }> = {
      ESSENTIAL: { granted: 0, revoked: 0 },
      ANALYTICS: { granted: 0, revoked: 0 },
      MARKETING: { granted: 0, revoked: 0 },
      THIRD_PARTY: { granted: 0, revoked: 0 },
    };

    stats.forEach((stat) => {
      if (stat.granted) {
        result[stat.consentType].granted = stat._count;
      } else {
        result[stat.consentType].revoked = stat._count;
      }
    });

    return result;
  }
}
