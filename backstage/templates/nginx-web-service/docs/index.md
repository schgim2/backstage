# NGINX Web Service Template

다양한 웹 서비스 유형을 지원하는 완전한 NGINX 배포 템플릿입니다.

## 개요

이 템플릿은 정적 사이트, SPA, 리버스 프록시, 멀티 사이트 등 다양한 웹 서비스를 NGINX로 배포할 수 있도록 설계되었습니다.

### 주요 기능

- **다양한 서비스 유형**: 정적 사이트, SPA, 리버스 프록시, 멀티 사이트
- **SSL/TLS**: Let's Encrypt 또는 사용자 정의 인증서
- **성능 최적화**: 캐싱, 압축, HTTP/2 지원
- **보안**: 보안 헤더, 레이트 리미팅, WAF
- **모니터링**: Prometheus 메트릭, 액세스 로그 분석
- **고가용성**: 로드 밸런싱, 헬스 체크

### 지원 서비스 유형

1. **정적 사이트**: HTML, CSS, JS 파일 서빙
2. **SPA (Single Page Application)**: React, Vue, Angular 앱
3. **리버스 프록시**: 백엔드 API 프록시
4. **멀티 사이트**: 여러 도메인/서브도메인 호스팅

## 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   NGINX Ingress │    │   Cert Manager  │
│   (External)    │───►│   Controller    │◄───│   (SSL/TLS)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NGINX Pod 1   │    │   NGINX Pod 2   │    │   NGINX Pod 3   │
│   (Web Server)  │    │   (Web Server)  │    │   (Web Server)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Persistent    │    │   ConfigMap     │    │   Monitoring    │
│   Volume        │    │   (Config)      │    │   (Prometheus)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 빠른 시작

1. **템플릿 선택**: Backstage에서 "NGINX Web Service" 템플릿 선택
2. **서비스 유형 선택**: 정적 사이트, SPA, 프록시 등 선택
3. **도메인 설정**: 도메인명 및 SSL 설정 구성
4. **배포**: 생성된 코드로 배포 실행
5. **모니터링**: 대시보드에서 서비스 상태 확인

## 지원 환경

- **Docker Compose**: 로컬 개발 및 테스트
- **Kubernetes**: 프로덕션 환경
- **클라우드**: AWS, GCP, Azure 지원

## 다음 단계

- [시작하기](getting-started.md) - 상세한 설치 가이드
- [서비스 유형](service-types.md) - 각 서비스 유형별 설정
- [SSL 구성](ssl-configuration.md) - SSL/TLS 인증서 설정
- [성능 최적화](performance.md) - 캐싱 및 성능 튜닝
- [모니터링](monitoring.md) - 모니터링 및 로깅 설정