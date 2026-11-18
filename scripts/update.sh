#!/usr/bin/env bash
set -euo pipefail

# MST Tengapal — Production Update Script
# Safely updates packages, runs deploy script, and verifies system integrity.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=========================================================="
echo "  MST Tengapal — Checking & Applying System Updates"
echo "=========================================================="

# 1. Update dependencies if git is configured
if [ -d "${ROOT_DIR}/.git" ]; then
  echo "Pulling latest code from git..."
  git -C "${ROOT_DIR}" pull --ff-only || true
fi

echo "Installing backend dependencies..."
cd "${ROOT_DIR}/backend"
npm install

echo "Installing frontend dependencies..."
cd "${ROOT_DIR}/frontend"
npm install --legacy-peer-deps

echo "Triggering deployment pipeline..."
"${SCRIPT_DIR}/deploy.sh"
