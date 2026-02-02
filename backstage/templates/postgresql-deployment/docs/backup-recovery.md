# 백업 및 복구

PostgreSQL 데이터베이스의 백업 전략, 복구 절차, Point-in-Time Recovery 설정을 안내합니다.

## 📋 백업 전략 개요

### 백업 유형

1. **논리적 백업** - pg_dump/pg_dumpall
2. **물리적 백업** - pg_basebackup
3. **연속 아카이빙** - WAL 파일 백업
4. **스냅샷 백업** - 파일시스템/볼륨 스냅샷

### 백업 주기

- **전체 백업**: 주 1회 (일요일 새벽)
- **증분 백업**: 일 1회 (매일 새벽 2시)
- **WAL 아카이빙**: 실시간 연속
- **스냅샷**: 중요 작업 전후

## 🔄 자동 백업 설정

### 전체 백업 스크립트

```bash
#!/bin/bash
# full_backup.sh

# 설정
BACKUP_DIR="/var/lib/postgresql/backups"
ARCHIVE_DIR="/var/lib/postgresql/archive"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${LOG_FILE}
}

# 백업 디렉토리 생성
mkdir -p ${BACKUP_DIR}/{full,incremental,wal}

log "Starting full backup: ${TIMESTAMP}"

# 1. 전체 데이터베이스 백업 (압축)
log "Creating full database dump..."
pg_dump -h postgresql-master -U postgres \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="${BACKUP_DIR}/full/full_backup_${TIMESTAMP}.dump" \
    myapp 2>&1 | tee -a ${LOG_FILE}

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log "Full backup completed successfully"
else
    log "ERROR: Full backup failed"
    exit 1
fi

# 2. 스키마 전용 백업
log "Creating schema-only backup..."
pg_dump -h postgresql-master -U postgres \
    --schema-only \
    --format=plain \
    --file="${BACKUP_DIR}/full/schema_backup_${TIMESTAMP}.sql" \
    myapp 2>&1 | tee -a ${LOG_FILE}

# 3. 글로벌 객체 백업 (사용자, 역할 등)
log "Creating global objects backup..."
pg_dumpall -h postgresql-master -U postgres \
    --globals-only \
    --file="${BACKUP_DIR}/full/globals_backup_${TIMESTAMP}.sql" \
    2>&1 | tee -a ${LOG_FILE}

# 4. 백업 검증
log "Verifying backup integrity..."
pg_restore --list "${BACKUP_DIR}/full/full_backup_${TIMESTAMP}.dump" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    log "Backup verification successful"
else
    log "ERROR: Backup verification failed"
    exit 1
fi

# 5. 백업 메타데이터 생성
cat > "${BACKUP_DIR}/full/backup_${TIMESTAMP}.info" << EOF
backup_type=full
timestamp=${TIMESTAMP}
database=myapp
size=$(du -h "${BACKUP_DIR}/full/full_backup_${TIMESTAMP}.dump" | cut -f1)
checksum=$(md5sum "${BACKUP_DIR}/full/full_backup_${TIMESTAMP}.dump" | cut -d' ' -f1)
postgresql_version=$(psql -h postgresql-master -U postgres -t -c "SELECT version()")
EOF

# 6. 오래된 백업 정리
log "Cleaning up old backups..."
find ${BACKUP_DIR}/full -name "full_backup_*" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR}/full -name "schema_backup_*" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR}/full -name "globals_backup_*" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR}/full -name "backup_*.info" -mtime +${RETENTION_DAYS} -delete

# 7. 백업 완료 알림
log "Full backup completed: ${TIMESTAMP}"

# Slack 알림 (선택사항)
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"PostgreSQL full backup completed: '${TIMESTAMP}'"}' \
        $SLACK_WEBHOOK_URL
fi
```

### 증분 백업 스크립트

```bash
#!/bin/bash
# incremental_backup.sh

BACKUP_DIR="/var/lib/postgresql/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${BACKUP_DIR}/incremental_backup_${TIMESTAMP}.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${LOG_FILE}
}

log "Starting incremental backup: ${TIMESTAMP}"

# 베이스 백업 생성
pg_basebackup -h postgresql-master -U replicator \
    -D "${BACKUP_DIR}/incremental/base_backup_${TIMESTAMP}" \
    -Ft -z -P -W \
    --checkpoint=fast \
    --wal-method=stream 2>&1 | tee -a ${LOG_FILE}

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log "Incremental backup completed successfully"
    
    # 백업 정보 저장
    cat > "${BACKUP_DIR}/incremental/backup_${TIMESTAMP}.info" << EOF
backup_type=incremental
timestamp=${TIMESTAMP}
method=pg_basebackup
size=$(du -sh "${BACKUP_DIR}/incremental/base_backup_${TIMESTAMP}" | cut -f1)
EOF
else
    log "ERROR: Incremental backup failed"
    exit 1
fi

# 오래된 증분 백업 정리 (7일)
find ${BACKUP_DIR}/incremental -name "base_backup_*" -mtime +7 -exec rm -rf {} \;
find ${BACKUP_DIR}/incremental -name "backup_*.info" -mtime +7 -delete

log "Incremental backup completed: ${TIMESTAMP}"
```

### WAL 아카이빙 설정

```ini
# postgresql.conf
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/archive/%f && cp %p /var/lib/postgresql/archive/%f'
archive_timeout = 300
wal_keep_size = 2GB
```

```bash
#!/bin/bash
# wal_archive.sh

ARCHIVE_DIR="/var/lib/postgresql/archive"
BACKUP_DIR="/var/lib/postgresql/backups/wal"
RETENTION_DAYS=7

# WAL 파일을 백업 위치로 복사
cp "$1" "${BACKUP_DIR}/$2"

# 압축 (선택사항)
gzip "${BACKUP_DIR}/$2"

# 오래된 WAL 파일 정리
find ${ARCHIVE_DIR} -name "*.backup" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR} -name "*.gz" -mtime +${RETENTION_DAYS} -delete

exit 0
```

## 🔄 Kubernetes CronJob 설정

### 전체 백업 CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgresql-full-backup
  namespace: database
spec:
  schedule: "0 2 * * 0"  # 매주 일요일 오전 2시
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              # 백업 스크립트 실행
              /scripts/full_backup.sh
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgresql-credentials
                  key: postgres-password
            volumeMounts:
            - name: backup-storage
              mountPath: /var/lib/postgresql/backups
            - name: backup-scripts
              mountPath: /scripts
            - name: archive-storage
              mountPath: /var/lib/postgresql/archive
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: postgresql-backup-storage
          - name: backup-scripts
            configMap:
              name: postgresql-backup-scripts
              defaultMode: 0755
          - name: archive-storage
            persistentVolumeClaim:
              claimName: postgresql-archive-storage
          restartPolicy: OnFailure
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
```

### 증분 백업 CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgresql-incremental-backup
  namespace: database
spec:
  schedule: "0 2 * * 1-6"  # 월-토 오전 2시
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              /scripts/incremental_backup.sh
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgresql-credentials
                  key: replication-password
            volumeMounts:
            - name: backup-storage
              mountPath: /var/lib/postgresql/backups
            - name: backup-scripts
              mountPath: /scripts
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: postgresql-backup-storage
          - name: backup-scripts
            configMap:
              name: postgresql-backup-scripts
              defaultMode: 0755
          restartPolicy: OnFailure
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
```

## 🔄 클라우드 스토리지 백업

### AWS S3 백업

```bash
#!/bin/bash
# s3_backup.sh

AWS_BUCKET="my-postgresql-backups"
AWS_REGION="us-west-2"
BACKUP_DIR="/var/lib/postgresql/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# S3에 백업 업로드
aws s3 cp "${BACKUP_DIR}/full/full_backup_${TIMESTAMP}.dump" \
    "s3://${AWS_BUCKET}/full/" \
    --region ${AWS_REGION} \
    --storage-class STANDARD_IA

# 메타데이터 업로드
aws s3 cp "${BACKUP_DIR}/full/backup_${TIMESTAMP}.info" \
    "s3://${AWS_BUCKET}/full/" \
    --region ${AWS_REGION}

# 오래된 백업 정리 (30일)
aws s3 ls "s3://${AWS_BUCKET}/full/" | \
    awk '$1 < "'$(date -d '30 days ago' '+%Y-%m-%d')'" {print $4}' | \
    xargs -I {} aws s3 rm "s3://${AWS_BUCKET}/full/{}"
```

### Google Cloud Storage 백업

```bash
#!/bin/bash
# gcs_backup.sh

GCS_BUCKET="my-postgresql-backups"
BACKUP_DIR="/var/lib/postgresql/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# GCS에 백업 업로드
gsutil cp "${BACKUP_DIR}/full/full_backup_${TIMESTAMP}.dump" \
    "gs://${GCS_BUCKET}/full/"

# 메타데이터 업로드
gsutil cp "${BACKUP_DIR}/full/backup_${TIMESTAMP}.info" \
    "gs://${GCS_BUCKET}/full/"

# 오래된 백업 정리
gsutil ls -l "gs://${GCS_BUCKET}/full/" | \
    awk '$2 < "'$(date -d '30 days ago' -u '+%Y-%m-%dT%H:%M:%SZ')'" {print $3}' | \
    xargs -I {} gsutil rm "{}"
```

## 🔄 복구 절차

### 전체 복구

```bash
#!/bin/bash
# full_restore.sh

BACKUP_FILE="$1"
TARGET_DB="$2"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ -z "$BACKUP_FILE" ] || [ -z "$TARGET_DB" ]; then
    echo "Usage: $0 <backup_file> <target_database>"
    exit 1
fi

echo "Starting full restore: ${TIMESTAMP}"

# 1. 기존 데이터베이스 백업 (안전장치)
echo "Creating safety backup of existing database..."
pg_dump -h postgresql-master -U postgres \
    --format=custom \
    --file="/tmp/safety_backup_${TARGET_DB}_${TIMESTAMP}.dump" \
    ${TARGET_DB}

# 2. 기존 연결 종료
echo "Terminating existing connections..."
psql -h postgresql-master -U postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TARGET_DB}' AND pid <> pg_backend_pid();"

# 3. 데이터베이스 삭제 및 재생성
echo "Recreating database..."
psql -h postgresql-master -U postgres -c "DROP DATABASE IF EXISTS ${TARGET_DB};"
psql -h postgresql-master -U postgres -c "CREATE DATABASE ${TARGET_DB};"

# 4. 백업 복원
echo "Restoring from backup..."
pg_restore -h postgresql-master -U postgres \
    --dbname=${TARGET_DB} \
    --verbose \
    --clean \
    --if-exists \
    ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    echo "Full restore completed successfully: ${TIMESTAMP}"
    # 안전장치 백업 삭제
    rm -f "/tmp/safety_backup_${TARGET_DB}_${TIMESTAMP}.dump"
else
    echo "ERROR: Full restore failed"
    echo "Safety backup available at: /tmp/safety_backup_${TARGET_DB}_${TIMESTAMP}.dump"
    exit 1
fi

# 5. 권한 복원
echo "Restoring permissions..."
psql -h postgresql-master -U postgres -d ${TARGET_DB} -f /backup/globals_backup_latest.sql

echo "Full restore completed: ${TIMESTAMP}"
```

### Point-in-Time Recovery (PITR)

```bash
#!/bin/bash
# pitr_restore.sh

RECOVERY_TARGET="$1"  # 예: "2024-02-01 12:00:00"
BASE_BACKUP_DIR="$2"
ARCHIVE_DIR="/var/lib/postgresql/archive"
DATA_DIR="/var/lib/postgresql/data_recovery"

if [ -z "$RECOVERY_TARGET" ] || [ -z "$BASE_BACKUP_DIR" ]; then
    echo "Usage: $0 '<recovery_target_time>' <base_backup_directory>"
    echo "Example: $0 '2024-02-01 12:00:00' /backup/base_backup_20240201_100000"
    exit 1
fi

echo "Starting Point-in-Time Recovery to: ${RECOVERY_TARGET}"

# 1. 기존 데이터 디렉토리 백업
if [ -d "${DATA_DIR}" ]; then
    mv "${DATA_DIR}" "${DATA_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
fi

# 2. 베이스 백업 복원
echo "Restoring base backup..."
mkdir -p ${DATA_DIR}
tar -xzf ${BASE_BACKUP_DIR}/base.tar.gz -C ${DATA_DIR}/

# 3. WAL 파일 복원 설정
echo "Configuring WAL restore..."
cat >> ${DATA_DIR}/postgresql.auto.conf << EOF
# Recovery configuration
restore_command = 'cp ${ARCHIVE_DIR}/%f %p'
recovery_target_time = '${RECOVERY_TARGET}'
recovery_target_timeline = 'latest'
recovery_target_action = 'promote'
EOF

# 4. 복구 신호 파일 생성
touch ${DATA_DIR}/recovery.signal

# 5. PostgreSQL 시작 (복구 모드)
echo "Starting PostgreSQL in recovery mode..."
pg_ctl -D ${DATA_DIR} -l ${DATA_DIR}/recovery.log start

# 6. 복구 완료 대기
echo "Waiting for recovery to complete..."
while [ -f "${DATA_DIR}/recovery.signal" ]; do
    sleep 5
    echo -n "."
done
echo ""

# 7. 복구 완료 확인
if pg_isready -D ${DATA_DIR}; then
    echo "Point-in-Time Recovery completed successfully"
    echo "Database recovered to: ${RECOVERY_TARGET}"
    
    # 복구된 데이터베이스 정보 출력
    psql -h localhost -U postgres -c "SELECT pg_postmaster_start_time(), now();"
else
    echo "ERROR: Point-in-Time Recovery failed"
    echo "Check recovery log: ${DATA_DIR}/recovery.log"
    exit 1
fi
```

### 테이블 단위 복구

```bash
#!/bin/bash
# table_restore.sh

BACKUP_FILE="$1"
TABLE_NAME="$2"
TARGET_DB="$3"

if [ -z "$BACKUP_FILE" ] || [ -z "$TABLE_NAME" ] || [ -z "$TARGET_DB" ]; then
    echo "Usage: $0 <backup_file> <table_name> <target_database>"
    exit 1
fi

echo "Restoring table: ${TABLE_NAME}"

# 1. 테이블 백업 (안전장치)
pg_dump -h postgresql-master -U postgres \
    --table=${TABLE_NAME} \
    --format=custom \
    --file="/tmp/safety_${TABLE_NAME}_$(date +%Y%m%d_%H%M%S).dump" \
    ${TARGET_DB}

# 2. 기존 테이블 삭제 (선택사항)
read -p "Drop existing table ${TABLE_NAME}? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    psql -h postgresql-master -U postgres -d ${TARGET_DB} -c "DROP TABLE IF EXISTS ${TABLE_NAME} CASCADE;"
fi

# 3. 테이블 복원
pg_restore -h postgresql-master -U postgres \
    --dbname=${TARGET_DB} \
    --table=${TABLE_NAME} \
    --verbose \
    --clean \
    --if-exists \
    ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    echo "Table restore completed successfully: ${TABLE_NAME}"
else
    echo "ERROR: Table restore failed: ${TABLE_NAME}"
    exit 1
fi
```

## 📊 백업 모니터링

### 백업 상태 확인 스크립트

```bash
#!/bin/bash
# check_backup_status.sh

BACKUP_DIR="/var/lib/postgresql/backups"
CURRENT_DATE=$(date +%Y%m%d)

echo "=== PostgreSQL Backup Status ==="
echo "Date: $(date)"
echo ""

# 최근 전체 백업 확인
echo "=== Full Backups ==="
LATEST_FULL=$(ls -t ${BACKUP_DIR}/full/full_backup_*.dump 2>/dev/null | head -1)
if [ -n "$LATEST_FULL" ]; then
    echo "Latest full backup: $(basename $LATEST_FULL)"
    echo "Size: $(du -h $LATEST_FULL | cut -f1)"
    echo "Date: $(stat -c %y $LATEST_FULL)"
else
    echo "WARNING: No full backups found!"
fi
echo ""

# 최근 증분 백업 확인
echo "=== Incremental Backups ==="
LATEST_INCREMENTAL=$(ls -t ${BACKUP_DIR}/incremental/base_backup_* 2>/dev/null | head -1)
if [ -n "$LATEST_INCREMENTAL" ]; then
    echo "Latest incremental backup: $(basename $LATEST_INCREMENTAL)"
    echo "Size: $(du -sh $LATEST_INCREMENTAL | cut -f1)"
    echo "Date: $(stat -c %y $LATEST_INCREMENTAL)"
else
    echo "WARNING: No incremental backups found!"
fi
echo ""

# WAL 아카이빙 상태 확인
echo "=== WAL Archiving ==="
ARCHIVE_COUNT=$(ls /var/lib/postgresql/archive/ 2>/dev/null | wc -l)
echo "Archived WAL files: $ARCHIVE_COUNT"

# 최근 WAL 파일 확인
LATEST_WAL=$(ls -t /var/lib/postgresql/archive/ 2>/dev/null | head -1)
if [ -n "$LATEST_WAL" ]; then
    echo "Latest WAL file: $LATEST_WAL"
    echo "Date: $(stat -c %y /var/lib/postgresql/archive/$LATEST_WAL)"
else
    echo "WARNING: No WAL files found!"
fi
echo ""

# 디스크 사용량 확인
echo "=== Disk Usage ==="
echo "Backup directory: $(du -sh $BACKUP_DIR 2>/dev/null | cut -f1)"
echo "Archive directory: $(du -sh /var/lib/postgresql/archive 2>/dev/null | cut -f1)"
echo ""

# 백업 무결성 확인
echo "=== Backup Integrity ==="
if [ -n "$LATEST_FULL" ]; then
    pg_restore --list "$LATEST_FULL" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Full backup integrity: OK"
    else
        echo "Full backup integrity: FAILED"
    fi
fi
```

### Prometheus 메트릭

```bash
#!/bin/bash
# backup_metrics.sh

METRICS_FILE="/var/lib/postgresql/metrics/backup_metrics.prom"
BACKUP_DIR="/var/lib/postgresql/backups"

# 메트릭 파일 초기화
cat > ${METRICS_FILE} << EOF
# HELP postgresql_backup_last_success_timestamp Last successful backup timestamp
# TYPE postgresql_backup_last_success_timestamp gauge
# HELP postgresql_backup_size_bytes Backup file size in bytes
# TYPE postgresql_backup_size_bytes gauge
# HELP postgresql_backup_duration_seconds Backup duration in seconds
# TYPE postgresql_backup_duration_seconds gauge
EOF

# 최근 전체 백업 메트릭
LATEST_FULL=$(ls -t ${BACKUP_DIR}/full/full_backup_*.dump 2>/dev/null | head -1)
if [ -n "$LATEST_FULL" ]; then
    TIMESTAMP=$(stat -c %Y "$LATEST_FULL")
    SIZE=$(stat -c %s "$LATEST_FULL")
    
    echo "postgresql_backup_last_success_timestamp{type=\"full\"} $TIMESTAMP" >> ${METRICS_FILE}
    echo "postgresql_backup_size_bytes{type=\"full\"} $SIZE" >> ${METRICS_FILE}
fi

# 최근 증분 백업 메트릭
LATEST_INCREMENTAL=$(ls -t ${BACKUP_DIR}/incremental/base_backup_* 2>/dev/null | head -1)
if [ -n "$LATEST_INCREMENTAL" ]; then
    TIMESTAMP=$(stat -c %Y "$LATEST_INCREMENTAL")
    SIZE=$(du -sb "$LATEST_INCREMENTAL" | cut -f1)
    
    echo "postgresql_backup_last_success_timestamp{type=\"incremental\"} $TIMESTAMP" >> ${METRICS_FILE}
    echo "postgresql_backup_size_bytes{type=\"incremental\"} $SIZE" >> ${METRICS_FILE}
fi
```

## 🔄 백업 테스트

### 자동 백업 테스트

```bash
#!/bin/bash
# test_backup_restore.sh

TEST_DB="test_restore_$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

echo "Testing backup restore with test database: $TEST_DB"

# 1. 테스트 데이터베이스 생성
psql -h postgresql-master -U postgres -c "CREATE DATABASE $TEST_DB;"

# 2. 백업 복원
pg_restore -h postgresql-master -U postgres \
    --dbname=$TEST_DB \
    --verbose \
    $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "Backup restore test: PASSED"
    
    # 3. 기본 검증
    TABLE_COUNT=$(psql -h postgresql-master -U postgres -d $TEST_DB -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
    echo "Restored tables: $TABLE_COUNT"
    
    # 4. 테스트 데이터베이스 삭제
    psql -h postgresql-master -U postgres -c "DROP DATABASE $TEST_DB;"
    
    echo "Backup test completed successfully"
else
    echo "Backup restore test: FAILED"
    psql -h postgresql-master -U postgres -c "DROP DATABASE IF EXISTS $TEST_DB;"
    exit 1
fi
```

## 📚 다음 단계

백업 및 복구 설정이 완료되면 다음 문서들을 참고하세요:

- **[Monitoring](monitoring.md)** - 백업 모니터링 설정
- **[Security](security.md)** - 백업 보안 강화
- **[Troubleshooting](troubleshooting.md)** - 백업 문제 해결
- **[Best Practices](best-practices.md)** - 백업 모범 사례

---

**이전**: [High Availability](high-availability.md) | **다음**: [Monitoring](monitoring.md)