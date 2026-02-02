#!/bin/bash
# MySQL Backup Script
# Generated for ${{ values.name }} cluster

set -e

# Configuration
MYSQL_HOST="${MYSQL_HOST:-mysql-master}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD}"
MYSQL_DATABASE="${MYSQL_DATABASE:-${{ values.databaseName }}}"
BACKUP_DIR="/backups"
BACKUP_RETENTION="${BACKUP_RETENTION:-${{ values.backupRetention }}}"
BACKUP_STORAGE="${BACKUP_STORAGE:-${{ values.backupStorage }}}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/mysql_backup_${TIMESTAMP}.sql"
BACKUP_FILE_COMPRESSED="${BACKUP_FILE}.gz"

echo "Starting MySQL backup at $(date)"
echo "Backup file: ${BACKUP_FILE_COMPRESSED}"

# Create database backup
echo "Creating database dump..."
mysqldump \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user="${MYSQL_USER}" \
    --password="${MYSQL_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --hex-blob \
    --master-data=2 \
    --flush-logs \
    --all-databases \
    > "${BACKUP_FILE}"

# Compress backup
echo "Compressing backup..."
gzip "${BACKUP_FILE}"

# Verify backup
if [ -f "${BACKUP_FILE_COMPRESSED}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE_COMPRESSED}" | cut -f1)
    echo "Backup created successfully: ${BACKUP_FILE_COMPRESSED} (${BACKUP_SIZE})"
else
    echo "ERROR: Backup file not created!"
    exit 1
fi

{% if values.enableBinlogBackup %}
# Backup binary logs
echo "Backing up binary logs..."
BINLOG_DIR="${BACKUP_DIR}/binlogs/${TIMESTAMP}"
mkdir -p "${BINLOG_DIR}"

# Get list of binary logs
mysql \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user="${MYSQL_USER}" \
    --password="${MYSQL_PASSWORD}" \
    --batch \
    --skip-column-names \
    -e "SHOW BINARY LOGS;" | while read log_name log_size; do
    
    if [ ! -z "${log_name}" ]; then
        echo "Copying binary log: ${log_name}"
        # Note: In production, you would copy from the actual MySQL data directory
        # This is a placeholder for the actual binary log backup logic
        touch "${BINLOG_DIR}/${log_name}"
    fi
done

# Compress binary logs
if [ -d "${BINLOG_DIR}" ] && [ "$(ls -A ${BINLOG_DIR})" ]; then
    tar -czf "${BACKUP_DIR}/binlogs_${TIMESTAMP}.tar.gz" -C "${BACKUP_DIR}/binlogs" "${TIMESTAMP}"
    rm -rf "${BINLOG_DIR}"
    echo "Binary logs backed up: binlogs_${TIMESTAMP}.tar.gz"
fi
{% endif %}

# Upload to cloud storage if configured
case "${BACKUP_STORAGE}" in
    "s3")
        if command -v aws >/dev/null 2>&1; then
            echo "Uploading backup to S3..."
            aws s3 cp "${BACKUP_FILE_COMPRESSED}" "s3://${S3_BUCKET}/mysql-backups/"
            {% if values.enableBinlogBackup %}
            if [ -f "${BACKUP_DIR}/binlogs_${TIMESTAMP}.tar.gz" ]; then
                aws s3 cp "${BACKUP_DIR}/binlogs_${TIMESTAMP}.tar.gz" "s3://${S3_BUCKET}/mysql-backups/binlogs/"
            fi
            {% endif %}
            echo "Backup uploaded to S3 successfully"
        else
            echo "WARNING: AWS CLI not found, skipping S3 upload"
        fi
        ;;
    "gcs")
        if command -v gsutil >/dev/null 2>&1; then
            echo "Uploading backup to Google Cloud Storage..."
            gsutil cp "${BACKUP_FILE_COMPRESSED}" "gs://${GCS_BUCKET}/mysql-backups/"
            {% if values.enableBinlogBackup %}
            if [ -f "${BACKUP_DIR}/binlogs_${TIMESTAMP}.tar.gz" ]; then
                gsutil cp "${BACKUP_DIR}/binlogs_${TIMESTAMP}.tar.gz" "gs://${GCS_BUCKET}/mysql-backups/binlogs/"
            fi
            {% endif %}
            echo "Backup uploaded to GCS successfully"
        else
            echo "WARNING: gsutil not found, skipping GCS upload"
        fi
        ;;
    "azure")
        if command -v az >/dev/null 2>&1; then
            echo "Uploading backup to Azure Blob Storage..."
            az storage blob upload \
                --file "${BACKUP_FILE_COMPRESSED}" \
                --container-name mysql-backups \
                --name "mysql_backup_${TIMESTAMP}.sql.gz"
            {% if values.enableBinlogBackup %}
            if [ -f "${BACKUP_DIR}/binlogs_${TIMESTAMP}.tar.gz" ]; then
                az storage blob upload \
                    --file "${BACKUP_DIR}/binlogs_${TIMESTAMP}.tar.gz" \
                    --container-name mysql-backups \
                    --name "binlogs/binlogs_${TIMESTAMP}.tar.gz"
            fi
            {% endif %}
            echo "Backup uploaded to Azure successfully"
        else
            echo "WARNING: Azure CLI not found, skipping Azure upload"
        fi
        ;;
    "local")
        echo "Backup stored locally: ${BACKUP_FILE_COMPRESSED}"
        ;;
    *)
        echo "Unknown backup storage: ${BACKUP_STORAGE}"
        ;;
esac

# Clean up old backups
echo "Cleaning up old backups (retention: ${BACKUP_RETENTION} days)..."
find "${BACKUP_DIR}" -name "mysql_backup_*.sql.gz" -type f -mtime +${BACKUP_RETENTION} -delete
{% if values.enableBinlogBackup %}
find "${BACKUP_DIR}" -name "binlogs_*.tar.gz" -type f -mtime +${BACKUP_RETENTION} -delete
{% endif %}

# Create backup report
BACKUP_REPORT="${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
cat > "${BACKUP_REPORT}" <<EOF
MySQL Backup Report
==================
Date: $(date)
Host: ${MYSQL_HOST}:${MYSQL_PORT}
Database: ${MYSQL_DATABASE}
Backup File: ${BACKUP_FILE_COMPRESSED}
Backup Size: $(du -h "${BACKUP_FILE_COMPRESSED}" | cut -f1)
Storage: ${BACKUP_STORAGE}
Status: SUCCESS
EOF

echo "Backup completed successfully at $(date)"
echo "Report saved: ${BACKUP_REPORT}"

# Send notification (placeholder for actual notification system)
echo "Backup notification: MySQL backup completed for ${MYSQL_DATABASE} at $(date)"