# 시작하기

PostgreSQL 데이터베이스 클러스터를 빠르게 배포하고 설정하는 방법을 안내합니다.

## 📋 사전 요구사항

### 시스템 요구사항

#### Docker Compose 배포
- Docker Engine 20.10 이상
- Docker Compose v2.0 이상
- 최소 4GB RAM, 8GB 권장
- 최소 20GB 디스크 공간

#### Kubernetes 배포
- Kubernetes 클러스터 v1.20 이상
- kubectl CLI 도구
- Helm 3.0 이상 (Helm 배포 시)
- 최소 8GB RAM, 16GB 권장
- 최소 100GB 디스크 공간

### 필수 도구 설치

```bash
# Docker 및 Docker Compose 설치 (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install docker.io docker-compose-plugin

# kubectl 설치
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Helm 설치
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## 🚀 빠른 배포

### 1단계: 저장소 클론

```bash
git clone <repository-url>
cd postgresql-deployment
```

### 2단계: 환경 변수 설정

```bash
# 환경 변수 파일 생성
cp .env.example .env

# 필수 환경 변수 설정
export POSTGRES_DB="myapp"
export POSTGRES_USER="appuser"
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export POSTGRES_REPLICATION_PASSWORD=$(openssl rand -base64 32)

# 환경 변수 파일에 저장
cat > .env << EOF
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_REPLICATION_PASSWORD=${POSTGRES_REPLICATION_PASSWORD}
EOF
```

### 3단계: 배포 방식 선택

#### Option A: Docker Compose (개발/테스트)

```bash
# 서비스 시작
docker-compose up -d

# 상태 확인
docker-compose ps
docker-compose logs -f postgresql-master

# 연결 테스트
docker-compose exec postgresql-master psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c "SELECT version();"
```

#### Option B: Kubernetes (프로덕션)

```bash
# 네임스페이스 생성
kubectl create namespace database

# 시크릿 생성
kubectl create secret generic postgresql-credentials \
  --from-literal=postgres-password=${POSTGRES_PASSWORD} \
  --from-literal=replication-password=${POSTGRES_REPLICATION_PASSWORD} \
  --from-literal=pgadmin-password=$(openssl rand -base64 32) \
  -n database

# 배포 실행
kubectl apply -f k8s/ -n database

# 상태 확인
kubectl get pods -n database
kubectl logs -f statefulset/postgresql-master -n database
```

#### Option C: Helm Chart (고급 설정)

```bash
# Helm 차트 배포
helm install my-postgres ./helm-chart \
  --namespace database \
  --create-namespace \
  --set postgresql.auth.postgresPassword=${POSTGRES_PASSWORD} \
  --set postgresql.auth.replicationPassword=${POSTGRES_REPLICATION_PASSWORD}

# 상태 확인
helm status my-postgres -n database
kubectl get pods -n database
```

## 🔧 초기 설정

### 데이터베이스 연결 확인

#### Docker Compose 환경

```bash
# 마스터 연결 테스트
docker-compose exec postgresql-master psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}

# 복제본 연결 테스트 (복제 활성화 시)
docker-compose exec postgresql-replica-0 psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}
```

#### Kubernetes 환경

```bash
# 마스터 연결 테스트
kubectl exec -it postgresql-master-0 -n database -- \
  psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}

# 복제본 연결 테스트 (복제 활성화 시)
kubectl exec -it postgresql-replica-0-0 -n database -- \
  psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}
```

### 애플리케이션 연결 설정

#### 연결 문자열

```bash
# 마스터 (읽기/쓰기)
postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgresql-master:5432/${POSTGRES_DB}

# 복제본 (읽기 전용)
postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgresql-replica:5432/${POSTGRES_DB}

# PgBouncer (연결 풀링)
postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgresql-pgbouncer:5432/${POSTGRES_DB}
```

#### 애플리케이션 설정 예시

**Spring Boot (application.yml)**
```yaml
spring:
  datasource:
    # 쓰기 데이터소스 (마스터)
    primary:
      url: jdbc:postgresql://postgresql-master:5432/myapp
      username: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}
    # 읽기 데이터소스 (복제본)
    readonly:
      url: jdbc:postgresql://postgresql-replica:5432/myapp
      username: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}
```

**Node.js (환경 변수)**
```bash
# 쓰기 연결
DATABASE_WRITE_URL=postgresql://appuser:password@postgresql-master:5432/myapp

# 읽기 연결
DATABASE_READ_URL=postgresql://appuser:password@postgresql-replica:5432/myapp
```

**Python (Django settings.py)**
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'myapp',
        'USER': 'appuser',
        'PASSWORD': 'password',
        'HOST': 'postgresql-master',
        'PORT': '5432',
    },
    'readonly': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'myapp',
        'USER': 'appuser',
        'PASSWORD': 'password',
        'HOST': 'postgresql-replica',
        'PORT': '5432',
    }
}
```

## 📊 웹 인터페이스 접근

### pgAdmin 웹 관리 도구

#### Docker Compose 환경
```bash
# pgAdmin 접근 (포트 포워딩)
open http://localhost:8080

# 로그인 정보
# 이메일: admin@postgresql.local
# 비밀번호: 배포 시 설정한 비밀번호
```

#### Kubernetes 환경
```bash
# 포트 포워딩
kubectl port-forward svc/postgresql-pgadmin 8080:80 -n database

# 브라우저에서 접근
open http://localhost:8080
```

### 모니터링 대시보드

#### Prometheus 메트릭
```bash
# 메트릭 엔드포인트 확인
curl http://postgresql-master:9187/metrics

# Kubernetes 환경에서 포트 포워딩
kubectl port-forward svc/postgresql-master 9187:9187 -n database
curl http://localhost:9187/metrics
```

## 🔍 상태 확인 및 검증

### 서비스 상태 확인

#### Docker Compose
```bash
# 모든 서비스 상태
docker-compose ps

# 로그 확인
docker-compose logs postgresql-master
docker-compose logs postgresql-replica-0

# 리소스 사용량
docker stats
```

#### Kubernetes
```bash
# Pod 상태 확인
kubectl get pods -n database

# 서비스 상태 확인
kubectl get svc -n database

# 상세 정보 확인
kubectl describe statefulset postgresql-master -n database

# 로그 확인
kubectl logs -f postgresql-master-0 -n database
```

### 데이터베이스 상태 확인

```sql
-- 버전 확인
SELECT version();

-- 데이터베이스 목록
\l

-- 연결 정보
SELECT * FROM pg_stat_activity;

-- 복제 상태 (마스터에서 실행)
SELECT * FROM pg_stat_replication;

-- 복제 지연 확인 (복제본에서 실행)
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));
```

### 성능 테스트

```bash
# pgbench를 사용한 성능 테스트
kubectl exec -it postgresql-master-0 -n database -- \
  pgbench -i -s 10 ${POSTGRES_DB}

kubectl exec -it postgresql-master-0 -n database -- \
  pgbench -c 10 -j 2 -t 1000 ${POSTGRES_DB}
```

## 🛠️ 기본 운영 작업

### 백업 실행

```bash
# 수동 백업 (Docker Compose)
docker-compose exec postgresql-master pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup.sql

# 수동 백업 (Kubernetes)
kubectl exec postgresql-master-0 -n database -- \
  pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup.sql
```

### 사용자 및 권한 관리

```sql
-- 새 사용자 생성
CREATE USER newuser WITH PASSWORD 'securepassword';

-- 데이터베이스 권한 부여
GRANT ALL PRIVILEGES ON DATABASE myapp TO newuser;

-- 테이블 권한 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO newuser;

-- 읽기 전용 사용자 생성
CREATE USER readonly WITH PASSWORD 'readonlypassword';
GRANT CONNECT ON DATABASE myapp TO readonly;
GRANT USAGE ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
```

### 설정 변경

```bash
# 설정 파일 편집 (Kubernetes)
kubectl edit configmap postgresql-config -n database

# 설정 적용을 위한 재시작
kubectl rollout restart statefulset postgresql-master -n database
```

## 🚨 문제 해결

### 일반적인 문제

#### 1. 연결 실패
```bash
# 네트워크 연결 확인
telnet postgresql-master 5432

# DNS 해상도 확인
nslookup postgresql-master

# 방화벽 확인
iptables -L | grep 5432
```

#### 2. 권한 문제
```bash
# 파일 권한 확인
ls -la /var/lib/postgresql/data/

# 소유자 변경
chown -R postgres:postgres /var/lib/postgresql/data/
```

#### 3. 디스크 공간 부족
```bash
# 디스크 사용량 확인
df -h

# PostgreSQL 데이터 크기 확인
du -sh /var/lib/postgresql/data/
```

### 로그 분석

```bash
# PostgreSQL 로그 확인
tail -f /var/lib/postgresql/data/log/postgresql-*.log

# Kubernetes 환경에서 로그 확인
kubectl logs -f postgresql-master-0 -n database

# 특정 에러 검색
kubectl logs postgresql-master-0 -n database | grep ERROR
```

## 📚 다음 단계

설치가 완료되면 다음 문서들을 참고하여 시스템을 최적화하세요:

- **[Configuration](configuration.md)** - 상세 설정 옵션
- **[High Availability](high-availability.md)** - 고가용성 구성
- **[Backup & Recovery](backup-recovery.md)** - 백업 및 복구 전략
- **[Monitoring](monitoring.md)** - 모니터링 설정
- **[Security](security.md)** - 보안 강화 방법
- **[Best Practices](best-practices.md)** - 운영 모범 사례

## 🤝 지원

문제가 발생하면 다음을 통해 도움을 받으세요:

- **문서 확인**: 관련 문서 섹션 참조
- **로그 분석**: 에러 로그 확인
- **커뮤니티**: GitHub Issues 또는 Slack 채널
- **전문 지원**: 엔터프라이즈 지원 문의

---

**다음**: [Configuration 가이드](configuration.md)로 이동하여 상세 설정을 확인하세요.