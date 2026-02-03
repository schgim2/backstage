# Getting Started

이 가이드는 ${{ values.name }} 서비스를 로컬에서 개발하고 배포하는 방법을 설명합니다.

## 사전 요구사항

### 필수 도구
- Docker 및 Docker Compose
{% if values.deploymentType == "kubernetes" or values.deploymentType == "both" %}
- kubectl (Kubernetes CLI)
- Helm (선택사항)
{% endif %}
- Git

### 권장 도구
- Visual Studio Code
- NGINX 설정 문법 하이라이터

## 로컬 개발 환경 설정

### 1. 저장소 클론

```bash
git clone ${{ values.owner }}/${{ values.repo }}.git
cd ${{ values.repo }}
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 편집하여 환경에 맞는 값을 설정하세요:

```bash
# 기본 설정
SERVICE_NAME=${{ values.name }}
SERVICE_PORT=${{ values.port }}
NGINX_VERSION=${{ values.nginxVersion }}

{% if values.domain %}
# 도메인 설정
DOMAIN=${{ values.domain }}
{% if values.additionalDomains %}
ADDITIONAL_DOMAINS=${{ values.additionalDomains | join(',') }}
{% endif %}
{% endif %}

{% if values.enableSSL %}
# SSL 설정
SSL_ENABLED=true
SSL_PROVIDER=${{ values.sslProvider }}
{% endif %}

{% if values.enableMonitoring %}
# 모니터링 설정
MONITORING_ENABLED=true
{% endif %}
```

### 3. Docker Compose로 로컬 실행

```bash
# 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f nginx

# 서비스 상태 확인
docker-compose ps
```

### 4. 서비스 접속 확인

{% if values.enableSSL and values.domain %}
브라우저에서 `https://${{ values.domain }}`로 접속하여 서비스가 정상 동작하는지 확인하세요.
{% else %}
브라우저에서 `http://localhost:${{ values.port }}`로 접속하여 서비스가 정상 동작하는지 확인하세요.
{% endif %}

{% if values.enableMonitoring %}
### 5. 모니터링 확인

Prometheus 메트릭은 다음 URL에서 확인할 수 있습니다:
- 메트릭 엔드포인트: `http://localhost:9114/metrics`
{% endif %}

## 프로젝트 구조

```
${{ values.repo }}/
├── config/                 # NGINX 설정 파일
│   ├── nginx.conf          # 메인 NGINX 설정
│   └── default.conf        # 기본 사이트 설정
├── html/                   # 웹 콘텐츠 (정적 파일)
│   ├── index.html
│   └── errors/             # 커스텀 에러 페이지
├── k8s/                    # Kubernetes 매니페스트
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   └── configmap.yaml
├── docker-compose.yml      # Docker Compose 설정
├── Dockerfile             # Docker 이미지 빌드 설정
├── .env.example           # 환경 변수 템플릿
└── README.md              # 프로젝트 개요
```

## 개발 워크플로우

### 1. 설정 변경

NGINX 설정을 변경하려면:

1. `config/nginx.conf` 또는 `config/default.conf` 파일을 편집
2. 설정 문법 검증: `docker-compose exec nginx nginx -t`
3. 설정 리로드: `docker-compose exec nginx nginx -s reload`

### 2. 콘텐츠 업데이트

{% if values.serviceType == "static-site" %}
정적 콘텐츠를 업데이트하려면:

1. `html/` 디렉토리의 파일을 편집
2. 변경사항이 즉시 반영됨 (볼륨 마운트)
{% elif values.serviceType == "reverse-proxy" %}
백엔드 서비스 설정을 변경하려면:

1. `config/default.conf`의 upstream 설정을 편집
2. NGINX 설정 리로드
{% endif %}

### 3. 로그 모니터링

```bash
# 실시간 로그 확인
docker-compose logs -f nginx

# 접근 로그만 확인
docker-compose exec nginx tail -f /var/log/nginx/access.log

# 에러 로그만 확인
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

## 다음 단계

- [Configuration](configuration.md) - 상세 설정 옵션 알아보기
- [Deployment](deployment.md) - 프로덕션 배포 가이드
- [Monitoring](monitoring.md) - 모니터링 설정하기
- [Security](security.md) - 보안 강화 방법