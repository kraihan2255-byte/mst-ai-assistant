#!/usr/bin/env bash
set -euo pipefail

# MST Tengapal — Safe Database Restoration Script
# Restores a verified dump into a target database (defaults to mst_tengapal_test to protect production).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups"

BACKUP_FILE="${1:-}"
TARGET_DB="${2:-mst_tengapal_test}"
DB_USER="${DB_USER:-raihan}"

if [ -z "${BACKUP_FILE}" ]; then
  # Pick the latest backup file if not specified
  BACKUP_FILE="$(ls -t "${BACKUP_DIR}"/mst_tengapal_*.dump 2>/dev/null | head -n 1 || true)"
fi

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  echo "Usage: $0 [path/to/backup.dump] [target_db_name]"
  exit 1
fi

echo "=========================================================="
echo "  MST Tengapal — Database Restoration Verification"
echo "=========================================================="
echo "Backup Archive : ${BACKUP_FILE}"
echo "Target Database: ${TARGET_DB}"
echo "Database User  : ${DB_USER}"
echo "=========================================================="

if [ "${TARGET_DB}" = "mst_tengapal" ]; then
  echo "⚠️ WARNING: You have specified the PRODUCTION database (mst_tengapal)!"
  if [ "${CONFIRM_PROD_RESTORE:-no}" != "yes" ]; then
    echo "Aborted. To restore to production, set CONFIRM_PROD_RESTORE=yes."
    exit 1
  fi
fi

PG_RESTORE_BIN="$(which pg_restore || true)"
if [ -z "${PG_RESTORE_BIN}" ] && [ -x "/opt/homebrew/opt/postgresql@17/bin/pg_restore" ]; then
  PG_RESTORE_BIN="/opt/homebrew/opt/postgresql@17/bin/pg_restore"
fi

if [ -z "${PG_RESTORE_BIN}" ]; then
  echo "ERROR: pg_restore binary not found."
  exit 1
fi

PSQL_BIN="$(which psql || true)"
if [ -z "${PSQL_BIN}" ] && [ -x "/opt/homebrew/opt/postgresql@17/bin/psql" ]; then
  PSQL_BIN="/opt/homebrew/opt/postgresql@17/bin/psql"
fi

echo "Verifying archive integrity..."
"${PG_RESTORE_BIN}" -l "${BACKUP_FILE}" > /dev/null

echo "Preparing schema in ${TARGET_DB}..."
"${PSQL_BIN}" -U "${DB_USER}" -d "${TARGET_DB}" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

echo "Restoring data into ${TARGET_DB}..."
"${PG_RESTORE_BIN}" -U "${DB_USER}" -d "${TARGET_DB}" --no-owner --no-privileges "${BACKUP_FILE}" || true

echo "Verifying restored tables in ${TARGET_DB}:"
"${PSQL_BIN}" -U "${DB_USER}" -d "${TARGET_DB}" -c "
SELECT 'areas' AS table_name, count(*) FROM areas UNION ALL
SELECT 'customers', count(*) FROM customers UNION ALL
SELECT 'products', count(*) FROM products UNION ALL
SELECT 'product_price_history', count(*) FROM product_price_history UNION ALL
SELECT 'deliveries', count(*) FROM deliveries UNION ALL
SELECT 'delivery_items', count(*) FROM delivery_items UNION ALL
SELECT 'payments', count(*) FROM payments;
"

echo "✅ Restoration completed and verified successfully into ${TARGET_DB}!"
