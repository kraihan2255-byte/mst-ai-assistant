#!/bin/sh
set -e

echo "=========================================================="
echo "  MST Tengapal — Starting Cloud Production Server"
echo "=========================================================="

# 1. Apply database migrations
echo "Applying database migrations..."
npx prisma migrate deploy

# 2. Run idempotent database seed (Malappuram areas, core products, admin user)
echo "Ensuring foundation seed data..."
npm run seed || echo "Seed completed or skipped."

# 3. Start NestJS production server
echo "Starting application on port ${PORT:-3000}..."
exec node dist/main.js
