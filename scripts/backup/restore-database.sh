#!/bin/bash

# restore-database.sh
# PostgreSQL database restoration script
# Usage: ./restore-database.sh <backup-file> [--force]

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

# Parse arguments
BACKUP_FILE="${1:-}"
FORCE_RESTORE="${2:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo -e "${RED}[RESTORE]${NC} Error: Backup file not specified"
  echo -e "Usage: ./restore-database.sh <backup-file> [--force]"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo -e "${RED}[RESTORE]${NC} Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo -e "${GREEN}[RESTORE]${NC} Database Restoration"
echo -e "${GREEN}[RESTORE]${NC} ===================="
echo -e "${GREEN}[RESTORE]${NC} Database: ${DB_NAME}"
echo -e "${GREEN}[RESTORE]${NC} Host: ${DB_HOST}:${DB_PORT}"
echo -e "${GREEN}[RESTORE]${NC} Backup file: ${BACKUP_FILE}"
echo ""

# Warning prompt unless --force is provided
if [ "${FORCE_RESTORE}" != "--force" ]; then
  echo -e "${YELLOW}[RESTORE]${NC} ${RED}WARNING:${NC} This will REPLACE the current database!"
  echo -e "${YELLOW}[RESTORE]${NC} All existing data will be lost."
  echo -e "${YELLOW}[RESTORE]${NC}"
  read -p "Are you sure you want to continue? (yes/no): " -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}[RESTORE]${NC} Restoration cancelled"
    exit 0
  fi
fi

# Export password for psql/pg_restore
export PGPASSWORD="${DB_PASSWORD}"

# Check database connection
echo -e "${YELLOW}[RESTORE]${NC} Checking database connection..."
if ! psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${RED}[RESTORE]${NC} Error: Cannot connect to PostgreSQL server"
  exit 1
fi

echo -e "${GREEN}[RESTORE]${NC} Connection successful"

# Terminate existing connections to the database
echo -e "${YELLOW}[RESTORE]${NC} Terminating existing connections..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres <<EOF
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
EOF

# Drop and recreate database
echo -e "${YELLOW}[RESTORE]${NC} Dropping existing database..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"

echo -e "${YELLOW}[RESTORE]${NC} Creating new database..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME};"

# Restore from backup
echo -e "${YELLOW}[RESTORE]${NC} Restoring database from backup..."
START_TIME=$(date +%s)

# Detect if file is compressed
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  echo -e "${YELLOW}[RESTORE]${NC} Decompressing and restoring..."
  if gunzip -c "${BACKUP_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
    RESTORE_SUCCESS=true
  else
    RESTORE_SUCCESS=false
  fi
else
  echo -e "${YELLOW}[RESTORE]${NC} Restoring from uncompressed backup..."
  if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" < "${BACKUP_FILE}" > /dev/null 2>&1; then
    RESTORE_SUCCESS=true
  else
    RESTORE_SUCCESS=false
  fi
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ "${RESTORE_SUCCESS}" = true ]; then
  echo -e "${GREEN}[RESTORE]${NC} Database restored successfully"
  echo -e "${GREEN}[RESTORE]${NC} Duration: ${DURATION}s"

  # Verify restoration
  echo -e "${YELLOW}[RESTORE]${NC} Verifying database..."
  TABLE_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

  echo -e "${GREEN}[RESTORE]${NC} Database verification:"
  echo -e "${GREEN}[RESTORE]${NC} - Tables: ${TABLE_COUNT}"

  # Check if Prisma migrations table exists
  if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '_prisma_migrations'" | grep -q 1; then
    MIGRATION_COUNT=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM _prisma_migrations;" | tr -d ' ')
    echo -e "${GREEN}[RESTORE]${NC} - Migrations applied: ${MIGRATION_COUNT}"
  fi

  echo -e "${GREEN}[RESTORE]${NC} Restoration completed successfully"
  exit 0
else
  echo -e "${RED}[RESTORE]${NC} Database restoration failed"
  echo -e "${RED}[RESTORE]${NC} The database may be in an inconsistent state"
  exit 1
fi
