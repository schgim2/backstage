# ${{ values.name }}

${{ values.description }}

## Overview

This repository contains the deployment configuration for a Redis cluster with the following specifications:

- **Cluster Size**: ${{ values.clusterSize }} master nodes
- **Replication Factor**: ${{ values.replicationFactor }} replicas per master
- **Redis Version**: ${{ values.redisVersion }}
- **High Availability**: {% if values.enableSentinel %}Enabled with Sentinel{% else %}Disabled{% endif %}
- **Authentication**: {% if values.enableAuth %}Enabled{% else %}Disabled{% endif %}
- **TLS Encryption**: {% if values.enableTLS %}Enabled{% else %}Disabled{% endif %}

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Redis Cluster                           │
├─────────────────────────────────────────────────────────────┤
│  Master 1    │  Master 2    │  Master 3    │ ... Master N  │
│  (Port 7001) │  (Port 7002) │  (Port 7003) │               │
├─────────────────────────────────────────────────────────────┤
│  Replica 1   │  Replica 2   │  Replica 3   │ ... Replica N │
│  (Port 7011) │  (Port 7012) │  (Port 7013) │               │
└─────────────────────────────────────────────────────────────┘
{% if values.enableSentinel %}
┌─────────────────────────────────────────────────────────────┐
│                 Redis Sentinel                             │
├─────────────────────────────────────────────────────────────┤
│  Sentinel 1  │  Sentinel 2  │  Sentinel 3  │               │
│  (Port 26379)│  (Port 26380)│  (Port 26381)│               │
└─────────────────────────────────────────────────────────────┘
{% endif %}
```

## Quick Start

### Prerequisites

{% if values.deploymentType == "docker-compose" or values.deploymentType == "both" %}
- Docker and Docker Compose
{% endif %}
{% if values.deploymentType == "kubernetes" or values.deploymentType == "both" %}
- Kubernetes cluster
- kubectl configured
{% endif %}
{% if values.enableAuth %}
- Redis password (will be generated automatically)
{% endif %}

### Deployment

{% if values.deploymentType == "docker-compose" or values.deploymentType == "both" %}
#### Docker Compose Deployment

1. Clone this repository:
   ```bash
   git clone ${{ values.repoUrl }}
   cd ${{ values.name }}
   ```

2. Start the Redis cluster:
   ```bash
   docker-compose up -d
   ```

3. Initialize the cluster:
   ```bash
   ./scripts/init-cluster.sh
   ```

4. Verify cluster status:
   ```bash
   docker exec redis-node-1 redis-cli cluster nodes
   ```
{% endif %}

{% if values.deploymentType == "kubernetes" or values.deploymentType == "both" %}
#### Kubernetes Deployment

1. Create namespace:
   ```bash
   kubectl create namespace ${{ values.namespace }}
   ```

2. Apply configurations:
   ```bash
   kubectl apply -f k8s/
   ```

3. Wait for pods to be ready:
   ```bash
   kubectl wait --for=condition=ready pod -l app=redis-cluster -n ${{ values.namespace }} --timeout=300s
   ```

4. Initialize cluster:
   ```bash
   kubectl exec -it redis-cluster-0 -n ${{ values.namespace }} -- redis-cli --cluster create \
     $(kubectl get pods -l app=redis-cluster -n ${{ values.namespace }} -o jsonpath='{range.items[*]}{.status.podIP}:6379 {end}') \
     --cluster-replicas ${{ values.replicationFactor }}
   ```
{% endif %}

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_PASSWORD` | Redis authentication password | `auto-generated` |
| `REDIS_PORT` | Redis port | `6379` |
| `CLUSTER_ANNOUNCE_IP` | IP address for cluster communication | `auto-detected` |

### Persistent Storage

- **Storage Class**: `${{ values.storageClass }}`
- **Storage Size**: `${{ values.storageSize }}` per instance
- **Total Storage**: `${{ values.storageSize * (values.clusterSize + values.clusterSize * values.replicationFactor) }}`

## Monitoring

{% if values.enableMonitoring %}
### Prometheus Metrics

Redis metrics are exposed on port `9121` via redis_exporter.

Key metrics to monitor:
- `redis_connected_clients`
- `redis_used_memory_bytes`
- `redis_keyspace_hits_total`
- `redis_keyspace_misses_total`
- `redis_cluster_state`

### Grafana Dashboard

Import the provided Grafana dashboard from `monitoring/grafana-dashboard.json`.
{% else %}
Monitoring is disabled. To enable monitoring, set `enableMonitoring: true` in the template parameters.
{% endif %}

## Security

{% if values.enableAuth %}
### Authentication

Redis AUTH is enabled. The password is stored in:
{% if values.deploymentType == "kubernetes" or values.deploymentType == "both" %}
- Kubernetes Secret: `redis-auth` in namespace `${{ values.namespace }}`
{% endif %}
{% if values.deploymentType == "docker-compose" or values.deploymentType == "both" %}
- Docker Compose: `.env` file
{% endif %}
{% endif %}

{% if values.enableTLS %}
### TLS Encryption

TLS is enabled for all Redis connections. Certificates are automatically generated and managed.
{% endif %}

{% if values.networkPolicy %}
### Network Policies

Kubernetes network policies are configured to:
- Allow intra-cluster communication
- Restrict external access to authorized services only
- Allow monitoring scraping from Prometheus
{% endif %}

## Backup and Recovery

### Automated Backups

Backups are configured to run daily at 2 AM UTC:
- **Retention**: 7 daily, 4 weekly, 12 monthly
- **Storage**: Persistent volume snapshots
- **Encryption**: AES-256

### Manual Backup

```bash
# Create immediate backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh <backup-timestamp>
```

## Troubleshooting

### Common Issues

1. **Cluster initialization fails**
   ```bash
   # Check node connectivity
   ./scripts/check-connectivity.sh
   
   # Reset cluster if needed
   ./scripts/reset-cluster.sh
   ```

2. **Memory issues**
   ```bash
   # Check memory usage
   kubectl exec redis-cluster-0 -n ${{ values.namespace }} -- redis-cli info memory
   
   # Adjust maxmemory settings in redis.conf
   ```

3. **Split-brain scenarios**
   ```bash
   # Check sentinel status
   kubectl exec sentinel-0 -n ${{ values.namespace }} -- redis-cli -p 26379 sentinel masters
   ```

### Health Checks

```bash
# Overall cluster health
./scripts/health-check.sh

# Individual node health
kubectl exec redis-cluster-0 -n ${{ values.namespace }} -- redis-cli ping
```

## Performance Tuning

### Recommended Settings

- **maxmemory-policy**: `allkeys-lru`
- **tcp-keepalive**: `300`
- **timeout**: `0`
- **tcp-backlog**: `511`

### Benchmarking

```bash
# Run performance benchmark
./scripts/benchmark.sh

# Custom benchmark
redis-benchmark -h <redis-host> -p 6379 -c 50 -n 10000
```

## Maintenance

### Scaling

To scale the cluster:
1. Update `clusterSize` parameter
2. Redeploy the configuration
3. Run cluster rebalancing script

### Updates

1. Update Redis version in configuration
2. Perform rolling update
3. Verify cluster integrity

## Support

For issues and questions:
- Create an issue in this repository
- Contact the platform team
- Check the [Redis Cluster documentation](https://redis.io/topics/cluster-tutorial)

## License

This deployment configuration is licensed under MIT License.