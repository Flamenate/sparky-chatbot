#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/sparky-chatbot

current_time=$(date "+%Y-%m-%d %H:%M:%S")

# Remember current commit
CURRENT=$(git rev-parse HEAD)

# Update remote refs
git fetch origin

# Latest commit on main
LATEST=$(git rev-parse origin/main)

# Exit if nothing changed
if [ "$CURRENT" = "$LATEST" ]; then
	echo "[$current_time] No new version detected."
    exit 0
fi

echo "[$current_time] New version detected, starting redeployment..."

# Update code
git reset --hard origin/main

chmod +x ./deploy.sh

echo "[$current_time] Installing dependencies..."
/home/ubuntu/.nvm/versions/node/v26.5.0/bin/pnpm install --frozen-lockfile

echo "[$current_time] Building..."
/home/ubuntu/.nvm/versions/node/v26.5.0/bin/pnpm build

echo "[$current_time] Restarting..."
/home/ubuntu/.nvm/versions/node/v26.5.0/bin/pm2 restart dist/index.js

echo "[$current_time] Deployment complete."