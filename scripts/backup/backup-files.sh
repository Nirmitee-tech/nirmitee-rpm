#!/bin/bash

# backup-files.sh
# S3/Storage file backup script
# Usage: ./backup-files.sh [backup-name]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration from environment or defaults
BACKUP_DIR="${BACKUP_DIR:-./backups/files}"
SOURCE_DIRS="${BACKUP_SOURCE_DIRS:-./uploads,./data}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_PATH="${BACKUP_S3_PATH:-backups/files}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
EXCLUDE_PATTERNS="${BACKUP_EXCLUDE_PATTERNS:-.git,node_modules,*.log,*.tmp}"

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${1:-backup}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}_${TIMESTAMP}.tar.gz"
BACKUP_METADATA="${BACKUP_DIR}/${BACKUP_NAME}_${TIMESTAMP}.meta.json"

echo -e "${GREEN}[BACKUP]${NC} Starting file system backup..."
echo -e "${GREEN}[BACKUP]${NC} Source directories: ${SOURCE_DIRS}"
echo -e "${GREEN}[BACKUP]${NC} Timestamp: ${TIMESTAMP}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Build exclude arguments for tar
EXCLUDE_ARGS=""
IFS=',' read -ra EXCLUDES <<< "${EXCLUDE_PATTERNS}"
for pattern in "${EXCLUDES[@]}"; do
  EXCLUDE_ARGS="${EXCLUDE_ARGS} --exclude=${pattern}"
done

# Perform backup with compression
echo -e "${YELLOW}[BACKUP]${NC} Creating compressed archive..."
START_TIME=$(date +%s)

# Convert comma-separated SOURCE_DIRS to array
IFS=',' read -ra DIRS <<< "${SOURCE_DIRS}"

# Check if any source directories exist
EXISTING_DIRS=()
for dir in "${DIRS[@]}"; do
  if [ -d "${dir}" ]; then
    EXISTING_DIRS+=("${dir}")
  else
    echo -e "${YELLOW}[BACKUP]${NC} Warning: Directory not found: ${dir}"
  fi
done

if [ ${#EXISTING_DIRS[@]} -eq 0 ]; then
  echo -e "${RED}[BACKUP]${NC} Error: No source directories found"
  exit 1
fi

# Create tar archive
if tar czf "${BACKUP_FILE}" \
  ${EXCLUDE_ARGS} \
  "${EXISTING_DIRS[@]}" \
  2>&1; then

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  BACKUP_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null || echo "0")
  FILE_COUNT=$(tar -tzf "${BACKUP_FILE}" | wc -l | tr -d ' ')

  echo -e "${GREEN}[BACKUP]${NC} File backup completed successfully"
  echo -e "${GREEN}[BACKUP]${NC} File: ${BACKUP_FILE}"
  echo -e "${GREEN}[BACKUP]${NC} Size: $(numfmt --to=iec-i --suffix=B ${BACKUP_SIZE} 2>/dev/null || echo "${BACKUP_SIZE} bytes")"
  echo -e "${GREEN}[BACKUP]${NC} Files: ${FILE_COUNT}"
  echo -e "${GREEN}[BACKUP]${NC} Duration: ${DURATION}s"

  # Create metadata file
  cat > "${BACKUP_METADATA}" <<EOF
{
  "type": "FILES",
  "timestamp": "${TIMESTAMP}",
  "sourceDirs": $(printf '%s\n' "${EXISTING_DIRS[@]}" | jq -R . | jq -s .),
  "excludePatterns": "$(echo ${EXCLUDE_PATTERNS} | sed 's/,/, /g')",
  "file": "${BACKUP_FILE}",
  "size": ${BACKUP_SIZE},
  "fileCount": ${FILE_COUNT},
  "duration": ${DURATION},
  "status": "COMPLETED"
}
EOF

  echo -e "${GREEN}[BACKUP]${NC} Metadata saved: ${BACKUP_METADATA}"

  # Upload to S3 if configured
  if [ -n "${S3_BUCKET}" ]; then
    echo -e "${YELLOW}[BACKUP]${NC} Uploading to S3..."

    S3_KEY="${S3_PATH}/${BACKUP_NAME}_${TIMESTAMP}.tar.gz"
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
  find "${BACKUP_DIR}" -name "*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
  find "${BACKUP_DIR}" -name "*.meta.json" -type f -mtime +${RETENTION_DAYS} -delete

  echo -e "${GREEN}[BACKUP]${NC} Backup process completed successfully"
  exit 0

else
  echo -e "${RED}[BACKUP]${NC} File backup failed"

  # Create failed metadata
  cat > "${BACKUP_METADATA}" <<EOF
{
  "type": "FILES",
  "timestamp": "${TIMESTAMP}",
  "sourceDirs": $(printf '%s\n' "${EXISTING_DIRS[@]}" | jq -R . | jq -s .),
  "status": "FAILED",
  "error": "tar command failed"
}
EOF

  exit 1
fi
