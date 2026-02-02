# ${{ values.name | title }} PostgreSQL 클러스터

${{ values.description }}

## 📋 개요

이 저장소는 고가용성 PostgreSQL 데이터베이스 클러스터의 배포 및 관리를 위한 설정 파일들을 포함합니다.

### 🎯 주요 기능

- **고가용성**: 마스터/슬레이브 복제 구성
- **자동 백업**: 정기적인 백업 및 WAL 아카이빙
- **모니터링**: Prometheus 메트릭 및 Grafana 대시보드
- **보안**: SSL/TLS 암호화 및 네트워크 정책
- **확장성**: 읽기 복제본을 통한 읽기 성능 향상

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───►│   PgBouncer     │───►│  PostgreSQL     │
│   (Client)      │    │ (Connection     │    │   Master        │
└─────────────────┘    │  Pooling)       │    └─────────────────┘
                       └─────────────────┘             │
                                                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Monitoring    │    │  PostgreSQL     │
                       │ (Prometheus)    │    │   Replica       │
                       └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐             ▼
                       │     Backup      │    ┌─────────────────┐
                       │   (pg_dump +    │    │  PostgreSQL     │
                       │   WAL Archive)  │    │   Replica       │
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
export POSTGRES_DB=${{ values.databaseName }}
export POSTGRES_USER=${{ values.username }}
export POSTGRES_PASSWORD=$(openssl rand -base64 32)

# 복제 사용자 비밀번호
export POSTGRES_REPLICATION_PASSWORD=$(openssl rand -base64 32)

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
docker-compose logs -f postgresql-master
```
{% elif values.deploymentType == 'kubernetes' %}
```bash
# Kubernetes 네임스페이스 생성
kubectl create namespace ${{ values.namespace }}

# 시크릿 생성
kubectl create secret generic postgresql-credentials \
  --from-literal=postgres-password=$POSTGRES_PASSWORD \
  --from-literal=replication-password=$POSTGRES_REPLICATION_PASSWORD \
  -n ${{ values.namespace }}

# 배포 실행
kubectl apply -f k8s/ -n ${{ values.namespace }}

# 상태 확인
kubectl get pods -n ${{ values.namespace }}
kubectl logs -f deployment/${{ values.name }}-master -n ${{ values.namespace }}
```
{% elif values.deploymentType == 'helm' %}
```bash
# Helm으로 배포
helm install ${{ values.name }} ./helm-chart \
  --namespace ${{ values.namespace }} \
  --create-namespace \
  --set postgresql.auth.postgresPassword=$POSTGRES_PASSWORD \
  --set postgresql.auth.replicationPassword=$POSTGRES_REPLICATION_PASSWORD

# 상태 확인
helm status ${{ values.name }} -n ${{ values.namespace }}
kubectl get pods -n ${{ values.namespace }}
```
{% endif %}

## 🔧 설정

### PostgreSQL 설정

- **버전**: PostgreSQL ${{ values.postgresVersion }}
- **데이터베이스**: ${{ values.databaseName }}
- **사용자**: ${{ values.username }}
- **최대 연결**: ${{ values.maxConnections }}
- **SSL**: {% if values.enableSSL %}활성화{% else %}비활성화{% endif %}

### 고가용성 설정

{% if values.enableReplication %}
- **복제 모드**: {% if values.synchronousReplication %}동기 복제{% else %}비동기 복제{% endif %}
- **복제본 수**: ${{ values.replicaCount }}개
{% endif %}
{% if values.enablePgBouncer %}
- **연결 풀링**: PgBouncer 활성화
{% endif %}

### 백업 설정

{% if values.enableBackup %}
- **백업 스케줄**: ${{ values.backupSchedule }}
- **보존 기간**: ${{ values.backupRetention }}일
- **저장소**: ${{ values.backupStorage | title }}
{% if values.enableWALArchiving %}
- **WAL 아카이빙**: 활성화 (PITR 지원)
{% endif %}
{% endif %}

## 📊 모니터링

{% if values.enableMonitoring %}
### Prometheus 메트릭

PostgreSQL 메트릭은 다음 엔드포인트에서 확인할 수 있습니다:

```
http://${{ values.name }}-exporter.${{ values.namespace }}.svc.cluster.local:9187/metrics
```

### Grafana 대시보드

사전 구성된 Grafana 대시보드를 사용하여 다음 메트릭을 모니터링할 수 있습니다:

- 데이터베이스 연결 수
- 쿼리 성능 통계
- 복제 지연 시간
- 디스크 사용량
- 백업 상태

### 주요 메트릭

- `pg_up`: PostgreSQL 서버 상태
- `pg_stat_database_tup_returned`: 반환된 행 수
- `pg_stat_database_tup_fetched`: 가져온 행 수
- `pg_stat_database_xact_commit`: 커밋된 트랜잭션 수
- `pg_stat_replication_lag`: 복제 지연 시간
{% endif %}

{% if values.enablePgAdmin %}
### pgAdmin 웹 인터페이스

pgAdmin은 다음 주소에서 접근할 수 있습니다:

```
http://pgadmin.${{ values.namespace }}.svc.cluster.local
```

기본 로그인 정보:
- 이메일: admin@${{ values.name }}.local
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
- **역할 기반 접근 제어**: PostgreSQL 내장 RBAC 사용
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
  pg_dump -U ${{ values.username }} -d ${{ values.databaseName }} > backup.sql

# 특정 테이블 백업
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  pg_dump -U ${{ values.username }} -d ${{ values.databaseName }} -t table_name > table_backup.sql
```

### 복구 절차

```bash
# 백업에서 복구
kubectl exec -i ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  psql -U ${{ values.username }} -d ${{ values.databaseName }} < backup.sql
```

{% if values.enableWALArchiving %}
### Point-in-Time Recovery (PITR)

WAL 아카이빙이 활성화되어 있어 특정 시점으로 복구가 가능합니다:

```bash
# 특정 시점으로 복구 (예: 2024-01-01 12:00:00)
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  pg_ctl stop -D /var/lib/postgresql/data

# recovery.conf 파일 생성 후 재시작
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  pg_ctl start -D /var/lib/postgresql/data
```
{% endif %}
{% endif %}

## 🔧 운영 가이드

### 연결 정보

#### 마스터 (읽기/쓰기)
```
Host: ${{ values.name }}-master.${{ values.namespace }}.svc.cluster.local
Port: 5432
Database: ${{ values.databaseName }}
Username: ${{ values.username }}
```

{% if values.enableReplication %}
#### 복제본 (읽기 전용)
{% for i in range(values.replicaCount) %}
```
Host: ${{ values.name }}-replica-{{ i }}.${{ values.namespace }}.svc.cluster.local
Port: 5432
Database: ${{ values.databaseName }}
Username: ${{ values.username }}
```
{% endfor %}
{% endif %}

### 일반적인 작업

#### 데이터베이스 연결 테스트

```bash
# 마스터 연결 테스트
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  psql -U ${{ values.username }} -d ${{ values.databaseName }} -c "SELECT version();"

{% if values.enableReplication %}
# 복제본 연결 테스트
kubectl exec -it ${{ values.name }}-replica-0 -n ${{ values.namespace }} -- \
  psql -U ${{ values.username }} -d ${{ values.databaseName }} -c "SELECT version();"
{% endif %}
```

#### 복제 상태 확인

{% if values.enableReplication %}
```bash
# 마스터에서 복제 상태 확인
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# 복제본에서 복제 지연 확인
kubectl exec -it ${{ values.name }}-replica-0 -n ${{ values.namespace }} -- \
  psql -U postgres -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));"
```
{% endif %}

#### 성능 모니터링

```bash
# 활성 연결 수 확인
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 느린 쿼리 확인
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  psql -U postgres -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

## 🚨 문제 해결

### 일반적인 문제

#### 1. 연결 실패
```bash
# 포트 포워딩으로 로컬 연결 테스트
kubectl port-forward svc/${{ values.name }}-master 5432:5432 -n ${{ values.namespace }}
psql -h localhost -U ${{ values.username }} -d ${{ values.databaseName }}
```

#### 2. 복제 지연
{% if values.enableReplication %}
```bash
# 복제 지연 확인
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  psql -U postgres -c "SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn FROM pg_stat_replication;"
```
{% endif %}

#### 3. 디스크 공간 부족
```bash
# 디스크 사용량 확인
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- df -h

# 데이터베이스 크기 확인
kubectl exec -it ${{ values.name }}-master-0 -n ${{ values.namespace }} -- \
  psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('${{ values.databaseName }}'));"
```

### 로그 확인

```bash
# PostgreSQL 로그 확인
kubectl logs -f ${{ values.name }}-master-0 -n ${{ values.namespace }}

# 백업 작업 로그 확인
kubectl logs -f job/${{ values.name }}-backup -n ${{ values.namespace }}
```

## 📚 추가 리소스

- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [PostgreSQL 고가용성 가이드](https://www.postgresql.org/docs/current/high-availability.html)
- [pg_stat_statements 확장](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [PostgreSQL 백업 및 복구](https://www.postgresql.org/docs/current/backup.html)

## 🤝 지원

문제가 발생하거나 개선 사항이 있다면 다음을 통해 연락해 주세요:

- **이슈 리포트**: GitHub Issues
- **기능 요청**: Feature Request
- **문서 개선**: Pull Request

---

**소유자**: ${{ values.owner }}  
**생성일**: {{ "now" | date("YYYY-MM-DD") }}  
**PostgreSQL 버전**: ${{ values.postgresVersion }}