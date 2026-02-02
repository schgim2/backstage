#!/bin/bash

# Keycloak Database Backup Script
# This script creates automated backups of the Keycloak database

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7
DB_HOST="${DB_HOST:-postgresql}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-keycloak}"
DB_USER="${POSTGRES_USER:-keycloak}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to create database backup
create_backup() {
    local backup_file="$BACKUP_DIR/keycloak_backup_$TIMESTAMP.sql"
    local compressed_file="$backup_file.gz"
    
    log "Starting database backup..."
    
    # Create SQL dump
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-password --verbose --clean --if-exists --create > "$backup_file"; then
        
        # Compress the backup
        gzip "$backup_file"
        
        log "Backup created successfully: $compressed_file"
        
        # Verify backup integrity
        if gunzip -t "$compressed_file"; then
            log "Backup integrity verified"
        else
            log "ERROR: Backup integrity check failed"
            return 1
        fi
        
        # Set appropriate permissions
        chmod 600 "$compressed_file"
        
    else
        log "ERROR: Database backup failed"
        return 1
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    find "$BACKUP_DIR" -name "keycloak_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    local remaining_backups=$(find "$BACKUP_DIR" -name "keycloak_backup_*.sql.gz" -type f | wc -l)
    log "Cleanup completed. $remaining_backups backup(s) remaining."
}

# Function to create backup metadata
create_metadata() {
    local metadata_file="$BACKUP_DIR/keycloak_backup_$TIMESTAMP.metadata"
    
    cat > "$metadata_file" << EOF
{
  "timestamp": "$TIMESTAMP",
  "database_host": "$DB_HOST",
  "database_name": "$DB_NAME",
  "database_user": "$DB_USER",
  "backup_size": "$(stat -c%s "$BACKUP_DIR/keycloak_backup_$TIMESTAMP.sql.gz" 2>/dev/null || echo 'unknown')",
  "keycloak_version": "$(curl -s http://keycloak:8080/admin/serverinfo 2>/dev/null | jq -r '.systemInfo.version' || echo 'unknown')",
  "created_by": "backup-script"
}
EOF
    
    log "Backup metadata created: $metadata_file"
}

# Function to send backup notification (if configured)
send_notification() {
    if [ -n "${WEBHOOK_URL:-}" ]; then
        local status="$1"
        local message="$2"
        
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"Keycloak Backup $status: $message\"}" \
            --silent --show-error || log "Failed to send notification"
    fi
}

# Main execution
main() {
    log "Starting Keycloak backup process..."
    
    # Check if database is accessible
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
        log "ERROR: Database is not accessible"
        send_notification "FAILED" "Database not accessible"
        exit 1
    fi
    
    # Create backup
    if create_backup; then
        create_metadata
        cleanup_old_backups
        send_notification "SUCCESS" "Backup completed successfully at $TIMESTAMP"
        log "Backup process completed successfully"
    else
        send_notification "FAILED" "Backup process failed at $TIMESTAMP"
        log "ERROR: Backup process failed"
        exit 1
    fi
}

# Execute main function
main "$@"