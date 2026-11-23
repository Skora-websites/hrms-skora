#!/bin/bash
set -e

echo "======================================================="
echo "🚀 Starting SKORA HRMS deployment..."
echo "======================================================="

PROJECT_DIR="/www/wwwroot/hrms-skora"

if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
fi

echo "📥 Resetting & syncing latest code..."
git fetch origin main
git reset --hard origin/main

echo "📦 Installing dependencies..."
npm install --production=false --legacy-peer-deps

echo "🗄️ Running database migrations..."
npm run db:migrate

echo "🔨 Compiling Next.js production build..."
npm run build

echo "🔒 Setting correct permissions on .next folder..."
if [ -d "$PROJECT_DIR/.next" ]; then
    chown -R www:www "$PROJECT_DIR/.next" 2>/dev/null || true
    chmod -R 755 "$PROJECT_DIR/.next" 2>/dev/null || true
fi

echo "🔄 Reloading PM2 process..."
pm2 reload hrms-skora || pm2 restart hrms-skora || pm2 start ecosystem.config.js

echo "======================================================="
echo "✅ SKORA HRMS deployed & running successfully!"
echo "======================================================="
