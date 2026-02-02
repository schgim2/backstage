# 고가용성 구성

PostgreSQL 클러스터의 고가용성을 위한 복제, 장애 조치, 로드 밸런싱 설정을 안내합니다.

## 🏗️ 고가용성 아키텍처

### 마스터-슬레이브 복제 구조

```
                    ┌─────────────────┐
                    │   Application   │
                    │   Load Balancer │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │   PgBouncer     │
                    │ (Connection     │
                    │  Pooling)       │
                    └─────────┬───────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  PostgreSQL     │ │  PostgreSQL     │ │  PostgreSQL     │
    │   Master        │ │   Replica 1     │ │   Replica 2     │
    │ (Read/Write)    │ │ (Read Only)     │ │ (Read Only)     │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
              │               ▲               ▲
              └───────────────┼───────────────┘
                        Streaming Replication
```

## 🔄 스트리밍 복제 설정

### 마스터 서버 설정

#### postgresql.conf 설정

```ini
# WAL 설정
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = 2GB

# 체크포인트 설정
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min
max_wal_size = 4GB
min_wal_size = 2GB

# 아카이빙 설정
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
archive_timeout = 300

# 동기 복제 설정 (선택사항)
synchronous_standby_names = 'replica1,replica2'
synchronous_commit = on
```

#### pg_hba.conf 설정

```ini
# 복제 연결 허용
host    replication     replicator      10.0.0.0/8              md5
host    replication     replicator      172.16.0.0/12           md5
host    replication     replicator      192.168.0.0/16          md5

# SSL 복제 연결 (권장)
hostssl replication     replicator      0.0.0.0/0               md5
```

#### 복제 사용자 생성

```sql
-- 복제 전용 사용자 생성
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replication_password';

-- 복제 슬롯 생성
SELECT pg_create_physical_replication_slot('replica1');
SELECT pg_create_physical_replication_slot('replica2');
```

### 슬레이브 서버 설정

#### postgresql.conf 설정

```ini
# 핫 스탠바이 설정
hot_standby = on
max_standby_archive_delay = 30s
max_standby_streaming_delay = 30s
wal_receiver_status_interval = 10s
hot_standby_feedback = on

# 복구 설정
restore_command = 'cp /var/lib/postgresql/archive/%f %p'
recovery_target_timeline = 'latest'
```

#### 복제 설정 파일 (standby.signal)

```bash
# 슬레이브 서버에 standby.signal 파일 생성
touch /var/lib/postgresql/data/standby.signal
```

#### 복제 연결 설정

```ini
# postgresql.auto.conf 또는 postgresql.conf
primary_conninfo = 'host=postgresql-master port=5432 user=replicator password=replication_password application_name=replica1'
primary_slot_name = 'replica1'
```

## ⚡ 동기 vs 비동기 복제

### 비동기 복제 (기본값)

```ini
# postgresql.conf (마스터)
synchronous_commit = off
synchronous_standby_names = ''
```

**장점:**
- 높은 성능
- 네트워크 지연에 영향 받지 않음
- 슬레이브 장애 시 마스터 영향 없음

**단점:**
- 데이터 손실 가능성
- 복제 지연 발생 가능

### 동기 복제

```ini
# postgresql.conf (마스터)
synchronous_commit = on
synchronous_standby_names = 'FIRST 1 (replica1, replica2)'
```

**장점:**
- 데이터 일관성 보장
- 데이터 손실 방지

**단점:**
- 성능 저하
- 슬레이브 장애 시 마스터 영향

### 하이브리드 설정

```ini
# 중요한 트랜잭션만 동기화
synchronous_commit = local
synchronous_standby_names = 'ANY 1 (replica1, replica2)'
```

## 🔄 자동 장애 조치

### Patroni를 사용한 자동 장애 조치

#### Patroni 설정 파일

```yaml
# patroni.yml
scope: postgresql-cluster
namespace: /postgresql/
name: postgresql-master

restapi:
  listen: 0.0.0.0:8008
  connect_address: postgresql-master:8008

etcd:
  hosts: etcd1:2379,etcd2:2379,etcd3:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 30
    maximum_lag_on_failover: 1048576
    master_start_timeout: 300
    synchronous_mode: false
    postgresql:
      use_pg_rewind: true
      use_slots: true
      parameters:
        wal_level: replica
        hot_standby: "on"
        max_connections: 200
        max_wal_senders: 10
        wal_keep_size: 2GB
        max_replication_slots: 10

  initdb:
  - encoding: UTF8
  - data-checksums

  pg_hba:
  - host replication replicator 0.0.0.0/0 md5
  - host all all 0.0.0.0/0 md5

postgresql:
  listen: 0.0.0.0:5432
  connect_address: postgresql-master:5432
  data_dir: /var/lib/postgresql/data
  bin_dir: /usr/lib/postgresql/15/bin
  pgpass: /tmp/pgpass
  authentication:
    replication:
      username: replicator
      password: replication_password
    superuser:
      username: postgres
      password: postgres_password

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

#### Kubernetes에서 Patroni 배포

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql-patroni
spec:
  serviceName: postgresql-patroni
  replicas: 3
  selector:
    matchLabels:
      app: postgresql-patroni
  template:
    metadata:
      labels:
        app: postgresql-patroni
    spec:
      containers:
      - name: postgresql
        image: postgres:15
        env:
        - name: PATRONI_SCOPE
          value: postgresql-cluster
        - name: PATRONI_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: PATRONI_POSTGRESQL_DATA_DIR
          value: /var/lib/postgresql/data
        - name: PATRONI_POSTGRESQL_LISTEN
          value: 0.0.0.0:5432
        - name: PATRONI_RESTAPI_LISTEN
          value: 0.0.0.0:8008
        volumeMounts:
        - name: postgresql-data
          mountPath: /var/lib/postgresql/data
        - name: patroni-config
          mountPath: /etc/patroni
      volumes:
      - name: patroni-config
        configMap:
          name: patroni-config
  volumeClaimTemplates:
  - metadata:
      name: postgresql-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

### HAProxy를 사용한 로드 밸런싱

#### HAProxy 설정

```ini
# haproxy.cfg
global
    daemon
    maxconn 1000

defaults
    mode tcp
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

# PostgreSQL 마스터 (읽기/쓰기)
listen postgresql-master
    bind *:5432
    option httpchk GET /master
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions
    server postgresql-master postgresql-master:5432 check port 8008
    server postgresql-replica1 postgresql-replica1:5432 check port 8008 backup
    server postgresql-replica2 postgresql-replica2:5432 check port 8008 backup

# PostgreSQL 슬레이브 (읽기 전용)
listen postgresql-replica
    bind *:5433
    option httpchk GET /replica
    http-check expect status 200
    balance roundrobin
    default-server inter 3s fall 3 rise 2
    server postgresql-replica1 postgresql-replica1:5432 check port 8008
    server postgresql-replica2 postgresql-replica2:5432 check port 8008

# 통계 페이지
listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
    stats admin if TRUE
```

## 📊 복제 모니터링

### 복제 상태 확인

```sql
-- 마스터에서 복제 상태 확인
SELECT client_addr, application_name, state, 
       sent_lsn, write_lsn, flush_lsn, replay_lsn,
       pg_wal_lsn_diff(sent_lsn, write_lsn) AS write_lag,
       pg_wal_lsn_diff(write_lsn, flush_lsn) AS flush_lag,
       pg_wal_lsn_diff(flush_lsn, replay_lsn) AS replay_lag
FROM pg_stat_replication;

-- 슬레이브에서 복제 지연 확인
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds;

-- 복제 슬롯 상태 확인
SELECT slot_name, plugin, slot_type, database, active, 
       restart_lsn, confirmed_flush_lsn
FROM pg_replication_slots;
```

### 복제 지연 알림

```bash
#!/bin/bash
# check_replication_lag.sh

THRESHOLD=60  # 60초 임계값
LAG=$(psql -h postgresql-replica -U postgres -t -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))")

if (( $(echo "$LAG > $THRESHOLD" | bc -l) )); then
    echo "CRITICAL: Replication lag is ${LAG} seconds"
    # 알림 발송 (Slack, 이메일 등)
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"PostgreSQL replication lag: '${LAG}' seconds"}' \
        $SLACK_WEBHOOK_URL
    exit 2
else
    echo "OK: Replication lag is ${LAG} seconds"
    exit 0
fi
```

## 🔧 장애 복구 절차

### 마스터 장애 시 수동 복구

```bash
# 1. 마스터 상태 확인
kubectl exec -it postgresql-master-0 -n database -- pg_isready

# 2. 슬레이브를 마스터로 승격
kubectl exec -it postgresql-replica-0-0 -n database -- \
  pg_promote

# 3. 애플리케이션 연결 변경
kubectl patch service postgresql-master -n database \
  -p '{"spec":{"selector":{"app.kubernetes.io/instance":"replica-0"}}}'

# 4. 기존 마스터 복구 후 슬레이브로 설정
# (기존 마스터가 복구되면 새로운 슬레이브로 설정)
```

### 슬레이브 장애 시 복구

```bash
# 1. 장애 슬레이브 제거
kubectl delete pod postgresql-replica-0-0 -n database

# 2. 새로운 슬레이브 생성 (자동)
# StatefulSet이 자동으로 새 Pod 생성

# 3. 복제 상태 확인
kubectl exec -it postgresql-master-0 -n database -- \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"
```

### 스플릿 브레인 방지

```sql
-- 복제 슬롯을 사용한 안전한 복제
SELECT pg_create_physical_replication_slot('replica1');

-- 동기 복제로 데이터 일관성 보장
ALTER SYSTEM SET synchronous_standby_names = 'replica1';
ALTER SYSTEM SET synchronous_commit = 'on';
SELECT pg_reload_conf();
```

## 🔄 백업 및 PITR

### 연속 아카이빙 설정

```ini
# postgresql.conf
archive_mode = on
archive_command = 'test ! -f /backup/archive/%f && cp %p /backup/archive/%f'
archive_timeout = 300
```

### 베이스 백업 생성

```bash
#!/bin/bash
# create_base_backup.sh

BACKUP_DIR="/backup/base"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 베이스 백업 생성
pg_basebackup -h postgresql-master -U replicator \
  -D ${BACKUP_DIR}/base_backup_${TIMESTAMP} \
  -Ft -z -P -W

# 백업 검증
if [ $? -eq 0 ]; then
    echo "Base backup created successfully: ${TIMESTAMP}"
    # 오래된 백업 정리
    find ${BACKUP_DIR} -name "base_backup_*" -mtime +7 -exec rm -rf {} \;
else
    echo "Base backup failed: ${TIMESTAMP}"
    exit 1
fi
```

### Point-in-Time Recovery

```bash
#!/bin/bash
# pitr_recovery.sh

BACKUP_DIR="/backup/base"
ARCHIVE_DIR="/backup/archive"
RECOVERY_TARGET="2024-02-01 12:00:00"

# 최신 베이스 백업 복원
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/base_backup_* | head -1)
tar -xzf ${LATEST_BACKUP}/base.tar.gz -C /var/lib/postgresql/data/

# 복구 설정
cat > /var/lib/postgresql/data/postgresql.auto.conf << EOF
restore_command = 'cp ${ARCHIVE_DIR}/%f %p'
recovery_target_time = '${RECOVERY_TARGET}'
recovery_target_timeline = 'latest'
EOF

# 복구 시작
touch /var/lib/postgresql/data/recovery.signal
systemctl start postgresql
```

## 📈 성능 최적화

### 읽기 부하 분산

```python
# Python 예제: 읽기/쓰기 분리
import psycopg2
from psycopg2 import pool

# 연결 풀 생성
write_pool = psycopg2.pool.ThreadedConnectionPool(
    1, 20,
    host='postgresql-master',
    database='myapp',
    user='appuser',
    password='password'
)

read_pool = psycopg2.pool.ThreadedConnectionPool(
    1, 20,
    host='postgresql-replica',
    database='myapp',
    user='appuser',
    password='password'
)

def execute_read_query(query, params=None):
    conn = read_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()
    finally:
        read_pool.putconn(conn)

def execute_write_query(query, params=None):
    conn = write_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            conn.commit()
    finally:
        write_pool.putconn(conn)
```

### 연결 풀링 최적화

```ini
# pgbouncer.ini
[databases]
myapp_write = host=postgresql-master port=5432 dbname=myapp
myapp_read = host=postgresql-replica port=5432 dbname=myapp

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5

# 읽기 전용 연결 최적화
server_reset_query = DISCARD ALL
server_check_query = SELECT 1
server_check_delay = 30
```

## 🚨 장애 시나리오 대응

### 시나리오 1: 마스터 서버 장애

1. **감지**: 헬스 체크 실패
2. **격리**: 트래픽 차단
3. **승격**: 슬레이브를 마스터로 승격
4. **복구**: 기존 마스터 복구 후 슬레이브로 재구성

### 시나리오 2: 네트워크 분할

1. **감지**: 복제 연결 끊김
2. **판단**: 쿼럼 기반 의사결정
3. **대응**: 다수 파티션에서 서비스 계속
4. **복구**: 네트워크 복구 후 데이터 동기화

### 시나리오 3: 데이터 손상

1. **감지**: 체크섬 오류 또는 쿼리 실패
2. **격리**: 손상된 노드 격리
3. **복구**: 백업에서 복원 또는 다른 노드에서 재구축
4. **검증**: 데이터 무결성 확인

## 📚 다음 단계

고가용성 설정이 완료되면 다음 문서들을 참고하세요:

- **[Backup & Recovery](backup-recovery.md)** - 백업 및 복구 전략
- **[Monitoring](monitoring.md)** - 모니터링 설정
- **[Security](security.md)** - 보안 강화
- **[Troubleshooting](troubleshooting.md)** - 문제 해결

---

**이전**: [Configuration](configuration.md) | **다음**: [Backup & Recovery](backup-recovery.md)