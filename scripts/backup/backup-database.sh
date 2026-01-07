#!/bin/bash

# backup-database.sh
# PostgreSQL database backup script using pg_dump
# Usage: ./backup-database.sh [backup-name]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration from environment or defaults
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-nirmiteerpm}"
DB_USER="${DATABASE_USER:-postgres}"
DB_PASSWORD="${DATABASE_PASSWORD:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups/database}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_PATH="${BACKUP_S3_PATH:-backups/database}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${1:-backup}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}_${TIMESTAMP}.sql.gz"
BACKUP_METADATA="${BACKUP_DIR}/${BACKUP_NAME}_${TIMESTAMP}.meta.json"

echo -e "${GREEN}[BACKUP]${NC} Starting PostgreSQL database backup..."
echo -e "${GREEN}[BACKUP]${NC} Database: ${DB_NAME}"
echo -e "${GREEN}[BACKUP]${NC} Host: ${DB_HOST}:${DB_PORT}"
echo -e "${GREEN}[BACKUP]${NC} Timestamp: ${TIMESTAMP}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Export password for pg_dump
export PGPASSWORD="${DB_PASSWORD}"

# Perform backup with compression
echo -e "${YELLOW}[BACKUP]${NC} Dumping database..."
START_TIME=$(date +%s)

if pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --verbose \
  2>&1 | gzip > "${BACKUP_FILE}"; then

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  BACKUP_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null || echo "0")

  echo -e "${GREEN}[BACKUP]${NC} Database backup completed successfully"
  echo -e "${GREEN}[BACKUP]${NC} File: ${BACKUP_FILE}"
  echo -e "${GREEN}[BACKUP]${NC} Size: $(numfmt --to=iec-i --suffix=B ${BACKUP_SIZE} 2>/dev/null || echo "${BACKUP_SIZE} bytes")"
  echo -e "${GREEN}[BACKUP]${NC} Duration: ${DURATION}s"

  # Create metadata file
  cat > "${BACKUP_METADATA}" <<EOF
{
  "type": "DATABASE",
  "timestamp": "${TIMESTAMP}",
  "database": "${DB_NAME}",
  "host": "${DB_HOST}",
  "port": ${DB_PORT},
  "file": "${BACKUP_FILE}",
  "size": ${BACKUP_SIZE},
  "duration": ${DURATION},
  "status": "COMPLETED",
  "pgVersion": "$(pg_dump --version | head -n1)"
}
EOF

  echo -e "${GREEN}[BACKUP]${NC} Metadata saved: ${BACKUP_METADATA}"

  # Upload to S3 if configured
  if [ -n "${S3_BUCKET}" ]; then
    echo -e "${YELLOW}[BACKUP]${NC} Uploading to S3..."

    S3_KEY="${S3_PATH}/${BACKUP_NAME}_${TIMESTAMP}.sql.gz"
    S3_META_KEY="${S3_PATH}/${BACKUP_NAME}_${TIMESTAMP}.meta.json"

    if command -v aws &> /dev/null; then
      aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/${S3_KEY}"
      aws s3 cp "${BACKUP_METADATA}" "s3://${S3_BUCKET}/${S3_META_KEY}"
      echo -e "${GREEN}[BACKUP]${NC} Uploaded to s3://${S3_BUCKET}/${S3_KEY}"
    else
      echo -e "${YELLOW}[BACKUP]${NC} AWS CLI not found, skipping S3 upload"
    fi
  fi

  # Clean up old backups
  echo -e "${YELLOW}[BACKUP]${NC} Cleaning up backups older than ${RETENTION_DAYS} days..."
  find "${BACKUP_DIR}" -name "*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
  find "${BACKUP_DIR}" -name "*.meta.json" -type f -mtime +${RETENTION_DAYS} -delete

  echo -e "${GREEN}[BACKUP]${NC} Backup process completed successfully"
  exit 0

else
  echo -e "${RED}[BACKUP]${NC} Database backup failed"

  # Create failed metadata
  cat > "${BACKUP_METADATA}" <<EOF
{
  "type": "DATABASE",
  "timestamp": "${TIMESTAMP}",
  "database": "${DB_NAME}",
  "host": "${DB_HOST}",
  "port": ${DB_PORT},
  "status": "FAILED",
  "error": "pg_dump command failed"
}
EOF

  exit 1
fi
