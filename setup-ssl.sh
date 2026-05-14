#!/bin/bash

# ERP SSL & Nginx Setup Script for pypeerp.com
# This script should be run on the production server

set -e

echo "🚀 Starting SSL/Nginx setup for pypeerp.com..."

# 1. Update and install Nginx & Certbot
echo "📦 Installing Nginx and Certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Setup the project directory
echo "📁 Preparing project directory in /var/www/erp..."
sudo mkdir -p /var/www/erp
sudo chown -R $USER:$USER /var/www/erp

# 3. Copy Nginx Configuration
echo "⚙️ Configuring Nginx..."
# Assuming nginx.conf was uploaded to the home directory
if [ -f "$HOME/nginx.conf" ]; then
    sudo cp "$HOME/nginx.conf" /etc/nginx/sites-available/erp
else
    echo "❌ Error: nginx.conf not found in $HOME. Please upload it first."
    exit 1
fi

sudo ln -sf /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 4. Test Nginx and Restart
echo "🔄 Restarting Nginx..."
sudo nginx -t
sudo systemctl restart nginx

# 5. Obtain SSL Certificate via Let's Encrypt
echo "🔐 Obtaining SSL Certificate for pypeerp.com..."
sudo certbot --nginx -d pypeerp.com --non-interactive --agree-tos --email admin@pypeerp.com --redirect

echo "✅ Setup Complete!"
echo "Your ERP should now be accessible at https://pypeerp.com"
echo "Note: Ensure your build artifacts are placed in /var/www/erp/client/dist"
