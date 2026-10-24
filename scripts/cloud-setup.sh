#!/usr/bin/env bash
# Prepares a fresh Linux cloud machine to render Shorts:
# npm packages, Chrome's system libraries, an emoji font, and Remotion's browser.
# Usage: bash scripts/cloud-setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."

npm ci --no-audit --no-fund

# Chrome headless needs these shared libraries; emoji need a color emoji font.
LIBS="libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 fonts-noto-color-emoji"
if command -v apt-get >/dev/null; then
  SUDO=""
  [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null && SUDO="sudo"
  $SUDO apt-get update -qq || true
  # libasound2 was renamed libasound2t64 on newer Ubuntu; try both.
  $SUDO apt-get install -y -qq $LIBS libasound2t64 >/dev/null 2>&1 || $SUDO apt-get install -y -qq $LIBS libasound2 >/dev/null 2>&1 || echo "⚠ apt-get could not install every library; rendering may fail"
fi

npx remotion browser ensure
echo "✓ Cloud setup done"
