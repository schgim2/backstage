#!/bin/bash
# PostgreSQL Replica Initialization Script
# Generated for ${{ values.name }} cluster

set -e

echo "Initializing PostgreSQL Replica..."

# Wait for master to be ready
echo "Waiting for master to be ready..."
until pg_isready -h "$POSTGRES_MASTER_HOST" -p "$POSTGRES_MASTER_PORT" -U postgres; do
    echo "Master is not ready yet, waiting..."
    sleep 5
done
echo "Master is ready!"

# Remove existing data directory if it exists
if [ -d "/var/lib/postgresql/data" ] && [ "$(ls -A /var/lib/postgresql/data)" ]; then
    echo "Removing existing data directory..."
    rm -rf /var/lib/postgresql/data/*
fi

# Create base backup from master
echo "Creating base backup from master..."
PGPASSWORD="$POSTGRES_REPLICATION_PASSWORD" pg_basebackup \
    -h "$POSTGRES_MASTER_HOST" \
    -p "$POSTGRES_MASTER_PORT" \
    -U replicator \
    -D /var/lib/postgresql/data \
    -Fp -Xs -P -R -W

echo "Base backup completed successfully"

# Configure replica-specific settings
cat >> /var/lib/postgresql/data/postgresql.auto.conf <<EOF
# Replica-specific configuration
hot_standby = on
max_standby_streaming_delay = 30s
max_standby_archive_delay = 30s
wal_receiver_status_interval = 10s
hot_standby_feedback = off
wal_receiver_timeout = 60s
wal_retrieve_retry_interval = 5s
recovery_min_apply_delay = 0

# Performance tuning for replica
shared_buffers = '{{ (values.replicaResources.memory | replace('Gi', '') | int * 1024 * 0.25) | int }}MB'
effective_cache_size = '{{ (values.replicaResources.memory | replace('Gi', '') | int * 1024 * 0.75) | int }}MB'
EOF

# Create standby.signal file to indicate this is a standby server
touch /var/lib/postgresql/data/standby.signal

# Set proper permissions
chown -R postgres:postgres /var/lib/postgresql/data
chmod 700 /var/lib/postgresql/data

echo "PostgreSQL Replica initialization completed successfully!"

# Display connection information
echo "=================================="
echo "PostgreSQL Replica Connection Info:"
echo "Host: localhost (or container name)"
echo "Port: 5432"
echo "Database: ${{ values.databaseName }}"
echo "Username: ${{ values.username }}"
echo "Mode: Read-Only Replica"
echo "Master: $POSTGRES_MASTER_HOST:$POSTGRES_MASTER_PORT"
echo "=================================="