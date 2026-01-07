import { GDPRService } from '../../services/gdpr-service';
import { DataDeletionService } from '../../services/data-deletion-service';
import { prisma } from '../../utils/prisma';

/**
 * GDPR Job Processor
 * Handles scheduled GDPR compliance tasks
 */
export class GDPRProcessor {
  /**
   * Process pending data export requests
   */
  static async processPendingExports(): Promise<void> {
    console.log('[GDPR] Processing pending export requests...');

    try {
      // Get all pending export requests
      const pendingExports = await prisma.dataExportRequest.findMany({
        where: {
          status: 'PENDING',
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 10, // Process 10 at a time
      });

      console.log(`[GDPR] Found ${pendingExports.length} pending export requests`);

      for (const exportRequest of pendingExports) {
        try {
          await GDPRService.processDataExport(exportRequest.id);
          console.log(`[GDPR] Successfully processed export ${exportRequest.id}`);
        } catch (error) {
          console.error(`[GDPR] Failed to process export ${exportRequest.id}:`, error);
        }
      }

      // Cleanup expired exports
      const deletedCount = await GDPRService.cleanupExpiredExports();
      if (deletedCount > 0) {
        console.log(`[GDPR] Cleaned up ${deletedCount} expired exports`);
      }
    } catch (error) {
      console.error('[GDPR] Error processing exports:', error);
      throw error;
    }
  }

  /**
   * Process scheduled account deletions
   */
  static async processScheduledDeletions(): Promise<void> {
    console.log('[GDPR] Processing scheduled deletions...');

    try {
      // Get deletions that are scheduled for now or earlier
      const scheduledDeletions = await DataDeletionService.getPendingDeletions();

      console.log(`[GDPR] Found ${scheduledDeletions.length} scheduled deletions`);

      for (const deletion of scheduledDeletions) {
        try {
          console.log(`[GDPR] Processing deletion for user ${deletion.user.email}`);
          await DataDeletionService.processDeletion(deletion.id);
          console.log(`[GDPR] Successfully deleted user ${deletion.user.email}`);
        } catch (error) {
          console.error(`[GDPR] Failed to process deletion ${deletion.id}:`, error);
        }
      }

      // Cleanup old completed requests
      const cleanedCount = await DataDeletionService.cleanupOldRequests(90);
      if (cleanedCount > 0) {
        console.log(`[GDPR] Cleaned up ${cleanedCount} old deletion requests`);
      }
    } catch (error) {
      console.error('[GDPR] Error processing deletions:', error);
      throw error;
    }
  }

  /**
   * Run all GDPR compliance jobs
   */
  static async runAll(): Promise<void> {
    console.log('[GDPR] Running all GDPR compliance jobs...');

    try {
      await this.processPendingExports();
      await this.processScheduledDeletions();
      console.log('[GDPR] All GDPR jobs completed');
    } catch (error) {
      console.error('[GDPR] Error running GDPR jobs:', error);
      throw error;
    }
  }

  /**
   * Get job statistics
   */
  static async getStatistics() {
    const [
      pendingExports,
      processingExports,
      completedExports,
      failedExports,
      pendingDeletions,
      processingDeletions,
      completedDeletions,
    ] = await Promise.all([
      prisma.dataExportRequest.count({ where: { status: 'PENDING' } }),
      prisma.dataExportRequest.count({ where: { status: 'PROCESSING' } }),
      prisma.dataExportRequest.count({ where: { status: 'COMPLETED' } }),
      prisma.dataExportRequest.count({ where: { status: 'FAILED' } }),
      prisma.dataDeletionRequest.count({ where: { status: 'PENDING' } }),
      prisma.dataDeletionRequest.count({ where: { status: 'PROCESSING' } }),
      prisma.dataDeletionRequest.count({ where: { status: 'COMPLETED' } }),
    ]);

    return {
      exports: {
        pending: pendingExports,
        processing: processingExports,
        completed: completedExports,
        failed: failedExports,
      },
      deletions: {
        pending: pendingDeletions,
        processing: processingDeletions,
        completed: completedDeletions,
      },
    };
  }
}

/**
 * Initialize GDPR job scheduler
 * This should be called when the application starts
 */
export function initializeGDPRJobs(): void {
  console.log('[GDPR] Initializing GDPR job scheduler...');

  // Run immediately on startup
  GDPRProcessor.runAll().catch((error) => {
    console.error('[GDPR] Error in startup job:', error);
  });

  // Schedule to run every hour
  setInterval(
    async () => {
      try {
        await GDPRProcessor.runAll();
      } catch (error) {
        console.error('[GDPR] Error in scheduled job:', error);
      }
    },
    60 * 60 * 1000 // 1 hour
  );

  console.log('[GDPR] GDPR job scheduler initialized (runs every hour)');
}
