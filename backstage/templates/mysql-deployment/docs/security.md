# 보안

MySQL 클러스터의 보안 강화를 위한 종합적인 가이드입니다.

## 보안 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───►│  Network Policy │───►│     MySQL       │
│   (Client)      │    │   (Firewall)    │    │   (Encrypted)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Authentication │    │   SSL/TLS       │    │   Audit Logs    │
│   (Credentials) │    │ (Encryption)    │    │  (Monitoring)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 네트워크 보안

### SSL/TLS 암호화

#### SSL 인증서 생성
```bash
# CA 키 및 인증서 생성
openssl genrsa 2048 > ca-key.pem
openssl req -new -x509 -nodes -days 3600 -key ca-key.pem -out ca.pem \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=Company/CN=MySQL_CA"

# 서버 키 및 인증서 생성
openssl req -newkey rsa:2048 -days 3600 -nodes -keyout server-key.pem \
  -out server-req.pem -subj "/C=KR/ST=Seoul/L=Seoul/O=Company/CN=MySQL_Server"
openssl rsa -in server-key.pem -out server-key.pem
openssl x509 -req -in server-req.pem -days 3600 -CA ca.pem -CAkey ca-key.pem \
  -set_serial 01 -out server-cert.pem

# 클라이언트 키 및 인증서 생성
openssl req -newkey rsa:2048 -days 3600 -nodes -keyout client-key.pem \
  -out client-req.pem -subj "/C=KR/ST=Seoul/L=Seoul/O=Company/CN=MySQL_Client"
openssl rsa -in client-key.pem -out client-key.pem
openssl x509 -req -in client-req.pem -days 3600 -CA ca.pem -CAkey ca-key.pem \
  -set_serial 01 -out client-cert.pem

# 인증서 검증
openssl verify -CAfile ca.pem server-cert.pem client-cert.pem
```

#### SSL 설정 확인
```sql
-- SSL 상태 확인
SHOW STATUS LIKE 'Ssl%';

-- SSL 변수 확인
SHOW VARIABLES LIKE '%ssl%';

-- 현재 연결의 SSL 상태 확인
SELECT 
    CONNECTION_ID(),
    USER(),
    HOST(),
    CONNECTION_TYPE,
    TLS_VERSION
FROM performance_schema.session_status 
WHERE VARIABLE_NAME = 'Ssl_cipher';
```

#### 강제 SSL 연결
```sql
-- 사용자별 SSL 강제 설정
CREATE USER 'secure_user'@'%' IDENTIFIED BY 'password' REQUIRE SSL;

-- 기존 사용자에 SSL 요구사항 추가
ALTER USER 'existing_user'@'%' REQUIRE SSL;

-- X.509 인증서 요구
ALTER USER 'cert_user'@'%' REQUIRE X509;

-- 특정 인증서 요구
ALTER USER 'specific_cert_user'@'%' 
REQUIRE SUBJECT '/C=KR/ST=Seoul/L=Seoul/O=Company/CN=Client';
```

### 네트워크 정책

#### Kubernetes 네트워크 정책
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mysql-security-policy
  namespace: database
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: mysql-cluster
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # 애플리케이션 네임스페이스에서만 접근 허용
  - from:
    - namespaceSelector:
        matchLabels:
          name: application
    ports:
    - protocol: TCP
      port: 3306
  # 모니터링 네임스페이스에서 메트릭 수집 허용
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 9104
  # 관리자 접근 (특정 IP에서만)
  - from:
    - ipBlock:
        cidr: 10.0.1.0/24  # 관리자 네트워크
    ports:
    - protocol: TCP
      port: 3306
  egress:
  # DNS 해석 허용
  - to: []
    ports:
    - protocol: UDP
      port: 53
  # MySQL 복제 트래픽 허용
  - to:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: mysql-cluster
    ports:
    - protocol: TCP
      port: 3306
  # 백업 업로드 허용 (HTTPS)
  - to: []
    ports:
    - protocol: TCP
      port: 443
```

#### 방화벽 규칙 (iptables)
```bash
# MySQL 포트 접근 제한
iptables -A INPUT -p tcp --dport 3306 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 3306 -j DROP

# 복제 트래픽 허용
iptables -A INPUT -p tcp --dport 3306 -s mysql-replica-ip -j ACCEPT

# 모니터링 포트 보호
iptables -A INPUT -p tcp --dport 9104 -s monitoring-server-ip -j ACCEPT
iptables -A INPUT -p tcp --dport 9104 -j DROP
```

## 인증 및 권한 관리

### 사용자 계정 보안

#### 강력한 비밀번호 정책
```sql
-- 비밀번호 검증 플러그인 설치 (MySQL 8.0)
INSTALL COMPONENT 'file://component_validate_password';

-- 비밀번호 정책 설정
SET GLOBAL validate_password.policy = STRONG;
SET GLOBAL validate_password.length = 12;
SET GLOBAL validate_password.mixed_case_count = 1;
SET GLOBAL validate_password.number_count = 1;
SET GLOBAL validate_password.special_char_count = 1;

-- 비밀번호 정책 확인
SHOW VARIABLES LIKE 'validate_password%';
```

#### 계정 생성 및 권한 부여
```sql
-- 애플리케이션 사용자 (최소 권한)
CREATE USER 'app_user'@'10.0.%' IDENTIFIED BY 'StrongP@ssw0rd123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'app_user'@'10.0.%';

-- 읽기 전용 사용자
CREATE USER 'readonly_user'@'10.0.%' IDENTIFIED BY 'ReadOnlyP@ss123!';
GRANT SELECT ON myapp.* TO 'readonly_user'@'10.0.%';

-- 백업 사용자
CREATE USER 'backup_user'@'localhost' IDENTIFIED BY 'BackupP@ss123!';
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER, RELOAD ON *.* TO 'backup_user'@'localhost';

-- 모니터링 사용자
CREATE USER 'monitoring_user'@'10.0.%' IDENTIFIED BY 'MonitorP@ss123!' 
WITH MAX_USER_CONNECTIONS 3;
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'monitoring_user'@'10.0.%';

-- 복제 사용자
CREATE USER 'replication_user'@'10.0.%' IDENTIFIED BY 'ReplP@ss123!';
GRANT REPLICATION SLAVE ON *.* TO 'replication_user'@'10.0.%';
```

#### 계정 보안 강화
```sql
-- 계정 잠금 정책 설정
ALTER USER 'app_user'@'10.0.%' 
FAILED_LOGIN_ATTEMPTS 3 
PASSWORD_LOCK_TIME 2;

-- 비밀번호 만료 설정
ALTER USER 'app_user'@'10.0.%' PASSWORD EXPIRE INTERVAL 90 DAY;

-- 비밀번호 재사용 방지
ALTER USER 'app_user'@'10.0.%' PASSWORD HISTORY 5;

-- 계정 상태 확인
SELECT 
    User, 
    Host, 
    account_locked, 
    password_expired,
    password_last_changed,
    password_lifetime
FROM mysql.user 
WHERE User NOT IN ('mysql.sys', 'mysql.session', 'mysql.infoschema');
```

### 역할 기반 접근 제어 (RBAC)

#### 역할 생성 및 관리
```sql
-- 역할 생성
CREATE ROLE 'app_developer', 'app_admin', 'db_monitor';

-- 역할에 권한 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'app_developer';
GRANT ALL PRIVILEGES ON myapp.* TO 'app_admin';
GRANT SELECT ON performance_schema.* TO 'db_monitor';
GRANT PROCESS, REPLICATION CLIENT ON *.* TO 'db_monitor';

-- 사용자에게 역할 할당
CREATE USER 'john'@'10.0.%' IDENTIFIED BY 'JohnP@ss123!';
GRANT 'app_developer' TO 'john'@'10.0.%';

CREATE USER 'admin'@'10.0.%' IDENTIFIED BY 'AdminP@ss123!';
GRANT 'app_admin' TO 'admin'@'10.0.%';

-- 기본 역할 설정
ALTER USER 'john'@'10.0.%' DEFAULT ROLE 'app_developer';
ALTER USER 'admin'@'10.0.%' DEFAULT ROLE 'app_admin';

-- 역할 활성화
SET ROLE ALL;
```

## 데이터 보호

### 데이터 암호화

#### 저장 데이터 암호화 (TDE)
```sql
-- 키링 플러그인 설치
INSTALL PLUGIN keyring_file SONAME 'keyring_file.so';

-- 암호화된 테이블스페이스 생성
CREATE TABLESPACE encrypted_ts 
ADD DATAFILE 'encrypted_ts.ibd' 
ENCRYPTION='Y';

-- 암호화된 테이블 생성
CREATE TABLE sensitive_data (
    id INT PRIMARY KEY,
    ssn VARCHAR(11) NOT NULL,
    credit_card VARCHAR(16) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) TABLESPACE encrypted_ts ENCRYPTION='Y';

-- 기존 테이블 암호화
ALTER TABLE users ENCRYPTION='Y';

-- 암호화 상태 확인
SELECT 
    SCHEMA_NAME,
    TABLE_NAME,
    CREATE_OPTIONS
FROM information_schema.TABLES 
WHERE CREATE_OPTIONS LIKE '%ENCRYPTION%';
```

#### 컬럼 수준 암호화
```sql
-- AES 암호화 함수 사용
INSERT INTO users (name, email, encrypted_ssn) 
VALUES ('John Doe', 'john@example.com', AES_ENCRYPT('123-45-6789', 'encryption_key'));

-- 복호화
SELECT 
    name, 
    email, 
    AES_DECRYPT(encrypted_ssn, 'encryption_key') as ssn 
FROM users 
WHERE id = 1;

-- 해시 함수 사용 (단방향)
INSERT INTO users (name, email, password_hash) 
VALUES ('John Doe', 'john@example.com', SHA2('password123', 256));
```

### 데이터 마스킹

#### 동적 데이터 마스킹
```sql
-- 마스킹 함수 생성
DELIMITER //
CREATE FUNCTION mask_ssn(ssn VARCHAR(11))
RETURNS VARCHAR(11)
READS SQL DATA
DETERMINISTIC
BEGIN
    RETURN CONCAT('XXX-XX-', RIGHT(ssn, 4));
END //
DELIMITER ;

-- 마스킹된 뷰 생성
CREATE VIEW users_masked AS
SELECT 
    id,
    name,
    email,
    mask_ssn(ssn) as ssn,
    created_at
FROM users;

-- 개발자용 권한 (마스킹된 데이터만 접근)
GRANT SELECT ON myapp.users_masked TO 'developer'@'10.0.%';
REVOKE SELECT ON myapp.users FROM 'developer'@'10.0.%';
```

## 감사 및 로깅

### 감사 로그 설정

#### MySQL Enterprise Audit (상용)
```sql
-- 감사 플러그인 설치
INSTALL PLUGIN audit_log SONAME 'audit_log.so';

-- 감사 정책 설정
SET GLOBAL audit_log_policy = ALL;
SET GLOBAL audit_log_format = JSON;
SET GLOBAL audit_log_file = 'audit.log';

-- 특정 사용자 감사
SET GLOBAL audit_log_include_accounts = 'admin@%,root@%';

-- 특정 이벤트만 감사
SET GLOBAL audit_log_statement_policy = ALL;
SET GLOBAL audit_log_connection_policy = ALL;
```

#### 커스텀 감사 로깅
```sql
-- 감사 테이블 생성
CREATE TABLE audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user VARCHAR(100),
    host VARCHAR(100),
    command_type VARCHAR(50),
    query_text TEXT,
    affected_rows INT,
    execution_time DECIMAL(10,3)
);

-- 트리거를 통한 감사 로깅
DELIMITER //
CREATE TRIGGER users_audit_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (user, host, command_type, query_text, affected_rows)
    VALUES (USER(), CONNECTION_ID(), 'INSERT', 
            CONCAT('INSERT INTO users VALUES (', NEW.id, ', ...)', 1);
END //

CREATE TRIGGER users_audit_update
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (user, host, command_type, query_text, affected_rows)
    VALUES (USER(), CONNECTION_ID(), 'UPDATE', 
            CONCAT('UPDATE users SET ... WHERE id = ', NEW.id), 1);
END //

CREATE TRIGGER users_audit_delete
AFTER DELETE ON users
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (user, host, command_type, query_text, affected_rows)
    VALUES (USER(), CONNECTION_ID(), 'DELETE', 
            CONCAT('DELETE FROM users WHERE id = ', OLD.id), 1);
END //
DELIMITER ;
```

### 로그 분석 및 모니터링

#### 의심스러운 활동 탐지
```sql
-- 비정상적인 로그인 시도
SELECT 
    user,
    host,
    COUNT(*) as failed_attempts,
    MAX(timestamp) as last_attempt
FROM audit_log 
WHERE command_type = 'FAILED_LOGIN' 
    AND timestamp > DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY user, host
HAVING failed_attempts > 5;

-- 권한 변경 감지
SELECT * FROM audit_log 
WHERE query_text LIKE '%GRANT%' 
   OR query_text LIKE '%REVOKE%'
   OR query_text LIKE '%CREATE USER%'
   OR query_text LIKE '%DROP USER%'
ORDER BY timestamp DESC;

-- 대량 데이터 조회 감지
SELECT 
    user,
    host,
    query_text,
    affected_rows,
    timestamp
FROM audit_log 
WHERE command_type = 'SELECT' 
    AND affected_rows > 10000
    AND timestamp > DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY affected_rows DESC;
```

## 보안 모니터링

### 보안 메트릭

#### Prometheus 보안 메트릭
```promql
# 실패한 로그인 시도
mysql_global_status_aborted_connects

# 권한 거부 횟수
mysql_global_status_access_denied_errors

# SSL 연결 비율
mysql_global_status_ssl_accepts / mysql_global_status_connections

# 비정상적인 연결 패턴
rate(mysql_global_status_connections[5m]) > 100
```

#### 보안 알림 규칙
```yaml
groups:
- name: mysql-security
  rules:
  - alert: MySQLHighFailedLogins
    expr: rate(mysql_global_status_aborted_connects[5m]) > 10
    for: 2m
    labels:
      severity: warning
      category: security
    annotations:
      summary: "High number of failed MySQL login attempts"
      description: "{{ $value }} failed login attempts per second"

  - alert: MySQLUnauthorizedAccess
    expr: rate(mysql_global_status_access_denied_errors[5m]) > 5
    for: 1m
    labels:
      severity: critical
      category: security
    annotations:
      summary: "MySQL unauthorized access attempts detected"
      description: "{{ $value }} access denied errors per second"

  - alert: MySQLInsecureConnections
    expr: (mysql_global_status_ssl_accepts / mysql_global_status_connections) < 0.9
    for: 5m
    labels:
      severity: warning
      category: security
    annotations:
      summary: "Low SSL connection ratio"
      description: "Only {{ $value | humanizePercentage }} of connections use SSL"
```

## 보안 강화 체크리스트

### 설치 및 구성
- [ ] 기본 root 비밀번호 변경
- [ ] 불필요한 기본 계정 제거
- [ ] test 데이터베이스 제거
- [ ] 원격 root 로그인 비활성화
- [ ] 익명 사용자 제거

### 네트워크 보안
- [ ] SSL/TLS 암호화 활성화
- [ ] 방화벽 규칙 설정
- [ ] 네트워크 정책 적용
- [ ] 불필요한 포트 차단
- [ ] VPN 또는 프라이빗 네트워크 사용

### 인증 및 권한
- [ ] 강력한 비밀번호 정책 적용
- [ ] 최소 권한 원칙 적용
- [ ] 역할 기반 접근 제어 구현
- [ ] 정기적인 권한 검토
- [ ] 계정 잠금 정책 설정

### 데이터 보호
- [ ] 중요 데이터 암호화
- [ ] 백업 암호화
- [ ] 데이터 마스킹 구현
- [ ] 개인정보 보호 정책 준수

### 모니터링 및 감사
- [ ] 감사 로깅 활성화
- [ ] 보안 이벤트 모니터링
- [ ] 알림 시스템 구성
- [ ] 정기적인 보안 검토

### 운영 보안
- [ ] 정기적인 보안 패치 적용
- [ ] 백업 및 복구 테스트
- [ ] 재해 복구 계획 수립
- [ ] 보안 교육 및 훈련

---

**다음**: [문제 해결](troubleshooting.md)