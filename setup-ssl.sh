#!/bin/bash

# ERP SSL & Nginx Setup Script for pypeerp.com
# This script should be run on the production server

set -e

echo "🚀 Starting SSL/Nginx setup for pypeerp.com..."

# Use current directory for finding nginx.conf
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# 1. Update and install Nginx & Certbot
echo "📦 Installing Nginx and Certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Copy Nginx Configuration
echo "⚙️ Configuring Nginx..."
# Check in current script directory first, then $HOME
if [ -f "$SCRIPT_DIR/nginx.conf" ]; then
    sudo cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/erp
elif [ -f "$HOME/nginx.conf" ]; then
    sudo cp "$HOME/nginx.conf" /etc/nginx/sites-available/erp
else
    echo "❌ Error: nginx.conf not found. Please ensure it is in the same directory as this script."
    exit 1
fi

sudo ln -sf /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 3. Test Nginx and Restart
echo "🔄 Restarting Nginx..."
sudo nginx -t
sudo systemctl restart nginx

# 4. Obtain SSL Certificate via Let's Encrypt
echo "🔐 Obtaining SSL Certificate for pypeerp.com..."
sudo certbot --nginx -d pypeerp.com --non-interactive --agree-tos --email admin@pypeerp.com --redirect

echo "✅ Setup Complete!"
echo "Your ERP should now be accessible at https://pypeerp.com"
