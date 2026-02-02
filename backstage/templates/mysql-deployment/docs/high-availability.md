# 고가용성 구성

MySQL 클러스터의 고가용성(HA) 구성에 대한 상세 가이드입니다.

## 고가용성 아키텍처

### 마스터-슬레이브 복제

```
┌─────────────────┐    ┌─────────────────┐
│   Application   │───►│   ProxySQL      │
│   (Client)      │    │ (Load Balancer) │
└─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │   MySQL     │ │   MySQL     │ │   MySQL     │
        │   Master    │ │  Replica 1  │ │  Replica 2  │
        │ (Read/Write)│ │ (Read Only) │ │ (Read Only) │
        └─────────────┘ └─────────────┘ └─────────────┘
```

### 복제 모드 비교

| 모드 | 성능 | 일관성 | 복잡성 | 사용 사례 |
|------|------|--------|--------|-----------|
| 비동기 | 높음 | 낮음 | 낮음 | 읽기 성능 향상 |
| 반동기 | 중간 | 중간 | 중간 | 일반적인 HA |
| 그룹 복제 | 낮음 | 높음 | 높음 | 미션 크리티컬 |

## ProxySQL 로드 밸런서

### 쿼리 라우팅 규칙

ProxySQL은 다음 규칙에 따라 쿼리를 라우팅합니다:

```sql
-- 1. SELECT FOR UPDATE는 마스터로
SELECT * FROM users WHERE id = 1 FOR UPDATE;

-- 2. 일반 SELECT는 복제본으로
SELECT * FROM users WHERE status = 'active';

-- 3. INSERT/UPDATE/DELETE는 마스터로
INSERT INTO users (name, email) VALUES ('John', 'john@example.com');
UPDATE users SET status = 'inactive' WHERE id = 1;
DELETE FROM users WHERE id = 1;
```

### 연결 풀링

ProxySQL 연결 풀 설정:
```ini
# 최대 클라이언트 연결
max_connections = 2048

# 기본 풀 크기
default_pool_size = 25

# 최소 풀 크기
min_pool_size = 5

# 예약 풀 크기
reserve_pool_size = 5
```

## 장애 감지 및 복구

### 자동 장애 감지

#### 헬스 체크 설정
```yaml
# Kubernetes 헬스 체크
livenessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - mysqladmin ping -h localhost -u root -p$MYSQL_ROOT_PASSWORD
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - mysql -h localhost -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT 1"
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

#### ProxySQL 모니터링
```sql
-- MySQL 서버 상태 확인
SELECT hostgroup_id, hostname, port, status, weight 
FROM mysql_servers;

-- 연결 상태 확인
SELECT * FROM stats_mysql_connection_pool;

-- 쿼리 통계 확인
SELECT * FROM stats_mysql_query_rules;
```

### 수동 페일오버

#### 마스터 장애 시 복제본 승격

1. **복제본 상태 확인**
```bash
kubectl exec -it mysql-replica-0-0 -n database -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G"
```

2. **복제 중지**
```sql
STOP SLAVE;
```

3. **읽기 전용 모드 해제**
```sql
SET GLOBAL read_only = OFF;
SET GLOBAL super_read_only = OFF;
```

4. **새 마스터로 승격**
```sql
RESET MASTER;
```

5. **다른 복제본들을 새 마스터로 연결**
```sql
CHANGE MASTER TO
    MASTER_HOST='new-master-host',
    MASTER_PORT=3306,
    MASTER_USER='replicator',
    MASTER_PASSWORD='replication_password',
    MASTER_AUTO_POSITION=1;

START SLAVE;
```

## 데이터 일관성

### GTID (Global Transaction Identifier)

GTID 활성화로 얻는 이점:
- **자동 위치 찾기**: 복제 재시작 시 자동으로 올바른 위치 찾기
- **일관성 보장**: 트랜잭션 중복 실행 방지
- **간편한 페일오버**: 복잡한 바이너리 로그 위치 계산 불필요

#### GTID 상태 확인
```sql
-- 마스터에서 실행된 GTID 확인
SHOW MASTER STATUS;

-- 복제본에서 실행된 GTID 확인
SHOW SLAVE STATUS\G

-- GTID 실행 상태 확인
SELECT @@GLOBAL.gtid_executed;
SELECT @@GLOBAL.gtid_purged;
```

### 반동기 복제

반동기 복제 설정 및 모니터링:

#### 마스터 설정
```sql
-- 플러그인 설치
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';

-- 반동기 복제 활성화
SET GLOBAL rpl_semi_sync_master_enabled = 1;

-- 타임아웃 설정 (밀리초)
SET GLOBAL rpl_semi_sync_master_timeout = 1000;

-- 상태 확인
SHOW STATUS LIKE 'Rpl_semi_sync_master%';
```

#### 복제본 설정
```sql
-- 플러그인 설치
INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';

-- 반동기 복제 활성화
SET GLOBAL rpl_semi_sync_slave_enabled = 1;

-- 상태 확인
SHOW STATUS LIKE 'Rpl_semi_sync_slave%';
```

## 성능 최적화

### 읽기 성능 향상

#### 읽기 부하 분산
```python
# Python 예시: 읽기/쓰기 분리
import mysql.connector

# 쓰기용 마스터 연결
master_conn = mysql.connector.connect(
    host='mysql-master.database.svc.cluster.local',
    port=3306,
    user='appuser',
    password='password',
    database='myapp'
)

# 읽기용 복제본 연결
replica_conn = mysql.connector.connect(
    host='mysql-replica-0.database.svc.cluster.local',
    port=3306,
    user='appuser',
    password='password',
    database='myapp'
)

# 쓰기 작업
def create_user(name, email):
    cursor = master_conn.cursor()
    cursor.execute("INSERT INTO users (name, email) VALUES (%s, %s)", (name, email))
    master_conn.commit()

# 읽기 작업
def get_users():
    cursor = replica_conn.cursor()
    cursor.execute("SELECT * FROM users")
    return cursor.fetchall()
```

#### ProxySQL을 통한 자동 라우팅
```python
# ProxySQL을 통한 단일 연결
proxysql_conn = mysql.connector.connect(
    host='mysql-proxysql.database.svc.cluster.local',
    port=6033,
    user='appuser',
    password='password',
    database='myapp'
)

# 자동으로 적절한 서버로 라우팅됨
cursor = proxysql_conn.cursor()

# 이 쿼리는 복제본으로 라우팅
cursor.execute("SELECT * FROM users")

# 이 쿼리는 마스터로 라우팅
cursor.execute("INSERT INTO users (name, email) VALUES ('John', 'john@example.com')")
```

### 복제 지연 최소화

#### 네트워크 최적화
```yaml
# Kubernetes에서 Pod 간 네트워크 최적화
spec:
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: app.kubernetes.io/name
              operator: In
              values: ["mysql-cluster"]
          topologyKey: kubernetes.io/hostname
```

#### 복제 설정 최적화
```sql
-- 복제 지연 모니터링
SELECT 
    CHANNEL_NAME,
    SERVICE_STATE,
    LAST_ERROR_MESSAGE,
    LAST_ERROR_TIMESTAMP
FROM performance_schema.replication_connection_status;

-- 복제 성능 튜닝
SET GLOBAL slave_parallel_workers = 4;
SET GLOBAL slave_parallel_type = 'LOGICAL_CLOCK';
SET GLOBAL slave_preserve_commit_order = ON;
```

## 백업 전략

### 고가용성을 위한 백업

#### 복제본을 이용한 백업
```bash
# 복제본에서 백업 수행 (마스터 부하 최소화)
kubectl exec -it mysql-replica-0-0 -n database -- \
  mysqldump -u root -p$MYSQL_ROOT_PASSWORD \
  --single-transaction \
  --master-data=2 \
  --all-databases > backup.sql
```

#### 바이너리 로그 백업
```bash
# 바이너리 로그 목록 확인
kubectl exec -it mysql-master-0 -n database -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW BINARY LOGS;"

# 바이너리 로그 백업
kubectl exec -it mysql-master-0 -n database -- \
  mysqlbinlog mysql-bin.000001 > binlog_backup.sql
```

## 모니터링 및 알림

### 핵심 메트릭

#### 복제 상태 메트릭
```promql
# 복제 지연 시간
mysql_slave_lag_seconds

# 복제 상태 (1=정상, 0=오류)
mysql_slave_running

# 마스터 연결 상태
mysql_up{instance="mysql-master"}
```

#### 성능 메트릭
```promql
# 초당 쿼리 수
rate(mysql_global_status_queries[5m])

# 연결 수
mysql_global_status_threads_connected

# InnoDB 버퍼 풀 히트율
mysql_global_status_innodb_buffer_pool_read_requests / 
mysql_global_status_innodb_buffer_pool_reads
```

### 알림 규칙

#### Prometheus 알림 규칙
```yaml
groups:
- name: mysql-ha
  rules:
  - alert: MySQLDown
    expr: mysql_up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "MySQL instance is down"
      description: "MySQL instance {{ $labels.instance }} has been down for more than 1 minute."

  - alert: MySQLReplicationLag
    expr: mysql_slave_lag_seconds > 30
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "MySQL replication lag is high"
      description: "MySQL replication lag is {{ $value }} seconds on {{ $labels.instance }}."

  - alert: MySQLReplicationStopped
    expr: mysql_slave_running == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "MySQL replication has stopped"
      description: "MySQL replication has stopped on {{ $labels.instance }}."
```

## 재해 복구

### 데이터 센터 장애 대응

#### 지리적 복제
```yaml
# 다른 가용 영역에 복제본 배치
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: topology.kubernetes.io/zone
            operator: In
            values: ["zone-a", "zone-b", "zone-c"]
```

#### 크로스 리전 백업
```bash
# 다른 리전으로 백업 복제
aws s3 sync s3://primary-backup-bucket s3://dr-backup-bucket --region us-west-2
```

### 복구 절차

#### 전체 클러스터 복구
1. **백업에서 마스터 복구**
2. **복제본들을 새 마스터에 연결**
3. **애플리케이션 연결 복구**
4. **데이터 일관성 검증**

#### Point-in-Time Recovery
```bash
# 특정 시점으로 복구
mysqlbinlog --start-datetime="2024-01-01 12:00:00" \
            --stop-datetime="2024-01-01 12:30:00" \
            mysql-bin.* | mysql -u root -p
```

---

**다음**: [백업 및 복구](backup-recovery.md)