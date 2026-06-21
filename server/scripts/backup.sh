#!/bin/bash

# Exit on error
set -e

# Configuration
BACKUP_DIR="/var/www/pype-erp/backups"
KEEP_DAYS=7

# Load environment variables
if [ -f "/var/www/pype-erp/server/.env" ]; then
    export $(grep -v '^#' /var/www/pype-erp/server/.env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    exit 1
fi

# Make sure backup directory exists
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

echo "⏳ Starting database backup..."

# Since pg_dump is run from the server folder where global-bundle.pem is,
# we temporarily CD there to satisfy the relative sslrootcert path
cd /var/www/pype-erp/server

# Perform backup
pg_dump "$DATABASE_URL" -F p -f "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

echo "✅ Backup completed successfully: ${BACKUP_FILE}.gz"

# Prune backups older than N days
echo "🧹 Pruning backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "✨ Pruning done"
