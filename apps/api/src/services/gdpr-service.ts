import { prisma } from '../utils/prisma';
import { logSystemActivity } from '../utils/activity-logger';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';

interface ExportDataOptions {
  userId: string;
  format?: 'JSON' | 'ZIP';
}

interface ExportedData {
  user: Record<string, unknown>;
  organizations: Record<string, unknown>[];
  teams: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  activities: Record<string, unknown>[];
  consentRecords: Record<string, unknown>[];
  metadata: {
    exportedAt: string;
    userId: string;
    dataVersion: string;
  };
}

export class GDPRService {
  /**
   * Request a data export for a user
   */
  static async requestDataExport(options: ExportDataOptions): Promise<{ requestId: string }> {
    const { userId, format = 'JSON' } = options;

    // Check if there's already a pending/processing request
    const existingRequest = await prisma.dataExportRequest.findFirst({
      where: {
        userId,
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
    });

    if (existingRequest) {
      throw new Error('A data export request is already in progress');
    }

    // Create export request
    const exportRequest = await prisma.dataExportRequest.create({
      data: {
        userId,
        format,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Log activity
    await logSystemActivity(
      'system',
      'requested',
      {
        type: 'data_export',
        id: exportRequest.id,
        name: 'Data export request',
      },
      { userId }
    );

    return { requestId: exportRequest.id };
  }

  /**
   * Get data export request status
   */
  static async getExportStatus(requestId: string, userId: string) {
    const request = await prisma.dataExportRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
    });

    if (!request) {
      throw new Error('Export request not found');
    }

    return {
      id: request.id,
      status: request.status,
      format: request.format,
      createdAt: request.createdAt,
      completedAt: request.completedAt,
      expiresAt: request.expiresAt,
      isExpired: request.expiresAt ? new Date() > request.expiresAt : false,
    };
  }

  /**
   * Process data export (called by job processor)
   */
  static async processDataExport(requestId: string): Promise<void> {
    const request = await prisma.dataExportRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new Error('Export request not found');
    }

    try {
      // Update status to processing
      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: { status: 'PROCESSING' },
      });

      // Collect user data
      const exportData = await this.collectUserData(request.userId);

      // Create export directory if it doesn't exist
      const exportDir = path.join(process.cwd(), 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const fileName = `user-data-${request.userId}-${Date.now()}`;
      let filePath: string;

      if (request.format === 'ZIP') {
        filePath = path.join(exportDir, `${fileName}.zip`);
        await this.createZipExport(exportData, filePath);
      } else {
        filePath = path.join(exportDir, `${fileName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      }

      // Update request with file location
      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          fileLocation: filePath,
          completedAt: new Date(),
        },
      });

      // Log activity
      await logSystemActivity(
        'system',
        'completed',
        {
          type: 'data_export',
          id: requestId,
          name: 'Data export',
        },
        { userId: request.userId }
      );
    } catch (error) {
      // Update request with error
      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Collect all user data for export
   */
  private static async collectUserData(userId: string): Promise<ExportedData> {
    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        emailVerified: true,
        isActive: true,
        lastLoginAt: true,
        mfaEnabled: true,
        mfaMethod: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get organizations
    const organizationMembers = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    // Get teams
    const teamMembers = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Get notifications
    const notifications = await prisma.notification.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit to last 1000 notifications
    });

    // Get sessions
    const sessions = await prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Get audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        ipAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5000, // Limit to last 5000 logs
    });

    // Get activities
    const activities = await prisma.activity.findMany({
      where: { actorId: userId },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        entityName: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // Get consent records
    const consentRecords = await prisma.consentRecord.findMany({
      where: { userId },
      select: {
        id: true,
        consentType: true,
        granted: true,
        grantedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    return {
      user: user as Record<string, unknown>,
      organizations: organizationMembers.map((om) => ({
        organizationId: om.organization.id,
        organizationName: om.organization.name,
        organizationSlug: om.organization.slug,
        role: om.role.name,
        joinedAt: om.joinedAt,
        status: om.status,
      })),
      teams: teamMembers.map((tm) => ({
        teamId: tm.team.id,
        teamName: tm.team.name,
        teamDescription: tm.team.description,
        role: tm.role,
        joinedAt: tm.joinedAt,
      })),
      notifications: notifications as Record<string, unknown>[],
      sessions: sessions as Record<string, unknown>[],
      auditLogs: auditLogs as Record<string, unknown>[],
      activities: activities as Record<string, unknown>[],
      consentRecords: consentRecords as Record<string, unknown>[],
      metadata: {
        exportedAt: new Date().toISOString(),
        userId,
        dataVersion: '1.0',
      },
    };
  }

  /**
   * Create ZIP archive of exported data
   */
  private static async createZipExport(data: ExportedData, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);

      // Add JSON files to archive
      archive.append(JSON.stringify(data.user, null, 2), { name: 'profile.json' });
      archive.append(JSON.stringify(data.organizations, null, 2), { name: 'organizations.json' });
      archive.append(JSON.stringify(data.teams, null, 2), { name: 'teams.json' });
      archive.append(JSON.stringify(data.notifications, null, 2), { name: 'notifications.json' });
      archive.append(JSON.stringify(data.sessions, null, 2), { name: 'sessions.json' });
      archive.append(JSON.stringify(data.auditLogs, null, 2), { name: 'audit_logs.json' });
      archive.append(JSON.stringify(data.activities, null, 2), { name: 'activities.json' });
      archive.append(JSON.stringify(data.consentRecords, null, 2), { name: 'consents.json' });
      archive.append(JSON.stringify(data.metadata, null, 2), { name: 'metadata.json' });

      archive.finalize();
    });
  }

  /**
   * Get download URL for completed export
   */
  static async getDownloadPath(requestId: string, userId: string): Promise<string> {
    const request = await prisma.dataExportRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
    });

    if (!request) {
      throw new Error('Export request not found');
    }

    if (request.status !== 'COMPLETED') {
      throw new Error('Export is not ready for download');
    }

    if (!request.fileLocation) {
      throw new Error('Export file not found');
    }

    // Check if expired
    if (request.expiresAt && new Date() > request.expiresAt) {
      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: { status: 'EXPIRED' },
      });
      throw new Error('Export has expired');
    }

    return request.fileLocation;
  }

  /**
   * Get all export requests for a user
   */
  static async getUserExportRequests(userId: string) {
    return prisma.dataExportRequest.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        format: true,
        createdAt: true,
        completedAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Clean up expired exports
   */
  static async cleanupExpiredExports(): Promise<number> {
    const expiredRequests = await prisma.dataExportRequest.findMany({
      where: {
        status: 'COMPLETED',
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    let deletedCount = 0;

    for (const request of expiredRequests) {
      try {
        // Delete file if it exists
        if (request.fileLocation && fs.existsSync(request.fileLocation)) {
          fs.unlinkSync(request.fileLocation);
        }

        // Update status to expired
        await prisma.dataExportRequest.update({
          where: { id: request.id },
          data: { status: 'EXPIRED', fileLocation: null },
        });

        deletedCount++;
      } catch (error) {
        console.error(`Failed to cleanup export ${request.id}:`, error);
      }
    }

    return deletedCount;
  }
}
