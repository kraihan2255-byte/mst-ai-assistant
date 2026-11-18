#!/usr/bin/env bash
set -euo pipefail

# MST Tengapal — Automated PostgreSQL Backup Script
# Creates a compressed, verified backup of the production database with retention management.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups"
LOG_FILE="${BACKUP_DIR}/backup.log"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
BACKUP_FILE="${BACKUP_DIR}/mst_tengapal_backup_${TIMESTAMP}.dump"
DB_NAME="${DB_NAME:-mst_tengapal}"
DB_USER="${DB_USER:-raihan}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "${BACKUP_DIR}"

log() {
  local msg="[$(date +'%Y-%m-%d %H:%M:%S %Z')] $1"
  echo "$msg"
  echo "$msg" >> "${LOG_FILE}"
}

log "Starting backup for database: ${DB_NAME}..."

# Locate pg_dump
PG_DUMP_BIN="$(which pg_dump || true)"
if [ -z "${PG_DUMP_BIN}" ] && [ -x "/opt/homebrew/opt/postgresql@17/bin/pg_dump" ]; then
  PG_DUMP_BIN="/opt/homebrew/opt/postgresql@17/bin/pg_dump"
fi

if [ -z "${PG_DUMP_BIN}" ]; then
  log "ERROR: pg_dump utility not found."
  exit 1
fi

PG_RESTORE_BIN="$(which pg_restore || true)"
if [ -z "${PG_RESTORE_BIN}" ] && [ -x "/opt/homebrew/opt/postgresql@17/bin/pg_restore" ]; then
  PG_RESTORE_BIN="/opt/homebrew/opt/postgresql@17/bin/pg_restore"
fi

# Execute dump with gzip custom format (-Fc)
"${PG_DUMP_BIN}" -U "${DB_USER}" -d "${DB_NAME}" -Fc -f "${BACKUP_FILE}"

if [ ! -f "${BACKUP_FILE}" ]; then
  log "ERROR: Backup file was not created: ${BACKUP_FILE}"
  exit 1
fi

FILE_SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
log "Backup archive created: ${BACKUP_FILE} (Size: ${FILE_SIZE})"

# Verify backup integrity
if [ -n "${PG_RESTORE_BIN}" ]; then
  log "Verifying backup archive integrity..."
  "${PG_RESTORE_BIN}" -l "${BACKUP_FILE}" > /dev/null
  log "SUCCESS: Backup verified and intact."
fi

# Retention policy: remove backups older than RETENTION_DAYS
log "Enforcing retention policy (${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "mst_tengapal_backup_*.dump" -type f -mtime "+${RETENTION_DAYS}" -print -delete >> "${LOG_FILE}" 2>&1 || true

log "Backup completed successfully."
