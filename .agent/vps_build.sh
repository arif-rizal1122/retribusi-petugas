#!/bin/bash
set -e

TARGET_DIR="/home/sipanda/retribusi-petugas"
REPO_URL="https://github.com/muhdanfyan/retribusi-petugas.git"

echo "🚀 Starting Deployment Script..."

# 1. Clean up old folder completely
echo "🗑️ Cleaning old folder..."
sudo rm -rf "$TARGET_DIR"

# 2. Clone fresh
echo "📦 Cloning fresh repository..."
git clone --depth 1 "$REPO_URL" "$TARGET_DIR"
cd "$TARGET_DIR"

# 3. Setup Environment
echo "🛠️ Setting up environment..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" || true

# 4. Build
echo "🏗️ Installing and Building..."
npm install --no-fund --no-audit
VITE_API_URL="https://api.mpad.online" npm run build

# 5. Tag Build
echo "🏷️ Tagging Build..."
sed -i "s/<\/head>/<meta name='x-build-id' content='manual-vps-build-v3'><\/head>/" dist/index.html

# 6. Final Permissions Fix
echo "🔐 Fixing permissions for Nginx..."
sudo chown -R www-data:www-data "$TARGET_DIR/dist"
sudo chmod -R 755 "$TARGET_DIR/dist"

echo "✅ Deployment Successful!"
