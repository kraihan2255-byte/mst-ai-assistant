#!/usr/bin/env bash
set -euo pipefail

# MST Tengapal — Production Service Shutdown Script
# Gracefully stops the NestJS backend and Caddy web server.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PID_FILE="${ROOT_DIR}/.backend.pid"

echo "=========================================================="
echo "  MST Tengapal — Stopping Production Services"
echo "=========================================================="

# 1. Stop Caddy
echo "Stopping Caddy web server..."
if which caddy > /dev/null 2>&1; then
  caddy stop --config "${ROOT_DIR}/Caddyfile" > /dev/null 2>&1 || true
fi

# 2. Stop NestJS Backend
if [ -f "${PID_FILE}" ]; then
  PID="$(cat "${PID_FILE}")"
  echo "Stopping NestJS Backend (PID: ${PID})..."
  if ps -p "${PID}" > /dev/null 2>&1; then
    kill "${PID}" || true
    sleep 1
    if ps -p "${PID}" > /dev/null 2>&1; then
      kill -9 "${PID}" || true
    fi
  fi
  rm -f "${PID_FILE}"
  echo "✅ Backend stopped."
else
  # Fallback: check if node dist/main is running
  pkill -f "node dist/main" || true
  echo "ℹ️ No PID file found."
fi

echo "=========================================================="
echo "✅ MST Tengapal services stopped."
echo "=========================================================="
