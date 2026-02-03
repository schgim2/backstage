# nginx-test-service

NGINX 테스트 웹서비스 - Backstage 템플릿으로 생성된 정적 사이트

## Overview

이 프로젝트는 Backstage 템플릿 생성기를 사용하여 만든 NGINX 기반 웹서비스입니다:

- **Service Type**: static-site
- **NGINX Version**: 1.25-alpine
- **Replicas**: 1 (테스트용)
- **SSL/TLS**: Disabled (로컬 테스트)
- **Caching**: Enabled (100m)
- **Compression**: Gzip
- **Monitoring**: Enabled

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                           │
│                   (Docker Network)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                 NGINX Service                              │
├─────────────────────────────────────────────────────────────┤
│  NGINX Container    │  Prometheus Exporter                │
│  (Port 8080)        │  (Port 9114)                        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Monitoring                               │
│            (Prometheus Metrics)                           │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- 포트 8082, 9114가 사용 가능해야 함

### Deployment

1. 프로젝트 디렉토리로 이동:
   ```bash
   cd nginx-test-project/generated-project
   ```

2. 서비스 시작:
   ```bash
   docker-compose up -d
   ```

3. 배포 확인:
   ```bash
   curl http://localhost:8082
   ```

4. 웹 브라우저에서 확인:
   - 메인 사이트: http://localhost:8082
   - 소개 페이지: http://localhost:8082/about.html
   - 상태 확인: http://localhost:8082/health
   - Prometheus 메트릭: http://localhost:9114/metrics

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NGINX_PORT` | NGINX listening port | `80` |
| `NGINX_WORKER_PROCESSES` | Number of worker processes | `auto` |
| `NGINX_WORKER_CONNECTIONS` | Worker connections | `1024` |
| `RATE_LIMIT_RPM` | Rate limit per minute | `60` |

### NGINX Configuration

NGINX 설정은 다음과 같이 최적화되어 있습니다:
- **Performance**: 효율적인 워커 프로세스 및 연결
- **Security**: 보안 헤더 및 접근 제어
- **Caching**: 정적 자산 캐싱 활성화
- **Compression**: Gzip 압축
- **SSL/TLS**: HTTP 전용 (테스트 환경)

## Content Management

### Content Source: local files

콘텐츠는 로컬 파일에서 제공됩니다:
- **Location**: `./html/` 디렉토리
- **Update Method**: 파일 수정 후 컨테이너 재시작

콘텐츠 업데이트 방법:
1. `html/` 디렉토리의 파일 수정
2. 컨테이너 재시작: `docker-compose restart nginx-test-service`

## Performance Optimization

### Caching Strategy

NGINX 캐싱이 활성화되어 있습니다:
- **Cache Size**: 100m
- **Cache Location**: `/var/cache/nginx`
- **Cache Duration**: 
  - 정적 자산 (CSS, JS, 이미지): 1년
  - HTML 파일: 1시간

캐시 관리:
```bash
# 캐시 삭제
docker-compose exec nginx-test-service rm -rf /var/cache/nginx/*

# 캐시 통계
docker-compose exec nginx-test-service nginx -T | grep cache
```

### Compression

Gzip 압축이 활성화되어 있습니다:
- **Gzip**: 텍스트 파일, JSON, CSS, JS에 대해 활성화
- **압축 레벨**: 6 (속도/압축률 균형)

## Security

### Access Control

- IP 기반 접근 제어: 비활성화 (테스트 환경)
- 기본 인증: 비활성화 (테스트 환경)

### Rate Limiting

요청 속도 제한이 활성화되어 있습니다:
- **제한**: 분당 60개 요청 per IP
- **버스트 허용**: 15개 요청
- 초과 시 429 상태 반환

### Security Headers

다음 보안 헤더가 자동으로 추가됩니다:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Monitoring

### Prometheus Metrics

NGINX 메트릭이 nginx-prometheus-exporter를 통해 노출됩니다:
- **메트릭 엔드포인트**: http://localhost:9114/metrics
- **포트**: `9114`

주요 모니터링 메트릭:
- `nginx_http_requests_total`
- `nginx_http_request_duration_seconds`
- `nginx_connections_active`
- `nginx_connections_reading`
- `nginx_connections_writing`
- `nginx_connections_waiting`

### Health Checks

상태 확인 엔드포인트:
- **Liveness**: http://localhost:8082/health
- **Readiness**: http://localhost:8082/ready
- **Status**: http://localhost:8082/nginx_status (내부용)

### Logging

접근 로깅이 활성화되어 있습니다:
- **Format**: JSON
- **Location**: `/var/log/nginx/access.log`

로그 분석:
```bash
# 최근 접근 로그 확인
docker-compose logs -f nginx-test-service

# 상세 로그 분석
docker-compose exec nginx-test-service tail -f /var/log/nginx/access.log
```

## Custom Error Pages

사용자 정의 에러 페이지가 활성화되어 있습니다:
- 404 Not Found
- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable

에러 페이지는 `/usr/share/nginx/html/errors/`에 위치합니다.

## Testing

### 기본 기능 테스트

```bash
# 메인 페이지 테스트
curl -I http://localhost:8082/

# 상태 확인
curl http://localhost:8082/health

# 404 에러 페이지 테스트
curl -I http://localhost:8082/nonexistent

# 압축 테스트
curl -H "Accept-Encoding: gzip" -I http://localhost:8082/

# 메트릭 확인
curl http://localhost:9114/metrics
```

### 성능 테스트

```bash
# Apache Bench를 사용한 부하 테스트
ab -n 1000 -c 10 http://localhost:8082/

# 또는 wrk 사용
wrk -t12 -c400 -d30s http://localhost:8082/
```

## Troubleshooting

### 일반적인 문제

1. **서비스에 접근할 수 없음**
   ```bash
   # 컨테이너 상태 확인
   docker-compose ps
   
   # 로그 확인
   docker-compose logs nginx-test-service
   
   # 포트 확인
   netstat -tlnp | grep 8082
   ```

2. **성능 문제**
   ```bash
   # 리소스 사용량 확인
   docker stats
   
   # 접근 로그 분석
   docker-compose logs nginx-test-service | grep "HTTP/1.1\" 5"
   ```

### Health Checks

```bash
# 전체 서비스 상태
curl -f http://localhost:8082/health

# NGINX 상태 (내부)
docker-compose exec nginx-test-service curl http://localhost/nginx_status

# 메트릭 상태
curl -f http://localhost:9114/metrics
```

## Maintenance

### 업데이트

1. 설정 파일 수정
2. 컨테이너 재시작:
   ```bash
   docker-compose restart nginx-test-service
   ```

### 정리

```bash
# 서비스 중지 및 정리
docker-compose down

# 볼륨까지 삭제
docker-compose down -v
```

## Support

문제 및 질문사항:
- 이 저장소에 이슈 생성
- 플랫폼 팀에 문의
- [NGINX 문서](https://nginx.org/en/docs/) 참조

## License

이 배포 설정은 MIT 라이선스 하에 제공됩니다.