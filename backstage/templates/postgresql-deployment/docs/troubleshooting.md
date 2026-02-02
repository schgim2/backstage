# 문제 해결

PostgreSQL 클러스터 운영 중 발생할 수 있는 일반적인 문제들과 해결 방법을 안내합니다.

## 🔍 진단 도구

### 기본 상태 확인

```bash
#!/bin/bash
# health_check.sh

echo "=== PostgreSQL Health Check ==="
echo "Timestamp: $(date)"
echo ""

# 1. 서비스 상태 확인
echo "1. Service Status:"
if kubectl get pods -n database | grep postgresql; then
    echo "✓ PostgreSQL pods are running"
else
    echo "✗ PostgreSQL pods not found or not running"
fi
echo ""

# 2. 연결 테스트
echo "2. Connection Test:"
if pg_isready -h postgresql-master.database.svc.cluster.local -p 5432; then
    echo "✓ Master is accepting connections"
else
    echo "✗ Master is not accepting connections"
fi

if pg_isready -h postgresql-replica.database.svc.cluster.local -p 5432; then
    echo "✓ Replica is accepting connections"
else
    echo "✗ Replica is not accepting connections"
fi
echo ""

# 3. 복제 상태 확인
echo "3. Replication Status:"
REPLICATION_STATUS=$(psql -h postgresql-master.database.svc.cluster.local -U postgres -t -c "SELECT count(*) FROM pg_stat_replication;")
if [ "$REPLICATION_STATUS" -gt 0 ]; then
    echo "✓ Replication is active ($REPLICATION_STATUS replicas)"
else
    echo "✗ No active replicas found"
fi
echo ""

# 4. 디스크 사용량 확인
echo "4. Disk Usage:"
kubectl exec postgresql-master-0 -n database -- df -h /var/lib/postgresql/data
echo ""

# 5. 메모리 사용량 확인
echo "5. Memory Usage:"
kubectl top pod -n database | grep postgresql
echo ""

# 6. 최근 에러 로그 확인
echo "6. Recent Errors:"
kubectl logs postgresql-master-0 -n database --tail=10 | grep -i error
echo ""
```

### 성능 진단

```sql
-- 현재 활성 쿼리 확인
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY query_start;

-- 잠금 대기 상황 확인
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- 테이블 크기 및 bloat 확인
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    n_dead_tup,
    n_live_tup,
    CASE WHEN n_live_tup > 0 
         THEN round(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2) 
         ELSE 0 END as dead_tuple_percent
FROM pg_stat_user_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🚨 일반적인 문제 해결

### 1. 연결 문제

#### 문제: "Connection refused" 오류

**증상:**
```
psql: error: could not connect to server: Connection refused
```

**원인 분석:**
```bash
# 포트 확인
kubectl get svc -n database | grep postgresql

# Pod 상태 확인
kubectl get pods -n database

# 로그 확인
kubectl logs postgresql-master-0 -n database
```

**해결 방법:**
```bash
# 1. 서비스 재시작
kubectl rollout restart statefulset postgresql-master -n database

# 2. 포트 포워딩으로 직접 연결 테스트
kubectl port-forward postgresql-master-0 5432:5432 -n database

# 3. 네트워크 정책 확인
kubectl get networkpolicy -n database

# 4. DNS 해상도 확인
kubectl exec -it postgresql-master-0 -n database -- nslookup postgresql-master
```

#### 문제: "Too many connections" 오류

**증상:**
```
FATAL: sorry, too many clients already
```

**원인 분석:**
```sql
-- 현재 연결 수 확인
SELECT count(*) FROM pg_stat_activity;

-- 최대 연결 수 확인
SHOW max_connections;

-- 연결별 상태 확인
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

**해결 방법:**
```sql
-- 1. 유휴 연결 종료
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
    AND state_change < NOW() - INTERVAL '1 hour';

-- 2. 최대 연결 수 증가 (임시)
ALTER SYSTEM SET max_connections = 300;
SELECT pg_reload_conf();

-- 3. 연결 풀링 설정 확인
-- PgBouncer 설정 검토 필요
```

### 2. 성능 문제

#### 문제: 느린 쿼리 성능

**증상:**
- 쿼리 실행 시간이 비정상적으로 길어짐
- 애플리케이션 응답 시간 증가

**원인 분석:**
```sql
-- 느린 쿼리 확인 (pg_stat_statements 필요)
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- 현재 실행 중인 느린 쿼리
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- 인덱스 사용률 확인
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    seq_tup_read / seq_scan as avg_seq_read
FROM pg_stat_user_tables 
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC;
```

**해결 방법:**
```sql
-- 1. 누락된 인덱스 생성
CREATE INDEX CONCURRENTLY idx_table_column ON table_name (column_name);

-- 2. 통계 정보 업데이트
ANALYZE;

-- 3. 쿼리 플랜 확인
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM table_name WHERE condition;

-- 4. 자동 VACUUM 설정 조정
ALTER TABLE table_name SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE table_name SET (autovacuum_analyze_scale_factor = 0.05);
```

#### 문제: 높은 CPU 사용률

**원인 분석:**
```bash
# CPU 사용률 확인
kubectl top pod -n database

# 시스템 리소스 확인
kubectl exec postgresql-master-0 -n database -- top -n 1

# PostgreSQL 프로세스 확인
kubectl exec postgresql-master-0 -n database -- ps aux | grep postgres
```

```sql
-- CPU 집약적인 쿼리 확인
SELECT 
    pid,
    usename,
    application_name,
    state,
    query_start,
    query
FROM pg_stat_activity 
WHERE state = 'active'
ORDER BY query_start;

-- 통계 정보 확인
SELECT 
    schemaname,
    tablename,
    n_tup_ins + n_tup_upd + n_tup_del as total_writes,
    seq_scan,
    seq_tup_read
FROM pg_stat_user_tables 
ORDER BY total_writes DESC;
```

**해결 방법:**
```sql
-- 1. 비효율적인 쿼리 최적화
-- 2. 인덱스 추가
-- 3. 파티셔닝 고려
-- 4. 리소스 제한 설정

-- work_mem 조정
ALTER SYSTEM SET work_mem = '8MB';
SELECT pg_reload_conf();

-- 병렬 처리 설정
ALTER SYSTEM SET max_parallel_workers_per_gather = 2;
SELECT pg_reload_conf();
```

### 3. 복제 문제

#### 문제: 복제 지연

**증상:**
- 슬레이브에서 최신 데이터가 조회되지 않음
- 복제 지연 알림 발생

**원인 분석:**
```sql
-- 마스터에서 복제 상태 확인
SELECT 
    client_addr,
    application_name,
    state,
    pg_wal_lsn_diff(sent_lsn, write_lsn) AS write_lag,
    pg_wal_lsn_diff(write_lsn, flush_lsn) AS flush_lag,
    pg_wal_lsn_diff(flush_lsn, replay_lsn) AS replay_lag
FROM pg_stat_replication;

-- 슬레이브에서 지연 확인
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds;

-- WAL 파일 상태 확인
SELECT 
    name,
    setting,
    unit
FROM pg_settings 
WHERE name IN ('wal_keep_size', 'max_wal_senders', 'wal_sender_timeout');
```

**해결 방법:**
```sql
-- 1. WAL 설정 조정
ALTER SYSTEM SET wal_keep_size = '2GB';
ALTER SYSTEM SET max_wal_senders = 10;
SELECT pg_reload_conf();

-- 2. 네트워크 설정 확인
ALTER SYSTEM SET wal_sender_timeout = '60s';
ALTER SYSTEM SET wal_receiver_timeout = '60s';
SELECT pg_reload_conf();

-- 3. 복제 슬롯 확인
SELECT 
    slot_name,
    active,
    restart_lsn,
    confirmed_flush_lsn
FROM pg_replication_slots;
```

#### 문제: 복제 중단

**증상:**
- 복제 연결이 끊어짐
- 슬레이브가 마스터와 동기화되지 않음

**원인 분석:**
```bash
# 네트워크 연결 확인
kubectl exec postgresql-replica-0-0 -n database -- \
  pg_isready -h postgresql-master.database.svc.cluster.local

# 복제 로그 확인
kubectl logs postgresql-replica-0-0 -n database | grep -i replication
```

**해결 방법:**
```bash
# 1. 복제 재시작
kubectl exec postgresql-replica-0-0 -n database -- \
  pg_ctl restart -D /var/lib/postgresql/data

# 2. 복제 슬롯 재생성
psql -h postgresql-master -U postgres -c "
SELECT pg_drop_replication_slot('replica1');
SELECT pg_create_physical_replication_slot('replica1');"

# 3. 베이스 백업에서 복제 재구축
kubectl exec postgresql-master-0 -n database -- \
  pg_basebackup -h postgresql-master -U replicator \
  -D /tmp/replica_backup -Ft -z -P
```

### 4. 디스크 공간 문제

#### 문제: 디스크 공간 부족

**증상:**
```
ERROR: could not extend file "base/16384/16385": No space left on device
```

**원인 분석:**
```bash
# 디스크 사용량 확인
kubectl exec postgresql-master-0 -n database -- df -h

# 데이터베이스 크기 확인
psql -h postgresql-master -U postgres -c "
SELECT 
    datname,
    pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database 
ORDER BY pg_database_size(datname) DESC;"

# 테이블별 크기 확인
psql -h postgresql-master -U postgres -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

**해결 방법:**
```bash
# 1. 임시 파일 정리
kubectl exec postgresql-master-0 -n database -- \
  find /var/lib/postgresql/data -name "pgsql_tmp*" -delete

# 2. WAL 파일 정리
kubectl exec postgresql-master-0 -n database -- \
  find /var/lib/postgresql/data/pg_wal -name "*.backup" -mtime +7 -delete

# 3. 로그 파일 정리
kubectl exec postgresql-master-0 -n database -- \
  find /var/lib/postgresql/data/log -name "*.log" -mtime +7 -delete
```

```sql
-- 4. VACUUM FULL 실행 (주의: 테이블 잠금 발생)
VACUUM FULL table_name;

-- 5. 불필요한 데이터 삭제
DELETE FROM old_table WHERE created_at < NOW() - INTERVAL '1 year';

-- 6. 파티션 삭제 (파티셔닝된 테이블의 경우)
DROP TABLE partition_table_202301;
```

### 5. 백업 및 복구 문제

#### 문제: 백업 실패

**증상:**
- 백업 작업이 완료되지 않음
- 백업 파일이 생성되지 않음

**원인 분석:**
```bash
# 백업 작업 로그 확인
kubectl logs -f job/postgresql-backup -n database

# 디스크 공간 확인
kubectl exec postgresql-master-0 -n database -- df -h /backup

# 권한 확인
kubectl exec postgresql-master-0 -n database -- ls -la /backup
```

**해결 방법:**
```bash
# 1. 수동 백업 테스트
kubectl exec postgresql-master-0 -n database -- \
  pg_dump -U postgres -d myapp -f /tmp/test_backup.sql

# 2. 백업 디렉토리 권한 수정
kubectl exec postgresql-master-0 -n database -- \
  chown postgres:postgres /backup

# 3. 백업 스크립트 수정
# 백업 스크립트의 오류 처리 로직 개선
```

#### 문제: 복구 실패

**증상:**
- 백업에서 복구 시 오류 발생
- 데이터 불일치

**해결 방법:**
```bash
# 1. 백업 파일 무결성 확인
pg_restore --list backup_file.dump

# 2. 단계별 복구
pg_restore --schema-only backup_file.dump | psql -d target_db
pg_restore --data-only backup_file.dump | psql -d target_db

# 3. 특정 테이블만 복구
pg_restore --table=specific_table backup_file.dump | psql -d target_db
```

## 🔧 자동 복구 스크립트

### 자동 문제 감지 및 복구

```bash
#!/bin/bash
# auto_recovery.sh

LOG_FILE="/var/log/postgresql/auto_recovery.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${LOG_FILE}
}

# 1. 연결 상태 확인 및 복구
check_connectivity() {
    if ! pg_isready -h postgresql-master.database.svc.cluster.local -p 5432; then
        log "WARNING: Master not responding, attempting restart..."
        kubectl rollout restart statefulset postgresql-master -n database
        sleep 60
        
        if pg_isready -h postgresql-master.database.svc.cluster.local -p 5432; then
            log "SUCCESS: Master connectivity restored"
        else
            log "ERROR: Master restart failed, manual intervention required"
            # 알림 발송
            curl -X POST -H 'Content-type: application/json' \
                --data '{"text":"🚨 PostgreSQL Master restart failed"}' \
                $SLACK_WEBHOOK_URL
        fi
    fi
}

# 2. 복제 지연 확인 및 복구
check_replication_lag() {
    LAG=$(psql -h postgresql-master.database.svc.cluster.local -U postgres -t -c "
    SELECT COALESCE(MAX(pg_wal_lsn_diff(sent_lsn, write_lsn)), 0) 
    FROM pg_stat_replication;")
    
    if [ "$LAG" -gt 1073741824 ]; then  # 1GB
        log "WARNING: High replication lag detected: $LAG bytes"
        
        # 복제 재시작 시도
        kubectl rollout restart statefulset postgresql-replica-0 -n database
        sleep 30
        
        # 재확인
        NEW_LAG=$(psql -h postgresql-master.database.svc.cluster.local -U postgres -t -c "
        SELECT COALESCE(MAX(pg_wal_lsn_diff(sent_lsn, write_lsn)), 0) 
        FROM pg_stat_replication;")
        
        if [ "$NEW_LAG" -lt "$LAG" ]; then
            log "SUCCESS: Replication lag reduced to $NEW_LAG bytes"
        else
            log "ERROR: Replication lag not improved, manual intervention required"
        fi
    fi
}

# 3. 디스크 공간 확인 및 정리
check_disk_space() {
    DISK_USAGE=$(kubectl exec postgresql-master-0 -n database -- \
        df /var/lib/postgresql/data | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$DISK_USAGE" -gt 85 ]; then
        log "WARNING: High disk usage: ${DISK_USAGE}%"
        
        # 임시 파일 정리
        kubectl exec postgresql-master-0 -n database -- \
            find /var/lib/postgresql/data -name "pgsql_tmp*" -delete
        
        # 오래된 WAL 파일 정리
        kubectl exec postgresql-master-0 -n database -- \
            find /var/lib/postgresql/data/pg_wal -name "*.backup" -mtime +3 -delete
        
        # 재확인
        NEW_USAGE=$(kubectl exec postgresql-master-0 -n database -- \
            df /var/lib/postgresql/data | tail -1 | awk '{print $5}' | sed 's/%//')
        
        log "Disk usage after cleanup: ${NEW_USAGE}%"
        
        if [ "$NEW_USAGE" -gt 90 ]; then
            log "CRITICAL: Disk usage still high after cleanup"
            # 긴급 알림
            curl -X POST -H 'Content-type: application/json' \
                --data '{"text":"🚨 CRITICAL: PostgreSQL disk usage > 90%"}' \
                $SLACK_WEBHOOK_URL
        fi
    fi
}

# 4. 연결 수 확인 및 정리
check_connections() {
    CONN_COUNT=$(psql -h postgresql-master.database.svc.cluster.local -U postgres -t -c "
    SELECT count(*) FROM pg_stat_activity;")
    
    MAX_CONN=$(psql -h postgresql-master.database.svc.cluster.local -U postgres -t -c "
    SHOW max_connections;" | tr -d ' ')
    
    CONN_PERCENT=$((CONN_COUNT * 100 / MAX_CONN))
    
    if [ "$CONN_PERCENT" -gt 80 ]; then
        log "WARNING: High connection usage: ${CONN_COUNT}/${MAX_CONN} (${CONN_PERCENT}%)"
        
        # 유휴 연결 정리
        TERMINATED=$(psql -h postgresql-master.database.svc.cluster.local -U postgres -t -c "
        SELECT count(pg_terminate_backend(pid)) 
        FROM pg_stat_activity 
        WHERE state = 'idle' 
            AND state_change < NOW() - INTERVAL '30 minutes'
            AND usename != 'postgres';")
        
        log "Terminated $TERMINATED idle connections"
    fi
}

# 메인 실행
log "Starting automatic recovery check..."

check_connectivity
check_replication_lag
check_disk_space
check_connections

log "Automatic recovery check completed"
```

## 📚 다음 단계

문제 해결 방법을 숙지한 후 다음 문서를 참고하세요:

- **[Best Practices](best-practices.md)** - 문제 예방을 위한 모범 사례

---

**이전**: [Security](security.md) | **다음**: [Best Practices](best-practices.md)