# Deployment Guide

이 가이드는 ${{ values.name }} 서비스를 다양한 환경에 배포하는 방법을 설명합니다.

## 배포 옵션

{% if values.deploymentType == "docker-compose" or values.deploymentType == "both" %}
## Docker Compose 배포

### 로컬 개발 환경

```bash
# 환경 변수 설정
cp .env.example .env
vim .env

# 서비스 시작
docker-compose up -d

# 상태 확인
docker-compose ps
docker-compose logs -f nginx
```

### 프로덕션 환경

프로덕션용 `docker-compose.prod.yml` 파일:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:${{ values.nginxVersion }}
    container_name: ${{ values.name }}
    restart: unless-stopped
    ports:
      - "${{ values.port }}:80"
      {% if values.enableSSL %}
      - "443:443"
      {% endif %}
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/default.conf:/etc/nginx/conf.d/default.conf:ro
      - ./html:/usr/share/nginx/html:ro
      {% if values.enableSSL %}
      - ./ssl:/etc/nginx/ssl:ro
      {% endif %}
      - nginx_logs:/var/log/nginx
    {% if values.enableMonitoring %}
    labels:
      - "prometheus.io/scrape=true"
      - "prometheus.io/port=9114"
    {% endif %}
    networks:
      - nginx_network

  {% if values.enableMonitoring %}
  nginx-exporter:
    image: nginx/nginx-prometheus-exporter:latest
    container_name: ${{ values.name }}-exporter
    restart: unless-stopped
    ports:
      - "9114:9114"
    command:
      - '-nginx.scrape-uri=http://nginx:80/nginx_status'
    depends_on:
      - nginx
    networks:
      - nginx_network
  {% endif %}

volumes:
  nginx_logs:

networks:
  nginx_network:
    driver: bridge
```

배포 명령:

```bash
# 프로덕션 배포
docker-compose -f docker-compose.prod.yml up -d

# 업데이트 배포
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```
{% endif %}

{% if values.deploymentType == "kubernetes" or values.deploymentType == "both" %}
## Kubernetes 배포

### 네임스페이스 생성

```bash
kubectl create namespace ${{ values.namespace }}
```

### ConfigMap 배포

```bash
kubectl apply -f k8s/configmap.yaml -n ${{ values.namespace }}
```

### Secret 배포 (SSL 인증서)

{% if values.enableSSL %}
```bash
# TLS 시크릿 생성
kubectl create secret tls ${{ values.name }}-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  -n ${{ values.namespace }}
```
{% endif %}

### 애플리케이션 배포

```bash
# 전체 매니페스트 배포
kubectl apply -f k8s/ -n ${{ values.namespace }}

# 개별 리소스 배포
kubectl apply -f k8s/deployment.yaml -n ${{ values.namespace }}
kubectl apply -f k8s/service.yaml -n ${{ values.namespace }}
kubectl apply -f k8s/ingress.yaml -n ${{ values.namespace }}
```

### 배포 상태 확인

```bash
# Pod 상태 확인
kubectl get pods -n ${{ values.namespace }}

# 서비스 상태 확인
kubectl get svc -n ${{ values.namespace }}

# Ingress 상태 확인
kubectl get ingress -n ${{ values.namespace }}

# 로그 확인
kubectl logs -f deployment/${{ values.name }} -n ${{ values.namespace }}
```

### Helm 배포 (선택사항)

Helm 차트를 사용한 배포:

```bash
# Helm 차트 생성
helm create ${{ values.name }}

# values.yaml 편집
vim ${{ values.name }}/values.yaml

# 배포
helm install ${{ values.name }} ./${{ values.name }} -n ${{ values.namespace }}

# 업그레이드
helm upgrade ${{ values.name }} ./${{ values.name }} -n ${{ values.namespace }}

# 상태 확인
helm status ${{ values.name }} -n ${{ values.namespace }}
```
{% endif %}

## CI/CD 파이프라인

### GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy NGINX Service

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Test NGINX Configuration
      run: |
        docker run --rm -v $PWD/config:/etc/nginx/conf.d nginx:${{ values.nginxVersion }} nginx -t

  {% if values.deploymentType == "docker-compose" or values.deploymentType == "both" %}
  deploy-docker:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Docker Compose
      run: |
        docker-compose -f docker-compose.prod.yml pull
        docker-compose -f docker-compose.prod.yml up -d
  {% endif %}

  {% if values.deploymentType == "kubernetes" or values.deploymentType == "both" %}
  deploy-k8s:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup kubectl
      uses: azure/setup-kubectl@v1
      with:
        version: 'latest'
    
    - name: Deploy to Kubernetes
      run: |
        kubectl apply -f k8s/ -n ${{ values.namespace }}
        kubectl rollout status deployment/${{ values.name }} -n ${{ values.namespace }}
  {% endif %}
```

### GitLab CI

`.gitlab-ci.yml`:

```yaml
stages:
  - test
  - deploy

variables:
  DOCKER_DRIVER: overlay2

test:
  stage: test
  image: nginx:${{ values.nginxVersion }}
  script:
    - nginx -t -c /builds/$CI_PROJECT_PATH/config/nginx.conf

{% if values.deploymentType == "docker-compose" or values.deploymentType == "both" %}
deploy-docker:
  stage: deploy
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker-compose -f docker-compose.prod.yml up -d
  only:
    - main
{% endif %}

{% if values.deploymentType == "kubernetes" or values.deploymentType == "both" %}
deploy-k8s:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl apply -f k8s/ -n ${{ values.namespace }}
    - kubectl rollout status deployment/${{ values.name }} -n ${{ values.namespace }}
  only:
    - main
{% endif %}
```

## 배포 전략

### Blue-Green 배포

```bash
# Green 환경 배포
kubectl apply -f k8s/ -n ${{ values.namespace }}-green

# 트래픽 전환 전 테스트
kubectl port-forward svc/${{ values.name }} 8080:80 -n ${{ values.namespace }}-green

# 트래픽 전환
kubectl patch service ${{ values.name }} -p '{"spec":{"selector":{"version":"green"}}}' -n ${{ values.namespace }}

# Blue 환경 정리
kubectl delete namespace ${{ values.namespace }}-blue
```

### Rolling Update

```bash
# 이미지 업데이트
kubectl set image deployment/${{ values.name }} nginx=nginx:${{ values.nginxVersion }} -n ${{ values.namespace }}

# 롤아웃 상태 확인
kubectl rollout status deployment/${{ values.name }} -n ${{ values.namespace }}

# 롤백 (필요시)
kubectl rollout undo deployment/${{ values.name }} -n ${{ values.namespace }}
```

### Canary 배포

```yaml
# canary-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${{ values.name }}-canary
spec:
  replicas: 1  # 전체 트래픽의 10%
  selector:
    matchLabels:
      app: ${{ values.name }}
      version: canary
  template:
    metadata:
      labels:
        app: ${{ values.name }}
        version: canary
    spec:
      containers:
      - name: nginx
        image: nginx:${{ values.nginxVersion }}
        # 새 버전 설정
```

## 환경별 설정

### 개발 환경

```bash
# 개발용 환경 변수
export ENVIRONMENT=development
export DEBUG=true
export LOG_LEVEL=debug
```

### 스테이징 환경

```bash
# 스테이징용 환경 변수
export ENVIRONMENT=staging
export DEBUG=false
export LOG_LEVEL=info
```

### 프로덕션 환경

```bash
# 프로덕션용 환경 변수
export ENVIRONMENT=production
export DEBUG=false
export LOG_LEVEL=warn
```

## 백업 및 복구

### 설정 백업

```bash
# 설정 파일 백업
tar -czf nginx-config-backup-$(date +%Y%m%d).tar.gz config/

# Kubernetes 리소스 백업
kubectl get all -n ${{ values.namespace }} -o yaml > k8s-backup-$(date +%Y%m%d).yaml
```

### 복구 절차

```bash
# 설정 복구
tar -xzf nginx-config-backup-YYYYMMDD.tar.gz

# Kubernetes 리소스 복구
kubectl apply -f k8s-backup-YYYYMMDD.yaml
```

## 성능 최적화

### 리소스 할당

```yaml
# Kubernetes 리소스 제한
resources:
  requests:
    memory: "64Mi"
    cpu: "250m"
  limits:
    memory: "128Mi"
    cpu: "500m"
```

### 오토스케일링

```yaml
# HPA 설정
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${{ values.name }}-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${{ values.name }}
  minReplicas: ${{ values.replicas }}
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 문제 해결

배포 관련 문제가 발생하면:

1. [Troubleshooting](troubleshooting.md) 가이드 확인
2. 로그 분석: `kubectl logs -f deployment/${{ values.name }} -n ${{ values.namespace }}`
3. 이벤트 확인: `kubectl get events -n ${{ values.namespace }}`
4. 리소스 상태 확인: `kubectl describe deployment/${{ values.name }} -n ${{ values.namespace }}`