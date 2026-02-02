# 모범 사례

PostgreSQL 클러스터 운영을 위한 모범 사례와 권장사항을 안내합니다.

## 🏗️ 아키텍처 설계 원칙

### 1. 고가용성 설계

#### 다중 가용 영역 배포
```yaml
# 노드 어피니티를 사용한 다중 AZ 배포
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql-master
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values: ["postgresql"]
            topologyKey: topology.kubernetes.io/zone
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: node-type
                operator: In
                values: ["database"]
```

#### 복제 구성 권장사항
- **비동기 복제**: 일반적인 워크로드에 권장
- **동기 복제**: 데이터 일관성이 중요한 경우만 사용
- **복제본 수**: 최소 2개, 권장 3개 (홀수 개수)
- **복제 지연 모니터링**: 1GB 이하 유지

### 2. 리소스 계획

#### CPU 및 메모리 할당
```yaml
# 프로덕션 환경 리소스 설정
resources:
  requests:
    cpu: "4"
    memory: "8Gi"
  limits:
    cpu: "8"
    memory: "16Gi"

# 개발 환경 리소스 설정
resources:
  requests:
    cpu: "1"
    memory: "2Gi"
  limits:
    cpu: "2"
    memory: "4Gi"
```

#### 스토리지 계획
- **IOPS**: 최소 3000 IOPS, 권장 10000+ IOPS
- **처리량**: 최소 125MB/s, 권장 500MB/s
- **용량**: 현재 데이터 크기의 3-5배
- **백업 공간**: 데이터 크기의 2-3배

## 🔧 설정 최적화

### PostgreSQL 설정 최적화

#### 메모리 설정 (16GB RAM 기준)
```ini
# postgresql.conf

# 공유 버퍼 (RAM의 25%)
shared_buffers = 4GB

# 작업 메모리 (RAM / max_connections / 4)
work_mem = 16MB

# 유지보수 작업 메모리 (RAM의 5-10%)
maintenance_work_mem = 1GB

# 효과적인 캐시 크기 (RAM의 75%)
effective_cache_size = 12GB

# WAL 버퍼
wal_buffers = 64MB

# 체크포인트 설정
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min
max_wal_size = 4GB
min_wal_size = 2GB

# 백그라운드 라이터
bgwriter_delay = 200ms
bgwriter_lru_maxpages = 100
bgwriter_lru_multiplier = 2.0

# 통계 수집
track_activities = on
track_counts = on
track_io_timing = on
track_functions = all
```

#### 연결 및 인증 설정
```ini
# 연결 설정
max_connections = 200
superuser_reserved_connections = 3

# 인증 타임아웃
authentication_timeout = 60s
tcp_keepalives_idle = 600
tcp_keepalives_interval = 30
tcp_keepalives_count = 3

# SSL 설정
ssl = on
ssl_prefer_server_ciphers = on
ssl_min_protocol_version = 'TLSv1.2'
```

### 인덱스 전략

#### 인덱스 생성 원칙
```sql
-- 1. 기본키는 자동으로 인덱스 생성됨
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,  -- 자동 인덱스 생성
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 자주 검색되는 컬럼에 인덱스 생성
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_created_at ON users (created_at);

-- 3. 복합 인덱스 (순서 중요)
CREATE INDEX idx_users_status_created ON users (status, created_at);

-- 4. 부분 인덱스 (조건부)
CREATE INDEX idx_users_active ON users (email) WHERE status = 'active';

-- 5. 함수 기반 인덱스
CREATE INDEX idx_users_email_lower ON users (lower(email));
```

#### 인덱스 모니터링
```sql
-- 사용되지 않는 인덱스 찾기
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- 중복 인덱스 찾기
WITH index_info AS (
    SELECT 
        schemaname,
        tablename,
        indexname,
        string_agg(attname, ',' ORDER BY attnum) as columns
    FROM pg_indexes 
    JOIN pg_attribute ON attrelid = (schemaname||'.'||tablename)::regclass
    WHERE attnum > 0
    GROUP BY schemaname, tablename, indexname
)
SELECT 
    schemaname,
    tablename,
    array_agg(indexname) as duplicate_indexes,
    columns
FROM index_info
GROUP BY schemaname, tablename, columns
HAVING count(*) > 1;
```

## 📊 모니터링 및 알림

### 핵심 메트릭 모니터링

#### 성능 메트릭
```yaml
# Prometheus 알림 규칙
groups:
- name: postgresql-performance
  rules:
  # 캐시 히트율
  - alert: PostgreSQLLowCacheHitRatio
    expr: postgresql_cache_hit_ratio < 95
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "PostgreSQL cache hit ratio is low"
      
  # 연결 수
  - alert: PostgreSQLHighConnections
    expr: postgresql_connections > 160  # 80% of max_connections
    for: 5m
    labels:
      severity: warning
      
  # 복제 지연
  - alert: PostgreSQLReplicationLag
    expr: postgresql_replication_lag_bytes > 100MB
    for: 5m
    labels:
      severity: warning
      
  # 디스크 사용량
  - alert: PostgreSQLHighDiskUsage
    expr: postgresql_disk_usage_percent > 85
    for: 5m
    labels:
      severity: warning
```

#### 자동화된 성능 리포트
```bash
#!/bin/bash
# daily_performance_report.sh

REPORT_DATE=$(date +%Y-%m-%d)
REPORT_FILE="/reports/postgresql_performance_${REPORT_DATE}.html"

# HTML 리포트 생성
cat > ${REPORT_FILE} << EOF
<!DOCTYPE html>
<html>
<head>
    <title>PostgreSQL Daily Performance Report - ${REPORT_DATE}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f0f8ff; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .critical { background: #f8d7da; border-left: 4px solid #dc3545; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>PostgreSQL Performance Report</h1>
    <p>Report Date: ${REPORT_DATE}</p>
    
    <h2>System Overview</h2>
EOF

# 시스템 메트릭 수집
TOTAL_CONNECTIONS=$(psql -h postgresql-master -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;")
CACHE_HIT_RATIO=$(psql -h postgresql-master -U postgres -t -c "SELECT round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) FROM pg_stat_database;")
DB_SIZE=$(psql -h postgresql-master -U postgres -t -c "SELECT pg_size_pretty(sum(pg_database_size(datname))) FROM pg_database WHERE datname NOT IN ('template0', 'template1', 'postgres');")

cat >> ${REPORT_FILE} << EOF
    <div class="metric">
        <strong>Total Connections:</strong> ${TOTAL_CONNECTIONS}
    </div>
    <div class="metric">
        <strong>Cache Hit Ratio:</strong> ${CACHE_HIT_RATIO}%
    </div>
    <div class="metric">
        <strong>Total Database Size:</strong> ${DB_SIZE}
    </div>
    
    <h2>Top 10 Slow Queries</h2>
    <table>
        <tr><th>Query</th><th>Calls</th><th>Mean Time (ms)</th><th>Total Time (ms)</th></tr>
EOF

# 느린 쿼리 정보 추가
psql -h postgresql-master -U postgres -H -c "
SELECT 
    left(query, 100) as query,
    calls,
    round(mean_time::numeric, 2) as mean_time,
    round(total_time::numeric, 2) as total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;" >> ${REPORT_FILE}

cat >> ${REPORT_FILE} << EOF
    </table>
</body>
</html>
EOF

# 이메일 발송
if [ ! -z "$REPORT_EMAIL" ]; then
    mail -s "PostgreSQL Daily Performance Report - ${REPORT_DATE}" \
         -a "Content-Type: text/html" \
         $REPORT_EMAIL < ${REPORT_FILE}
fi
```

## 🔒 보안 모범 사례

### 접근 제어

#### 최소 권한 원칙
```sql
-- 애플리케이션별 전용 사용자 생성
CREATE USER app1_user WITH LOGIN ENCRYPTED PASSWORD 'strong_password';
CREATE USER app2_user WITH LOGIN ENCRYPTED PASSWORD 'strong_password';

-- 스키마별 권한 분리
CREATE SCHEMA app1_schema;
CREATE SCHEMA app2_schema;

GRANT USAGE ON SCHEMA app1_schema TO app1_user;
GRANT ALL ON ALL TABLES IN SCHEMA app1_schema TO app1_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA app1_schema GRANT ALL ON TABLES TO app1_user;

-- 읽기 전용 사용자
CREATE USER readonly_user WITH LOGIN ENCRYPTED PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE myapp TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;
```

#### 네트워크 보안
```ini
# pg_hba.conf 보안 설정

# 로컬 연결만 trust 허용
local   all             postgres                                peer

# 애플리케이션 서버에서만 접근 허용
host    myapp           app_user        10.0.1.0/24             scram-sha-256
host    myapp           readonly_user   10.0.2.0/24             scram-sha-256

# SSL 연결 강제
hostssl all             all             0.0.0.0/0               scram-sha-256

# 복제 연결 보안
hostssl replication     replicator      10.0.0.0/8              scram-sha-256

# 모든 다른 연결 거부
host    all             all             0.0.0.0/0               reject
```

### 데이터 보호

#### 민감한 데이터 암호화
```sql
-- pgcrypto를 사용한 컬럼 수준 암호화
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE customer_data (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255),
    phone_encrypted BYTEA,  -- 암호화된 전화번호
    ssn_encrypted BYTEA,    -- 암호화된 주민번호
    created_at TIMESTAMP DEFAULT NOW()
);

-- 암호화 함수
CREATE OR REPLACE FUNCTION encrypt_pii(data TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 복호화 함수 (권한 있는 사용자만)
CREATE OR REPLACE FUNCTION decrypt_pii(encrypted_data BYTEA)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용 예시
INSERT INTO customer_data (name, email, phone_encrypted, ssn_encrypted)
VALUES ('John Doe', 'john@example.com', 
        encrypt_pii('010-1234-5678'), 
        encrypt_pii('123-45-6789'));
```

## 💾 백업 및 복구 전략

### 백업 전략

#### 3-2-1 백업 규칙
- **3개의 복사본**: 원본 + 2개의 백업
- **2개의 다른 미디어**: 로컬 + 클라우드
- **1개의 오프사이트**: 다른 지역/데이터센터

#### 백업 스케줄 권장사항
```yaml
# 백업 스케줄 예시
schedules:
  full_backup:
    frequency: weekly
    day: sunday
    time: "02:00"
    retention: 4_weeks
    
  incremental_backup:
    frequency: daily
    time: "02:00"
    retention: 7_days
    
  wal_archiving:
    frequency: continuous
    retention: 7_days
    
  snapshot_backup:
    frequency: before_major_changes
    retention: 30_days
```

#### 백업 검증 자동화
```bash
#!/bin/bash
# backup_verification.sh

BACKUP_FILE="$1"
TEST_DB="backup_test_$(date +%Y%m%d_%H%M%S)"

# 1. 백업 파일 무결성 검사
if ! pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
    echo "ERROR: Backup file is corrupted"
    exit 1
fi

# 2. 테스트 데이터베이스에 복원
createdb "$TEST_DB"
if pg_restore -d "$TEST_DB" "$BACKUP_FILE" > /dev/null 2>&1; then
    echo "SUCCESS: Backup restoration test passed"
    
    # 3. 기본 데이터 검증
    TABLE_COUNT=$(psql -d "$TEST_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
    echo "Restored tables: $TABLE_COUNT"
    
    # 4. 테스트 데이터베이스 삭제
    dropdb "$TEST_DB"
else
    echo "ERROR: Backup restoration test failed"
    dropdb "$TEST_DB" 2>/dev/null
    exit 1
fi
```

## 🚀 성능 최적화

### 쿼리 최적화

#### 쿼리 작성 가이드라인
```sql
-- 좋은 예: 인덱스를 활용한 쿼리
SELECT id, name, email 
FROM users 
WHERE status = 'active' 
    AND created_at >= '2024-01-01'
ORDER BY created_at DESC 
LIMIT 100;

-- 나쁜 예: 함수 사용으로 인덱스 무효화
SELECT id, name, email 
FROM users 
WHERE UPPER(status) = 'ACTIVE'  -- 인덱스 사용 불가
    AND DATE(created_at) = '2024-01-01';  -- 인덱스 사용 불가

-- 개선된 예: 함수 기반 인덱스 또는 조건 변경
CREATE INDEX idx_users_status_upper ON users (UPPER(status));
-- 또는
SELECT id, name, email 
FROM users 
WHERE status = 'active'
    AND created_at >= '2024-01-01'
    AND created_at < '2024-01-02';
```

#### 배치 처리 최적화
```sql
-- 대량 데이터 처리 시 배치 단위로 처리
DO $$
DECLARE
    batch_size INTEGER := 1000;
    processed INTEGER := 0;
    total_rows INTEGER;
BEGIN
    SELECT count(*) INTO total_rows FROM large_table WHERE condition;
    
    WHILE processed < total_rows LOOP
        UPDATE large_table 
        SET column = new_value 
        WHERE id IN (
            SELECT id FROM large_table 
            WHERE condition 
            LIMIT batch_size OFFSET processed
        );
        
        processed := processed + batch_size;
        
        -- 진행 상황 로그
        RAISE NOTICE 'Processed % of % rows', processed, total_rows;
        
        -- 다른 트랜잭션에게 기회 제공
        COMMIT;
    END LOOP;
END $$;
```

### 연결 풀링 최적화

#### PgBouncer 설정 권장사항
```ini
# pgbouncer.ini

[databases]
myapp = host=postgresql-master port=5432 dbname=myapp

[pgbouncer]
# 풀 모드 (transaction 권장)
pool_mode = transaction

# 연결 수 설정
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5

# 타임아웃 설정
server_lifetime = 3600
server_idle_timeout = 600
client_idle_timeout = 0

# 로그 설정
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

# 통계 수집
stats_period = 60
```

## 🔄 운영 자동화

### 정기 유지보수 작업

#### 자동 VACUUM 및 ANALYZE
```sql
-- 테이블별 자동 VACUUM 설정 조정
ALTER TABLE high_update_table SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 10
);

-- 대용량 테이블의 경우
ALTER TABLE large_table SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_analyze_scale_factor = 0.01,
    autovacuum_vacuum_cost_limit = 2000
);
```

#### 통계 정보 업데이트 자동화
```bash
#!/bin/bash
# update_statistics.sh

# 매일 새벽 통계 정보 업데이트
psql -h postgresql-master -U postgres -c "
-- 전체 데이터베이스 통계 업데이트
ANALYZE;

-- 특정 테이블의 상세 통계 업데이트
ANALYZE VERBOSE large_table;

-- 통계 정보 확인
SELECT 
    schemaname,
    tablename,
    last_analyze,
    last_autoanalyze,
    n_mod_since_analyze
FROM pg_stat_user_tables 
WHERE n_mod_since_analyze > 1000
ORDER BY n_mod_since_analyze DESC;
"
```

### 용량 관리

#### 파티셔닝 전략
```sql
-- 시간 기반 파티셔닝 (PostgreSQL 10+)
CREATE TABLE events (
    id BIGSERIAL,
    event_type VARCHAR(50),
    event_data JSONB,
    created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);

-- 월별 파티션 생성
CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 자동 파티션 생성 함수
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
    
    -- 인덱스 생성
    EXECUTE format('CREATE INDEX idx_%s_created_at ON %I (created_at)',
                   partition_name, partition_name);
END;
$$ LANGUAGE plpgsql;
```

## 📋 체크리스트

### 일일 점검 항목
- [ ] 서비스 상태 확인 (모든 Pod 실행 중)
- [ ] 연결 수 모니터링 (임계값 이하)
- [ ] 복제 지연 확인 (1GB 이하)
- [ ] 디스크 사용량 확인 (85% 이하)
- [ ] 에러 로그 검토
- [ ] 백업 작업 성공 여부 확인

### 주간 점검 항목
- [ ] 성능 메트릭 리뷰
- [ ] 느린 쿼리 분석 및 최적화
- [ ] 인덱스 사용률 검토
- [ ] 보안 로그 검토
- [ ] 용량 증가 추세 분석
- [ ] 백업 복원 테스트

### 월간 점검 항목
- [ ] 전체 시스템 성능 리뷰
- [ ] 보안 감사 실행
- [ ] 용량 계획 검토
- [ ] 재해 복구 계획 테스트
- [ ] 설정 최적화 검토
- [ ] 업그레이드 계획 수립

### 분기별 점검 항목
- [ ] 전체 아키텍처 검토
- [ ] 비즈니스 연속성 계획 테스트
- [ ] 성능 벤치마크 실행
- [ ] 보안 정책 업데이트
- [ ] 팀 교육 및 문서 업데이트

## 📚 추가 리소스

### 공식 문서
- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [PostgreSQL 성능 튜닝 가이드](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [PostgreSQL 보안 가이드](https://www.postgresql.org/docs/current/security.html)

### 커뮤니티 리소스
- [PostgreSQL 메일링 리스트](https://www.postgresql.org/list/)
- [PostgreSQL Wiki](https://wiki.postgresql.org/)
- [Planet PostgreSQL](https://planet.postgresql.org/)

### 도구 및 유틸리티
- [pgAdmin](https://www.pgadmin.org/) - 웹 기반 관리 도구
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html) - 쿼리 통계
- [pgbouncer](https://www.pgbouncer.org/) - 연결 풀링
- [Patroni](https://github.com/zalando/patroni) - 고가용성 관리

---

이 모범 사례 가이드를 따라 PostgreSQL 클러스터를 안정적이고 효율적으로 운영하시기 바랍니다. 지속적인 모니터링과 개선을 통해 최적의 성능을 유지할 수 있습니다.

**이전**: [Troubleshooting](troubleshooting.md)