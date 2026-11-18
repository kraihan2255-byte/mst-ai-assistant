#!/usr/bin/env bash
set -euo pipefail

# MST Tengapal — Production Health & Diagnostic Check
# Verifies database, Ollama AI, backend API, web server, and Tailscale private network.

echo "=========================================================="
echo "  MST Tengapal — Health Check & Diagnostics"
echo "  $(date +'%Y-%m-%d %H:%M:%S %Z')"
echo "=========================================================="

ERRORS=0

# 1. Check PostgreSQL
echo -n "Checking PostgreSQL Database (port 5432)... "
PSQL_BIN="$(which psql || echo "/opt/homebrew/opt/postgresql@17/bin/psql")"
if "${PSQL_BIN}" -U raihan -d mst_tengapal -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✅ OK (PostgreSQL 17 is active)"
else
  echo "❌ FAILED (Cannot connect to PostgreSQL)"
  ERRORS=$((ERRORS + 1))
fi

# 2. Check Ollama Service & Model
echo -n "Checking Local Ollama Runtime (http://localhost:11434)... "
if curl -s -f http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "✅ OK (Ollama is responding)"
  echo -n "Verifying Qwen3 4B Model... "
  if curl -s http://localhost:11434/api/tags | grep -q "qwen3:4b"; then
    echo "✅ OK (qwen3:4b model loaded)"
  else
    echo "❌ FAILED (qwen3:4b model missing from Ollama)"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "❌ FAILED (Ollama is not running)"
  ERRORS=$((ERRORS + 1))
fi

# 3. Check NestJS Backend API
echo -n "Checking NestJS Backend API (http://localhost:3000/api/health)... "
HEALTH_RESPONSE="$(curl -s -f http://localhost:3000/api/health || true)"
if [ -n "${HEALTH_RESPONSE}" ]; then
  STATUS="$(echo "${HEALTH_RESPONSE}" | grep -o '"status":"[^"]*"' | head -n 1 | cut -d'"' -f4 || echo "unknown")"
  if [ "${STATUS}" = "ok" ]; then
    echo "✅ OK (Status: ${STATUS})"
  else
    echo "⚠️ Status: ${STATUS} (${HEALTH_RESPONSE})"
  fi
else
  echo "❌ FAILED (Backend not responding on port 3000)"
  ERRORS=$((ERRORS + 1))
fi

# 4. Check Caddy Web Server
echo -n "Checking Caddy Production Web Server (port 8080)... "
if curl -s -f http://localhost:8080 > /dev/null 2>&1; then
  echo "✅ OK (Caddy is serving frontend)"
else
  echo "⚠️ Web server not active on port 8080 (Run scripts/start.sh)"
fi

# 5. Check Tailscale Status
echo -n "Checking Tailscale Status... "
TAILSCALE_BIN="$(which tailscale || echo "/opt/homebrew/bin/tailscale")"
if [ -x "${TAILSCALE_BIN}" ]; then
  TS_STATUS="$("${TAILSCALE_BIN}" status 2>&1 || true)"
  if echo "${TS_STATUS}" | grep -q "Logged out"; then
    echo "⚠️ Installed, but awaiting login (Run 'tailscale up')"
  elif echo "${TS_STATUS}" | grep -q "Tailscale is stopped"; then
    echo "⚠️ Installed, daemon stopped"
  elif echo "${TS_STATUS}" | grep -q "100\."; then
    echo "✅ OK (Connected to Tailnet)"
  else
    echo "ℹ️ ${TS_STATUS}"
  fi
else
  echo "❌ Tailscale not found"
  ERRORS=$((ERRORS + 1))
fi

echo "=========================================================="
if [ ${ERRORS} -eq 0 ]; then
  echo "✅ All core services are healthy and operational!"
else
  echo "⚠️ Completed with ${ERRORS} issue(s) detected."
fi
echo "=========================================================="
