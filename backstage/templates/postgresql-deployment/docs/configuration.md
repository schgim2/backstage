# 설정 가이드

PostgreSQL 클러스터의 상세 설정 옵션과 최적화 방법을 안내합니다.

## 🔧 PostgreSQL 핵심 설정

### 메모리 설정

```ini
# postgresql.conf

# 공유 버퍼 (전체 메모리의 25% 권장)
shared_buffers = 1GB

# 작업 메모리 (연결당 할당)
work_mem = 4MB

# 유지보수 작업 메모리
maintenance_work_mem = 256MB

# 효과적인 캐시 크기 (전체 메모리의 75% 권장)
effective_cache_size = 3GB

# WAL 버퍼
wal_buffers = 16MB
```

### 연결 설정

```ini
# 최대 연결 수
max_connections = 200

# 슈퍼유저 예약 연결
superuser_reserved_connections = 3

# 연결 타임아웃
tcp_keepalives_idle = 600
tcp_keepalives_interval = 30
tcp_keepalives_count = 3
```

### 로깅 설정

```ini
# 로그 레벨
log_min_messages = warning
log_min_error_statement = error

# 로그 대상
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'

# 로그 순환
log_rotation_age = 1d
log_rotation_size = 100MB

# 쿼리 로깅
log_statement = 'mod'  # DDL, DML 로깅
log_min_duration_statement = 1000  # 1초 이상 쿼리 로깅

# 연결 로깅
log_connections = on
log_disconnections = on
```

### 성능 최적화

```ini
# 체크포인트 설정
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min
max_wal_size = 2GB
min_wal_size = 1GB

# 백그라운드 라이터
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
bgwriter_lru_multiplier = 2.0

# 자동 VACUUM 설정
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
```

## 🔐 보안 설정

### 인증 설정 (pg_hba.conf)

```ini
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# 로컬 연결
local   all             postgres                                peer
local   all             all                                     md5

# IPv4 로컬 연결
host    all             all             127.0.0.1/32            md5
host    all             all             10.0.0.0/8              md5
host    all             all             172.16.0.0/12           md5
host    all             all             192.168.0.0/16          md5

# IPv6 로컬 연결
host    all             all             ::1/128                 md5

# 복제 연결
host    replication     replicator      10.0.0.0/8              md5
host    replication     replicator      172.16.0.0/12           md5
host    replication     replicator      192.168.0.0/16          md5

# SSL 연결 강제
hostssl all             all             0.0.0.0/0               md5
```

### SSL/TLS 설정

```ini
# SSL 활성화
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
ssl_ca_file = '/etc/ssl/certs/ca.crt'

# SSL 암호화 설정
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
ssl_ecdh_curve = 'prime256v1'

# SSL 최소 버전
ssl_min_protocol_version = 'TLSv1.2'
```

### 비밀번호 정책

```sql
-- 비밀번호 복잡성 확장 설치
CREATE EXTENSION IF NOT EXISTS passwordcheck;

-- 비밀번호 정책 설정
ALTER SYSTEM SET passwordcheck.minimum_length = 12;
ALTER SYSTEM SET passwordcheck.maximum_length = 128;
ALTER SYSTEM SET passwordcheck.special_chars = 2;
ALTER SYSTEM SET passwordcheck.numbers = 2;
ALTER SYSTEM SET passwordcheck.uppercase = 2;
ALTER SYSTEM SET passwordcheck.lowercase = 2;

-- 설정 적용
SELECT pg_reload_conf();
```

## 🏗️ 고가용성 설정

### 복제 설정 (마스터)

```ini
# WAL 설정
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
wal_keep_size = 1GB

# 동기 복제 설정 (선택사항)
synchronous_standby_names = 'replica1,replica2'
synchronous_commit = on

# 아카이빙 설정
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
archive_timeout = 300
```

### 복제 설정 (슬레이브)

```ini
# 핫 스탠바이 설정
hot_standby = on
max_standby_archive_delay = 30s
max_standby_streaming_delay = 30s
wal_receiver_status_interval = 10s
hot_standby_feedback = on
```

### 복제 슬롯 관리

```sql
-- 복제 슬롯 생성
SELECT pg_create_physical_replication_slot('replica1');
SELECT pg_create_physical_replication_slot('replica2');

-- 복제 슬롯 상태 확인
SELECT slot_name, active, restart_lsn FROM pg_replication_slots;

-- 복제 상태 확인
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn 
FROM pg_stat_replication;
```

## 📊 모니터링 설정

### 통계 수집 설정

```ini
# 통계 수집 활성화
track_activities = on
track_counts = on
track_io_timing = on
track_functions = all

# pg_stat_statements 확장
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
pg_stat_statements.save = on
```

### 모니터링 확장 설치

```sql
-- 필수 확장 설치
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_buffercache;
CREATE EXTENSION IF NOT EXISTS pgstattuple;

-- 모니터링 사용자 생성
CREATE USER postgres_exporter WITH PASSWORD 'exporter_password';
GRANT pg_monitor TO postgres_exporter;
GRANT SELECT ON pg_stat_database TO postgres_exporter;
```

### Prometheus 메트릭 설정

```yaml
# postgres_exporter 설정
queries:
  - name: "pg_database"
    help: "Database statistics"
    labels:
      - "datname"
    values:
      - "numbackends"
      - "xact_commit"
      - "xact_rollback"
      - "blks_read"
      - "blks_hit"
    query: |
      SELECT datname,
             numbackends,
             xact_commit,
             xact_rollback,
             blks_read,
             blks_hit
      FROM pg_stat_database
      WHERE datname NOT IN ('template0', 'template1', 'postgres')

  - name: "pg_replication"
    help: "Replication statistics"
    labels:
      - "client_addr"
      - "state"
    values:
      - "sent_lsn_bytes"
      - "write_lsn_bytes"
      - "flush_lsn_bytes"
      - "replay_lsn_bytes"
    query: |
      SELECT client_addr,
             state,
             pg_wal_lsn_diff(sent_lsn, '0/0') as sent_lsn_bytes,
             pg_wal_lsn_diff(write_lsn, '0/0') as write_lsn_bytes,
             pg_wal_lsn_diff(flush_lsn, '0/0') as flush_lsn_bytes,
             pg_wal_lsn_diff(replay_lsn, '0/0') as replay_lsn_bytes
      FROM pg_stat_replication
```

## 🔄 백업 설정

### 자동 백업 스크립트

```bash
#!/bin/bash
# backup.sh

# 설정
BACKUP_DIR="/var/lib/postgresql/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 전체 백업
pg_dump -U postgres -h localhost -p 5432 \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="${BACKUP_DIR}/full_backup_${TIMESTAMP}.dump" \
  myapp

# 스키마만 백업
pg_dump -U postgres -h localhost -p 5432 \
  --schema-only \
  --format=plain \
  --file="${BACKUP_DIR}/schema_backup_${TIMESTAMP}.sql" \
  myapp

# 오래된 백업 삭제
find ${BACKUP_DIR} -name "*.dump" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR} -name "*.sql" -mtime +${RETENTION_DAYS} -delete

# 백업 검증
pg_restore --list "${BACKUP_DIR}/full_backup_${TIMESTAMP}.dump" > /dev/null
if [ $? -eq 0 ]; then
    echo "Backup verification successful: ${TIMESTAMP}"
else
    echo "Backup verification failed: ${TIMESTAMP}"
    exit 1
fi
```

### WAL 아카이빙 설정

```ini
# postgresql.conf
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/archive/%f && cp %p /var/lib/postgresql/archive/%f'
archive_timeout = 300

# 아카이브 정리 스크립트
wal_keep_size = 1GB
```

```bash
#!/bin/bash
# wal_cleanup.sh

ARCHIVE_DIR="/var/lib/postgresql/archive"
RETENTION_DAYS=7

# 오래된 WAL 파일 삭제
find ${ARCHIVE_DIR} -name "*.backup" -mtime +${RETENTION_DAYS} -delete
find ${ARCHIVE_DIR} -name "[0-9A-F]*" -mtime +${RETENTION_DAYS} -delete
```

## 🔧 PgBouncer 설정

### 연결 풀링 설정

```ini
# pgbouncer.ini

[databases]
myapp = host=postgresql-master port=5432 dbname=myapp

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 5432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# 풀 모드
pool_mode = transaction
server_reset_query = DISCARD ALL

# 연결 제한
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5

# 타임아웃
server_lifetime = 3600
server_idle_timeout = 600
client_idle_timeout = 0

# 로깅
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

# 관리
admin_users = postgres
stats_users = postgres
```

### 사용자 인증 파일

```txt
# userlist.txt
"postgres" "md5d41d8cd98f00b204e9800998ecf8427e"
"appuser" "md5098f6bcd4621d373cade4e832627b4f6"
```

## 🎛️ 환경별 설정

### 개발 환경

```ini
# 개발용 최적화
shared_buffers = 256MB
work_mem = 8MB
maintenance_work_mem = 64MB
effective_cache_size = 1GB

# 로깅 (상세)
log_statement = 'all'
log_min_duration_statement = 0
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# 자동 VACUUM (빈번)
autovacuum_naptime = 30s
```

### 프로덕션 환경

```ini
# 프로덕션 최적화
shared_buffers = 4GB
work_mem = 4MB
maintenance_work_mem = 1GB
effective_cache_size = 12GB

# 로깅 (최소)
log_statement = 'mod'
log_min_duration_statement = 5000
log_line_prefix = '%t [%p]: [%l-1] '

# 자동 VACUUM (보수적)
autovacuum_naptime = 5min
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05
```

## 📈 성능 튜닝

### 인덱스 최적화

```sql
-- 인덱스 사용량 분석
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 사용되지 않는 인덱스 찾기
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;

-- 중복 인덱스 찾기
SELECT pg_size_pretty(sum(pg_relation_size(idx))::bigint) as size,
       (array_agg(idx))[1] as idx1, (array_agg(idx))[2] as idx2,
       (array_agg(idx))[3] as idx3, (array_agg(idx))[4] as idx4
FROM (
    SELECT indexrelid::regclass as idx, (indrelid::text ||E'\n'|| indclass::text ||E'\n'|| indkey::text ||E'\n'|| coalesce(indexprs::text,'')||E'\n' || coalesce(indpred::text,'')) as KEY
    FROM pg_index) sub
GROUP BY KEY HAVING count(*)>1
ORDER BY sum(pg_relation_size(idx)) DESC;
```

### 쿼리 최적화

```sql
-- 느린 쿼리 분석
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 테이블 크기 분석
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
       pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 메모리 사용량 최적화

```sql
-- 버퍼 캐시 분석
SELECT c.relname, count(*) as buffers
FROM pg_buffercache b
INNER JOIN pg_class c ON b.relfilenode = pg_relation_filenode(c.oid)
WHERE b.reldatabase IN (0, (SELECT oid FROM pg_database WHERE datname = current_database()))
GROUP BY c.relname
ORDER BY 2 DESC
LIMIT 10;

-- 연결별 메모리 사용량
SELECT pid, usename, application_name, client_addr,
       pg_size_pretty(pg_backend_memory_contexts.total_bytes) as memory_usage
FROM pg_stat_activity
JOIN pg_backend_memory_contexts ON pg_stat_activity.pid = pg_backend_memory_contexts.pid
WHERE state = 'active'
ORDER BY pg_backend_memory_contexts.total_bytes DESC;
```

## 🔄 설정 적용 방법

### 설정 파일 수정

```bash
# Kubernetes 환경
kubectl edit configmap postgresql-config -n database

# Docker Compose 환경
docker-compose exec postgresql-master vi /etc/postgresql/postgresql.conf
```

### 설정 다시 로드

```sql
-- 설정 다시 로드 (재시작 불필요)
SELECT pg_reload_conf();

-- 현재 설정 확인
SHOW all;

-- 특정 설정 확인
SHOW shared_buffers;
SHOW max_connections;
```

### 재시작이 필요한 설정

```sql
-- 재시작이 필요한 설정 확인
SELECT name, setting, pending_restart
FROM pg_settings
WHERE pending_restart = true;
```

```bash
# Kubernetes 환경에서 재시작
kubectl rollout restart statefulset postgresql-master -n database

# Docker Compose 환경에서 재시작
docker-compose restart postgresql-master
```

## 📚 다음 단계

설정이 완료되면 다음 문서들을 참고하세요:

- **[High Availability](high-availability.md)** - 고가용성 구성
- **[Monitoring](monitoring.md)** - 모니터링 설정
- **[Security](security.md)** - 보안 강화
- **[Best Practices](best-practices.md)** - 운영 모범 사례

---

**이전**: [Getting Started](getting-started.md) | **다음**: [High Availability](high-availability.md)