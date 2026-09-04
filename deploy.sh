#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration
EC2_USER="ubuntu"
EC2_IP="35.154.243.111"
SSH_KEY_PATH="$HOME/Downloads/perp.pem"
DEPLOY_ARCHIVE="deploy.tar.gz"
REMOTE_APP_DIR="/var/www/pype-erp"

echo "==========================================="
echo "🚀 Starting Deployment to AWS EC2: $EC2_IP"
echo "==========================================="

# Ensure the SSH key exists and has the correct permissions
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "❌ Error: SSH key not found at $SSH_KEY_PATH"
    exit 1
fi
chmod 400 "$SSH_KEY_PATH"

# 1. Build Client
echo "🔨 Building Client..."
cd client
npm install
npm run build
cd ..

# 2. Build Server
echo "🔨 Building Server..."
cd server
npm install
npm run build
cd ..

# 3. Create Deployment Package
echo "📦 Packaging deployment files..."
rm -f "$DEPLOY_ARCHIVE"
# Package the dist folders, package files, and prisma files
tar -czvf "$DEPLOY_ARCHIVE" client/dist server/dist server/package.json server/package-lock.json server/prisma server/prisma.config.ts 2>/dev/null || tar -czvf "$DEPLOY_ARCHIVE" client/dist server/dist server/package.json server/package-lock.json server/prisma

# 4. Upload to EC2
echo "☁️ Uploading to EC2..."
scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$DEPLOY_ARCHIVE" "$EC2_USER@$EC2_IP:~/"

# 5. Execute commands on EC2
echo "🔄 Running deployment tasks on EC2..."
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << EOF
set -e

# Prepare temp directory
rm -rf ~/deploy_tmp
mkdir -p ~/deploy_tmp
tar -xzvf ~/$DEPLOY_ARCHIVE -C ~/deploy_tmp/ > /dev/null

# Sync files to target web directory
echo "📦 Syncing files to $REMOTE_APP_DIR..."
sudo mkdir -p $REMOTE_APP_DIR
sudo chown -R ubuntu:ubuntu $REMOTE_APP_DIR
rsync -av ~/deploy_tmp/client/ $REMOTE_APP_DIR/client/
rsync -av ~/deploy_tmp/server/ $REMOTE_APP_DIR/server/

# Fix Prisma v7 config dynamically if missing
if [ ! -f $REMOTE_APP_DIR/server/prisma.config.ts ]; then
cat > $REMOTE_APP_DIR/server/prisma.config.ts << "CONFIG"
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
CONFIG
fi

# Clean old static url config if present
sed -i '/url      = env("DATABASE_URL")/d' $REMOTE_APP_DIR/server/prisma/schema.prisma

# Setup Backend
echo "📦 Installing server dependencies..."
cd $REMOTE_APP_DIR/server
npm install --production

echo "🔄 Running Prisma Database Sync..."
npx prisma generate
npx prisma db push --accept-data-loss || true

echo "🔄 Restarting Backend with PM2..."
# Kill any incorrectly placed PM2 process (like ~/app/server)
pm2 delete erp-backend || true
# Start it from the correct directory
pm2 start dist/server.js --name "erp-backend"
pm2 save

echo "✅ EC2 Deployment tasks completed successfully!"
EOF

# Clean up local archive
rm -f "$DEPLOY_ARCHIVE"

echo "==========================================="
echo "🎉 Deployment successfully completed!"
echo "🌍 Your application is live at: https://pypeerp.com/"
echo "==========================================="
