#!/bin/bash

# verify-backup.sh
# Backup integrity verification script
# Usage: ./verify-backup.sh <backup-file>

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo -e "${RED}[VERIFY]${NC} Error: Backup file not specified"
  echo -e "Usage: ./verify-backup.sh <backup-file>"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo -e "${RED}[VERIFY]${NC} Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo -e "${GREEN}[VERIFY]${NC} Backup Verification"
echo -e "${GREEN}[VERIFY]${NC} ==================="
echo -e "${GREEN}[VERIFY]${NC} File: ${BACKUP_FILE}"
echo ""

# Get file information
BACKUP_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null || echo "0")
FILE_EXT="${BACKUP_FILE##*.}"

echo -e "${YELLOW}[VERIFY]${NC} Basic checks..."
echo -e "${GREEN}[VERIFY]${NC} - File exists: ✓"
echo -e "${GREEN}[VERIFY]${NC} - Size: $(numfmt --to=iec-i --suffix=B ${BACKUP_SIZE} 2>/dev/null || echo "${BACKUP_SIZE} bytes")"

# Check if file is not empty
if [ "${BACKUP_SIZE}" -eq 0 ]; then
  echo -e "${RED}[VERIFY]${NC} - File is empty: ✗"
  exit 1
fi
echo -e "${GREEN}[VERIFY]${NC} - Non-empty: ✓"

# Verify based on file type
if [[ "${BACKUP_FILE}" == *.sql.gz ]] || [[ "${BACKUP_FILE}" == *.tar.gz ]]; then
  echo -e "${YELLOW}[VERIFY]${NC} Verifying gzip compression..."

  if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    echo -e "${GREEN}[VERIFY]${NC} - Gzip integrity: ✓"
  else
    echo -e "${RED}[VERIFY]${NC} - Gzip integrity: ✗ (Corrupted)"
    exit 1
  fi

  # For database backups, verify SQL content
  if [[ "${BACKUP_FILE}" == *.sql.gz ]]; then
    echo -e "${YELLOW}[VERIFY]${NC} Verifying SQL content..."

    # Check for common SQL keywords
    if gunzip -c "${BACKUP_FILE}" 2>/dev/null | head -n 100 | grep -q -E "(CREATE|INSERT|COPY|ALTER|DROP)"; then
      echo -e "${GREEN}[VERIFY]${NC} - SQL content: ✓"
    else
      echo -e "${RED}[VERIFY]${NC} - SQL content: ✗ (Invalid SQL)"
      exit 1
    fi

    # Check for PostgreSQL dump header
    if gunzip -c "${BACKUP_FILE}" 2>/dev/null | head -n 10 | grep -q "PostgreSQL"; then
      echo -e "${GREEN}[VERIFY]${NC} - PostgreSQL dump: ✓"
    else
      echo -e "${YELLOW}[VERIFY]${NC} - PostgreSQL dump header not found (may be valid)"
    fi
  fi

  # For file backups, verify tar content
  if [[ "${BACKUP_FILE}" == *.tar.gz ]]; then
    echo -e "${YELLOW}[VERIFY]${NC} Verifying tar archive..."

    if tar -tzf "${BACKUP_FILE}" > /dev/null 2>&1; then
      echo -e "${GREEN}[VERIFY]${NC} - Tar archive: ✓"

      FILE_COUNT=$(tar -tzf "${BACKUP_FILE}" | wc -l | tr -d ' ')
      echo -e "${GREEN}[VERIFY]${NC} - Files in archive: ${FILE_COUNT}"
    else
      echo -e "${RED}[VERIFY]${NC} - Tar archive: ✗ (Corrupted)"
      exit 1
    fi
  fi

elif [[ "${BACKUP_FILE}" == *.sql ]]; then
  echo -e "${YELLOW}[VERIFY]${NC} Verifying uncompressed SQL..."

  # Check for common SQL keywords
  if head -n 100 "${BACKUP_FILE}" | grep -q -E "(CREATE|INSERT|COPY|ALTER|DROP)"; then
    echo -e "${GREEN}[VERIFY]${NC} - SQL content: ✓"
  else
    echo -e "${RED}[VERIFY]${NC} - SQL content: ✗ (Invalid SQL)"
    exit 1
  fi

elif [[ "${BACKUP_FILE}" == *.tar ]]; then
  echo -e "${YELLOW}[VERIFY]${NC} Verifying tar archive..."

  if tar -tf "${BACKUP_FILE}" > /dev/null 2>&1; then
    echo -e "${GREEN}[VERIFY]${NC} - Tar archive: ✓"

    FILE_COUNT=$(tar -tf "${BACKUP_FILE}" | wc -l | tr -d ' ')
    echo -e "${GREEN}[VERIFY]${NC} - Files in archive: ${FILE_COUNT}"
  else
    echo -e "${RED}[VERIFY]${NC} - Tar archive: ✗ (Corrupted)"
    exit 1
  fi

else
  echo -e "${YELLOW}[VERIFY]${NC} Unknown file type, performing basic checks only"
fi

# Check for associated metadata file
METADATA_FILE="${BACKUP_FILE%.sql.gz}.meta.json"
METADATA_FILE="${METADATA_FILE%.tar.gz}.meta.json"

if [ -f "${METADATA_FILE}" ]; then
  echo -e "${YELLOW}[VERIFY]${NC} Verifying metadata..."
  echo -e "${GREEN}[VERIFY]${NC} - Metadata file exists: ✓"

  # Validate JSON
  if command -v jq &> /dev/null; then
    if jq empty "${METADATA_FILE}" 2>/dev/null; then
      echo -e "${GREEN}[VERIFY]${NC} - JSON valid: ✓"

      # Extract and display metadata
      BACKUP_TYPE=$(jq -r '.type // "UNKNOWN"' "${METADATA_FILE}")
      BACKUP_STATUS=$(jq -r '.status // "UNKNOWN"' "${METADATA_FILE}")
      BACKUP_TIMESTAMP=$(jq -r '.timestamp // "UNKNOWN"' "${METADATA_FILE}")

      echo -e "${GREEN}[VERIFY]${NC} - Type: ${BACKUP_TYPE}"
      echo -e "${GREEN}[VERIFY]${NC} - Status: ${BACKUP_STATUS}"
      echo -e "${GREEN}[VERIFY]${NC} - Timestamp: ${BACKUP_TIMESTAMP}"

      # Check if metadata size matches actual size
      METADATA_SIZE=$(jq -r '.size // 0' "${METADATA_FILE}")
      if [ "${METADATA_SIZE}" -eq "${BACKUP_SIZE}" ]; then
        echo -e "${GREEN}[VERIFY]${NC} - Size match: ✓"
      else
        echo -e "${YELLOW}[VERIFY]${NC} - Size mismatch (expected: ${METADATA_SIZE}, actual: ${BACKUP_SIZE})"
      fi
    else
      echo -e "${RED}[VERIFY]${NC} - JSON valid: ✗"
    fi
  else
    echo -e "${YELLOW}[VERIFY]${NC} - jq not installed, skipping JSON validation"
  fi
else
  echo -e "${YELLOW}[VERIFY]${NC} - Metadata file not found (optional)"
fi

# Generate checksum for integrity tracking
if command -v sha256sum &> /dev/null; then
  CHECKSUM=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
  echo -e "${GREEN}[VERIFY]${NC} - SHA256: ${CHECKSUM}"
elif command -v shasum &> /dev/null; then
  CHECKSUM=$(shasum -a 256 "${BACKUP_FILE}" | awk '{print $1}')
  echo -e "${GREEN}[VERIFY]${NC} - SHA256: ${CHECKSUM}"
fi

echo ""
echo -e "${GREEN}[VERIFY]${NC} Backup verification completed successfully"
echo -e "${GREEN}[VERIFY]${NC} The backup file appears to be valid and restorable"
exit 0
