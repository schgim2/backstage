# 시작하기

Redis 클러스터 템플릿을 사용하여 첫 번째 클러스터를 배포하는 방법을 안내합니다.

## 사전 요구사항

### Docker Compose 배포
- Docker 20.10+
- Docker Compose 2.0+
- 최소 4GB RAM

### Kubernetes 배포
- Kubernetes 1.20+
- kubectl 설치 및 구성
- Helm 3.0+ (선택사항)

## 템플릿 사용하기

### 1. Backstage에서 템플릿 선택

1. Backstage 대시보드에서 "Create Component" 클릭
2. "Redis Cluster Deployment" 템플릿 선택
3. 프로젝트 정보 입력:
   - **Name**: 클러스터 이름 (예: `my-redis-cluster`)
   - **Description**: 클러스터 설명
   - **Repository**: Git 저장소 위치

### 2. 클러스터 구성

#### 기본 설정
- **Cluster Size**: 클러스터 노드 수 (3, 5, 7 중 선택)
- **Memory Limit**: 각 노드의 메모리 제한 (512MB, 1GB, 2GB, 4GB)
- **Persistence**: 데이터 영속성 활성화 여부

#### 보안 설정
- **Enable Auth**: Redis 인증 활성화
- **Password**: Redis 접속 비밀번호 (자동 생성 가능)
- **TLS**: TLS 암호화 활성화 여부

#### 모니터링 설정
- **Enable Monitoring**: Prometheus 메트릭 수집 활성화
- **Enable Grafana**: Grafana 대시보드 포함
- **Alert Rules**: 알림 규칙 포함 여부

### 3. 배포 환경 선택

#### Docker Compose (개발/테스트)
```yaml
deployment_type: docker-compose
environment: development
```

#### Kubernetes (프로덕션)
```yaml
deployment_type: kubernetes
environment: production
namespace: redis-cluster
```

## 배포 실행

### Docker Compose 배포

생성된 프로젝트 디렉토리에서:

```bash
# 클러스터 시작
docker-compose up -d

# 클러스터 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f redis-master
```

### Kubernetes 배포

```bash
# 네임스페이스 생성
kubectl create namespace redis-cluster

# 설정 적용
kubectl apply -f k8s/

# 상태 확인
kubectl get pods -n redis-cluster
kubectl get services -n redis-cluster
```

## 연결 테스트

### Redis CLI를 사용한 테스트

```bash
# Docker Compose 환경
docker exec -it redis-master redis-cli

# Kubernetes 환경
kubectl exec -it redis-master-0 -n redis-cluster -- redis-cli
```

### 기본 명령어 테스트

```redis
# 인증 (활성화된 경우)
AUTH your-password

# 데이터 저장/조회
SET test-key "Hello Redis"
GET test-key

# 클러스터 정보 확인
INFO replication
SENTINEL masters
```

## 모니터링 접속

### Grafana 대시보드

- **URL**: http://localhost:3000 (Docker Compose) 또는 Ingress URL (Kubernetes)
- **기본 계정**: admin / admin
- **대시보드**: Redis Cluster Overview

### Prometheus 메트릭

- **URL**: http://localhost:9090 (Docker Compose) 또는 Ingress URL (Kubernetes)
- **메트릭**: `redis_*` 접두사로 시작하는 메트릭들

## 다음 단계

- [구성 옵션](configuration.md) - 상세한 설정 방법
- [배포 가이드](deployment.md) - 프로덕션 배포 베스트 프랙티스
- [모니터링 설정](monitoring.md) - 모니터링 및 알림 구성