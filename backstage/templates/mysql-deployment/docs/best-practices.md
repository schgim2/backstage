# 모범 사례

MySQL 클러스터의 안정적이고 효율적인 운영을 위한 모범 사례 가이드입니다.

## 설계 원칙

### 고가용성 설계

#### 다중 가용 영역 배포
```yaml
# 노드 어피니티를 통한 가용 영역 분산
spec:
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: app.kubernetes.io/name
            operator: In
            values: ["mysql-cluster"]
        topologyKey: topology.kubernetes.io/zone
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
          - key: topology.kubernetes.io/zone
            operator: In
            values: ["zone-a", "zone-b", "zone-c"]
```

#### 장애 도메인 분리
- **마스터**: 별도 노드에 배치
- **복제본**: 서로 다른 노드에 분산
- **백업**: 별도 스토리지 시스템 사용
- **모니터링**: 독립적인 인프라에 구성

### 확장성 고려사항

#### 수직 확장 (Scale Up)
```yaml
# 리소스 단계별 확장 계획
resources:
  # 소규모 (< 1000 QPS)
  small:
    cpu: "2"
    memory: "4Gi"
    storage: "100Gi"
  
  # 중간 규모 (1000-5000 QPS)
  medium:
    cpu: "4"
    memory: "8Gi"
    storage: "500Gi"
  
  # 대규모 (5000+ QPS)
  large:
    cpu: "8"
    memory: "16Gi"
    storage: "1Ti"
```

#### 수평 확장 (Scale Out)
```yaml
# 읽기 복제본 확장
replication:
  # 읽기 부하에 따른 복제본 수 조정
  read_replicas:
    - name: replica-read-1
      zone: zone-a
      resources: medium
    - name: replica-read-2
      zone: zone-b
      resources: medium
    - name: replica-analytics
      zone: zone-c
      resources: large
      purpose: analytics_workload
```

## 성능 최적화

### 데이터베이스 설계

#### 테이블 설계 원칙
```sql
-- 1. 적절한 데이터 타입 선택
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,           -- 고정 길이보다 가변 길이
    email VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',  -- ENUM 사용
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 인덱스 설계
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_email (email),
    KEY idx_status_created (status, created_at),  -- 복합 인덱스
    KEY idx_created_at (created_at)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  ROW_FORMAT=DYNAMIC;

-- 2. 파티셔닝 활용
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    order_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    
    PRIMARY KEY (id, order_date),  -- 파티션 키 포함
    KEY idx_user_id (user_id),
    KEY idx_status (status)
) ENGINE=InnoDB
  PARTITION BY RANGE (YEAR(order_date)) (
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
  );
```

#### 인덱스 최적화 전략
```sql
-- 1. 복합 인덱스 순서 최적화
-- 선택도가 높은 컬럼을 앞에 배치
CREATE INDEX idx_user_status_date ON users (status, created_at, user_id);

-- 2. 커버링 인덱스 활용
CREATE INDEX idx_user_covering ON users (status, created_at) INCLUDE (username, email);

-- 3. 함수 기반 인덱스 (MySQL 8.0+)
CREATE INDEX idx_email_domain ON users ((SUBSTRING_INDEX(email, '@', -1)));

-- 4. 인덱스 사용량 모니터링
SELECT 
    OBJECT_SCHEMA,
    OBJECT_NAME,
    INDEX_NAME,
    COUNT_FETCH,
    COUNT_INSERT,
    COUNT_UPDATE,
    COUNT_DELETE
FROM performance_schema.table_io_waits_summary_by_index_usage 
WHERE OBJECT_SCHEMA = 'myapp'
ORDER BY COUNT_FETCH DESC;

-- 5. 사용되지 않는 인덱스 찾기
SELECT 
    OBJECT_SCHEMA,
    OBJECT_NAME,
    INDEX_NAME
FROM performance_schema.table_io_waits_summary_by_index_usage 
WHERE OBJECT_SCHEMA = 'myapp'
  AND INDEX_NAME IS NOT NULL
  AND COUNT_FETCH = 0
  AND COUNT_INSERT = 0
  AND COUNT_UPDATE = 0
  AND COUNT_DELETE = 0;
```

### 쿼리 최적화

#### 효율적인 쿼리 패턴
```sql
-- 1. LIMIT과 OFFSET 대신 커서 기반 페이징
-- 비효율적
SELECT * FROM users ORDER BY id LIMIT 10000, 20;

-- 효율적
SELECT * FROM users WHERE id > 10000 ORDER BY id LIMIT 20;

-- 2. EXISTS vs IN 최적화
-- 대용량 데이터에서 EXISTS가 더 효율적
SELECT * FROM users u 
WHERE EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.user_id = u.id 
    AND o.created_at > '2024-01-01'
);

-- 3. 조건절 최적화
-- 인덱스를 활용할 수 있도록 조건 작성
SELECT * FROM users 
WHERE created_at >= '2024-01-01' 
  AND created_at < '2024-02-01'  -- BETWEEN 대신 범위 조건
  AND status = 'active';

-- 4. JOIN 최적화
SELECT u.username, p.title 
FROM users u
INNER JOIN posts p ON u.id = p.user_id  -- INNER JOIN 우선 사용
WHERE u.status = 'active'
  AND p.published_at > '2024-01-01'
ORDER BY p.published_at DESC
LIMIT 10;
```

#### 쿼리 실행 계획 분석
```sql
-- 1. EXPLAIN 활용
EXPLAIN FORMAT=JSON 
SELECT * FROM users 
WHERE email = 'user@example.com';

-- 2. 실행 통계 확인
SELECT 
    DIGEST_TEXT,
    COUNT_STAR as execution_count,
    AVG_TIMER_WAIT/1000000000 as avg_time_sec,
    SUM_ROWS_EXAMINED/COUNT_STAR as avg_rows_examined,
    SUM_ROWS_SENT/COUNT_STAR as avg_rows_sent
FROM performance_schema.events_statements_summary_by_digest 
WHERE DIGEST_TEXT LIKE '%users%'
ORDER BY AVG_TIMER_WAIT DESC;
```

## 보안 모범 사례

### 계정 관리

#### 최소 권한 원칙
```sql
-- 1. 애플리케이션별 전용 계정
CREATE USER 'web_app'@'10.0.%' IDENTIFIED BY 'StrongPassword123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'web_app'@'10.0.%';

CREATE USER 'analytics'@'10.0.%' IDENTIFIED BY 'AnalyticsPass123!';
GRANT SELECT ON myapp.* TO 'analytics'@'10.0.%';

CREATE USER 'backup_user'@'localhost' IDENTIFIED BY 'BackupPass123!';
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON *.* TO 'backup_user'@'localhost';

-- 2. 역할 기반 권한 관리
CREATE ROLE 'app_read', 'app_write', 'app_admin';

GRANT SELECT ON myapp.* TO 'app_read';
GRANT INSERT, UPDATE, DELETE ON myapp.* TO 'app_write';
GRANT ALL PRIVILEGES ON myapp.* TO 'app_admin';

-- 사용자에게 역할 할당
GRANT 'app_read', 'app_write' TO 'web_app'@'10.0.%';
SET DEFAULT ROLE 'app_read', 'app_write' TO 'web_app'@'10.0.%';
```

#### 정기적인 보안 검토
```sql
-- 1. 권한 감사
SELECT 
    User,
    Host,
    authentication_string,
    password_expired,
    password_last_changed,
    password_lifetime,
    account_locked
FROM mysql.user 
WHERE User NOT IN ('mysql.sys', 'mysql.session', 'mysql.infoschema');

-- 2. 사용되지 않는 계정 찾기
SELECT 
    USER,
    HOST,
    CURRENT_CONNECTIONS,
    TOTAL_CONNECTIONS
FROM performance_schema.accounts 
WHERE TOTAL_CONNECTIONS = 0;

-- 3. 권한 과다 부여 확인
SELECT 
    User,
    Host,
    Super_priv,
    Process_priv,
    File_priv,
    Grant_priv
FROM mysql.user 
WHERE Super_priv = 'Y' OR Process_priv = 'Y' OR File_priv = 'Y';
```

### 데이터 보호

#### 민감 데이터 처리
```sql
-- 1. 데이터 마스킹 함수
DELIMITER //
CREATE FUNCTION mask_credit_card(card_number VARCHAR(16))
RETURNS VARCHAR(16)
READS SQL DATA
DETERMINISTIC
BEGIN
    RETURN CONCAT('****-****-****-', RIGHT(card_number, 4));
END //

CREATE FUNCTION mask_email(email VARCHAR(255))
RETURNS VARCHAR(255)
READS SQL DATA
DETERMINISTIC
BEGIN
    RETURN CONCAT(LEFT(email, 2), '***@', SUBSTRING_INDEX(email, '@', -1));
END //
DELIMITER ;

-- 2. 개발환경용 마스킹된 뷰
CREATE VIEW users_dev AS
SELECT 
    id,
    username,
    mask_email(email) as email,
    status,
    created_at
FROM users;

-- 3. 데이터 암호화
CREATE TABLE sensitive_data (
    id INT PRIMARY KEY,
    user_id INT NOT NULL,
    encrypted_ssn VARBINARY(255),
    encrypted_card VARBINARY(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENCRYPTION='Y';

-- 암호화된 데이터 삽입
INSERT INTO sensitive_data (user_id, encrypted_ssn, encrypted_card)
VALUES (1, 
        AES_ENCRYPT('123-45-6789', 'encryption_key'),
        AES_ENCRYPT('1234-5678-9012-3456', 'encryption_key'));
```

## 운영 모범 사례

### 백업 전략

#### 3-2-1 백업 규칙
- **3개의 복사본**: 원본 + 2개의 백업
- **2개의 다른 미디어**: 로컬 + 클라우드
- **1개의 오프사이트**: 다른 지역/데이터센터

```bash
#!/bin/bash
# 종합 백업 스크립트

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

# 1. 로컬 전체 백업
mysqldump --single-transaction --routines --triggers --all-databases | \
gzip > "${BACKUP_DIR}/full_backup_${TIMESTAMP}.sql.gz"

# 2. 증분 백업 (바이너리 로그)
mysql -e "FLUSH LOGS;"
tar -czf "${BACKUP_DIR}/binlog_backup_${TIMESTAMP}.tar.gz" /var/lib/mysql/mysql-bin.*

# 3. 클라우드 업로드
aws s3 cp "${BACKUP_DIR}/full_backup_${TIMESTAMP}.sql.gz" \
    "s3://mysql-backups/$(date +%Y/%m/%d)/"

# 4. 다른 리전으로 복제
aws s3 sync "s3://mysql-backups/" "s3://mysql-backups-dr/" --region us-west-2

# 5. 백업 검증
gunzip -t "${BACKUP_DIR}/full_backup_${TIMESTAMP}.sql.gz"

# 6. 오래된 백업 정리
find "${BACKUP_DIR}" -name "*.gz" -mtime +${RETENTION_DAYS} -delete
```

#### 복구 테스트 자동화
```bash
#!/bin/bash
# 월간 복구 테스트

TEST_NAMESPACE="mysql-recovery-test"
LATEST_BACKUP=$(aws s3 ls s3://mysql-backups/ --recursive | sort | tail -n 1 | awk '{print $4}')

# 1. 테스트 환경 생성
kubectl create namespace ${TEST_NAMESPACE}
kubectl apply -f k8s/ -n ${TEST_NAMESPACE}

# 2. 백업에서 복구
aws s3 cp "s3://mysql-backups/${LATEST_BACKUP}" ./test_backup.sql.gz
gunzip test_backup.sql.gz
kubectl exec -i mysql-master-0 -n ${TEST_NAMESPACE} -- mysql -u root -p < test_backup.sql

# 3. 데이터 무결성 검증
kubectl exec -it mysql-master-0 -n ${TEST_NAMESPACE} -- mysql -u root -p <<EOF
SELECT COUNT(*) FROM myapp.users;
SELECT COUNT(*) FROM myapp.orders;
CHECKSUM TABLE myapp.users, myapp.orders;
EOF

# 4. 테스트 환경 정리
kubectl delete namespace ${TEST_NAMESPACE}
```

### 모니터링 및 알림

#### 계층화된 모니터링
```yaml
# 1. 인프라 레벨 (Kubernetes)
monitoring:
  infrastructure:
    - pod_status
    - resource_usage
    - network_connectivity
    - storage_health

# 2. 서비스 레벨 (MySQL)
  service:
    - mysql_availability
    - replication_status
    - connection_count
    - query_performance

# 3. 애플리케이션 레벨 (Business)
  application:
    - user_registrations
    - order_processing
    - payment_success_rate
    - api_response_time
```

#### SLA 기반 알림 설정
```yaml
# SLA 목표
sla_targets:
  availability: 99.9%      # 월 43분 다운타임
  response_time: 100ms     # 95th percentile
  error_rate: 0.1%         # 1000 요청 중 1개 오류

# 알림 규칙
alerts:
  critical:
    - mysql_down > 1m
    - replication_stopped > 30s
    - disk_usage > 90%
    
  warning:
    - response_time_p95 > 200ms for 5m
    - connection_usage > 80% for 10m
    - replication_lag > 30s for 2m
    
  info:
    - backup_completed
    - failover_executed
    - maintenance_started
```

### 용량 계획

#### 성장 예측 모델
```python
# 용량 계획 스크립트
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

def capacity_planning():
    # 1. 데이터 수집 (지난 6개월)
    metrics = {
        'date': pd.date_range('2024-01-01', periods=180, freq='D'),
        'data_size_gb': np.random.normal(100, 10, 180),  # 실제 데이터로 교체
        'qps': np.random.normal(1000, 100, 180),
        'connections': np.random.normal(50, 10, 180)
    }
    
    df = pd.DataFrame(metrics)
    
    # 2. 성장률 계산
    X = np.arange(len(df)).reshape(-1, 1)
    
    # 데이터 크기 예측
    model_size = LinearRegression().fit(X, df['data_size_gb'])
    future_size = model_size.predict([[365]])[0]  # 1년 후 예측
    
    # QPS 예측
    model_qps = LinearRegression().fit(X, df['qps'])
    future_qps = model_qps.predict([[365]])[0]
    
    # 3. 리소스 요구사항 계산
    required_storage = future_size * 3  # 데이터 + 인덱스 + 여유공간
    required_memory = future_size * 0.7  # InnoDB 버퍼 풀
    required_cpu = future_qps / 500  # QPS당 CPU 코어
    
    print(f"1년 후 예상 요구사항:")
    print(f"스토리지: {required_storage:.1f} GB")
    print(f"메모리: {required_memory:.1f} GB") 
    print(f"CPU: {required_cpu:.1f} cores")
    
    return {
        'storage': required_storage,
        'memory': required_memory,
        'cpu': required_cpu
    }

capacity_planning()
```

### 변경 관리

#### 데이터베이스 스키마 변경
```sql
-- 1. 안전한 스키마 변경 절차
-- 단계 1: 새 컬럼 추가 (NULL 허용)
ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL;

-- 단계 2: 애플리케이션 배포 (새 컬럼 사용)
-- 단계 3: 데이터 마이그레이션
UPDATE users SET phone = '000-0000-0000' WHERE phone IS NULL;

-- 단계 4: NOT NULL 제약 추가
ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL;

-- 2. 온라인 DDL 활용 (MySQL 8.0)
ALTER TABLE users 
ADD COLUMN address TEXT,
ALGORITHM=INPLACE, 
LOCK=NONE;

-- 3. pt-online-schema-change 사용 (대용량 테이블)
pt-online-schema-change \
  --alter "ADD COLUMN new_field INT" \
  --execute \
  h=localhost,D=myapp,t=users
```

#### 설정 변경 관리
```bash
# 1. 설정 변경 전 백업
kubectl get configmap mysql-config -n database -o yaml > mysql-config-backup.yaml

# 2. 단계적 적용
# 개발 환경 → 스테이징 → 프로덕션

# 3. 롤백 계획 준비
kubectl apply -f mysql-config-backup.yaml

# 4. 변경 사항 모니터링
kubectl logs -f mysql-master-0 -n database
```

## 성능 벤치마킹

### 정기적인 성능 테스트
```bash
#!/bin/bash
# 월간 성능 벤치마크

# 1. sysbench 설치 및 실행
sysbench oltp_read_write \
  --mysql-host=mysql-master \
  --mysql-user=test \
  --mysql-password=test \
  --mysql-db=testdb \
  --tables=10 \
  --table-size=100000 \
  --threads=16 \
  --time=300 \
  --report-interval=10 \
  prepare

sysbench oltp_read_write \
  --mysql-host=mysql-master \
  --mysql-user=test \
  --mysql-password=test \
  --mysql-db=testdb \
  --tables=10 \
  --table-size=100000 \
  --threads=16 \
  --time=300 \
  --report-interval=10 \
  run > benchmark_results_$(date +%Y%m%d).txt

# 2. 결과 분석 및 저장
echo "Benchmark completed: $(date)" >> benchmark_history.log
grep "transactions:" benchmark_results_$(date +%Y%m%d).txt >> benchmark_history.log
```

### 성능 기준선 설정
```yaml
# 성능 기준선 (SLA)
performance_baselines:
  read_qps: 5000
  write_qps: 1000
  avg_response_time: 50ms
  p95_response_time: 100ms
  p99_response_time: 200ms
  
  connection_limit: 200
  buffer_pool_hit_ratio: 95%
  replication_lag: 1s
  
  cpu_usage: 70%
  memory_usage: 80%
  disk_usage: 75%
```

---

이상으로 MySQL 클러스터 배포 및 운영을 위한 종합적인 가이드를 완성했습니다. 각 문서는 실제 운영 환경에서 필요한 실용적인 정보와 모범 사례를 제공합니다.