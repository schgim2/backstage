#!/bin/bash
# PostgreSQL Backup Script
# Generated for ${{ values.name }} cluster

set -e

# Configuration
POSTGRES_HOST="${POSTGRES_HOST:-postgresql-master}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-${{ values.databaseName }}}"
POSTGRES_USER="${POSTGRES_USER:-${{ values.username }}}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION="${BACKUP_RETENTION:-${{ values.backupRetention }}}"
BACKUP_STORAGE="${BACKUP_STORAGE:-${{ values.backupStorage }}}"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${POSTGRES_DB}_${TIMESTAMP}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting backup process..."
echo "Database: $POSTGRES_DB"
echo "Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "Timestamp: $TIMESTAMP"
echo "Storage: $BACKUP_STORAGE"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $BACKUP_RETENTION days..."
    
    case "$BACKUP_STORAGE" in
        "local")
            find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$BACKUP_RETENTION -delete
            find "$BACKUP_DIR" -name "*.dump" -type f -mtime +$BACKUP_RETENTION -delete
            ;;
        "s3")
            # AWS S3 cleanup (requires aws-cli)
            if command -v aws &> /dev/null; then
                aws s3 ls s3://$S3_BUCKET/ --recursive | \
                awk '$1 <= "'$(date -d "$BACKUP_RETENTION days ago" '+%Y-%m-%d')'" {print $4}' | \
                xargs -I {} aws s3 rm s3://$S3_BUCKET/{}
            fi
            ;;
        "gcs")
            # Google Cloud Storage cleanup (requires gsutil)
            if command -v gsutil &> /dev/null; then
                gsutil ls gs://$GCS_BUCKET/ | \
                while read file; do
                    file_date=$(gsutil stat "$file" | grep "Creation time" | awk '{print $3}')
                    if [[ $(date -d "$file_date" +%s) -lt $(date -d "$BACKUP_RETENTION days ago" +%s) ]]; then
                        gsutil rm "$file"
                    fi
                done
            fi
            ;;
    esac
    
    log "Cleanup completed"
}

# Function to perform SQL dump backup
sql_dump_backup() {
    local backup_file="$BACKUP_DIR/${BACKUP_NAME}.sql"
    local compressed_file="$backup_file.gz"
    
    log "Creating SQL dump backup..."
    
    # Create SQL dump
    PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --no-password \
        --format=plain \
        --no-owner \
        --no-privileges \
        --create \
        --clean \
        --if-exists \
        > "$backup_file"
    
    # Compress the backup
    gzip "$backup_file"
    
    log "SQL dump backup created: $compressed_file"
    
    # Get backup size
    backup_size=$(du -h "$compressed_file" | cut -f1)
    log "Backup size: $backup_size"
    
    echo "$compressed_file"
}

# Function to perform custom format backup
custom_dump_backup() {
    local backup_file="$BACKUP_DIR/${BACKUP_NAME}.dump"
    
    log "Creating custom format backup..."
    
    # Create custom format dump
    PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --verbose \
        --no-password \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-privileges \
        --file="$backup_file"
    
    log "Custom format backup created: $backup_file"
    
    # Get backup size
    backup_size=$(du -h "$backup_file" | cut -f1)
    log "Backup size: $backup_size"
    
    echo "$backup_file"
}

# Function to upload backup to cloud storage
upload_backup() {
    local backup_file="$1"
    local filename=$(basename "$backup_file")
    
    case "$BACKUP_STORAGE" in
        "s3")
            log "Uploading backup to S3..."
            if command -v aws &> /dev/null; then
                aws s3 cp "$backup_file" "s3://$S3_BUCKET/$filename"
                log "Backup uploaded to S3: s3://$S3_BUCKET/$filename"
            else
                log "ERROR: aws-cli not found, cannot upload to S3"
                return 1
            fi
            ;;
        "gcs")
            log "Uploading backup to Google Cloud Storage..."
            if command -v gsutil &> /dev/null; then
                gsutil cp "$backup_file" "gs://$GCS_BUCKET/$filename"
                log "Backup uploaded to GCS: gs://$GCS_BUCKET/$filename"
            else
                log "ERROR: gsutil not found, cannot upload to GCS"
                return 1
            fi
            ;;
        "azure")
            log "Uploading backup to Azure Blob Storage..."
            if command -v az &> /dev/null; then
                az storage blob upload \
                    --file "$backup_file" \
                    --name "$filename" \
                    --container-name backups \
                    --account-name "$AZURE_STORAGE_ACCOUNT"
                log "Backup uploaded to Azure: $filename"
            else
                log "ERROR: azure-cli not found, cannot upload to Azure"
                return 1
            fi
            ;;
        "local")
            log "Backup stored locally: $backup_file"
            ;;
    esac
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup integrity..."
    
    if [[ "$backup_file" == *.sql.gz ]]; then
        # Verify gzipped SQL file
        if gzip -t "$backup_file"; then
            log "Backup integrity check passed"
            return 0
        else
            log "ERROR: Backup integrity check failed"
            return 1
        fi
    elif [[ "$backup_file" == *.dump ]]; then
        # Verify custom format dump
        if PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
            --list "$backup_file" > /dev/null 2>&1; then
            log "Backup integrity check passed"
            return 0
        else
            log "ERROR: Backup integrity check failed"
            return 1
        fi
    fi
}

# Function to send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # You can implement notification logic here
    # For example, send to Slack, email, etc.
    log "NOTIFICATION [$status]: $message"
    
    # Example: Send to webhook
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"PostgreSQL Backup [$status]: $message\"}" \
            > /dev/null 2>&1 || true
    fi
}

# Main backup process
main() {
    local start_time=$(date +%s)
    local backup_file=""
    
    log "Starting PostgreSQL backup process"
    
    # Check if PostgreSQL is accessible
    if ! PGPASSWORD="$POSTGRES_PASSWORD" pg_isready \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB"; then
        log "ERROR: Cannot connect to PostgreSQL"
        send_notification "FAILED" "Cannot connect to PostgreSQL database"
        exit 1
    fi
    
    # Perform backup
    if backup_file=$(sql_dump_backup); then
        log "Backup created successfully: $backup_file"
    else
        log "ERROR: Backup creation failed"
        send_notification "FAILED" "Backup creation failed"
        exit 1
    fi
    
    # Verify backup
    if verify_backup "$backup_file"; then
        log "Backup verification successful"
    else
        log "ERROR: Backup verification failed"
        send_notification "FAILED" "Backup verification failed"
        exit 1
    fi
    
    # Upload to cloud storage if configured
    if [ "$BACKUP_STORAGE" != "local" ]; then
        if upload_backup "$backup_file"; then
            log "Backup upload successful"
            # Remove local copy after successful upload
            rm -f "$backup_file"
            log "Local backup file removed after successful upload"
        else
            log "ERROR: Backup upload failed"
            send_notification "FAILED" "Backup upload failed"
            exit 1
        fi
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "Backup process completed successfully in ${duration} seconds"
    send_notification "SUCCESS" "Backup completed successfully in ${duration} seconds"
}

# Run main function
main "$@"