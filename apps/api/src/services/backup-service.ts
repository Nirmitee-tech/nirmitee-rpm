import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { storageService } from './storage-service';
import { log } from '../utils/logger';
import { ApiError } from '../utils/api-error';

const execAsync = promisify(exec);

export type BackupType = 'DATABASE' | 'FILES' | 'FULL';
export type BackupStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'VERIFIED';

export interface BackupMetadata {
  type: BackupType;
  timestamp: string;
  size?: number;
  duration?: number;
  fileCount?: number;
  database?: string;
  host?: string;
  [key: string]: unknown;
}

export interface BackupResult {
  id: string;
  type: BackupType;
  status: BackupStatus;
  location?: string;
  size?: bigint;
  metadata?: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date | null;
  createdBy?: string | null;
}

export interface BackupListFilter {
  type?: BackupType;
  status?: BackupStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Service for managing backup operations
 */
class BackupService {
  private readonly scriptsDir = path.join(process.cwd(), 'scripts', 'backup');
  private readonly backupsDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

  /**
   * Trigger a database backup
   */
  async backupDatabase(createdBy?: string): Promise<BackupResult> {
    log.info('[BACKUP_SERVICE] Starting database backup', { createdBy });

    // Create backup record
    const backup = await prisma.backup.create({
      data: {
        type: 'DATABASE',
        status: 'IN_PROGRESS',
        createdBy,
        metadata: {
          database: process.env.DATABASE_NAME || 'nirmiteerpm',
          host: process.env.DATABASE_HOST || 'localhost',
        },
      },
    });

    try {
      // Execute backup script
      const scriptPath = path.join(this.scriptsDir, 'backup-database.sh');
      const backupName = `db_${backup.id}`;

      log.info('[BACKUP_SERVICE] Executing backup script', { scriptPath, backupName });

      const { stdout, stderr } = await execAsync(`bash "${scriptPath}" "${backupName}"`, {
        env: {
          ...process.env,
          BACKUP_DIR: path.join(this.backupsDir, 'database'),
        },
        timeout: 3600000, // 1 hour timeout
      });

      log.info('[BACKUP_SERVICE] Backup script output', { stdout, stderr });

      // Find the created backup file and metadata
      const backupDir = path.join(this.backupsDir, 'database');
      const files = await fs.readdir(backupDir);
      const backupFile = files.find((f) => f.startsWith(backupName) && f.endsWith('.sql.gz'));
      const metaFile = files.find((f) => f.startsWith(backupName) && f.endsWith('.meta.json'));

      if (!backupFile) {
        throw new Error('Backup file not found after script execution');
      }

      const backupPath = path.join(backupDir, backupFile);
      const stats = await fs.stat(backupPath);

      // Read metadata if available
      let metadata: BackupMetadata = {
        type: 'DATABASE',
        timestamp: new Date().toISOString(),
      };

      if (metaFile) {
        const metaPath = path.join(backupDir, metaFile);
        const metaContent = await fs.readFile(metaPath, 'utf-8');
        metadata = JSON.parse(metaContent);
      }

      // Upload to S3 if configured
      let s3Location: string | undefined;
      if (process.env.BACKUP_S3_BUCKET) {
        log.info('[BACKUP_SERVICE] Uploading backup to S3');
        const fileBuffer = await fs.readFile(backupPath);
        const s3Key = `backups/database/${backupFile}`;

        await storageService.upload(fileBuffer, s3Key, 'application/gzip');
        s3Location = `s3://${process.env.BACKUP_S3_BUCKET}/${s3Key}`;

        log.info('[BACKUP_SERVICE] Backup uploaded to S3', { location: s3Location });
      }

      // Update backup record
      const updatedBackup = await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'COMPLETED',
          size: BigInt(stats.size),
          location: s3Location || backupPath,
          metadata: metadata as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      log.info('[BACKUP_SERVICE] Database backup completed', { backupId: backup.id });

      return {
        ...updatedBackup,
        location: updatedBackup.location || undefined,
      } as BackupResult;
    } catch (error) {
      log.error('[BACKUP_SERVICE] Database backup failed', error);

      // Update backup record with error
      await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      throw ApiError.internal('Database backup failed');
    }
  }

  /**
   * Trigger a file backup
   */
  async backupFiles(createdBy?: string): Promise<BackupResult> {
    log.info('[BACKUP_SERVICE] Starting file backup', { createdBy });

    // Create backup record
    const backup = await prisma.backup.create({
      data: {
        type: 'FILES',
        status: 'IN_PROGRESS',
        createdBy,
        metadata: {
          sourceDirs: process.env.BACKUP_SOURCE_DIRS || './uploads,./data',
        },
      },
    });

    try {
      // Execute backup script
      const scriptPath = path.join(this.scriptsDir, 'backup-files.sh');
      const backupName = `files_${backup.id}`;

      log.info('[BACKUP_SERVICE] Executing backup script', { scriptPath, backupName });

      const { stdout, stderr } = await execAsync(`bash "${scriptPath}" "${backupName}"`, {
        env: {
          ...process.env,
          BACKUP_DIR: path.join(this.backupsDir, 'files'),
        },
        timeout: 7200000, // 2 hour timeout
      });

      log.info('[BACKUP_SERVICE] Backup script output', { stdout, stderr });

      // Find the created backup file and metadata
      const backupDir = path.join(this.backupsDir, 'files');
      const files = await fs.readdir(backupDir);
      const backupFile = files.find((f) => f.startsWith(backupName) && f.endsWith('.tar.gz'));
      const metaFile = files.find((f) => f.startsWith(backupName) && f.endsWith('.meta.json'));

      if (!backupFile) {
        throw new Error('Backup file not found after script execution');
      }

      const backupPath = path.join(backupDir, backupFile);
      const stats = await fs.stat(backupPath);

      // Read metadata if available
      let metadata: BackupMetadata = {
        type: 'FILES',
        timestamp: new Date().toISOString(),
      };

      if (metaFile) {
        const metaPath = path.join(backupDir, metaFile);
        const metaContent = await fs.readFile(metaPath, 'utf-8');
        metadata = JSON.parse(metaContent);
      }

      // Upload to S3 if configured
      let s3Location: string | undefined;
      if (process.env.BACKUP_S3_BUCKET) {
        log.info('[BACKUP_SERVICE] Uploading backup to S3');
        const fileBuffer = await fs.readFile(backupPath);
        const s3Key = `backups/files/${backupFile}`;

        await storageService.upload(fileBuffer, s3Key, 'application/gzip');
        s3Location = `s3://${process.env.BACKUP_S3_BUCKET}/${s3Key}`;

        log.info('[BACKUP_SERVICE] Backup uploaded to S3', { location: s3Location });
      }

      // Update backup record
      const updatedBackup = await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'COMPLETED',
          size: BigInt(stats.size),
          location: s3Location || backupPath,
          metadata: metadata as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      log.info('[BACKUP_SERVICE] File backup completed', { backupId: backup.id });

      return {
        ...updatedBackup,
        location: updatedBackup.location || undefined,
      } as BackupResult;
    } catch (error) {
      log.error('[BACKUP_SERVICE] File backup failed', error);

      // Update backup record with error
      await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      throw ApiError.internal('File backup failed');
    }
  }

  /**
   * Trigger a full backup (database + files)
   */
  async backupFull(createdBy?: string): Promise<BackupResult> {
    log.info('[BACKUP_SERVICE] Starting full backup', { createdBy });

    // Create backup record
    const backup = await prisma.backup.create({
      data: {
        type: 'FULL',
        status: 'IN_PROGRESS',
        createdBy,
      },
    });

    try {
      // Perform database backup
      log.info('[BACKUP_SERVICE] Performing database backup');
      const dbBackup = await this.backupDatabase(createdBy);

      // Perform file backup
      log.info('[BACKUP_SERVICE] Performing file backup');
      const fileBackup = await this.backupFiles(createdBy);

      // Calculate total size
      const totalSize = (dbBackup.size || BigInt(0)) + (fileBackup.size || BigInt(0));

      // Update backup record
      const updatedBackup = await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'COMPLETED',
          size: totalSize,
          metadata: {
            databaseBackupId: dbBackup.id,
            fileBackupId: fileBackup.id,
          } as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      log.info('[BACKUP_SERVICE] Full backup completed', { backupId: backup.id });

      return {
        ...updatedBackup,
        location: updatedBackup.location || undefined,
      } as BackupResult;
    } catch (error) {
      log.error('[BACKUP_SERVICE] Full backup failed', error);

      // Update backup record with error
      await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      throw ApiError.internal('Full backup failed');
    }
  }

  /**
   * List backups with filtering
   */
  async listBackups(filter: BackupListFilter = {}): Promise<{
    backups: BackupResult[];
    total: number;
  }> {
    const { type, status, startDate, endDate, limit = 50, offset = 0 } = filter;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) {
        where.startedAt.gte = startDate;
      }
      if (endDate) {
        where.startedAt.lte = endDate;
      }
    }

    const [backups, total] = await Promise.all([
      prisma.backup.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.backup.count({ where }),
    ]);

    const backupResults = backups.map((b) => ({
      ...b,
      location: b.location || undefined,
    })) as BackupResult[];

    return { backups: backupResults, total };
  }

  /**
   * Get backup by ID
   */
  async getBackup(id: string): Promise<BackupResult | null> {
    const backup = await prisma.backup.findUnique({
      where: { id },
    });

    if (!backup) {
      return null;
    }

    return {
      ...backup,
      location: backup.location || undefined,
    } as BackupResult;
  }

  /**
   * Delete a backup
   */
  async deleteBackup(id: string): Promise<void> {
    const backup = await prisma.backup.findUnique({
      where: { id },
    });

    if (!backup) {
      throw ApiError.notFound('Backup not found');
    }

    // Delete from S3 if applicable
    if (backup.location && backup.location.startsWith('s3://')) {
      const s3Key = backup.location.replace(/^s3:\/\/[^/]+\//, '');
      await storageService.delete(s3Key);
      log.info('[BACKUP_SERVICE] Deleted backup from S3', { s3Key });
    }

    // Delete local file if applicable
    if (backup.location && !backup.location.startsWith('s3://')) {
      try {
        await fs.unlink(backup.location);
        log.info('[BACKUP_SERVICE] Deleted local backup file', { location: backup.location });
      } catch (error) {
        log.warn('[BACKUP_SERVICE] Failed to delete local backup file', { error });
      }
    }

    // Delete backup record
    await prisma.backup.delete({
      where: { id },
    });

    log.info('[BACKUP_SERVICE] Backup deleted', { backupId: id });
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(id: string): Promise<boolean> {
    const backup = await prisma.backup.findUnique({
      where: { id },
    });

    if (!backup) {
      throw ApiError.notFound('Backup not found');
    }

    if (!backup.location) {
      throw ApiError.badRequest('Backup location not found');
    }

    try {
      // If S3 backup, download first
      let localPath = backup.location;

      if (backup.location.startsWith('s3://')) {
        // TODO: Implement S3 download for verification
        log.warn('[BACKUP_SERVICE] S3 backup verification not fully implemented');
        return true;
      }

      // Execute verification script
      const scriptPath = path.join(this.scriptsDir, 'verify-backup.sh');

      log.info('[BACKUP_SERVICE] Verifying backup', { backupId: id, location: localPath });

      await execAsync(`bash "${scriptPath}" "${localPath}"`, {
        timeout: 600000, // 10 minute timeout
      });

      // Update backup status
      await prisma.backup.update({
        where: { id },
        data: { status: 'VERIFIED' },
      });

      log.info('[BACKUP_SERVICE] Backup verified successfully', { backupId: id });

      return true;
    } catch (error) {
      log.error('[BACKUP_SERVICE] Backup verification failed', error);
      return false;
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(id: string, force = false): Promise<void> {
    const backup = await prisma.backup.findUnique({
      where: { id },
    });

    if (!backup) {
      throw ApiError.notFound('Backup not found');
    }

    if (backup.status !== 'COMPLETED' && backup.status !== 'VERIFIED') {
      throw ApiError.badRequest('Cannot restore from incomplete or failed backup');
    }

    if (!backup.location) {
      throw ApiError.badRequest('Backup location not found');
    }

    try {
      // If S3 backup, download first
      let localPath = backup.location;

      if (backup.location.startsWith('s3://')) {
        // TODO: Implement S3 download for restoration
        throw new Error('S3 backup restoration not yet implemented');
      }

      // Execute restoration script based on backup type
      if (backup.type === 'DATABASE') {
        const scriptPath = path.join(this.scriptsDir, 'restore-database.sh');
        const forceFlag = force ? '--force' : '';

        log.warn('[BACKUP_SERVICE] Restoring database backup', { backupId: id, force });

        await execAsync(`bash "${scriptPath}" "${localPath}" ${forceFlag}`, {
          timeout: 3600000, // 1 hour timeout
        });

        log.info('[BACKUP_SERVICE] Database restored successfully', { backupId: id });
      } else {
        throw new Error(`Restoration for backup type ${backup.type} not yet implemented`);
      }
    } catch (error) {
      log.error('[BACKUP_SERVICE] Backup restoration failed', error);
      throw ApiError.internal('Backup restoration failed');
    }
  }

  /**
   * Enforce retention policy
   */
  async enforceRetentionPolicy(): Promise<number> {
    const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    log.info('[BACKUP_SERVICE] Enforcing retention policy', { retentionDays, cutoffDate });

    // Find old backups
    const oldBackups = await prisma.backup.findMany({
      where: {
        startedAt: { lt: cutoffDate },
        status: { in: ['COMPLETED', 'VERIFIED', 'FAILED'] },
      },
    });

    log.info('[BACKUP_SERVICE] Found old backups for deletion', { count: oldBackups.length });

    // Delete old backups
    let deletedCount = 0;
    for (const backup of oldBackups) {
      try {
        await this.deleteBackup(backup.id);
        deletedCount++;
      } catch (error) {
        log.error('[BACKUP_SERVICE] Failed to delete old backup', { backupId: backup.id, error });
      }
    }

    log.info('[BACKUP_SERVICE] Retention policy enforced', { deletedCount });

    return deletedCount;
  }
}

export const backupService = new BackupService();
