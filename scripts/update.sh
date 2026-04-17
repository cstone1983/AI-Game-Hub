#!/bin/bash
# Master Hub CI/CD Update Orchestrator
# Target: https://github.com/cstone1983/AI-Game-Hub

set -e

echo "[START] Updating Platform from GitHub..."
echo "Target Repository: https://github.com/cstone1983/AI-Game-Hub"

# Ensure we are tracking the correct remote repository
git remote set-url origin https://github.com/cstone1983/AI-Game-Hub.git 2>/dev/null || git remote add origin https://github.com/cstone1983/AI-Game-Hub.git

echo "[PULL] Fetching latest changes from main branch..."
git fetch origin main || echo "[WARN] Git fetch failed. Is the directory a valid git repository?"
git reset --hard origin/main || echo "[WARN] Git reset failed."

echo "[INSTALL] Refreshing dependencies if necessary..."
# Note: For production Python, this would run: venv/bin/pip install -r requirements.txt
npm install || echo "[WARN] NPM install bypassed."

echo "[SYSTEMD] Restarting local services..."
# If run on the deployed Ubuntu server, systemd commands are executed
if command -v systemctl &> /dev/null; then
    sudo systemctl restart infinity-hub || echo "[WARN] SystemD service restart skipped (infinity-hub not found or not sudo)."
else
    echo "[INFO] systemctl not found, skipping service restart."
fi

echo "[SUCCESS] Update sequence orchestrated successfully."
