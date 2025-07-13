#!/bin/bash

# Backup Script for LunaSlides.com

BACKUP_DIR="/home/deploy/backups/$(date +%Y%m%d_%H%M%S)"
PROJECT_DIR="/home/deploy/lunaslides"

echo "[$(date)] Starting backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup configuration files
cp "$PROJECT_DIR/.env" "$BACKUP_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/Aspose.Slides.Product.Family.lic" "$BACKUP_DIR/" 2>/dev/null || true

# Backup Docker volumes
docker run --rm -v luna_uploads:/data -v "$BACKUP_DIR":/backup alpine \
    tar czf /backup/uploads.tar.gz -C /data .

docker run --rm -v luna_logs:/data -v "$BACKUP_DIR":/backup alpine \
    tar czf /backup/logs.tar.gz -C /data .

docker run --rm -v luna_conversions:/data -v "$BACKUP_DIR":/backup alpine \
    tar czf /backup/conversions.tar.gz -C /data .

# Backup monitoring data (optional)
docker run --rm -v prometheus_data:/data -v "$BACKUP_DIR":/backup alpine \
    tar czf /backup/prometheus_data.tar.gz -C /data . 2>/dev/null || true

docker run --rm -v grafana_data:/data -v "$BACKUP_DIR":/backup alpine \
    tar czf /backup/grafana_data.tar.gz -C /data . 2>/dev/null || true

# Clean old backups (keep 30 days)
find /home/deploy/backups -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true

echo "[$(date)] Backup complete at $BACKUP_DIR"