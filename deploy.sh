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

echo "[$current_time] New version detected, deploying..."

# Update code
git reset --hard origin/main

chmod +x ./deploy.sh

# Install dependencies if needed
pnpm install

# Build if your project requires it
pnpm build

# Restart the app
pm2 reload dist/index.js

echo "[$current_time] Deployment complete."