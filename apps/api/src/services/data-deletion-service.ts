import { prisma } from '../utils/prisma';
import { logSystemActivity } from '../utils/activity-logger';
import crypto from 'crypto';

interface DeletionRequestOptions {
  userId: string;
  reason?: string;
  gracePeriodDays?: number;
}

export class DataDeletionService {
  private static readonly DEFAULT_GRACE_PERIOD_DAYS = 30;

  /**
   * Request account deletion
   */
  static async requestDeletion(options: DeletionRequestOptions): Promise<{ requestId: string; scheduledFor: Date }> {
    const { userId, reason, gracePeriodDays = this.DEFAULT_GRACE_PERIOD_DAYS } = options;

    // Check if there's already a pending request
    const existingRequest = await prisma.dataDeletionRequest.findFirst({
      where: {
        userId,
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
    });

    if (existingRequest) {
      throw new Error('A deletion request is already pending');
    }

    // Calculate scheduled deletion date
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + gracePeriodDays);

    // Create deletion request
    const deletionRequest = await prisma.dataDeletionRequest.create({
      data: {
        userId,
        reason,
        scheduledFor,
        status: 'PENDING',
      },
    });

    // Soft delete user account immediately
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Log activity
    await logSystemActivity(
      'system', // organizationId - use 'system' for user-level actions
      'requested',
      {
        type: 'data_deletion',
        id: deletionRequest.id,
        name: 'Account deletion request',
      },
      { userId }
    );

    return {
      requestId: deletionRequest.id,
      scheduledFor,
    };
  }

  /**
   * Cancel deletion request (within grace period)
   */
  static async cancelDeletion(requestId: string, userId: string): Promise<void> {
    const request = await prisma.dataDeletionRequest.findFirst({
      where: {
        id: requestId,
        userId,
        status: 'PENDING',
      },
    });

    if (!request) {
      throw new Error('Deletion request not found or cannot be cancelled');
    }

    // Check if grace period has not expired
    if (new Date() > request.scheduledFor) {
      throw new Error('Grace period has expired, cannot cancel deletion');
    }

    // Cancel request
    await prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    // Restore user account
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: null,
        isActive: true,
      },
    });

    // Log activity
    await logSystemActivity(
      'system',
      'cancelled',
      {
        type: 'data_deletion',
        id: requestId,
        name: 'Account deletion cancelled',
      },
      { userId }
    );
  }

  /**
   * Process account deletion (called by job processor)
   */
  static async processDeletion(requestId: string): Promise<void> {
    const request = await prisma.dataDeletionRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new Error('Deletion request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Deletion request is not pending');
    }

    // Check if scheduled time has arrived
    if (new Date() < request.scheduledFor) {
      throw new Error('Deletion is not yet scheduled');
    }

    try {
      // Update status to processing
      await prisma.dataDeletionRequest.update({
        where: { id: requestId },
        data: { status: 'PROCESSING' },
      });

      const userId = request.userId;

      // Step 1: Delete personal data from various tables
      await this.deletePersonalData(userId);

      // Step 2: Anonymize audit logs (keep for compliance)
      await this.anonymizeAuditLogs(userId);

      // Step 3: Hard delete user account
      await prisma.user.delete({
        where: { id: userId },
      });

      // Update request status
      await prisma.dataDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      console.log(`Successfully deleted user data for userId: ${userId}`);
    } catch (error) {
      // Update request with error
      await prisma.dataDeletionRequest.update({
        where: { id: requestId },
        data: { status: 'FAILED' },
      });

      throw error;
    }
  }

  /**
   * Delete personal data
   */
  private static async deletePersonalData(userId: string): Promise<void> {
    // Delete sessions
    await prisma.session.deleteMany({
      where: { userId },
    });

    // Delete password resets
    await prisma.passwordReset.deleteMany({
      where: { userId },
    });

    // Delete notifications
    await prisma.notification.deleteMany({
      where: { userId },
    });

    // Delete notification preferences
    await prisma.notificationPreference.deleteMany({
      where: { userId },
    });

    // Delete consent records
    await prisma.consentRecord.deleteMany({
      where: { userId },
    });

    // Delete data export requests
    await prisma.dataExportRequest.deleteMany({
      where: { userId },
    });

    // Delete OAuth connections
    await prisma.userAuthProvider.deleteMany({
      where: { userId },
    });

    // Remove from organizations
    await prisma.organizationMember.deleteMany({
      where: { userId },
    });

    // Remove from teams
    await prisma.teamMember.deleteMany({
      where: { userId },
    });

    // Delete uploaded files
    await prisma.file.deleteMany({
      where: { uploadedBy: userId },
    });

    console.log(`Deleted personal data for userId: ${userId}`);
  }

  /**
   * Anonymize audit logs (required for compliance)
   */
  private static async anonymizeAuditLogs(userId: string): Promise<void> {
    const anonymousId = this.generateAnonymousId(userId);

    // Update audit logs to use anonymous ID
    await prisma.auditLog.updateMany({
      where: { userId },
      data: {
        userId: anonymousId,
        // Clear IP address and user agent
        ipAddress: null,
        userAgent: null,
      },
    });

    // Update activities
    await prisma.activity.updateMany({
      where: { actorId: userId },
      data: {
        actorId: anonymousId,
      },
    });

    console.log(`Anonymized audit logs for userId: ${userId}`);
  }

  /**
   * Generate anonymous ID for audit trail
   */
  private static generateAnonymousId(userId: string): string {
    // Create a hash of the user ID for anonymization
    const hash = crypto.createHash('sha256').update(userId).digest('hex');
    return `anonymous-${hash.substring(0, 16)}`;
  }

  /**
   * Get deletion request status
   */
  static async getDeletionStatus(userId: string) {
    const request = await prisma.dataDeletionRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!request) {
      return null;
    }

    return {
      id: request.id,
      status: request.status,
      reason: request.reason,
      scheduledFor: request.scheduledFor,
      completedAt: request.completedAt,
      createdAt: request.createdAt,
      canCancel: request.status === 'PENDING' && new Date() < request.scheduledFor,
      daysRemaining: request.status === 'PENDING'
        ? Math.ceil((request.scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0,
    };
  }

  /**
   * Get pending deletions (for job processor)
   */
  static async getPendingDeletions() {
    return prisma.dataDeletionRequest.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Cleanup old completed deletion requests
   */
  static async cleanupOldRequests(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.dataDeletionRequest.deleteMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
