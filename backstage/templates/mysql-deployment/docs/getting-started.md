# 시작하기

이 가이드는 MySQL 클러스터를 빠르게 배포하고 시작하는 방법을 설명합니다.

## 전제 조건

### 시스템 요구사항

{% if values.deploymentType == 'kubernetes' %}
#### Kubernetes 환경
- Kubernetes 클러스터 (v1.20+)
- kubectl CLI 도구 설치 및 구성
- 충분한 리소스 (CPU: {{ values.masterResources.cpu }}, 메모리: {{ values.masterResources.memory }}, 스토리지: {{ values.masterResources.storage }})
- 스토리지 클래스: `{{ values.storageClass }}`

```bash
# Kubernetes 버전 확인
kubectl version --short

# 사용 가능한 스토리지 클래스 확인
kubectl get storageclass
```

{% elif values.deploymentType == 'docker-compose' %}
#### Docker 환경
- Docker Engine (v20.10+)
- Docker Compose (v2.0+)
- 충분한 시스템 리소스

```bash
# Docker 버전 확인
docker --version
docker-compose --version

# 시스템 리소스 확인
docker system df
```
{% endif %}

### 네트워크 요구사항
- 포트 3306 (MySQL)
{% if values.enableProxySQL %}
- 포트 6033 (ProxySQL MySQL)
- 포트 6032 (ProxySQL Admin)
{% endif %}
{% if values.enablePhpMyAdmin %}
- 포트 8080 (phpMyAdmin)
{% endif %}
{% if values.enableMonitoring %}
- 포트 9090 (Prometheus)
- 포트 3000 (Grafana)
- 포트 9104 (MySQL Exporter)
{% endif %}

## 빠른 배포

### 1단계: 환경 변수 설정

먼저 필요한 환경 변수를 설정합니다:

```bash
# 데이터베이스 설정
export MYSQL_DATABASE=${{ values.databaseName }}
export MYSQL_USER=${{ values.username }}
export MYSQL_PASSWORD=$(openssl rand -base64 32)
export MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)

# 복제 사용자 비밀번호
export MYSQL_REPLICATION_PASSWORD=$(openssl rand -base64 32)

{% if values.enableMonitoring %}
# 모니터링 설정
export GRAFANA_PASSWORD=$(openssl rand -base64 16)
{% endif %}

{% if values.backupStorage == 's3' %}
# AWS S3 백업 설정 (선택사항)
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export S3_BUCKET=your-backup-bucket
{% elif values.backupStorage == 'gcs' %}
# Google Cloud Storage 백업 설정 (선택사항)
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export GCS_BUCKET=your-backup-bucket
{% endif %}

# 비밀번호 저장 (안전한 위치에)
echo "MySQL Root Password: $MYSQL_ROOT_PASSWORD" > mysql_passwords.txt
echo "MySQL User Password: $MYSQL_PASSWORD" >> mysql_passwords.txt
echo "Replication Password: $MYSQL_REPLICATION_PASSWORD" >> mysql_passwords.txt
{% if values.enableMonitoring %}
echo "Grafana Password: $GRAFANA_PASSWORD" >> mysql_passwords.txt
{% endif %}
chmod 600 mysql_passwords.txt
```

{% if values.deploymentType == 'kubernetes' %}
### 2단계: Kubernetes 배포

#### 네임스페이스 생성
```bash
kubectl apply -f k8s/namespace.yaml
```

#### 시크릿 생성
```bash
# MySQL 인증 정보 시크릿 생성
kubectl create secret generic ${{ values.name }}-credentials \
  --from-literal=mysql-root-password=$MYSQL_ROOT_PASSWORD \
  --from-literal=mysql-password=$MYSQL_PASSWORD \
  --from-literal=replication-password=$MYSQL_REPLICATION_PASSWORD \
  -n ${{ values.namespace }}

{% if values.enableBackup and values.backupStorage == 's3' %}
# S3 백업 인증 정보 (선택사항)
kubectl create secret generic ${{ values.name }}-backup-credentials \
  --from-literal=aws-access-key-id=$AWS_ACCESS_KEY_ID \
  --from-literal=aws-secret-access-key=$AWS_SECRET_ACCESS_KEY \
  --from-literal=s3-bucket=$S3_BUCKET \
  -n ${{ values.namespace }}
{% elif values.enableBackup and values.backupStorage == 'gcs' %}
# GCS 백업 인증 정보 (선택사항)
kubectl create secret generic ${{ values.name }}-backup-credentials \
  --from-file=service-account.json=$GOOGLE_APPLICATION_CREDENTIALS \
  --from-literal=gcs-bucket=$GCS_BUCKET \
  -n ${{ values.namespace }}
{% endif %}
```

#### MySQL 클러스터 배포
```bash
# ConfigMap 및 기본 리소스 배포
kubectl apply -f k8s/configmap.yaml -n ${{ values.namespace }}

# MySQL 마스터 배포
kubectl apply -f k8s/master-statefulset.yaml -n ${{ values.namespace }}

# 마스터가 준비될 때까지 대기
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=master -n ${{ values.namespace }} --timeout=300s

{% if values.enableReplication %}
# MySQL 복제본 배포
kubectl apply -f k8s/replica-statefulset.yaml -n ${{ values.namespace }}

# 복제본이 준비될 때까지 대기
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=database -n ${{ values.namespace }} --timeout=300s
{% endif %}

{% if values.enableProxySQL %}
# ProxySQL 로드 밸런서 배포
kubectl apply -f k8s/proxysql.yaml -n ${{ values.namespace }}
{% endif %}

{% if values.enablePhpMyAdmin %}
# phpMyAdmin 웹 인터페이스 배포
kubectl apply -f k8s/phpmyadmin.yaml -n ${{ values.namespace }}
{% endif %}

{% if values.enableBackup %}
# 백업 CronJob 배포
kubectl apply -f k8s/backup-cronjob.yaml -n ${{ values.namespace }}
{% endif %}

{% if values.enableNetworkPolicies %}
# 네트워크 정책 적용
kubectl apply -f k8s/network-policy.yaml -n ${{ values.namespace }}
{% endif %}
```

#### 배포 상태 확인
```bash
# 모든 Pod 상태 확인
kubectl get pods -n ${{ values.namespace }}

# 서비스 상태 확인
kubectl get services -n ${{ values.namespace }}

# StatefulSet 상태 확인
kubectl get statefulsets -n ${{ values.namespace }}

# PVC 상태 확인
kubectl get pvc -n ${{ values.namespace }}
```

{% elif values.deploymentType == 'docker-compose' %}
### 2단계: Docker Compose 배포

#### 백그라운드에서 서비스 시작
```bash
# 모든 서비스 시작
docker-compose up -d

# 서비스 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f mysql-master
```

#### 개별 서비스 시작 (선택사항)
```bash
# MySQL 마스터만 시작
docker-compose up -d mysql-master

# 마스터가 준비되면 복제본 시작
{% if values.enableReplication %}
{% for i in range(values.replicaCount) %}
docker-compose up -d mysql-replica-{{ i }}
{% endfor %}
{% endif %}

{% if values.enableProxySQL %}
# ProxySQL 시작
docker-compose up -d proxysql
{% endif %}

{% if values.enablePhpMyAdmin %}
# phpMyAdmin 시작
docker-compose up -d phpmyadmin
{% endif %}
```
{% endif %}

### 3단계: 연결 테스트

#### 마스터 연결 테스트
{% if values.deploymentType == 'kubernetes' %}
```bash
# 포트 포워딩으로 로컬 연결
kubectl port-forward svc/${{ values.name }}-master 3306:3306 -n ${{ values.namespace }} &

# MySQL 클라이언트로 연결
mysql -h localhost -P 3306 -u ${{ values.username }} -p$MYSQL_PASSWORD ${{ values.databaseName }}
```

또는 클러스터 내부에서 직접 연결:
```bash
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysql -u ${{ values.username }} -p$MYSQL_PASSWORD ${{ values.databaseName }} -e "SELECT VERSION();"
```

{% elif values.deploymentType == 'docker-compose' %}
```bash
# MySQL 클라이언트로 연결
mysql -h localhost -P 3306 -u ${{ values.username }} -p$MYSQL_PASSWORD ${{ values.databaseName }}

# 또는 Docker 컨테이너 내부에서
docker exec -it ${{ values.name }}-master \
  mysql -u ${{ values.username }} -p$MYSQL_PASSWORD ${{ values.databaseName }} -e "SELECT VERSION();"
```
{% endif %}

{% if values.enableReplication %}
#### 복제본 연결 테스트
{% if values.deploymentType == 'kubernetes' %}
```bash
# 복제본 연결 (읽기 전용)
kubectl exec -it ${{ values.name }}-replica-0-0 -n ${{ values.namespace }} -- \
  mysql -u ${{ values.username }} -p$MYSQL_PASSWORD ${{ values.databaseName }} -e "SELECT @@read_only;"
```
{% elif values.deploymentType == 'docker-compose' %}
```bash
# 복제본 연결 (읽기 전용)
docker exec -it ${{ values.name }}-replica-0 \
  mysql -u ${{ values.username }} -p$MYSQL_PASSWORD ${{ values.databaseName }} -e "SELECT @@read_only;"
```
{% endif %}
{% endif %}

{% if values.enableProxySQL %}
#### ProxySQL 연결 테스트
{% if values.deploymentType == 'kubernetes' %}
```bash
# ProxySQL을 통한 연결
kubectl port-forward svc/${{ values.name }}-proxysql 6033:6033 -n ${{ values.namespace }} &
mysql -h localhost -P 6033 -u ${{ values.username }} -p$MYSQL_PASSWORD ${{ values.databaseName }}
```
{% elif values.deploymentType == 'docker-compose' %}
```bash
# ProxySQL을 통한 연결
mysql -h localhost -P 6033 -u ${{ values.username }} -p$MYSQL_PASSWORD ${{ values.databaseName }}
```
{% endif %}
{% endif %}

### 4단계: 기본 설정 확인

#### 복제 상태 확인
{% if values.enableReplication %}
```bash
# 마스터 상태 확인
{% if values.deploymentType == 'kubernetes' %}
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW MASTER STATUS\G"

# 복제본 상태 확인
kubectl exec -it ${{ values.name }}-replica-0-0 -n ${{ values.namespace }} -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G"
{% elif values.deploymentType == 'docker-compose' %}
docker exec -it ${{ values.name }}-master \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW MASTER STATUS\G"

docker exec -it ${{ values.name }}-replica-0 \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G"
{% endif %}
```
{% endif %}

#### 데이터베이스 및 테이블 확인
```bash
# 데이터베이스 목록 확인
{% if values.deploymentType == 'kubernetes' %}
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysql -u ${{ values.username }} -p$MYSQL_PASSWORD -e "SHOW DATABASES;"

# 테이블 확인
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysql -u ${{ values.username }} -p$MYSQL_PASSWORD ${{ values.databaseName }} -e "SHOW TABLES;"
{% elif values.deploymentType == 'docker-compose' %}
docker exec -it ${{ values.name }}-master \
  mysql -u ${{ values.username }} -p$MYSQL_PASSWORD -e "SHOW DATABASES;"

docker exec -it ${{ values.name }}-master \
  mysql -u ${{ values.username }} -p$MYSQL_PASSWORD ${{ values.databaseName }} -e "SHOW TABLES;"
{% endif %}
```

## 웹 인터페이스 접근

{% if values.enablePhpMyAdmin %}
### phpMyAdmin
{% if values.deploymentType == 'kubernetes' %}
```bash
# 포트 포워딩
kubectl port-forward svc/${{ values.name }}-phpmyadmin 8080:80 -n ${{ values.namespace }}
```
브라우저에서 http://localhost:8080 접속
{% elif values.deploymentType == 'docker-compose' %}
브라우저에서 http://localhost:8080 접속
{% endif %}

**로그인 정보:**
- 서버: ${{ values.name }}-master (또는 localhost)
- 사용자명: root 또는 ${{ values.username }}
- 비밀번호: 설정한 비밀번호
{% endif %}

{% if values.enableMonitoring %}
### Grafana 대시보드
{% if values.deploymentType == 'kubernetes' %}
```bash
# 포트 포워딩
kubectl port-forward svc/grafana 3000:3000 -n ${{ values.namespace }}
```
{% elif values.deploymentType == 'docker-compose' %}
브라우저에서 http://localhost:3000 접속
{% endif %}

**로그인 정보:**
- 사용자명: admin
- 비밀번호: $GRAFANA_PASSWORD (또는 admin)

### Prometheus
{% if values.deploymentType == 'kubernetes' %}
```bash
# 포트 포워딩
kubectl port-forward svc/prometheus 9090:9090 -n ${{ values.namespace }}
```
{% elif values.deploymentType == 'docker-compose' %}
브라우저에서 http://localhost:9090 접속
{% endif %}
{% endif %}

## 샘플 데이터 생성

기본 테이블과 샘플 데이터를 생성해보겠습니다:

```sql
-- 샘플 테이블 생성
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 샘플 데이터 삽입
INSERT INTO users (username, email) VALUES
('admin', 'admin@example.com'),
('user1', 'user1@example.com'),
('user2', 'user2@example.com');

-- 데이터 확인
SELECT * FROM users;
```

{% if values.enableReplication %}
복제본에서 데이터가 동기화되었는지 확인:
```bash
{% if values.deploymentType == 'kubernetes' %}
kubectl exec -it ${{ values.name }}-replica-0-0 -n ${{ values.namespace }} -- \
  mysql -u ${{ values.username }} -p$MYSQL_PASSWORD ${{ values.databaseName }} -e "SELECT COUNT(*) FROM users;"
{% elif values.deploymentType == 'docker-compose' %}
docker exec -it ${{ values.name }}-replica-0 \
  mysql -u ${{ values.username }} -p$MYSQL_PASSWORD ${{ values.databaseName }} -e "SELECT COUNT(*) FROM users;"
{% endif %}
```
{% endif %}

## 다음 단계

1. **[설정 옵션](configuration.md)** - 상세한 설정 방법 학습
2. **[고가용성](high-availability.md)** - HA 구성 최적화
3. **[백업 및 복구](backup-recovery.md)** - 백업 전략 수립
4. **[모니터링](monitoring.md)** - 모니터링 설정 및 알림 구성
5. **[보안](security.md)** - 보안 강화 방법

## 문제 해결

### 일반적인 문제

#### 연결 실패
```bash
# 네트워크 연결 확인
{% if values.deploymentType == 'kubernetes' %}
kubectl get svc -n ${{ values.namespace }}
kubectl describe pod ${{ values.name }}-master-0 -n ${{ values.namespace }}
{% elif values.deploymentType == 'docker-compose' %}
docker-compose ps
docker-compose logs mysql-master
{% endif %}
```

#### 복제 문제
```bash
# 복제 상태 상세 확인
{% if values.deploymentType == 'kubernetes' %}
kubectl exec -it ${{ values.name }}-replica-0-0 -n ${{ values.namespace }} -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G" | grep -E "(Running|Error|Lag)"
{% elif values.deploymentType == 'docker-compose' %}
docker exec -it ${{ values.name }}-replica-0 \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G" | grep -E "(Running|Error|Lag)"
{% endif %}
```

#### 성능 문제
```bash
# 현재 연결 수 확인
{% if values.deploymentType == 'kubernetes' %}
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW STATUS LIKE 'Threads_connected';"
{% elif values.deploymentType == 'docker-compose' %}
docker exec -it ${{ values.name }}-master \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW STATUS LIKE 'Threads_connected';"
{% endif %}
```

더 자세한 문제 해결 방법은 [문제 해결](troubleshooting.md) 페이지를 참조하세요.

---

**다음**: [설정 옵션](configuration.md)