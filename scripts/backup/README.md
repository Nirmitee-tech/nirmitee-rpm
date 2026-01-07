# Backup & Disaster Recovery Scripts

Comprehensive backup and restoration scripts for NirmiteeRPM database and files.

## Scripts

### 1. backup-database.sh
Creates compressed PostgreSQL database backup using pg_dump.

**Usage:**
```bash
./backup-database.sh [backup-name]
```

**Environment Variables:**
- `DATABASE_HOST` - PostgreSQL host (default: localhost)
- `DATABASE_PORT` - PostgreSQL port (default: 5432)
- `DATABASE_NAME` - Database name (default: nirmiteerpm)
- `DATABASE_USER` - PostgreSQL user (default: postgres)
- `DATABASE_PASSWORD` - PostgreSQL password (default: postgres)
- `BACKUP_DIR` - Backup directory (default: ./backups/database)
- `BACKUP_S3_BUCKET` - S3 bucket for upload (optional)
- `BACKUP_S3_PATH` - S3 path prefix (default: backups/database)
- `BACKUP_RETENTION_DAYS` - Days to retain backups (default: 30)

**Output:**
- `{backup-name}_{timestamp}.sql.gz` - Compressed backup file
- `{backup-name}_{timestamp}.meta.json` - Metadata file

**Example:**
```bash
export DATABASE_PASSWORD=mypassword
./backup-database.sh production
```

---

### 2. backup-files.sh
Creates compressed tar archive of file directories.

**Usage:**
```bash
./backup-files.sh [backup-name]
```

**Environment Variables:**
- `BACKUP_DIR` - Backup directory (default: ./backups/files)
- `BACKUP_SOURCE_DIRS` - Comma-separated source directories (default: ./uploads,./data)
- `BACKUP_S3_BUCKET` - S3 bucket for upload (optional)
- `BACKUP_S3_PATH` - S3 path prefix (default: backups/files)
- `BACKUP_RETENTION_DAYS` - Days to retain backups (default: 30)
- `BACKUP_EXCLUDE_PATTERNS` - Comma-separated exclude patterns (default: .git,node_modules,*.log,*.tmp)

**Output:**
- `{backup-name}_{timestamp}.tar.gz` - Compressed archive
- `{backup-name}_{timestamp}.meta.json` - Metadata file

**Example:**
```bash
export BACKUP_SOURCE_DIRS="/app/uploads,/app/data"
./backup-files.sh production
```

---

### 3. restore-database.sh
Restores PostgreSQL database from backup file.

**Usage:**
```bash
./restore-database.sh <backup-file> [--force]
```

**Arguments:**
- `backup-file` - Path to backup file (.sql.gz or .sql)
- `--force` - Skip confirmation prompt

**Environment Variables:**
- `DATABASE_HOST` - PostgreSQL host (default: localhost)
- `DATABASE_PORT` - PostgreSQL port (default: 5432)
- `DATABASE_NAME` - Database name (default: nirmiteerpm)
- `DATABASE_USER` - PostgreSQL user (default: postgres)
- `DATABASE_PASSWORD` - PostgreSQL password (default: postgres)

**Warning:** This will DROP and RECREATE the database, destroying all existing data.

**Example:**
```bash
./restore-database.sh ./backups/database/production_20260107_120000.sql.gz
```

---

### 4. verify-backup.sh
Verifies backup file integrity and content.

**Usage:**
```bash
./verify-backup.sh <backup-file>
```

**Checks:**
- File exists and is not empty
- Gzip compression integrity (for .gz files)
- SQL content validity (for database backups)
- Tar archive integrity (for file backups)
- Metadata file validation (if exists)
- Checksum generation (SHA256)

**Example:**
```bash
./verify-backup.sh ./backups/database/production_20260107_120000.sql.gz
```

---

## Automated Backups

The system automatically schedules recurring backups:

- **Daily database backup** - Every day at 2:00 AM
- **Weekly full backup** - Every Sunday at 3:00 AM
- **Monthly file backup** - 1st day of month at 4:00 AM

Automated backups are managed by the job queue system and run in the background.

---

## API Integration

Backups can be triggered and managed via REST API:

### Trigger Manual Backup
```bash
POST /api/v1/admin/backups
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "DATABASE" | "FILES" | "FULL"
}
```

### List Backups
```bash
GET /api/v1/admin/backups
Authorization: Bearer <token>
```

### Get Backup Details
```bash
GET /api/v1/admin/backups/:id
Authorization: Bearer <token>
```

### Verify Backup
```bash
POST /api/v1/admin/backups/:id/verify
Authorization: Bearer <token>
```

### Restore Backup
```bash
POST /api/v1/admin/backups/:id/restore
Content-Type: application/json
Authorization: Bearer <token>

{
  "force": true
}
```

### Delete Backup
```bash
DELETE /api/v1/admin/backups/:id
Authorization: Bearer <token>
```

### Enforce Retention Policy
```bash
POST /api/v1/admin/backups/retention/enforce
Authorization: Bearer <token>
```

---

## S3 Integration

To enable S3 backup uploads:

1. Install AWS CLI:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

2. Configure AWS credentials:
```bash
aws configure
```

3. Set environment variables:
```bash
export BACKUP_S3_BUCKET=my-backup-bucket
export BACKUP_S3_PATH=backups/nirmiteerpm
```

4. Backups will automatically upload to S3 after creation.

---

## Retention Policy

Default retention: **30 days**

Older backups are automatically deleted to save storage. Configure with:
```bash
export BACKUP_RETENTION_DAYS=60
```

Daily retention cleanup runs automatically via scheduled job.

---

## Docker Integration

The docker-compose.yml includes backup volume mounts:

```yaml
volumes:
  - backup-data:/backups
```

All backups are stored in the persistent `backup-data` volume.

---

## Best Practices

1. **Test Restorations** - Regularly test backup restoration to ensure data integrity
2. **Off-site Storage** - Use S3 or remote storage for disaster recovery
3. **Monitor Backup Jobs** - Check job queue status and logs regularly
4. **Verify Backups** - Run verification script after important backups
5. **Document Recovery** - Maintain documented disaster recovery procedures
6. **Secure Credentials** - Use environment variables, never hardcode passwords
7. **Rotation Strategy** - Keep daily (7), weekly (4), monthly (12) backups

---

## Troubleshooting

### Backup fails with "pg_dump: command not found"
Install PostgreSQL client tools:
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql
```

### Permission denied error
Make scripts executable:
```bash
chmod +x scripts/backup/*.sh
```

### Out of disk space
Check backup directory size and enforce retention:
```bash
du -sh ./backups
./verify-backup.sh
```

### S3 upload fails
Verify AWS credentials and bucket permissions:
```bash
aws s3 ls s3://my-backup-bucket/
```

---

## Security Considerations

- Store `DATABASE_PASSWORD` in secure environment variables
- Restrict backup file permissions: `chmod 600`
- Encrypt backups before S3 upload for sensitive data
- Use IAM roles for S3 access in production
- Limit backup API access to super admins only
- Audit all backup/restore operations

---

## Monitoring

Monitor backup health via:

1. **API Status** - GET `/api/v1/admin/backups`
2. **Job Queue** - Check backup queue status
3. **Logs** - Review application logs for backup events
4. **Disk Usage** - Monitor backup directory size
5. **S3 Metrics** - Track S3 storage and bandwidth

---

## Support

For issues or questions:
- Check application logs: `logs/backup.log`
- Review job queue failures
- Verify environment variables
- Test scripts manually with verbose output
