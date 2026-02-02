# ${{ values.name | title }} MySQL 클러스터

${{ values.description }}

## 📋 개요

이 저장소는 고가용성 MySQL 데이터베이스 클러스터의 배포 및 관리를 위한 설정 파일들을 포함합니다.

### 🎯 주요 기능

- **고가용성**: 마스터/슬레이브 복제 구성
- **자동 백업**: 정기적인 백업 및 바이너리 로그 아카이빙
- **모니터링**: Prometheus 메트릭 및 Grafana 대시보드
- **보안**: SSL/TLS 암호화 및 네트워크 정책
- **확장성**: 읽기 복제본을 통한 읽기 성능 향상

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───►│   ProxySQL      │───►│     MySQL       │
│   (Client)      │    │ (Load Balancer) │    │    Master       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼ (Replication)
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Monitoring    │    │     MySQL       │
                       │ (Prometheus)    │    │    Replica 1    │
                       └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐             ▼ (Replication)
                       │     Backup      │    ┌─────────────────┐
                       │  (mysqldump +   │    │     MySQL       │
                       │   binlog)       │    │    Replica 2    │
                       └─────────────────┘    └─────────────────┘
```

## 🚀 빠른 시작

### 전제 조건

{% if values.deploymentType == 'kubernetes' %}
- Kubernetes 클러스터 (v1.20+)
- kubectl CLI 도구
- Helm (선택사항)
{% elif values.deploymentType == 'docker-compose' %}
- Docker Engine (v20.10+)
- Docker Compose (v2.0+)
{% endif %}
- 충분한 스토리지 공간 (최소 {{ values.masterResources.storage }})

### 1. 환경 변수 설정

```bash
# 데이터베이스 설정
export MYSQL_DATABASE=${{ values.databaseName }}
export MYSQL_USER=${{ values.username }}
export MYSQL_PASSWORD=$(openssl rand -base64 32)
export MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)

# 복제 사용자 비밀번호
export MYSQL_REPLICATION_PASSWORD=$(openssl rand -base64 32)

# 백업 설정
{% if values.backupStorage == 's3' %}
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export S3_BUCKET=your-backup-bucket
{% elif values.backupStorage == 'gcs' %}
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export GCS_BUCKET=your-backup-bucket
{% endif %}
```

### 2. 배포 실행

{% if values.deploymentType == 'docker-compose' %}
```bash
# Docker Compose로 배포
docker-compose up -d

# 상태 확인
docker-compose ps
docker-compose logs -f mysql-master
```
{% elif values.deploymentType == 'kubernetes' %}
```bash
# Kubernetes 네임스페이스 생성
kubectl create namespace ${{ values.namespace }}

# 시크릿 생성
kubectl create secret generic mysql-credentials \
  --from-literal=mysql-root-password=$MYSQL_ROOT_PASSWORD \
  --from-literal=mysql-password=$MYSQL_PASSWORD \
  --from-literal=replication-password=$MYSQL_REPLICATION_PASSWORD \
  -n ${{ values.namespace }}

# 배포 실행
kubectl apply -f k8s/ -n ${{ values.namespace }}

# 상태 확인
kubectl get pods -n ${{ values.namespace }}
kubectl logs -f statefulset/${{ values.name }}-master -n ${{ values.namespace }}
```
{% elif values.deploymentType == 'helm' %}
```bash
# Helm으로 배포
helm install ${{ values.name }} ./helm-chart \
  --namespace ${{ values.namespace }} \
  --create-namespace \
  --set mysql.auth.rootPassword=$MYSQL_ROOT_PASSWORD \
  --set mysql.auth.password=$MYSQL_PASSWORD \
  --set mysql.auth.replicationPassword=$MYSQL_REPLICATION_PASSWORD

# 상태 확인
helm status ${{ values.name }} -n ${{ values.namespace }}
kubectl get pods -n ${{ values.namespace }}
```
{% endif %}

## 🔧 설정

### MySQL 설정

- **버전**: MySQL ${{ values.mysqlVersion }}
- **데이터베이스**: ${{ values.databaseName }}
- **사용자**: ${{ values.username }}
- **문자 집합**: ${{ values.charset }}
- **콜레이션**: ${{ values.collation }}
- **최대 연결**: ${{ values.maxConnections }}
- **SSL**: {% if values.enableSSL %}활성화{% else %}비활성화{% endif %}

### 고가용성 설정

{% if values.enableReplication %}
- **복제 모드**: ${{ values.replicationMode | title }}
- **복제본 수**: ${{ values.replicaCount }}개
{% endif %}
{% if values.enableProxySQL %}
- **로드 밸런서**: ProxySQL 활성화
{% endif %}

### 백업 설정

{% if values.enableBackup %}
- **백업 스케줄**: ${{ values.backupSchedule }}
- **보존 기간**: ${{ values.backupRetention }}일
- **저장소**: ${{ values.backupStorage | title }}
{% if values.enableBinlogBackup %}
- **바이너리 로그 백업**: 활성화 (PITR 지원)
{% endif %}
{% endif %}

## 📊 모니터링

{% if values.enableMonitoring %}
### Prometheus 메트릭

MySQL 메트릭은 다음 엔드포인트에서 확인할 수 있습니다:

```
http://${{ values.name }}-exporter.${{ values.namespace }}.svc.cluster.local:9104/metrics
```

### Grafana 대시보드

사전 구성된 Grafana 대시보드를 사용하여 다음 메트릭을 모니터링할 수 있습니다:

- 데이터베이스 연결 수
- 쿼리 성능 통계
- 복제 지연 시간
- 디스크 사용량
- 백업 상태

### 주요 메트릭

- `mysql_up`: MySQL 서버 상태
- `mysql_global_status_connections`: 총 연결 수
- `mysql_global_status_threads_connected`: 현재 연결된 스레드 수
- `mysql_global_status_queries`: 실행된 쿼리 수
- `mysql_slave_lag_seconds`: 복제 지연 시간
{% endif %}

{% if values.enablePhpMyAdmin %}
### phpMyAdmin 웹 인터페이스

phpMyAdmin은 다음 주소에서 접근할 수 있습니다:

```
http://phpmyadmin-${{ values.name }}.${{ values.namespace }}.svc.cluster.local
```

기본 로그인 정보:
- 사용자명: root 또는 ${{ values.username }}
- 비밀번호: 배포 시 생성된 비밀번호 확인
{% endif %}

## 🔒 보안

### 네트워크 보안

{% if values.enableNetworkPolicies %}
- **네트워크 정책**: Kubernetes 네트워크 정책으로 트래픽 제한
{% endif %}
{% if values.enableTLS %}
- **내부 TLS**: 클러스터 내부 통신 암호화
{% endif %}
- **SSL 연결**: {% if values.enableSSL %}클라이언트 연결 암호화{% else %}비활성화{% endif %}

### 인증 및 권한

- **비밀번호 복잡성**: ${{ values.passwordComplexity | title }} 수준
- **역할 기반 접근 제어**: MySQL 내장 권한 시스템 사용
- **연결 제한**: IP 기반 접근 제어

## 💾 백업 및 복구

{% if values.enableBackup %}
### 자동 백업

백업은 다음 스케줄에 따라 자동으로 실행됩니다:

- **스케줄**: ${{ values.backupSchedule }} (Cron 형식)
- **보존 기간**: ${{ values.backupRetention }}일
- **저장 위치**: ${{ values.backupStorage | title }}

### 수동 백업

```bash
# 전체 데이터베이스 백업
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysqldump -u root -p$MYSQL_ROOT_PASSWORD --all-databases > backup.sql

# 특정 데이터베이스 백업
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysqldump -u root -p$MYSQL_ROOT_PASSWORD ${{ values.databaseName }} > database_backup.sql
```

### 복구 절차

```bash
# 백업에서 복구
kubectl exec -i ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD < backup.sql
```

{% if values.enableBinlogBackup %}
### Point-in-Time Recovery (PITR)

바이너리 로그 백업이 활성화되어 있어 특정 시점으로 복구가 가능합니다:

```bash
# 특정 시점으로 복구 (예: 2024-01-01 12:00:00)
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysqlbinlog --start-datetime="2024-01-01 12:00:00" /var/lib/mysql/binlog.* | \
  mysql -u root -p$MYSQL_ROOT_PASSWORD
```
{% endif %}
{% endif %}

## 🔧 운영 가이드

### 연결 정보

#### 마스터 (읽기/쓰기)
```
Host: ${{ values.name }}-master.${{ values.namespace }}.svc.cluster.local
Port: 3306
Database: ${{ values.databaseName }}
Username: ${{ values.username }}
```

{% if values.enableReplication %}
#### 복제본 (읽기 전용)
{% for i in range(values.replicaCount) %}
```
Host: ${{ values.name }}-replica-{{ i }}.${{ values.namespace }}.svc.cluster.local
Port: 3306
Database: ${{ values.databaseName }}
Username: ${{ values.username }}
```
{% endfor %}
{% endif %}

{% if values.enableProxySQL %}
#### ProxySQL (로드 밸런서)
```
Host: ${{ values.name }}-proxysql.${{ values.namespace }}.svc.cluster.local
Port: 6033
Database: ${{ values.databaseName }}
Username: ${{ values.username }}
```
{% endif %}

### 일반적인 작업

#### 데이터베이스 연결 테스트

```bash
# 마스터 연결 테스트
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysql -u ${{ values.username }} -p$MYSQL_PASSWORD -e "SELECT VERSION();"

{% if values.enableReplication %}
# 복제본 연결 테스트
kubectl exec -it ${{ values.name }}-replica-0-0 -n ${{ values.namespace }} -- \
  mysql -u ${{ values.username }} -p$MYSQL_PASSWORD -e "SELECT VERSION();"
{% endif %}
```

#### 복제 상태 확인

{% if values.enableReplication %}
```bash
# 마스터에서 복제 상태 확인
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW MASTER STATUS;"

# 복제본에서 복제 지연 확인
kubectl exec -it ${{ values.name }}-replica-0-0 -n ${{ values.namespace }} -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G"
```
{% endif %}

#### 성능 모니터링

```bash
# 활성 연결 수 확인
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW STATUS LIKE 'Threads_connected';"

{% if values.enableSlowQueryLog %}
# 슬로우 쿼리 확인
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;"
{% endif %}
```

## 🚨 문제 해결

### 일반적인 문제

#### 1. 연결 실패
```bash
# 포트 포워딩으로 로컬 연결 테스트
kubectl port-forward svc/${{ values.name }}-master 3306:3306 -n ${{ values.namespace }}
mysql -h localhost -u ${{ values.username }} -p$MYSQL_PASSWORD ${{ values.databaseName }}
```

#### 2. 복제 지연
{% if values.enableReplication %}
```bash
# 복제 지연 확인
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW PROCESSLIST;"
```
{% endif %}

#### 3. 디스크 공간 부족
```bash
# 디스크 사용량 확인
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- df -h

# 데이터베이스 크기 확인
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables GROUP BY table_schema;"
```

### 로그 확인

```bash
# MySQL 로그 확인
kubectl logs -f ${{ values.name }}-master-0 -n ${{ values.namespace }}

# 백업 작업 로그 확인
kubectl logs -f job/${{ values.name }}-backup -n ${{ values.namespace }}
```

## 📚 추가 리소스

- [MySQL 공식 문서](https://dev.mysql.com/doc/)
- [MySQL 복제 가이드](https://dev.mysql.com/doc/refman/8.0/en/replication.html)
- [MySQL 성능 튜닝](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)
- [MySQL 백업 및 복구](https://dev.mysql.com/doc/refman/8.0/en/backup-and-recovery.html)

## 🤝 지원

문제가 발생하거나 개선 사항이 있다면 다음을 통해 연락해 주세요:

- **이슈 리포트**: GitHub Issues
- **기능 요청**: Feature Request
- **문서 개선**: Pull Request

---

**소유자**: ${{ values.owner }}  
**생성일**: {{ "now" | date("YYYY-MM-DD") }}  
**MySQL 버전**: ${{ values.mysqlVersion }}