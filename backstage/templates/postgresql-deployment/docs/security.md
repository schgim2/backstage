# 보안

PostgreSQL 클러스터의 보안 강화, 접근 제어, 암호화 설정을 안내합니다.

## 🔒 보안 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───►│   Network       │───►│   PostgreSQL    │
│   (mTLS)        │    │   Policies      │    │   (SSL/TLS)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Identity      │    │   Firewall      │    │   Encryption    │
│   Management    │    │   Rules         │    │   at Rest       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔐 인증 및 권한 관리

### 사용자 계정 관리

```sql
-- 관리자 계정 생성
CREATE USER db_admin WITH 
    SUPERUSER 
    CREATEDB 
    CREATEROLE 
    LOGIN 
    ENCRYPTED PASSWORD 'strong_admin_password';

-- 애플리케이션 계정 생성
CREATE USER app_user WITH 
    LOGIN 
    ENCRYPTED PASSWORD 'strong_app_password';

-- 읽기 전용 계정 생성
CREATE USER readonly_user WITH 
    LOGIN 
    ENCRYPTED PASSWORD 'strong_readonly_password';

-- 백업 전용 계정 생성
CREATE USER backup_user WITH 
    LOGIN 
    REPLICATION 
    ENCRYPTED PASSWORD 'strong_backup_password';

-- 모니터링 계정 생성
CREATE USER monitoring_user WITH 
    LOGIN 
    ENCRYPTED PASSWORD 'strong_monitoring_password';
GRANT pg_monitor TO monitoring_user;
```

### 역할 기반 접근 제어 (RBAC)

```sql
-- 역할 생성
CREATE ROLE app_read;
CREATE ROLE app_write;
CREATE ROLE app_admin;

-- 읽기 권한 설정
GRANT CONNECT ON DATABASE myapp TO app_read;
GRANT USAGE ON SCHEMA public TO app_read;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_read;

-- 쓰기 권한 설정
GRANT app_read TO app_write;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_write;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO app_write;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_write;

-- 관리자 권한 설정
GRANT app_write TO app_admin;
GRANT CREATE ON SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO app_admin;

-- 사용자에게 역할 할당
GRANT app_read TO readonly_user;
GRANT app_write TO app_user;
GRANT app_admin TO db_admin;
```

### 행 수준 보안 (RLS)

```sql
-- 행 수준 보안 활성화
ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (사용자는 자신의 데이터만 접근)
CREATE POLICY user_data_policy ON sensitive_data
    FOR ALL
    TO app_user
    USING (user_id = current_setting('app.current_user_id')::integer);

-- 관리자는 모든 데이터 접근 가능
CREATE POLICY admin_all_policy ON sensitive_data
    FOR ALL
    TO app_admin
    USING (true);

-- 읽기 전용 사용자는 공개 데이터만 접근
CREATE POLICY readonly_public_policy ON sensitive_data
    FOR SELECT
    TO readonly_user
    USING (is_public = true);
```

## 🔒 네트워크 보안

### SSL/TLS 설정

#### 인증서 생성

```bash
#!/bin/bash
# generate_ssl_certs.sh

CERT_DIR="/etc/postgresql/ssl"
DAYS=3650

# 디렉토리 생성
mkdir -p ${CERT_DIR}
cd ${CERT_DIR}

# CA 개인키 생성
openssl genrsa -out ca-key.pem 4096

# CA 인증서 생성
openssl req -new -x509 -days ${DAYS} -key ca-key.pem -out ca-cert.pem \
    -subj "/C=KR/ST=Seoul/L=Seoul/O=Company/OU=IT/CN=PostgreSQL-CA"

# 서버 개인키 생성
openssl genrsa -out server-key.pem 4096

# 서버 인증서 요청 생성
openssl req -new -key server-key.pem -out server-req.pem \
    -subj "/C=KR/ST=Seoul/L=Seoul/O=Company/OU=IT/CN=postgresql-master"

# 서버 인증서 생성
openssl x509 -req -days ${DAYS} -in server-req.pem \
    -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \
    -out server-cert.pem

# 클라이언트 개인키 생성
openssl genrsa -out client-key.pem 4096

# 클라이언트 인증서 요청 생성
openssl req -new -key client-key.pem -out client-req.pem \
    -subj "/C=KR/ST=Seoul/L=Seoul/O=Company/OU=IT/CN=postgresql-client"

# 클라이언트 인증서 생성
openssl x509 -req -days ${DAYS} -in client-req.pem \
    -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \
    -out client-cert.pem

# 권한 설정
chmod 600 *-key.pem
chmod 644 *-cert.pem ca-cert.pem
chown postgres:postgres *

# 정리
rm *-req.pem ca-cert.srl

echo "SSL certificates generated in ${CERT_DIR}"
```

#### PostgreSQL SSL 설정

```ini
# postgresql.conf
ssl = on
ssl_cert_file = '/etc/postgresql/ssl/server-cert.pem'
ssl_key_file = '/etc/postgresql/ssl/server-key.pem'
ssl_ca_file = '/etc/postgresql/ssl/ca-cert.pem'

# SSL 암호화 설정
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
ssl_ecdh_curve = 'prime256v1'
ssl_min_protocol_version = 'TLSv1.2'
ssl_max_protocol_version = 'TLSv1.3'

# 클라이언트 인증서 검증
ssl_cert_file = '/etc/postgresql/ssl/server-cert.pem'
ssl_key_file = '/etc/postgresql/ssl/server-key.pem'
ssl_ca_file = '/etc/postgresql/ssl/ca-cert.pem'
```

#### 클라이언트 인증 설정 (pg_hba.conf)

```ini
# SSL 연결 강제
hostssl all             all             0.0.0.0/0               cert
hostssl all             all             ::/0                    cert

# 특정 사용자는 인증서 + 비밀번호
hostssl all             app_user        0.0.0.0/0               cert clientcert=1
hostssl all             readonly_user   0.0.0.0/0               cert clientcert=1

# 관리자는 강화된 인증
hostssl all             db_admin        0.0.0.0/0               cert clientcert=1 map=admin_map

# 복제 연결 보안
hostssl replication     backup_user     0.0.0.0/0               cert clientcert=1
```

### Kubernetes 네트워크 정책

```yaml
# network-policy-postgresql.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgresql-network-policy
  namespace: database
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: postgresql
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  # 애플리케이션에서의 접근 허용
  - from:
    - namespaceSelector:
        matchLabels:
          name: application
    - podSelector:
        matchLabels:
          app: myapp
    ports:
    - protocol: TCP
      port: 5432
  
  # 모니터링 시스템에서의 접근 허용
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 9187
  
  # 관리자 접근 (pgAdmin)
  - from:
    - namespaceSelector:
        matchLabels:
          name: admin
    ports:
    - protocol: TCP
      port: 80
  
  # 클러스터 내부 통신 (복제)
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: postgresql
    ports:
    - protocol: TCP
      port: 5432
  
  egress:
  # DNS 해상도
  - to: []
    ports:
    - protocol: UDP
      port: 53
  
  # 백업 스토리지 접근
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS
    - protocol: TCP
      port: 80   # HTTP
  
  # 클러스터 내부 통신
  - to:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: postgresql
    ports:
    - protocol: TCP
      port: 5432

---
# 백업 작업을 위한 별도 정책
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgresql-backup-policy
  namespace: database
spec:
  podSelector:
    matchLabels:
      app: postgresql-backup
  policyTypes:
  - Ingress
  - Egress
  
  ingress: []  # 백업 작업은 인바운드 트래픽 불필요
  
  egress:
  # PostgreSQL 접근
  - to:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: postgresql
    ports:
    - protocol: TCP
      port: 5432
  
  # 외부 스토리지 접근
  - to: []
    ports:
    - protocol: TCP
      port: 443
```

## 🔐 데이터 암호화

### 저장 데이터 암호화

#### 투명한 데이터 암호화 (TDE)

```sql
-- pgcrypto 확장 설치
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 암호화된 컬럼 생성
CREATE TABLE encrypted_data (
    id SERIAL PRIMARY KEY,
    public_data TEXT,
    encrypted_data BYTEA,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 데이터 암호화 함수
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, key);
END;
$$ LANGUAGE plpgsql;

-- 데이터 복호화 함수
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data BYTEA, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data, key);
END;
$$ LANGUAGE plpgsql;

-- 사용 예시
INSERT INTO encrypted_data (public_data, encrypted_data)
VALUES ('Public Information', encrypt_sensitive_data('Sensitive Information', 'encryption_key'));

-- 복호화 조회
SELECT 
    public_data,
    decrypt_sensitive_data(encrypted_data, 'encryption_key') as decrypted_data
FROM encrypted_data;
```

#### 파일시스템 수준 암호화

```bash
#!/bin/bash
# setup_encryption.sh

# LUKS를 사용한 디스크 암호화
DEVICE="/dev/sdb"
MOUNT_POINT="/var/lib/postgresql/data"

# 디스크 암호화 설정
cryptsetup luksFormat ${DEVICE}
cryptsetup luksOpen ${DEVICE} postgresql_data

# 파일시스템 생성
mkfs.ext4 /dev/mapper/postgresql_data

# 마운트
mkdir -p ${MOUNT_POINT}
mount /dev/mapper/postgresql_data ${MOUNT_POINT}

# fstab 설정
echo "/dev/mapper/postgresql_data ${MOUNT_POINT} ext4 defaults 0 2" >> /etc/fstab

# 권한 설정
chown postgres:postgres ${MOUNT_POINT}
chmod 700 ${MOUNT_POINT}
```

### 백업 암호화

```bash
#!/bin/bash
# encrypted_backup.sh

BACKUP_DIR="/var/lib/postgresql/backups"
ENCRYPTION_KEY="backup_encryption_key"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 암호화된 백업 생성
pg_dump -h postgresql-master -U postgres myapp | \
    gpg --symmetric --cipher-algo AES256 --compress-algo 1 \
        --passphrase "${ENCRYPTION_KEY}" \
        --output "${BACKUP_DIR}/encrypted_backup_${TIMESTAMP}.sql.gpg"

# 백업 검증
gpg --decrypt --quiet --batch --passphrase "${ENCRYPTION_KEY}" \
    "${BACKUP_DIR}/encrypted_backup_${TIMESTAMP}.sql.gpg" | \
    head -10 > /dev/null

if [ $? -eq 0 ]; then
    echo "Encrypted backup created and verified: ${TIMESTAMP}"
else
    echo "ERROR: Encrypted backup verification failed"
    exit 1
fi

# 복호화 예시 (복구 시)
# gpg --decrypt --batch --passphrase "${ENCRYPTION_KEY}" \
#     "${BACKUP_DIR}/encrypted_backup_${TIMESTAMP}.sql.gpg" | \
#     psql -h postgresql-master -U postgres myapp
```

## 🔍 보안 감사

### 감사 로깅 설정

```sql
-- pgaudit 확장 설치
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- 감사 설정
ALTER SYSTEM SET pgaudit.log = 'all';
ALTER SYSTEM SET pgaudit.log_catalog = on;
ALTER SYSTEM SET pgaudit.log_parameter = on;
ALTER SYSTEM SET pgaudit.log_relation = on;
ALTER SYSTEM SET pgaudit.log_statement_once = off;

-- 설정 적용
SELECT pg_reload_conf();
```

```ini
# postgresql.conf
shared_preload_libraries = 'pgaudit'

# 감사 로깅 설정
pgaudit.log = 'ddl,dml,role,function,misc'
pgaudit.log_catalog = on
pgaudit.log_client = on
pgaudit.log_level = log
pgaudit.log_parameter = on
pgaudit.log_relation = on
pgaudit.log_statement_once = off

# 로그 형식
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'all'
log_connections = on
log_disconnections = on
log_duration = on
```

### 보안 모니터링 쿼리

```sql
-- 실패한 로그인 시도 모니터링
SELECT 
    client_addr,
    usename,
    datname,
    COUNT(*) as failed_attempts,
    MAX(backend_start) as last_attempt
FROM pg_stat_activity 
WHERE state = 'idle' 
    AND query LIKE '%authentication failed%'
GROUP BY client_addr, usename, datname
HAVING COUNT(*) > 5;

-- 권한 변경 감사
SELECT 
    schemaname,
    tablename,
    grantor,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE grantee NOT IN ('postgres', 'PUBLIC')
ORDER BY schemaname, tablename;

-- 슈퍼유저 계정 모니터링
SELECT 
    rolname,
    rolsuper,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    rolconnlimit,
    rolvaliduntil
FROM pg_roles 
WHERE rolsuper = true;

-- 비정상적인 연결 패턴 감지
SELECT 
    client_addr,
    usename,
    application_name,
    COUNT(*) as connection_count,
    MIN(backend_start) as first_connection,
    MAX(backend_start) as last_connection
FROM pg_stat_activity
WHERE backend_start > NOW() - INTERVAL '1 hour'
GROUP BY client_addr, usename, application_name
HAVING COUNT(*) > 100
ORDER BY connection_count DESC;
```

### 자동 보안 검사

```bash
#!/bin/bash
# security_audit.sh

REPORT_FILE="/tmp/postgresql_security_audit_$(date +%Y%m%d_%H%M%S).txt"

echo "PostgreSQL Security Audit Report" > ${REPORT_FILE}
echo "Generated: $(date)" >> ${REPORT_FILE}
echo "=================================" >> ${REPORT_FILE}

# 1. 사용자 계정 검사
echo "" >> ${REPORT_FILE}
echo "1. User Accounts:" >> ${REPORT_FILE}
psql -h postgresql-master -U postgres -c "
SELECT 
    rolname,
    rolsuper,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    rolconnlimit,
    CASE WHEN rolvaliduntil IS NULL THEN 'Never expires' 
         ELSE rolvaliduntil::text END as expires
FROM pg_roles 
ORDER BY rolsuper DESC, rolname;" >> ${REPORT_FILE}

# 2. 데이터베이스 권한 검사
echo "" >> ${REPORT_FILE}
echo "2. Database Privileges:" >> ${REPORT_FILE}
psql -h postgresql-master -U postgres -c "
SELECT 
    datname,
    datacl
FROM pg_database 
WHERE datname NOT IN ('template0', 'template1');" >> ${REPORT_FILE}

# 3. SSL 설정 검사
echo "" >> ${REPORT_FILE}
echo "3. SSL Configuration:" >> ${REPORT_FILE}
psql -h postgresql-master -U postgres -c "
SELECT 
    name,
    setting,
    source
FROM pg_settings 
WHERE name LIKE 'ssl%' OR name = 'log_connections';" >> ${REPORT_FILE}

# 4. 연결 보안 검사
echo "" >> ${REPORT_FILE}
echo "4. Connection Security:" >> ${REPORT_FILE}
psql -h postgresql-master -U postgres -c "
SELECT 
    client_addr,
    usename,
    ssl,
    COUNT(*) as connections
FROM pg_stat_ssl 
JOIN pg_stat_activity USING (pid)
GROUP BY client_addr, usename, ssl
ORDER BY connections DESC;" >> ${REPORT_FILE}

# 5. 파일 권한 검사
echo "" >> ${REPORT_FILE}
echo "5. File Permissions:" >> ${REPORT_FILE}
echo "Data directory permissions:" >> ${REPORT_FILE}
ls -la /var/lib/postgresql/data/ | head -10 >> ${REPORT_FILE}

echo "" >> ${REPORT_FILE}
echo "SSL certificate permissions:" >> ${REPORT_FILE}
ls -la /etc/postgresql/ssl/ >> ${REPORT_FILE}

# 6. 보안 설정 권장사항 검사
echo "" >> ${REPORT_FILE}
echo "6. Security Recommendations:" >> ${REPORT_FILE}

# 비밀번호 정책 검사
if psql -h postgresql-master -U postgres -t -c "SELECT 1 FROM pg_extension WHERE extname = 'passwordcheck';" | grep -q 1; then
    echo "✓ Password complexity extension installed" >> ${REPORT_FILE}
else
    echo "✗ Password complexity extension not installed" >> ${REPORT_FILE}
fi

# 감사 로깅 검사
if psql -h postgresql-master -U postgres -t -c "SELECT 1 FROM pg_extension WHERE extname = 'pgaudit';" | grep -q 1; then
    echo "✓ Audit logging extension installed" >> ${REPORT_FILE}
else
    echo "✗ Audit logging extension not installed" >> ${REPORT_FILE}
fi

# SSL 강제 검사
if grep -q "hostssl" /etc/postgresql/pg_hba.conf; then
    echo "✓ SSL connections enforced" >> ${REPORT_FILE}
else
    echo "✗ SSL connections not enforced" >> ${REPORT_FILE}
fi

echo "" >> ${REPORT_FILE}
echo "Security audit completed. Report saved to: ${REPORT_FILE}"

# 이메일 발송 (선택사항)
if [ ! -z "$SECURITY_EMAIL" ]; then
    mail -s "PostgreSQL Security Audit Report" $SECURITY_EMAIL < ${REPORT_FILE}
fi
```

## 🔐 비밀번호 정책

### 강력한 비밀번호 정책 설정

```sql
-- passwordcheck 확장 설치
CREATE EXTENSION IF NOT EXISTS passwordcheck;

-- 비밀번호 정책 설정
ALTER SYSTEM SET passwordcheck.minimum_length = 12;
ALTER SYSTEM SET passwordcheck.maximum_length = 128;
ALTER SYSTEM SET passwordcheck.special_chars = 2;
ALTER SYSTEM SET passwordcheck.numbers = 2;
ALTER SYSTEM SET passwordcheck.uppercase = 2;
ALTER SYSTEM SET passwordcheck.lowercase = 2;
ALTER SYSTEM SET passwordcheck.username_check = on;
ALTER SYSTEM SET passwordcheck.dictionary_check = on;

-- 설정 적용
SELECT pg_reload_conf();

-- 비밀번호 만료 정책
ALTER USER app_user VALID UNTIL '2024-12-31';
ALTER USER readonly_user VALID UNTIL '2024-12-31';

-- 정기적인 비밀번호 변경 알림
CREATE OR REPLACE FUNCTION check_password_expiry()
RETURNS TABLE(username NAME, days_until_expiry INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rolname,
        EXTRACT(DAY FROM rolvaliduntil - NOW())::INTEGER
    FROM pg_roles 
    WHERE rolvaliduntil IS NOT NULL 
        AND rolvaliduntil - NOW() < INTERVAL '30 days'
        AND rolcanlogin = true;
END;
$$ LANGUAGE plpgsql;

-- 만료 예정 계정 확인
SELECT * FROM check_password_expiry();
```

## 🚨 보안 사고 대응

### 보안 사고 대응 절차

```bash
#!/bin/bash
# security_incident_response.sh

INCIDENT_TYPE="$1"  # unauthorized_access, data_breach, etc.
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/postgresql/security_incident_${TIMESTAMP}.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${LOG_FILE}
}

case ${INCIDENT_TYPE} in
    "unauthorized_access")
        log "SECURITY INCIDENT: Unauthorized access detected"
        
        # 1. 의심스러운 연결 차단
        log "Blocking suspicious connections..."
        psql -h postgresql-master -U postgres -c "
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE client_addr NOT IN ('127.0.0.1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')
            AND usename NOT IN ('postgres', 'replicator');"
        
        # 2. 계정 잠금
        log "Locking compromised accounts..."
        psql -h postgresql-master -U postgres -c "
        ALTER USER suspicious_user NOLOGIN;"
        
        # 3. 감사 로그 수집
        log "Collecting audit logs..."
        grep "authentication failed\|connection authorized" /var/log/postgresql/*.log > /tmp/auth_logs_${TIMESTAMP}.txt
        ;;
        
    "data_breach")
        log "SECURITY INCIDENT: Data breach detected"
        
        # 1. 즉시 읽기 전용 모드 전환
        log "Switching to read-only mode..."
        psql -h postgresql-master -U postgres -c "
        ALTER SYSTEM SET default_transaction_read_only = on;
        SELECT pg_reload_conf();"
        
        # 2. 민감한 데이터 접근 차단
        log "Blocking access to sensitive data..."
        psql -h postgresql-master -U postgres -c "
        REVOKE ALL ON sensitive_table FROM PUBLIC;
        REVOKE ALL ON sensitive_table FROM app_user;"
        
        # 3. 데이터 무결성 검사
        log "Checking data integrity..."
        psql -h postgresql-master -U postgres -c "
        SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
        FROM pg_stat_user_tables 
        WHERE n_tup_upd > 0 OR n_tup_del > 0;"
        ;;
esac

# 알림 발송
if [ ! -z "$SECURITY_ALERT_EMAIL" ]; then
    mail -s "SECURITY INCIDENT: ${INCIDENT_TYPE}" $SECURITY_ALERT_EMAIL < ${LOG_FILE}
fi

# Slack 알림
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 SECURITY INCIDENT: '${INCIDENT_TYPE}' detected in PostgreSQL cluster"}' \
        $SLACK_WEBHOOK_URL
fi

log "Security incident response completed. Log: ${LOG_FILE}"
```

## 📚 다음 단계

보안 설정이 완료되면 다음 문서들을 참고하세요:

- **[Troubleshooting](troubleshooting.md)** - 보안 관련 문제 해결
- **[Best Practices](best-practices.md)** - 보안 모범 사례

---

**이전**: [Monitoring](monitoring.md) | **다음**: [Troubleshooting](troubleshooting.md)