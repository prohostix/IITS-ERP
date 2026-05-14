#!/bin/bash

# Deployment script for AWS (35.154.243.111)
# Run this from your local Mac to update the server

SERVER_IP="35.154.243.111"
SERVER_USER="ubuntu"
KEY_PATH="/Users/retro/Downloads/perp.pem"
PROJECT_DIR="/var/www/pype-erp"

echo "🚀 Starting AWS Update..."

# 1. SSH and Update
ssh -i $KEY_PATH $SERVER_USER@$SERVER_IP << EOF
    cd $PROJECT_DIR
    
    echo "📥 Syncing latest changes from Git (forcing overwrite)..."
    git fetch origin main
    git reset --hard origin/main
    
    echo "🔧 Checking for swap file (to prevent 'Killed' memory errors)..."
    if [ ! -f /swapfile ]; then
        sudo fallocate -l 2G /swapfile
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        echo "/swapfile swap swap defaults 0 0" | sudo tee -a /etc/fstab
    fi

    echo "📦 Installing server dependencies..."
    cd $PROJECT_DIR/server
    npm install
    
    echo "🏗️ Building server..."
    NODE_OPTIONS="--max-old-space-size=2048" npm run build
    
    echo "📦 Installing client dependencies..."
    cd $PROJECT_DIR/client
    rm -f .env  # Remove any hardcoded IP env files
    npm install
    
    echo "🏗️ Building client..."
    NODE_OPTIONS="--max-old-space-size=2048" npm run build
    
    echo "🔄 Restarting backend service..."
    cd $PROJECT_DIR/server
    if command -v pm2 &> /dev/null; then
        # Stop existing process on port 3677 if it exists
        pm2 stop pype-server || true
        pm2 delete pype-server || true
        
        pm2 restart erp-backend || pm2 start dist/server.js --name erp-backend
    else
        echo "⚠️ PM2 not found. You might need to restart your service manually."
    fi
    
    echo "✅ Server updated successfully!"
EOF
