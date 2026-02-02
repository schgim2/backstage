#!/bin/bash
# MySQL Master Initialization Script
# Generated for ${{ values.name }} cluster

set -e

echo "Initializing MySQL Master..."

# Wait for MySQL to be ready
until mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT 1" >/dev/null 2>&1; do
    echo "Waiting for MySQL to be ready..."
    sleep 2
done

echo "MySQL is ready. Setting up replication..."

# Create replication user
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<EOF
-- Create replication user
CREATE USER IF NOT EXISTS '${MYSQL_REPLICATION_USER}'@'%' IDENTIFIED BY '${MYSQL_REPLICATION_PASSWORD}';
GRANT REPLICATION SLAVE ON *.* TO '${MYSQL_REPLICATION_USER}'@'%';

-- Create monitoring user for exporter
CREATE USER IF NOT EXISTS 'exporter'@'%' IDENTIFIED BY 'exporter_password' WITH MAX_USER_CONNECTIONS 3;
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%';

-- Create application user
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Show master status
SHOW MASTER STATUS;
EOF

{% if values.enableSSL %}
# Generate SSL certificates if they don't exist
if [ ! -f /etc/mysql/ssl/ca.pem ]; then
    echo "Generating SSL certificates..."
    mkdir -p /etc/mysql/ssl
    
    # Generate CA key and certificate
    openssl genrsa 2048 > /etc/mysql/ssl/ca-key.pem
    openssl req -new -x509 -nodes -days 3600 -key /etc/mysql/ssl/ca-key.pem -out /etc/mysql/ssl/ca.pem -subj "/C=US/ST=CA/L=San Francisco/O=MySQL/CN=MySQL_CA"
    
    # Generate server key and certificate
    openssl req -newkey rsa:2048 -days 3600 -nodes -keyout /etc/mysql/ssl/server-key.pem -out /etc/mysql/ssl/server-req.pem -subj "/C=US/ST=CA/L=San Francisco/O=MySQL/CN=MySQL_Server"
    openssl rsa -in /etc/mysql/ssl/server-key.pem -out /etc/mysql/ssl/server-key.pem
    openssl x509 -req -in /etc/mysql/ssl/server-req.pem -days 3600 -CA /etc/mysql/ssl/ca.pem -CAkey /etc/mysql/ssl/ca-key.pem -set_serial 01 -out /etc/mysql/ssl/server-cert.pem
    
    # Generate client key and certificate
    openssl req -newkey rsa:2048 -days 3600 -nodes -keyout /etc/mysql/ssl/client-key.pem -out /etc/mysql/ssl/client-req.pem -subj "/C=US/ST=CA/L=San Francisco/O=MySQL/CN=MySQL_Client"
    openssl rsa -in /etc/mysql/ssl/client-key.pem -out /etc/mysql/ssl/client-key.pem
    openssl x509 -req -in /etc/mysql/ssl/client-req.pem -days 3600 -CA /etc/mysql/ssl/ca.pem -CAkey /etc/mysql/ssl/ca-key.pem -set_serial 01 -out /etc/mysql/ssl/client-cert.pem
    
    # Set permissions
    chmod 600 /etc/mysql/ssl/*-key.pem
    chmod 644 /etc/mysql/ssl/*.pem
    chown mysql:mysql /etc/mysql/ssl/*
    
    echo "SSL certificates generated successfully."
fi
{% endif %}

{% if values.replicationMode == 'semi-sync' %}
# Install semi-synchronous replication plugin
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<EOF
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';
SET GLOBAL rpl_semi_sync_master_enabled = 1;
SET GLOBAL rpl_semi_sync_master_timeout = 1000;
EOF
{% endif %}

# Create sample data if database is empty
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" <<EOF
-- Create sample table if it doesn't exist
CREATE TABLE IF NOT EXISTS health_check (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial health check record
INSERT IGNORE INTO health_check (id, status) VALUES (1, 'healthy');
EOF

echo "MySQL Master initialization completed successfully!"

# Show replication status
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SHOW MASTER STATUS\G"