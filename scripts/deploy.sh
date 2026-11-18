#!/usr/bin/env bash
set -euo pipefail

# MST Tengapal — End-to-End Production Deployment Script
# Safely backs up DB, applies migrations, compiles assets, restarts services and verifies health.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=========================================================="
echo "  MST Tengapal — Starting Production Deployment"
echo "  $(date +'%Y-%m-%d %H:%M:%S %Z')"
echo "=========================================================="

# 1. Automatic Database Backup
echo "Step 1/5: Running pre-deployment database backup..."
"${SCRIPT_DIR}/backup-db.sh"

# 2. Apply Prisma Migrations to Production DB
echo "Step 2/5: Applying Prisma production migrations..."
cd "${ROOT_DIR}/backend"
npx prisma migrate deploy

# 3. Compile Backend
echo "Step 3/5: Compiling NestJS production backend..."
npm run build

# 4. Compile Frontend
echo "Step 4/5: Compiling React 19 production frontend assets..."
cd "${ROOT_DIR}/frontend"
npm run build

# 5. Start / Restart Services
echo "Step 5/5: Restarting production services..."
cd "${ROOT_DIR}"
"${SCRIPT_DIR}/stop.sh" || true
"${SCRIPT_DIR}/start.sh"

# 6. Verify Health
echo ""
"${SCRIPT_DIR}/health-check.sh"

echo "=========================================================="
echo "🎉 Deployment successfully completed!"
echo "=========================================================="
