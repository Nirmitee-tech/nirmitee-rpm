import { Router, Request, Response } from 'express';
import { backupService, BackupType, BackupStatus } from '../../services/backup-service';
import { jobService } from '../../services/job-service';
import { authenticate } from '../../middleware/auth-middleware';
import { log } from '../../utils/logger';
import { ApiError } from '../../utils/api-error';

const router = Router();

/**
 * Middleware to check if user is super admin
 * Backup operations are restricted to super admins only
 */
const requireSuperAdmin = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;

  if (!user || !user.isSuperAdmin) {
    throw ApiError.forbidden('Only super admins can perform backup operations');
  }

  next();
};

/**
 * POST /api/v1/admin/backups
 * Trigger a manual backup
 */
router.post('/', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { type = 'DATABASE' } = req.body;
  const user = (req as any).user;

  log.info('[BACKUP_ROUTES] Triggering manual backup', {
    type,
    userId: user.id,
  });

  // Validate backup type
  if (!['DATABASE', 'FILES', 'FULL'].includes(type)) {
    throw ApiError.badRequest('Invalid backup type. Must be DATABASE, FILES, or FULL');
  }

  try {
    // Add backup job to queue for async processing
    const job = await jobService.addBackupJob({
      type: type as BackupType,
      createdBy: user.id,
      metadata: {
        manual: true,
        triggeredBy: user.email,
      },
    });

    log.info('[BACKUP_ROUTES] Backup job created', { jobId: job.id, type });

    return res.status(202).json({
      success: true,
      message: 'Backup initiated successfully',
      data: {
        jobId: job.id,
        type,
        status: 'PENDING',
      },
    });
  } catch (error) {
    log.error('[BACKUP_ROUTES] Failed to trigger backup', error);
    throw ApiError.internal('Failed to trigger backup');
  }
});

/**
 * GET /api/v1/admin/backups
 * List all backups with filtering
 */
router.get('/', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const {
    type,
    status,
    startDate,
    endDate,
    limit = '50',
    offset = '0',
  } = req.query;

  log.info('[BACKUP_ROUTES] Listing backups', {
    type,
    status,
    startDate,
    endDate,
    limit,
    offset,
  });

  try {
    const filter: any = {
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    };

    if (type) {
      filter.type = type as BackupType;
    }

    if (status) {
      filter.status = status as BackupStatus;
    }

    if (startDate) {
      filter.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filter.endDate = new Date(endDate as string);
    }

    const result = await backupService.listBackups(filter);

    return res.json({
      success: true,
      data: {
        backups: result.backups.map((backup) => ({
          ...backup,
          size: backup.size?.toString(), // Convert BigInt to string for JSON
        })),
        total: result.total,
        limit: filter.limit,
        offset: filter.offset,
      },
    });
  } catch (error) {
    log.error('[BACKUP_ROUTES] Failed to list backups', error);
    throw ApiError.internal('Failed to list backups');
  }
});

/**
 * GET /api/v1/admin/backups/:id
 * Get a specific backup by ID
 */
router.get('/:id', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  log.info('[BACKUP_ROUTES] Getting backup', { backupId: id });

  try {
    const backup = await backupService.getBackup(id);

    if (!backup) {
      throw ApiError.notFound('Backup not found');
    }

    return res.json({
      success: true,
      data: {
        ...backup,
        size: backup.size?.toString(), // Convert BigInt to string for JSON
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    log.error('[BACKUP_ROUTES] Failed to get backup', error);
    throw ApiError.internal('Failed to get backup');
  }
});

/**
 * POST /api/v1/admin/backups/:id/verify
 * Verify backup integrity
 */
router.post('/:id/verify', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  log.info('[BACKUP_ROUTES] Verifying backup', { backupId: id });

  try {
    const isValid = await backupService.verifyBackup(id);

    return res.json({
      success: true,
      message: isValid ? 'Backup verified successfully' : 'Backup verification failed',
      data: {
        backupId: id,
        valid: isValid,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    log.error('[BACKUP_ROUTES] Failed to verify backup', error);
    throw ApiError.internal('Failed to verify backup');
  }
});

/**
 * POST /api/v1/admin/backups/:id/restore
 * Restore from a backup
 */
router.post('/:id/restore', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { force = false } = req.body;
  const user = (req as any).user;

  log.warn('[BACKUP_ROUTES] Restoring from backup', {
    backupId: id,
    force,
    userId: user.id,
  });

  try {
    await backupService.restoreBackup(id, force);

    log.info('[BACKUP_ROUTES] Backup restored successfully', { backupId: id });

    return res.json({
      success: true,
      message: 'Backup restored successfully',
      data: {
        backupId: id,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    log.error('[BACKUP_ROUTES] Failed to restore backup', error);
    throw ApiError.internal('Failed to restore backup');
  }
});

/**
 * DELETE /api/v1/admin/backups/:id
 * Delete a backup
 */
router.delete('/:id', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user;

  log.info('[BACKUP_ROUTES] Deleting backup', {
    backupId: id,
    userId: user.id,
  });

  try {
    await backupService.deleteBackup(id);

    log.info('[BACKUP_ROUTES] Backup deleted successfully', { backupId: id });

    return res.json({
      success: true,
      message: 'Backup deleted successfully',
      data: {
        backupId: id,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    log.error('[BACKUP_ROUTES] Failed to delete backup', error);
    throw ApiError.internal('Failed to delete backup');
  }
});

/**
 * POST /api/v1/admin/backups/retention/enforce
 * Manually enforce retention policy
 */
router.post('/retention/enforce', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const user = (req as any).user;

  log.info('[BACKUP_ROUTES] Enforcing retention policy', {
    userId: user.id,
  });

  try {
    const deletedCount = await backupService.enforceRetentionPolicy();

    log.info('[BACKUP_ROUTES] Retention policy enforced', { deletedCount });

    return res.json({
      success: true,
      message: `Retention policy enforced. ${deletedCount} old backups deleted.`,
      data: {
        deletedCount,
      },
    });
  } catch (error) {
    log.error('[BACKUP_ROUTES] Failed to enforce retention policy', error);
    throw ApiError.internal('Failed to enforce retention policy');
  }
});

export default router;
