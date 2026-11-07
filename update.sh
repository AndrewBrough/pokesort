#!/usr/bin/env bash
set -euo pipefail

sudo systemctl stop pokesort
git -C ~/pokesort fetch origin
git -C ~/pokesort checkout main
git -C ~/pokesort pull --ff-only origin main
cd ~/pokesort
npm ci --prefix client
npm ci --prefix server
npm run build
sudo systemctl start pokesort
sleep 3
curl -fsS http://127.0.0.1:8787/health
