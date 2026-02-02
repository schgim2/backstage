# 문제 해결

MySQL 클러스터 운영 중 발생할 수 있는 일반적인 문제들과 해결 방법을 제공합니다.

## 연결 문제

### 연결 실패

#### 증상
```
ERROR 2003 (HY000): Can't connect to MySQL server on 'host' (111)
ERROR 1045 (28000): Access denied for user 'user'@'host' (using password: YES)
```

#### 진단 단계
```bash
# 1. MySQL 서비스 상태 확인
kubectl get pods -n database
kubectl describe pod mysql-master-0 -n database

# 2. 네트워크 연결 확인
kubectl exec -it mysql-master-0 -n database -- netstat -tlnp | grep 3306

# 3. 방화벽 및 네트워크 정책 확인
kubectl get networkpolicy -n database
kubectl describe networkpolicy mysql-network-policy -n database

# 4. DNS 해석 확인
nslookup mysql-master.database.svc.cluster.local
```

#### 해결 방법
```bash
# 포트 포워딩으로 직접 연결 테스트
kubectl port-forward svc/mysql-master 3306:3306 -n database

# 사용자 권한 확인 및 수정
kubectl exec -it mysql-master-0 -n database -- mysql -u root -p <<EOF
SELECT User, Host FROM mysql.user WHERE User = 'your_user';
GRANT ALL PRIVILEGES ON *.* TO 'your_user'@'%' IDENTIFIED BY 'password';
FLUSH PRIVILEGES;
EOF

# 네트워크 정책 임시 비활성화 (테스트용)
kubectl delete networkpolicy mysql-network-policy -n database
```

### 연결 풀 고갈

#### 증상
```
ERROR 1040 (HY000): Too many connections
```

#### 진단
```sql
-- 현재 연결 수 확인
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';
SHOW VARIABLES LIKE 'max_connections';

-- 연결 상세 정보
SELECT 
    ID,
    USER,
    HOST,
    DB,
    COMMAND,
    TIME,
    STATE,
    INFO
FROM information_schema.PROCESSLIST 
ORDER BY TIME DESC;

-- 사용자별 연결 수
SELECT 
    SUBSTRING_INDEX(HOST, ':', 1) as client_ip,
    USER,
    COUNT(*) as connections
FROM information_schema.PROCESSLIST 
GROUP BY client_ip, USER 
ORDER BY connections DESC;
```

#### 해결 방법
```sql
-- 임시로 최대 연결 수 증가
SET GLOBAL max_connections = 500;

-- 유휴 연결 종료
KILL CONNECTION_ID;

-- 또는 특정 사용자의 모든 연결 종료
SELECT CONCAT('KILL ', ID, ';') as kill_command
FROM information_schema.PROCESSLIST 
WHERE USER = 'problematic_user';

-- 연결 타임아웃 설정 조정
SET GLOBAL wait_timeout = 300;
SET GLOBAL interactive_timeout = 300;
```

## 복제 문제

### 복제 중단

#### 증상
```sql
SHOW SLAVE STATUS\G
-- Slave_IO_Running: No
-- Slave_SQL_Running: No
-- Last_Error: Error message
```

#### 진단
```bash
# 복제 상태 상세 확인
kubectl exec -it mysql-replica-0-0 -n database -- mysql -u root -p <<EOF
SHOW SLAVE STATUS\G
SHOW MASTER STATUS;
SELECT * FROM performance_schema.replication_connection_status;
SELECT * FROM performance_schema.replication_applier_status;
EOF

# 마스터 바이너리 로그 확인
kubectl exec -it mysql-master-0 -n database -- mysql -u root -p -e "SHOW BINARY LOGS;"

# 네트워크 연결 확인
kubectl exec -it mysql-replica-0-0 -n database -- telnet mysql-master 3306
```

#### 해결 방법
```sql
-- 복제 재시작
STOP SLAVE;
START SLAVE;

-- 복제 위치 재설정 (GTID 사용 시)
STOP SLAVE;
RESET SLAVE ALL;
CHANGE MASTER TO
    MASTER_HOST='mysql-master',
    MASTER_PORT=3306,
    MASTER_USER='replicator',
    MASTER_PASSWORD='password',
    MASTER_AUTO_POSITION=1;
START SLAVE;

-- 특정 오류 건너뛰기 (주의: 데이터 일관성 확인 필요)
STOP SLAVE;
SET GLOBAL sql_slave_skip_counter = 1;
START SLAVE;

-- 복제 사용자 권한 재확인
-- 마스터에서 실행
SHOW GRANTS FOR 'replicator'@'%';
```

### 복제 지연

#### 증상
```sql
-- Seconds_Behind_Master 값이 높음
SHOW SLAVE STATUS\G
```

#### 진단
```sql
-- 복제 지연 상세 분석
SELECT 
    CHANNEL_NAME,
    SERVICE_STATE,
    LAST_ERROR_MESSAGE,
    LAST_ERROR_TIMESTAMP
FROM performance_schema.replication_connection_status;

-- 복제 성능 메트릭
SELECT 
    CHANNEL_NAME,
    COUNT_TRANSACTIONS_IN_QUEUE,
    COUNT_TRANSACTIONS_RETRIES,
    LAST_APPLIED_TRANSACTION
FROM performance_schema.replication_applier_status_by_coordinator;

-- 마스터 부하 확인
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Com_%';
```

#### 해결 방법
```sql
-- 병렬 복제 활성화
STOP SLAVE;
SET GLOBAL slave_parallel_workers = 4;
SET GLOBAL slave_parallel_type = 'LOGICAL_CLOCK';
SET GLOBAL slave_preserve_commit_order = ON;
START SLAVE;

-- 복제 압축 활성화 (MySQL 8.0.18+)
STOP SLAVE;
CHANGE MASTER TO MASTER_COMPRESSION_ALGORITHMS = 'zlib,lz4,zstd';
START SLAVE;

-- 네트워크 최적화
SET GLOBAL slave_net_timeout = 60;
SET GLOBAL master_retry_count = 86400;
```

## 성능 문제

### 느린 쿼리

#### 증상
- 애플리케이션 응답 시간 증가
- 슬로우 쿼리 로그에 많은 쿼리 기록

#### 진단
```sql
-- 슬로우 쿼리 확인
SELECT 
    DIGEST_TEXT,
    COUNT_STAR,
    AVG_TIMER_WAIT/1000000000 as avg_time_sec,
    MAX_TIMER_WAIT/1000000000 as max_time_sec,
    SUM_ROWS_EXAMINED/COUNT_STAR as avg_rows_examined
FROM performance_schema.events_statements_summary_by_digest 
ORDER BY AVG_TIMER_WAIT DESC 
LIMIT 10;

-- 현재 실행 중인 쿼리
SELECT 
    ID,
    USER,
    HOST,
    DB,
    COMMAND,
    TIME,
    STATE,
    LEFT(INFO, 100) as QUERY
FROM information_schema.PROCESSLIST 
WHERE COMMAND != 'Sleep' 
ORDER BY TIME DESC;

-- 테이블 락 대기
SELECT 
    r.trx_id waiting_trx_id,
    r.trx_mysql_thread_id waiting_thread,
    r.trx_query waiting_query,
    b.trx_id blocking_trx_id,
    b.trx_mysql_thread_id blocking_thread,
    b.trx_query blocking_query
FROM information_schema.innodb_lock_waits w
INNER JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_trx_id
INNER JOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_trx_id;
```

#### 해결 방법
```sql
-- 인덱스 분석 및 추가
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
CREATE INDEX idx_users_email ON users(email);

-- 쿼리 최적화
-- 비효율적인 쿼리
SELECT * FROM users WHERE YEAR(created_at) = 2024;
-- 최적화된 쿼리
SELECT * FROM users WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';

-- 통계 정보 업데이트
ANALYZE TABLE users;

-- 쿼리 캐시 설정 (MySQL 5.7)
SET GLOBAL query_cache_size = 67108864; -- 64MB
SET GLOBAL query_cache_type = ON;
```

### 높은 CPU 사용률

#### 진단
```bash
# 시스템 리소스 확인
kubectl top pods -n database
kubectl exec -it mysql-master-0 -n database -- top
kubectl exec -it mysql-master-0 -n database -- iostat -x 1

# MySQL 프로세스 확인
kubectl exec -it mysql-master-0 -n database -- mysql -u root -p -e "SHOW PROCESSLIST;"
```

```sql
-- CPU 집약적인 쿼리 찾기
SELECT 
    DIGEST_TEXT,
    COUNT_STAR,
    SUM_TIMER_WAIT/1000000000 as total_time_sec,
    AVG_TIMER_WAIT/1000000000 as avg_time_sec
FROM performance_schema.events_statements_summary_by_digest 
ORDER BY SUM_TIMER_WAIT DESC 
LIMIT 10;

-- 스레드 상태 확인
SELECT 
    STATE,
    COUNT(*) as count
FROM information_schema.PROCESSLIST 
GROUP BY STATE 
ORDER BY count DESC;
```

#### 해결 방법
```sql
-- 비효율적인 쿼리 최적화
-- 인덱스 추가
-- 쿼리 리팩토링

-- 연결 수 제한
SET GLOBAL max_connections = 200;

-- 스레드 캐시 조정
SET GLOBAL thread_cache_size = 100;

-- 임시 테이블 크기 조정
SET GLOBAL tmp_table_size = 64*1024*1024;
SET GLOBAL max_heap_table_size = 64*1024*1024;
```

## 디스크 공간 문제

### 디스크 공간 부족

#### 증상
```
ERROR 1114 (HY000): The table 'table_name' is full
ERROR 3 (HY000): Error writing file '/tmp/...' (Errcode: 28 - No space left on device)
```

#### 진단
```bash
# 디스크 사용량 확인
kubectl exec -it mysql-master-0 -n database -- df -h
kubectl exec -it mysql-master-0 -n database -- du -sh /var/lib/mysql/*

# 큰 파일 찾기
kubectl exec -it mysql-master-0 -n database -- find /var/lib/mysql -type f -size +100M -exec ls -lh {} \;

# 바이너리 로그 크기 확인
kubectl exec -it mysql-master-0 -n database -- mysql -u root -p -e "SHOW BINARY LOGS;"
```

#### 해결 방법
```sql
-- 바이너리 로그 정리
PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 7 DAY);

-- 또는 특정 로그까지 삭제
PURGE BINARY LOGS TO 'mysql-bin.000010';

-- 일반 로그 비활성화 (임시)
SET GLOBAL general_log = OFF;

-- 슬로우 쿼리 로그 로테이션
FLUSH SLOW LOGS;

-- 임시 테이블 정리
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    ENGINE,
    TABLE_ROWS,
    DATA_LENGTH,
    INDEX_LENGTH
FROM information_schema.TABLES 
WHERE TABLE_NAME LIKE '#sql%' OR TABLE_NAME LIKE 'tmp%';
```

```bash
# PVC 확장 (Kubernetes)
kubectl patch pvc mysql-data-mysql-master-0 -n database -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'

# 로그 파일 정리
kubectl exec -it mysql-master-0 -n database -- find /var/lib/mysql -name "*.log" -mtime +7 -delete
```

## 백업 및 복구 문제

### 백업 실패

#### 진단
```bash
# 백업 작업 상태 확인
kubectl get cronjobs -n database
kubectl get jobs -n database
kubectl logs job/mysql-backup-xxx -n database

# 백업 스토리지 확인
kubectl exec -it mysql-backup-pod -n database -- df -h /backups

# 권한 확인
kubectl exec -it mysql-backup-pod -n database -- ls -la /backups
```

#### 해결 방법
```bash
# 수동 백업 테스트
kubectl exec -it mysql-master-0 -n database -- mysqldump -u root -p --all-databases > test_backup.sql

# 백업 스크립트 디버깅
kubectl exec -it mysql-backup-pod -n database -- bash -x /usr/local/bin/backup.sh

# 스토리지 권한 수정
kubectl exec -it mysql-backup-pod -n database -- chown mysql:mysql /backups
kubectl exec -it mysql-backup-pod -n database -- chmod 755 /backups
```

### 복구 실패

#### 진단
```bash
# 백업 파일 무결성 확인
kubectl exec -it mysql-master-0 -n database -- gzip -t backup.sql.gz

# MySQL 구문 검사
kubectl exec -it mysql-master-0 -n database -- mysql -u root -p --execute="source backup.sql" --force --verbose
```

#### 해결 방법
```sql
-- 부분 복구
-- 특정 데이터베이스만 복구
mysql -u root -p myapp < backup.sql

-- 테이블별 복구
mysql -u root -p myapp --execute="source backup.sql" --one-database

-- 오류 무시하고 복구 (주의)
mysql -u root -p --force < backup.sql
```

## 모니터링 문제

### 메트릭 수집 실패

#### 진단
```bash
# MySQL Exporter 상태 확인
kubectl get pods -l app=mysql-exporter -n database
kubectl logs mysql-exporter-pod -n database

# 메트릭 엔드포인트 확인
kubectl exec -it mysql-exporter-pod -n database -- curl localhost:9104/metrics

# Prometheus 타겟 상태 확인
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
# 브라우저에서 http://localhost:9090/targets 확인
```

#### 해결 방법
```bash
# Exporter 재시작
kubectl delete pod mysql-exporter-pod -n database

# 연결 정보 확인
kubectl exec -it mysql-exporter-pod -n database -- env | grep DATA_SOURCE_NAME

# 모니터링 사용자 권한 확인
kubectl exec -it mysql-master-0 -n database -- mysql -u root -p <<EOF
SHOW GRANTS FOR 'exporter'@'%';
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%';
FLUSH PRIVILEGES;
EOF
```

## 일반적인 오류 코드

### MySQL 오류 코드 해석

| 오류 코드 | 설명 | 해결 방법 |
|-----------|------|-----------|
| 1040 | Too many connections | max_connections 증가, 연결 풀 최적화 |
| 1045 | Access denied | 사용자 권한 확인, 비밀번호 확인 |
| 1114 | Table is full | 디스크 공간 확인, 테이블 최적화 |
| 1205 | Lock wait timeout | 트랜잭션 최적화, 락 타임아웃 조정 |
| 1213 | Deadlock found | 쿼리 순서 최적화, 재시도 로직 |
| 2003 | Can't connect | 네트워크 연결, 방화벽 확인 |
| 2006 | MySQL server has gone away | 연결 타임아웃, 패킷 크기 확인 |

### 진단 쿼리 모음

```sql
-- 시스템 상태 종합 확인
SELECT 
    'Uptime' as metric, 
    VARIABLE_VALUE as value 
FROM performance_schema.global_status 
WHERE VARIABLE_NAME = 'Uptime'
UNION ALL
SELECT 
    'Connections', 
    VARIABLE_VALUE 
FROM performance_schema.global_status 
WHERE VARIABLE_NAME = 'Threads_connected'
UNION ALL
SELECT 
    'QPS', 
    ROUND(VARIABLE_VALUE / (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Uptime'), 2)
FROM performance_schema.global_status 
WHERE VARIABLE_NAME = 'Queries';

-- 복제 상태 요약
SELECT 
    CHANNEL_NAME,
    SERVICE_STATE,
    LAST_ERROR_MESSAGE
FROM performance_schema.replication_connection_status
UNION ALL
SELECT 
    CHANNEL_NAME,
    SERVICE_STATE,
    LAST_ERROR_MESSAGE
FROM performance_schema.replication_applier_status;

-- 리소스 사용량 확인
SELECT 
    'Buffer Pool Usage' as metric,
    CONCAT(
        ROUND(
            (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_buffer_pool_bytes_data') /
            (SELECT VARIABLE_VALUE FROM performance_schema.global_variables WHERE VARIABLE_NAME = 'innodb_buffer_pool_size') * 100, 2
        ), '%'
    ) as value
UNION ALL
SELECT 
    'Connection Usage',
    CONCAT(
        ROUND(
            (SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Threads_connected') /
            (SELECT VARIABLE_VALUE FROM performance_schema.global_variables WHERE VARIABLE_NAME = 'max_connections') * 100, 2
        ), '%'
    );
```

## 응급 상황 대응

### 긴급 복구 절차

#### 1. 서비스 중단 최소화
```bash
# 읽기 전용 모드로 전환
kubectl exec -it mysql-master-0 -n database -- mysql -u root -p -e "SET GLOBAL read_only = ON;"

# 트래픽을 복제본으로 우회
kubectl patch service mysql-master -n database -p '{"spec":{"selector":{"app.kubernetes.io/instance":"replica-0"}}}'
```

#### 2. 문제 격리
```bash
# 문제가 있는 Pod 격리
kubectl cordon node-with-mysql-master
kubectl drain node-with-mysql-master --ignore-daemonsets --delete-emptydir-data
```

#### 3. 데이터 보호
```bash
# 긴급 백업
kubectl exec -it mysql-master-0 -n database -- mysqldump -u root -p --all-databases --single-transaction > emergency_backup.sql

# 바이너리 로그 백업
kubectl exec -it mysql-master-0 -n database -- mysql -u root -p -e "FLUSH LOGS;"
kubectl cp mysql-master-0:/var/lib/mysql/mysql-bin.* ./emergency_binlogs/ -n database
```

#### 4. 복구 실행
```bash
# 새 인스턴스에서 복구
kubectl apply -f k8s/master-statefulset.yaml
kubectl wait --for=condition=ready pod mysql-master-0 --timeout=600s
kubectl exec -i mysql-master-0 -n database -- mysql -u root -p < emergency_backup.sql
```

---

**다음**: [모범 사례](best-practices.md)