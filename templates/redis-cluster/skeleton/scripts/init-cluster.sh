#!/bin/bash

# Redis Cluster Initialization Script
# This script initializes a Redis cluster with the specified configuration

set -e

# Configuration
CLUSTER_SIZE=${{ values.clusterSize }}
REPLICATION_FACTOR=${{ values.replicationFactor }}
NAMESPACE="${{ values.namespace }}"
SERVICE_NAME="${{ values.name }}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running in Kubernetes or Docker Compose
if command -v kubectl &> /dev/null && kubectl cluster-info &> /dev/null; then
    DEPLOYMENT_TYPE="kubernetes"
    log "Detected Kubernetes deployment"
elif command -v docker-compose &> /dev/null && docker-compose ps &> /dev/null; then
    DEPLOYMENT_TYPE="docker-compose"
    log "Detected Docker Compose deployment"
else
    error "Could not detect deployment type (Kubernetes or Docker Compose)"
fi

# Function to wait for Redis nodes to be ready
wait_for_redis_nodes() {
    log "Waiting for Redis nodes to be ready..."
    
    if [ "$DEPLOYMENT_TYPE" = "kubernetes" ]; then
        # Wait for StatefulSet to be ready
        kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis-cluster -n "$NAMESPACE" --timeout=300s
        
        # Get pod IPs
        REDIS_NODES=$(kubectl get pods -l app.kubernetes.io/name=redis-cluster -n "$NAMESPACE" -o jsonpath='{range .items[*]}{.status.podIP}:6379 {end}')
    else
        # Docker Compose - wait for containers
        local ready_count=0
        local total_nodes=$((CLUSTER_SIZE + CLUSTER_SIZE * REPLICATION_FACTOR))
        
        while [ $ready_count -lt $total_nodes ]; do
            ready_count=0
            for i in $(seq 1 $CLUSTER_SIZE); do
                if docker exec redis-master-$i redis-cli ping &> /dev/null; then
                    ((ready_count++))
                fi
            done
            
            if [ $REPLICATION_FACTOR -gt 0 ]; then
                for i in $(seq 1 $CLUSTER_SIZE); do
                    for j in $(seq 1 $REPLICATION_FACTOR); do
                        if docker exec redis-replica-$i-$j redis-cli ping &> /dev/null; then
                            ((ready_count++))
                        fi
                    done
                done
            fi
            
            log "Ready nodes: $ready_count/$total_nodes"
            if [ $ready_count -lt $total_nodes ]; then
                sleep 5
            fi
        done
        
        # Build Redis nodes list for Docker Compose
        REDIS_NODES=""
        for i in $(seq 1 $CLUSTER_SIZE); do
            REDIS_NODES="$REDIS_NODES redis-master-$i:6379"
        done
        
        if [ $REPLICATION_FACTOR -gt 0 ]; then
            for i in $(seq 1 $CLUSTER_SIZE); do
                for j in $(seq 1 $REPLICATION_FACTOR); do
                    REDIS_NODES="$REDIS_NODES redis-replica-$i-$j:6379"
                done
            done
        fi
    fi
    
    log "All Redis nodes are ready"
}

# Function to initialize Redis cluster
initialize_cluster() {
    log "Initializing Redis cluster..."
    
    if [ "$DEPLOYMENT_TYPE" = "kubernetes" ]; then
        # Get the first pod name
        FIRST_POD=$(kubectl get pods -l app.kubernetes.io/name=redis-cluster -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
        
        # Initialize cluster
        kubectl exec -it "$FIRST_POD" -n "$NAMESPACE" -- redis-cli --cluster create $REDIS_NODES --cluster-replicas $REPLICATION_FACTOR --cluster-yes
    else
        # Docker Compose initialization
        docker exec redis-master-1 redis-cli --cluster create $REDIS_NODES --cluster-replicas $REPLICATION_FACTOR --cluster-yes
    fi
    
    log "Redis cluster initialized successfully"
}

# Function to verify cluster status
verify_cluster() {
    log "Verifying cluster status..."
    
    if [ "$DEPLOYMENT_TYPE" = "kubernetes" ]; then
        FIRST_POD=$(kubectl get pods -l app.kubernetes.io/name=redis-cluster -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
        kubectl exec "$FIRST_POD" -n "$NAMESPACE" -- redis-cli cluster nodes
        kubectl exec "$FIRST_POD" -n "$NAMESPACE" -- redis-cli cluster info
    else
        docker exec redis-master-1 redis-cli cluster nodes
        docker exec redis-master-1 redis-cli cluster info
    fi
    
    log "Cluster verification completed"
}

# Function to test cluster functionality
test_cluster() {
    log "Testing cluster functionality..."
    
    if [ "$DEPLOYMENT_TYPE" = "kubernetes" ]; then
        FIRST_POD=$(kubectl get pods -l app.kubernetes.io/name=redis-cluster -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')
        
        # Test write/read operations
        kubectl exec "$FIRST_POD" -n "$NAMESPACE" -- redis-cli set test-key "Hello Redis Cluster"
        RESULT=$(kubectl exec "$FIRST_POD" -n "$NAMESPACE" -- redis-cli get test-key)
        
        if [ "$RESULT" = "Hello Redis Cluster" ]; then
            log "Cluster functionality test passed"
        else
            error "Cluster functionality test failed"
        fi
        
        # Clean up test key
        kubectl exec "$FIRST_POD" -n "$NAMESPACE" -- redis-cli del test-key
    else
        # Test with Docker Compose
        docker exec redis-master-1 redis-cli set test-key "Hello Redis Cluster"
        RESULT=$(docker exec redis-master-1 redis-cli get test-key)
        
        if [ "$RESULT" = "Hello Redis Cluster" ]; then
            log "Cluster functionality test passed"
        else
            error "Cluster functionality test failed"
        fi
        
        # Clean up test key
        docker exec redis-master-1 redis-cli del test-key
    fi
}

# Main execution
main() {
    log "Starting Redis cluster initialization..."
    log "Configuration:"
    log "  - Cluster Size: $CLUSTER_SIZE"
    log "  - Replication Factor: $REPLICATION_FACTOR"
    log "  - Deployment Type: $DEPLOYMENT_TYPE"
    
    wait_for_redis_nodes
    initialize_cluster
    verify_cluster
    test_cluster
    
    log "Redis cluster initialization completed successfully!"
    log ""
    log "Cluster Access Information:"
    
    if [ "$DEPLOYMENT_TYPE" = "kubernetes" ]; then
        log "  - Service: $SERVICE_NAME.$NAMESPACE.svc.cluster.local:6379"
        log "  - Port Forward: kubectl port-forward svc/$SERVICE_NAME 6379:6379 -n $NAMESPACE"
    else
        log "  - Master Nodes: localhost:7001-$((7000 + CLUSTER_SIZE))"
        if [ $REPLICATION_FACTOR -gt 0 ]; then
            log "  - Replica Nodes: localhost:7101-$((7100 + CLUSTER_SIZE * REPLICATION_FACTOR))"
        fi
        log "  - Redis Commander: http://localhost:8081"
    fi
    
    {% if values.enableMonitoring %}
    log "  - Metrics: http://localhost:9121/metrics"
    {% endif %}
}

# Run main function
main "$@"