# 백업 및 복구

MySQL 클러스터의 데이터 보호를 위한 백업 전략과 복구 절차에 대한 상세 가이드입니다.

## 백업 전략

### 백업 유형

#### 1. 논리적 백업 (mysqldump)
```bash
# 전체 데이터베이스 백업
mysqldump -u root -p \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  --master-data=2 \
  --flush-logs \
  --all-databases > full_backup.sql

# 특정 데이터베이스 백업
mysqldump -u root -p \
  --single-transaction \
  --routines \
  --triggers \
  --master-data=2 \
  myapp > myapp_backup.sql
```

**장점:**
- 플랫폼 독립적
- 텍스트 형태로 가독성 좋음
- 선택적 복구 가능

**단점:**
- 큰 데이터베이스에서 느림
- 백업 중 일관성 유지 필요

#### 2. 물리적 백업 (바이너리 복사)
```bash
# MySQL 데이터 디렉토리 백업 (서비스 중지 필요)
systemctl stop mysql
tar -czf mysql_physical_backup.tar.gz /var/lib/mysql/
systemctl start mysql

# 또는 Percona XtraBackup 사용 (온라인 백업)
xtrabackup --backup --target-dir=/backup/mysql/
```

**장점:**
- 빠른 백업/복구
- 대용량 데이터베이스에 적합

**단점:**
- 플랫폼 종속적
- 전체 복구만 가능

### 자동 백업 설정

#### Kubernetes CronJob 백업
현재 템플릿에서 사용하는 자동 백업:

```yaml
# 백업 스케줄: {{ values.backupSchedule }}
# 보존 기간: {{ values.backupRetention }}일
# 저장소: {{ values.backupStorage }}
```

#### 백업 스크립트 커스터마이징
```bash
#!/bin/bash
# 고급 백업 스크립트

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS={{ values.backupRetention }}

# 백업 실행
echo "Starting backup at $(date)"

# 1. 전체 백업
mysqldump \
  --host=mysql-master \
  --user=root \
  --password=$MYSQL_ROOT_PASSWORD \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --master-data=2 \
  --flush-logs \
  --all-databases | gzip > "${BACKUP_DIR}/full_backup_${TIMESTAMP}.sql.gz"

# 2. 스키마만 백업
mysqldump \
  --host=mysql-master \
  --user=root \
  --password=$MYSQL_ROOT_PASSWORD \
  --no-data \
  --routines \
  --triggers \
  --events \
  --all-databases | gzip > "${BACKUP_DIR}/schema_backup_${TIMESTAMP}.sql.gz"

# 3. 바이너리 로그 백업
mysql -h mysql-master -u root -p$MYSQL_ROOT_PASSWORD \
  -e "FLUSH LOGS; SHOW MASTER STATUS;" > "${BACKUP_DIR}/master_status_${TIMESTAMP}.txt"

# 4. 백업 검증
if [ -f "${BACKUP_DIR}/full_backup_${TIMESTAMP}.sql.gz" ]; then
    echo "Backup completed successfully"
    
    # 백업 크기 기록
    du -h "${BACKUP_DIR}/full_backup_${TIMESTAMP}.sql.gz" >> "${BACKUP_DIR}/backup_sizes.log"
    
    # 이전 백업 정리
    find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    
    echo "Backup process finished at $(date)"
else
    echo "ERROR: Backup failed!"
    exit 1
fi
```

## 바이너리 로그 관리

### 바이너리 로그 설정

#### 로그 순환 설정
```sql
-- 바이너리 로그 보존 기간 (초)
SET GLOBAL binlog_expire_logs_seconds = 604800; -- 7일

-- 바이너리 로그 최대 크기
SET GLOBAL max_binlog_size = 104857600; -- 100MB

-- 바이너리 로그 상태 확인
SHOW BINARY LOGS;
SHOW MASTER STATUS;
```

#### 바이너리 로그 백업
```bash
# 현재 바이너리 로그 목록 가져오기
mysql -u root -p -e "SHOW BINARY LOGS;" | tail -n +2 | while read log_name log_size; do
    if [ ! -z "$log_name" ]; then
        echo "Backing up binary log: $log_name"
        
        # 바이너리 로그 복사
        kubectl cp mysql-master-0:/var/lib/mysql/$log_name ./binlog_backup/$log_name
        
        # 압축
        gzip ./binlog_backup/$log_name
    fi
done
```

### Point-in-Time Recovery (PITR)

#### PITR 준비
1. **정기적인 전체 백업**
2. **바이너리 로그 연속 백업**
3. **백업 시점 기록**

#### PITR 실행 예시
```bash
# 시나리오: 2024-01-15 14:30:00 시점으로 복구

# 1. 마지막 전체 백업 복구 (2024-01-15 02:00:00)
mysql -u root -p < full_backup_20240115_020000.sql

# 2. 바이너리 로그로 특정 시점까지 복구
mysqlbinlog \
  --start-datetime="2024-01-15 02:00:00" \
  --stop-datetime="2024-01-15 14:30:00" \
  mysql-bin.000123 mysql-bin.000124 | mysql -u root -p

# 3. 복구 검증
mysql -u root -p -e "SELECT COUNT(*) FROM myapp.users;"
```

## 클라우드 스토리지 백업

### Amazon S3 백업

#### S3 설정
```bash
# AWS CLI 설정
aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY
aws configure set default.region us-east-1

# S3 버킷 생성
aws s3 mb s3://mysql-backups-company

# 백업 업로드
aws s3 cp backup.sql.gz s3://mysql-backups-company/mysql/$(date +%Y/%m/%d)/

# 백업 목록 확인
aws s3 ls s3://mysql-backups-company/mysql/ --recursive
```

#### S3 라이프사이클 정책
```json
{
    "Rules": [
        {
            "ID": "mysql-backup-lifecycle",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "mysql/"
            },
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                },
                {
                    "Days": 365,
                    "StorageClass": "DEEP_ARCHIVE"
                }
            ],
            "Expiration": {
                "Days": 2555  // 7년
            }
        }
    ]
}
```

### Google Cloud Storage 백업

#### GCS 설정
```bash
# 서비스 계정 키 설정
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# GCS 버킷 생성
gsutil mb gs://mysql-backups-company

# 백업 업로드
gsutil cp backup.sql.gz gs://mysql-backups-company/mysql/$(date +%Y/%m/%d)/

# 백업 목록 확인
gsutil ls -r gs://mysql-backups-company/mysql/
```

#### GCS 라이프사이클 정책
```json
{
  "rule": [
    {
      "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
      "condition": {"age": 30}
    },
    {
      "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
      "condition": {"age": 90}
    },
    {
      "action": {"type": "SetStorageClass", "storageClass": "ARCHIVE"},
      "condition": {"age": 365}
    },
    {
      "action": {"type": "Delete"},
      "condition": {"age": 2555}
    }
  ]
}
```

## 복구 절차

### 전체 복구

#### 1. 새로운 MySQL 인스턴스 준비
```bash
# Kubernetes에서 새 인스턴스 배포
kubectl apply -f k8s/master-statefulset.yaml

# 인스턴스가 준비될 때까지 대기
kubectl wait --for=condition=ready pod mysql-master-0 --timeout=300s
```

#### 2. 백업에서 데이터 복구
```bash
# 백업 파일 다운로드 (S3 예시)
aws s3 cp s3://mysql-backups-company/mysql/2024/01/15/full_backup_20240115_020000.sql.gz ./

# 압축 해제
gunzip full_backup_20240115_020000.sql.gz

# 데이터 복구
kubectl exec -i mysql-master-0 -- mysql -u root -p$MYSQL_ROOT_PASSWORD < full_backup_20240115_020000.sql
```

#### 3. 복제 재설정
```bash
# 복제본들을 새 마스터에 연결
kubectl exec -it mysql-replica-0-0 -- mysql -u root -p$MYSQL_ROOT_PASSWORD <<EOF
STOP SLAVE;
RESET SLAVE ALL;
CHANGE MASTER TO
    MASTER_HOST='mysql-master',
    MASTER_PORT=3306,
    MASTER_USER='replicator',
    MASTER_PASSWORD='$MYSQL_REPLICATION_PASSWORD',
    MASTER_AUTO_POSITION=1;
START SLAVE;
EOF
```

### 부분 복구

#### 특정 테이블 복구
```bash
# 특정 테이블만 백업에서 추출
mysql -u root -p myapp < backup.sql --tables users

# 또는 mysqldump로 특정 테이블 복구
mysqldump -u root -p myapp users | mysql -u root -p myapp_restored
```

#### 특정 데이터베이스 복구
```bash
# 백업에서 특정 데이터베이스만 추출
sed -n '/^-- Current Database: `myapp`/,/^-- Current Database: `/p' backup.sql > myapp_only.sql

# 복구 실행
mysql -u root -p < myapp_only.sql
```

## 백업 검증

### 백업 무결성 검사

#### 1. 백업 파일 검증
```bash
# 압축 파일 무결성 검사
gzip -t backup.sql.gz
echo $? # 0이면 정상

# SQL 파일 구문 검사
mysql --help | head -1 # MySQL 클라이언트 확인
mysql -u root -p --execute="source backup.sql" --force --verbose
```

#### 2. 복구 테스트
```bash
# 테스트 환경에서 복구 테스트
kubectl create namespace mysql-test

# 테스트 인스턴스 배포
kubectl apply -f k8s/ -n mysql-test

# 백업에서 복구
kubectl exec -i mysql-master-0 -n mysql-test -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD < backup.sql

# 데이터 검증
kubectl exec -it mysql-master-0 -n mysql-test -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "
    SELECT 
      SCHEMA_NAME as 'Database',
      COUNT(*) as 'Tables'
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
    GROUP BY SCHEMA_NAME;
  "
```

### 자동 백업 검증

#### 백업 검증 스크립트
```bash
#!/bin/bash
# backup-verify.sh

BACKUP_FILE="$1"
TEST_DB="backup_test_$(date +%s)"

echo "Verifying backup: $BACKUP_FILE"

# 1. 파일 존재 확인
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found"
    exit 1
fi

# 2. 파일 크기 확인 (최소 1MB)
FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
if [ "$FILE_SIZE" -lt 1048576 ]; then
    echo "ERROR: Backup file too small ($FILE_SIZE bytes)"
    exit 1
fi

# 3. 압축 파일 무결성 확인
if [[ "$BACKUP_FILE" == *.gz ]]; then
    if ! gzip -t "$BACKUP_FILE"; then
        echo "ERROR: Backup file is corrupted"
        exit 1
    fi
fi

# 4. SQL 구문 검사
echo "Testing SQL syntax..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    zcat "$BACKUP_FILE" | head -100 | mysql --help >/dev/null 2>&1
else
    head -100 "$BACKUP_FILE" | mysql --help >/dev/null 2>&1
fi

if [ $? -ne 0 ]; then
    echo "ERROR: Invalid SQL syntax in backup"
    exit 1
fi

echo "Backup verification completed successfully"
```

## 재해 복구 계획

### RTO/RPO 목표

| 환경 | RTO (복구 시간) | RPO (데이터 손실) | 백업 주기 |
|------|----------------|------------------|-----------|
| 개발 | 4시간 | 24시간 | 일일 |
| 스테이징 | 2시간 | 4시간 | 6시간마다 |
| 프로덕션 | 1시간 | 15분 | 15분마다 |

### 재해 복구 절차

#### 1. 재해 상황 평가
```bash
# 시스템 상태 확인
kubectl get pods -n database
kubectl get pvc -n database
kubectl describe pod mysql-master-0 -n database

# 데이터 손실 범위 확인
kubectl logs mysql-master-0 -n database --tail=100
```

#### 2. 복구 전략 결정
- **부분 장애**: 특정 컴포넌트만 복구
- **전체 장애**: 전체 클러스터 재구축
- **데이터 손상**: 백업에서 완전 복구

#### 3. 복구 실행
```bash
# 긴급 복구 스크립트
#!/bin/bash
# disaster-recovery.sh

echo "Starting disaster recovery process..."

# 1. 백업 상태 확인
LATEST_BACKUP=$(aws s3 ls s3://mysql-backups-company/mysql/ --recursive | sort | tail -n 1 | awk '{print $4}')
echo "Latest backup: $LATEST_BACKUP"

# 2. 새 클러스터 배포
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/master-statefulset.yaml

# 3. 마스터 준비 대기
kubectl wait --for=condition=ready pod mysql-master-0 -n database --timeout=600s

# 4. 백업에서 복구
aws s3 cp "s3://mysql-backups-company/$LATEST_BACKUP" ./latest_backup.sql.gz
gunzip latest_backup.sql.gz
kubectl exec -i mysql-master-0 -n database -- mysql -u root -p$MYSQL_ROOT_PASSWORD < latest_backup.sql

# 5. 복제본 배포 및 설정
kubectl apply -f k8s/replica-statefulset.yaml
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=database -n database --timeout=600s

# 6. 서비스 복구
kubectl apply -f k8s/proxysql.yaml
kubectl apply -f k8s/phpmyadmin.yaml

echo "Disaster recovery completed"
```

## 백업 모니터링

### 백업 상태 메트릭

#### Prometheus 메트릭
```promql
# 백업 성공률
backup_success_total / backup_attempts_total

# 백업 크기 추이
backup_size_bytes

# 백업 소요 시간
backup_duration_seconds

# 마지막 성공한 백업 시간
time() - backup_last_success_timestamp
```

#### 알림 규칙
```yaml
groups:
- name: mysql-backup
  rules:
  - alert: BackupFailed
    expr: backup_success == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "MySQL backup failed"
      description: "MySQL backup has failed for {{ $labels.instance }}"

  - alert: BackupDelayed
    expr: time() - backup_last_success_timestamp > 86400
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "MySQL backup is delayed"
      description: "No successful backup for more than 24 hours"
```

---

**다음**: [모니터링](monitoring.md)