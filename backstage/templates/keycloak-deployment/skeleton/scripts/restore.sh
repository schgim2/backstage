#!/bin/bash

# Keycloak Database Restore Script
# This script restores Keycloak database from backup

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
DB_HOST="${DB_HOST:-postgresql}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-keycloak}"
DB_USER="${POSTGRES_USER:-keycloak}"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to list available backups
list_backups() {
    log "Available backups:"
    find "$BACKUP_DIR" -name "keycloak_backup_*.sql.gz" -type f -printf "%T@ %Tc %p\n" | sort -n | cut -d' ' -f2- | nl
}

# Function to restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log "ERROR: Backup file not found: $backup_file"
        return 1
    fi
    
    log "Starting database restore from: $backup_file"
    
    # Verify backup integrity
    if ! gunzip -t "$backup_file"; then
        log "ERROR: Backup file is corrupted"
        return 1
    fi
    
    # Check if database is accessible
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; then
        log "ERROR: Database is not accessible"
        return 1
    fi
    
    # Create a pre-restore backup
    local pre_restore_backup="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).sql"
    log "Creating pre-restore backup..."
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-password --clean --if-exists --create > "$pre_restore_backup"; then
        gzip "$pre_restore_backup"
        log "Pre-restore backup created: $pre_restore_backup.gz"
    else
        log "WARNING: Failed to create pre-restore backup"
    fi
    
    # Restore from backup
    log "Restoring database..."
    
    if gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres; then
        log "Database restore completed successfully"
        
        # Verify restore
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM information_schema.tables;" > /dev/null; then
            log "Restore verification successful"
        else
            log "WARNING: Restore verification failed"
        fi
        
    else
        log "ERROR: Database restore failed"
        return 1
    fi
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -l, --list              List available backups
    -r, --restore FILE      Restore from specific backup file
    -i, --interactive       Interactive mode to select backup
    -h, --help             Show this help message

Examples:
    $0 --list
    $0 --restore /backups/keycloak_backup_20240101_120000.sql.gz
    $0 --interactive
EOF
}

# Interactive backup selection
interactive_restore() {
    list_backups
    
    echo
    read -p "Enter the number of the backup to restore (or 'q' to quit): " selection
    
    if [ "$selection" = "q" ]; then
        log "Restore cancelled by user"
        exit 0
    fi
    
    local backup_file=$(find "$BACKUP_DIR" -name "keycloak_backup_*.sql.gz" -type f -printf "%T@ %p\n" | sort -n | cut -d' ' -f2- | sed -n "${selection}p")
    
    if [ -z "$backup_file" ]; then
        log "ERROR: Invalid selection"
        exit 1
    fi
    
    echo
    log "Selected backup: $backup_file"
    
    # Show backup metadata if available
    local metadata_file="${backup_file%.sql.gz}.metadata"
    if [ -f "$metadata_file" ]; then
        log "Backup metadata:"
        cat "$metadata_file" | jq . 2>/dev/null || cat "$metadata_file"
    fi
    
    echo
    read -p "Are you sure you want to restore from this backup? This will overwrite the current database. (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        restore_backup "$backup_file"
    else
        log "Restore cancelled by user"
        exit 0
    fi
}

# Main execution
main() {
    case "${1:-}" in
        -l|--list)
            list_backups
            ;;
        -r|--restore)
            if [ -z "${2:-}" ]; then
                log "ERROR: Backup file not specified"
                usage
                exit 1
            fi
            restore_backup "$2"
            ;;
        -i|--interactive)
            interactive_restore
            ;;
        -h|--help)
            usage
            ;;
        "")
            log "ERROR: No option specified"
            usage
            exit 1
            ;;
        *)
            log "ERROR: Unknown option: $1"
            usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"