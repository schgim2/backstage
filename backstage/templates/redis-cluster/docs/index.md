# Redis Cluster Deployment Template

Redis 클러스터를 컨테이너 환경에 배포하기 위한 완전한 템플릿입니다.

## 개요

이 템플릿은 고가용성 Redis 클러스터를 Docker Compose와 Kubernetes 환경에 배포할 수 있도록 설계되었습니다.

### 주요 기능

- **고가용성**: Master-Slave 복제 구성
- **자동 장애조치**: Redis Sentinel을 통한 자동 failover
- **모니터링**: Prometheus와 Grafana를 통한 메트릭 수집
- **보안**: 인증 및 네트워크 보안 설정
- **백업**: 자동 백업 스크립트 포함
- **확장성**: 쉬운 노드 추가/제거

### 지원 환경

- **Docker Compose**: 개발 및 테스트 환경
- **Kubernetes**: 프로덕션 환경
- **모니터링**: Prometheus, Grafana, Redis Exporter

## 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Redis Master  │    │  Redis Slave 1  │    │  Redis Slave 2  │
│     (6379)      │◄──►│     (6379)      │    │     (6379)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Sentinel 1    │    │   Sentinel 2    │    │   Sentinel 3    │
│     (26379)     │    │     (26379)     │    │     (26379)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 빠른 시작

1. **템플릿 사용**: Backstage에서 "Redis Cluster Deployment" 템플릿 선택
2. **설정 구성**: 클러스터 크기, 메모리, 보안 설정 등 구성
3. **배포**: 생성된 코드를 사용하여 배포
4. **모니터링**: Grafana 대시보드에서 클러스터 상태 확인

## 다음 단계

- [시작하기](getting-started.md) - 상세한 설치 가이드
- [구성](configuration.md) - 설정 옵션 상세 설명
- [배포](deployment.md) - 배포 방법 및 베스트 프랙티스
- [모니터링](monitoring.md) - 모니터링 설정 및 대시보드
- [문제해결](troubleshooting.md) - 일반적인 문제 및 해결방법