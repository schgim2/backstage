#!/bin/bash
# MySQL Replica Initialization Script
# Generated for ${{ values.name }} cluster

set -e

echo "Initializing MySQL Replica..."

# Wait for MySQL to be ready
until mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT 1" >/dev/null 2>&1; do
    echo "Waiting for MySQL to be ready..."
    sleep 2
done

echo "MySQL is ready. Waiting for master to be available..."

# Wait for master to be ready
until mysql -h "${MYSQL_MASTER_HOST}" -P "${MYSQL_MASTER_PORT}" -u "${MYSQL_REPLICATION_USER}" -p"${MYSQL_REPLICATION_PASSWORD}" -e "SELECT 1" >/dev/null 2>&1; do
    echo "Waiting for MySQL master to be ready..."
    sleep 5
done

echo "Master is ready. Setting up replication..."

{% if values.replicationMode == 'semi-sync' %}
# Install semi-synchronous replication plugin
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<EOF
INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';
SET GLOBAL rpl_semi_sync_slave_enabled = 1;
EOF
{% endif %}

# Configure replication
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<EOF
-- Stop slave if running
STOP SLAVE;

-- Reset slave
RESET SLAVE ALL;

-- Configure master connection
CHANGE MASTER TO
    MASTER_HOST='${MYSQL_MASTER_HOST}',
    MASTER_PORT=${MYSQL_MASTER_PORT},
    MASTER_USER='${MYSQL_REPLICATION_USER}',
    MASTER_PASSWORD='${MYSQL_REPLICATION_PASSWORD}',
    MASTER_AUTO_POSITION=1,
    MASTER_CONNECT_RETRY=10,
    MASTER_RETRY_COUNT=3;

-- Start slave
START SLAVE;

-- Show slave status
SHOW SLAVE STATUS\G
EOF

# Wait a moment for replication to start
sleep 5

# Check replication status
echo "Checking replication status..."
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<EOF
-- Check slave status
SELECT 
    CASE 
        WHEN Slave_IO_Running = 'Yes' AND Slave_SQL_Running = 'Yes' 
        THEN 'Replication is working correctly'
        ELSE CONCAT('Replication issue: IO=', Slave_IO_Running, ', SQL=', Slave_SQL_Running)
    END as replication_status
FROM (
    SELECT 
        SUBSTRING_INDEX(SUBSTRING_INDEX(SHOW_SLAVE_STATUS, 'Slave_IO_Running: ', -1), '\n', 1) as Slave_IO_Running,
        SUBSTRING_INDEX(SUBSTRING_INDEX(SHOW_SLAVE_STATUS, 'Slave_SQL_Running: ', -1), '\n', 1) as Slave_SQL_Running
    FROM (
        SELECT REPLACE(
            CONCAT(
                'Slave_IO_Running: ', 
                (SELECT SERVICE_STATE FROM performance_schema.replication_connection_status WHERE CHANNEL_NAME = ''),
                '\nSlave_SQL_Running: ',
                (SELECT SERVICE_STATE FROM performance_schema.replication_applier_status WHERE CHANNEL_NAME = '')
            ), 
            'ON', 'Yes'
        ) as SHOW_SLAVE_STATUS
    ) as status_check
) as replication_check;
EOF

# Create monitoring user for exporter
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" <<EOF
-- Create monitoring user for exporter
CREATE USER IF NOT EXISTS 'exporter'@'%' IDENTIFIED BY 'exporter_password' WITH MAX_USER_CONNECTIONS 3;
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%';
FLUSH PRIVILEGES;
EOF

echo "MySQL Replica initialization completed successfully!"

# Show final replication status
mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SHOW SLAVE STATUS\G" | grep -E "(Slave_IO_Running|Slave_SQL_Running|Seconds_Behind_Master|Last_Error)"