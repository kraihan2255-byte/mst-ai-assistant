#!/usr/bin/env bash
set -euo pipefail

# MST Tengapal — Production Service Startup Script
# Starts NestJS backend and Caddy web server in production mode.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PID_FILE="${ROOT_DIR}/.backend.pid"
LOGS_DIR="${ROOT_DIR}/logs"

mkdir -p "${LOGS_DIR}"

echo "=========================================================="
echo "  MST Tengapal — Starting Production Services"
echo "=========================================================="

# 1. Verify PostgreSQL is running
PSQL_BIN="$(which psql || echo "/opt/homebrew/opt/postgresql@17/bin/psql")"
if ! "${PSQL_BIN}" -d mst_tengapal -c "SELECT 1;" > /dev/null 2>&1; then
  echo "❌ PostgreSQL is not running. Starting Homebrew service..."
  brew services start postgresql@17
  sleep 2
fi

# 2. Check if backend is already running
if [ -f "${PID_FILE}" ]; then
  OLD_PID="$(cat "${PID_FILE}")"
  if ps -p "${OLD_PID}" > /dev/null 2>&1; then
    echo "ℹ️ Backend is already running (PID: ${OLD_PID})."
  else
    rm -f "${PID_FILE}"
  fi
fi

# 3. Start NestJS Backend in background if not running
if [ ! -f "${PID_FILE}" ]; then
  echo "Starting NestJS Production Backend..."
  cd "${ROOT_DIR}/backend"
  export NODE_ENV=production
  nohup node dist/main.js >> "${LOGS_DIR}/backend.log" 2>&1 < /dev/null &
  NEW_PID=$!
  disown ${NEW_PID} 2>/dev/null || true
  echo "${NEW_PID}" > "${PID_FILE}"
  echo "✅ NestJS started (PID: ${NEW_PID}). Logging to ${LOGS_DIR}/backend.log"
fi

# 4. Wait for backend to be ready
echo -n "Waiting for backend to respond on http://localhost:3000/api/health..."
for i in {1..15}; do
  if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo " Ready!"
    break
  fi
  echo -n "."
  sleep 1
done

# 5. Start Caddy Web Server
echo "Starting Caddy Production Web Server on port 8080..."
cd "${ROOT_DIR}"
caddy start --config Caddyfile

echo "=========================================================="
echo "✅ MST Tengapal Services are RUNNING!"
echo "iPhone Private URL: https://mohammeds-mac-mini.tail4ab45a.ts.net"
echo "Local Web Access  : http://localhost:8080"
echo "Backend API       : http://localhost:3000/api"
echo "Passcode PIN      : 1234 (or tap One-Tap Quick Unlock)"
echo "=========================================================="
