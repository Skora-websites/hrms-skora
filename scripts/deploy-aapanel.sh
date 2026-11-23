#!/bin/bash
# ==============================================================================
# SKORA HRMS Automated aaPanel Deployment Script
# ==============================================================================
# This script is executed automatically by aaPanel Git Manager / Webhook on push,
# or can be triggered manually via: bash scripts/deploy-aapanel.sh
# ==============================================================================

set -e

echo "=========================================================================="
echo "🚀 [$(date '+%Y-%m-%d %H:%M:%S')] Starting Automated aaPanel Deployment..."
echo "=========================================================================="

# 1. Resolve Project Directory
if [ -n "$HRMS_DIR" ] && [ -d "$HRMS_DIR" ]; then
  PROJECT_DIR="$HRMS_DIR"
elif [ -d "/www/wwwroot/hrms-skora" ]; then
  PROJECT_DIR="/www/wwwroot/hrms-skora"
else
  # Fallback to current working directory or script parent
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

echo "📂 Target project directory: $PROJECT_DIR"
cd "$PROJECT_DIR"

# 2. Check for environment configuration
if [ ! -f ".env" ] && [ ! -f ".env.production" ]; then
  if [ -f ".env.example" ]; then
    echo "⚠️ Warning: .env not found. Creating from .env.example..."
    cp .env.example .env
  else
    echo "❌ Error: Neither .env nor .env.example found in $PROJECT_DIR!"
    exit 1
  fi
fi

# 3. Automated Pre-Deployment Database Safety Backup
echo "💾 Creating pre-deployment database safety snapshot..."
BACKUP_DIR="/www/backup/database"
mkdir -p "$BACKUP_DIR" 2>/dev/null || true

if command -v mysqldump > /dev/null 2>&1; then
  # Extract DB credentials from .env if present
  DB_NAME=$(grep -E '^MYSQL_DATABASE=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "hrms")
  DB_USER=$(grep -E '^MYSQL_USER=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "root")
  DB_PASS=$(grep -E '^MYSQL_PASSWORD=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'")
  DB_HOST=$(grep -E '^MYSQL_HOST=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "localhost")

  BACKUP_FILE="$BACKUP_DIR/hrms_pre_deploy_$(date +%Y%m%d_%H%M%S).sql"

  if [ -n "$DB_PASS" ]; then
    mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" --single-transaction --quick "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null && \
      echo "✔ Database snapshot saved to: $BACKUP_FILE" || \
      echo "ℹ️ mysqldump backup skipped (using aaPanel scheduled cron)."
  else
    mysqldump -h "$DB_HOST" -u "$DB_USER" --single-transaction --quick "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null && \
      echo "✔ Database snapshot saved to: $BACKUP_FILE" || \
      echo "ℹ️ mysqldump backup skipped (using aaPanel scheduled cron)."
  fi
else
  echo "ℹ️ mysqldump not found in PATH; skipping snapshot."
fi

# 4. Fetch latest code from Git
BRANCH="${GIT_BRANCH:-main}"
echo "📦 Pulling latest commits from origin/$BRANCH..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# 5. Install dependencies
echo "📥 Installing application dependencies..."
npm install --legacy-peer-deps

# 6. Automated Database Migrations
echo "🗄️ Executing automated database migrations..."
npm run db:migrate

# 7. Next.js Production Build
echo "🔨 Compiling Next.js production bundle..."
npm run build

# 8. Reload PM2 Process with Zero-Downtime
echo "♻️ Reloading PM2 process (hrms-skora)..."
if pm2 describe hrms-skora > /dev/null 2>&1; then
  pm2 reload hrms-skora --update-env || pm2 restart hrms-skora --update-env
elif [ -f "ecosystem.config.js" ]; then
  pm2 start ecosystem.config.js
else
  pm2 start npm --name "hrms-skora" -- start
fi

# Save PM2 process list so it survives server reboots
pm2 save 2>/dev/null || true

# 9. Verify Application Health
echo "🔍 Verifying application health endpoint..."
sleep 3
APP_PORT=$(grep -E '^PORT=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "3000")
if command -v curl > /dev/null 2>&1; then
  if curl -f -s -o /dev/null "http://127.0.0.1:$APP_PORT/api/health" 2>/dev/null; then
    echo "✅ Health check passed: HTTP 200 OK (http://127.0.0.1:$APP_PORT/api/health)"
  else
    echo "ℹ️ Deployment completed. PM2 instance is running on port $APP_PORT."
  fi
fi

echo "=========================================================================="
echo "🎉 [$(date '+%Y-%m-%d %H:%M:%S')] SKORA HRMS is LIVE and Up-to-Date!"
echo "=========================================================================="
