# 구성 옵션

Redis 클러스터의 다양한 구성 옵션에 대한 상세한 설명입니다.

## 클러스터 구성

### 기본 설정

#### 클러스터 크기
```yaml
cluster_size: 3  # 3, 5, 7 중 선택
```

- **3 노드**: 최소 구성, 개발/테스트 환경
- **5 노드**: 권장 구성, 프로덕션 환경
- **7 노드**: 고가용성 구성, 대규모 환경

#### 메모리 설정
```yaml
memory_limit: "1GB"  # 512MB, 1GB, 2GB, 4GB
```

각 Redis 인스턴스의 메모리 제한을 설정합니다.

#### 영속성 설정
```yaml
enable_persistence: true
persistence_type: "rdb"  # rdb, aof, both
```

- **RDB**: 스냅샷 기반 백업
- **AOF**: Append-Only File 로깅
- **Both**: RDB + AOF 조합

## 보안 구성

### 인증 설정
```yaml
enable_auth: true
redis_password: "your-secure-password"
```

### TLS 암호화
```yaml
enable_tls: true
tls_cert_source: "self-signed"  # self-signed, cert-manager, manual
```

### 네트워크 보안
```yaml
network_policy: true  # Kubernetes만 해당
allowed_cidrs:
  - "10.0.0.0/8"
  - "172.16.0.0/12"
```

## Sentinel 구성

### 기본 설정
```yaml
sentinel_enabled: true
sentinel_quorum: 2
sentinel_down_after: 30000  # 밀리초
sentinel_failover_timeout: 180000  # 밀리초
```

### 알림 설정
```yaml
sentinel_notification_script: "/scripts/notify.sh"
sentinel_client_reconfig_script: "/scripts/reconfig.sh"
```

## 모니터링 구성

### Prometheus 설정
```yaml
enable_monitoring: true
prometheus_port: 9121
metrics_path: "/metrics"
```

### Grafana 설정
```yaml
enable_grafana: true
grafana_admin_password: "admin"
grafana_plugins:
  - "redis-datasource"
```

### 알림 규칙
```yaml
alert_rules:
  - name: "RedisDown"
    condition: "redis_up == 0"
    duration: "5m"
  - name: "RedisHighMemory"
    condition: "redis_memory_used_bytes / redis_memory_max_bytes > 0.9"
    duration: "10m"
```

## 백업 구성

### 자동 백업
```yaml
backup_enabled: true
backup_schedule: "0 2 * * *"  # 매일 오전 2시
backup_retention: 7  # 7일간 보관
```

### 백업 저장소
```yaml
backup_storage:
  type: "s3"  # s3, gcs, local
  bucket: "redis-backups"
  region: "us-west-2"
```

## 환경별 설정

### 개발 환경
```yaml
environment: development
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### 프로덕션 환경
```yaml
environment: production
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

## 고급 설정

### Redis 구성 파일 커스터마이징
```yaml
redis_config:
  maxmemory-policy: "allkeys-lru"
  tcp-keepalive: 300
  timeout: 0
  databases: 16
```

### 로그 설정
```yaml
log_level: "notice"  # debug, verbose, notice, warning
log_file: "/var/log/redis/redis.log"
syslog_enabled: true
```

### 성능 튜닝
```yaml
performance_tuning:
  tcp_backlog: 511
  maxclients: 10000
  hz: 10
  dynamic_hz: true
```

## 설정 파일 예제

### 최소 구성 (개발)
```yaml
name: "dev-redis"
cluster_size: 3
memory_limit: "512MB"
enable_persistence: false
enable_auth: false
enable_monitoring: false
```

### 권장 구성 (프로덕션)
```yaml
name: "prod-redis"
cluster_size: 5
memory_limit: "2GB"
enable_persistence: true
persistence_type: "both"
enable_auth: true
enable_tls: true
enable_monitoring: true
enable_grafana: true
backup_enabled: true
```

### 고가용성 구성
```yaml
name: "ha-redis"
cluster_size: 7
memory_limit: "4GB"
enable_persistence: true
persistence_type: "both"
enable_auth: true
enable_tls: true
enable_monitoring: true
enable_grafana: true
backup_enabled: true
sentinel_quorum: 4
network_policy: true
```

## 구성 검증

생성된 설정을 검증하려면:

```bash
# Docker Compose 설정 검증
docker-compose config

# Kubernetes 설정 검증
kubectl apply --dry-run=client -f k8s/
```