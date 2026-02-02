#!/bin/bash
# PostgreSQL Master Initialization Script
# Generated for ${{ values.name }} cluster

set -e

echo "Initializing PostgreSQL Master..."

# Create replication user
{% if values.enableReplication %}
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD '$POSTGRES_REPLICATION_PASSWORD';
    GRANT CONNECT ON DATABASE $POSTGRES_DB TO replicator;
EOSQL
echo "Replication user created successfully"
{% endif %}

# Create application database and user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create application user if not exists
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${{ values.username }}') THEN
            CREATE USER ${{ values.username }} WITH ENCRYPTED PASSWORD '$POSTGRES_PASSWORD';
        END IF;
    END
    \$\$;
    
    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE ${{ values.databaseName }} TO ${{ values.username }};
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${{ values.username }};
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${{ values.username }};
    GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ${{ values.username }};
    
    -- Set default privileges for future objects
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${{ values.username }};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${{ values.username }};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${{ values.username }};
EOSQL
echo "Application user and database configured successfully"

# Install and configure extensions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Install commonly used extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "hstore";
    CREATE EXTENSION IF NOT EXISTS "citext";
    
    {% if 'pg_stat_statements' in values.sharedPreloadLibraries %}
    -- Install pg_stat_statements for query performance monitoring
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
    {% endif %}
    
    {% if 'pg_buffercache' in values.sharedPreloadLibraries %}
    -- Install pg_buffercache for buffer cache monitoring
    CREATE EXTENSION IF NOT EXISTS "pg_buffercache";
    {% endif %}
EOSQL
echo "Extensions installed successfully"

# Create monitoring user for metrics collection
{% if values.enableMonitoring %}
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create monitoring user
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'postgres_exporter') THEN
            CREATE USER postgres_exporter WITH ENCRYPTED PASSWORD 'exporter_password';
        END IF;
    END
    \$\$;
    
    -- Grant necessary privileges for monitoring
    GRANT CONNECT ON DATABASE ${{ values.databaseName }} TO postgres_exporter;
    GRANT pg_monitor TO postgres_exporter;
    
    -- Grant access to specific tables for detailed metrics
    GRANT SELECT ON pg_stat_database TO postgres_exporter;
    GRANT SELECT ON pg_stat_user_tables TO postgres_exporter;
    GRANT SELECT ON pg_stat_user_indexes TO postgres_exporter;
    GRANT SELECT ON pg_statio_user_tables TO postgres_exporter;
    GRANT SELECT ON pg_statio_user_indexes TO postgres_exporter;
    {% if 'pg_stat_statements' in values.sharedPreloadLibraries %}
    GRANT SELECT ON pg_stat_statements TO postgres_exporter;
    {% endif %}
EOSQL
echo "Monitoring user configured successfully"
{% endif %}

# Create sample tables and data (optional)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create a sample table for testing
    CREATE TABLE IF NOT EXISTS health_check (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status TEXT DEFAULT 'healthy',
        message TEXT
    );
    
    -- Insert initial health check record
    INSERT INTO health_check (message) VALUES ('PostgreSQL master initialized successfully');
    
    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_health_check_timestamp ON health_check(timestamp);
    CREATE INDEX IF NOT EXISTS idx_health_check_status ON health_check(status);
EOSQL
echo "Sample tables created successfully"

{% if values.enableSSL %}
# Generate SSL certificates if they don't exist
if [ ! -f "/var/lib/postgresql/data/server.crt" ]; then
    echo "Generating SSL certificates..."
    
    # Generate private key
    openssl genrsa -out /var/lib/postgresql/data/server.key 2048
    chmod 600 /var/lib/postgresql/data/server.key
    
    # Generate certificate signing request
    openssl req -new -key /var/lib/postgresql/data/server.key \
        -out /var/lib/postgresql/data/server.csr \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=${{ values.name }}-master"
    
    # Generate self-signed certificate
    openssl x509 -req -in /var/lib/postgresql/data/server.csr \
        -signkey /var/lib/postgresql/data/server.key \
        -out /var/lib/postgresql/data/server.crt \
        -days 365
    
    # Generate CA certificate (self-signed)
    cp /var/lib/postgresql/data/server.crt /var/lib/postgresql/data/ca.crt
    
    # Set proper permissions
    chmod 600 /var/lib/postgresql/data/server.key
    chmod 644 /var/lib/postgresql/data/server.crt
    chmod 644 /var/lib/postgresql/data/ca.crt
    
    # Change ownership to postgres user
    chown postgres:postgres /var/lib/postgresql/data/server.*
    chown postgres:postgres /var/lib/postgresql/data/ca.crt
    
    echo "SSL certificates generated successfully"
fi
{% endif %}

# Configure PostgreSQL for optimal performance
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Update PostgreSQL configuration for better performance
    ALTER SYSTEM SET shared_buffers = '{{ (values.masterResources.memory | replace('Gi', '') | int * 1024 * 0.25) | int }}MB';
    ALTER SYSTEM SET effective_cache_size = '{{ (values.masterResources.memory | replace('Gi', '') | int * 1024 * 0.75) | int }}MB';
    ALTER SYSTEM SET maintenance_work_mem = '64MB';
    ALTER SYSTEM SET checkpoint_completion_target = 0.9;
    ALTER SYSTEM SET wal_buffers = '16MB';
    ALTER SYSTEM SET default_statistics_target = 100;
    ALTER SYSTEM SET random_page_cost = 1.1;
    ALTER SYSTEM SET effective_io_concurrency = 200;
    
    -- Reload configuration
    SELECT pg_reload_conf();
EOSQL
echo "Performance configuration applied successfully"

# Create backup directory and set permissions
mkdir -p /backups
chown postgres:postgres /backups
chmod 755 /backups

echo "PostgreSQL Master initialization completed successfully!"

# Display connection information
echo "=================================="
echo "PostgreSQL Master Connection Info:"
echo "Host: localhost (or container name)"
echo "Port: 5432"
echo "Database: ${{ values.databaseName }}"
echo "Username: ${{ values.username }}"
echo "SSL: {% if values.enableSSL %}Enabled{% else %}Disabled{% endif %}"
{% if values.enableReplication %}
echo "Replication: Enabled ({{ values.replicaCount }} replicas)"
{% endif %}
echo "=================================="