# MySQL 클러스터 배포 가이드

## 개요

이 문서는 ${{ values.name }} MySQL 고가용성 클러스터의 배포, 설정, 운영에 대한 종합적인 가이드입니다.

## 주요 기능

### 🏗️ 고가용성 아키텍처
- **마스터/슬레이브 복제**: 자동 페일오버와 읽기 성능 향상
- **ProxySQL 로드 밸런서**: 지능적인 쿼리 라우팅
- **GTID 기반 복제**: 일관성 있는 데이터 복제

### 💾 데이터 보호
- **자동 백업**: 정기적인 전체 백업 및 바이너리 로그 아카이빙
- **Point-in-Time Recovery**: 특정 시점으로의 정확한 복구
- **클라우드 스토리지 지원**: S3, GCS, Azure Blob Storage

### 📊 모니터링 및 관리
- **Prometheus 메트릭**: 상세한 성능 및 상태 모니터링
- **Grafana 대시보드**: 시각적인 모니터링 인터페이스
- **phpMyAdmin**: 웹 기반 데이터베이스 관리

### 🔒 보안
- **SSL/TLS 암호화**: 전송 중 데이터 보호
- **네트워크 정책**: Kubernetes 네트워크 수준 보안
- **역할 기반 접근 제어**: 세분화된 권한 관리

## 아키텍처 다이어그램

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

## 시스템 요구사항

### 최소 요구사항
- **CPU**: 2 cores (마스터), 1 core (복제본)
- **메모리**: 4GB (마스터), 2GB (복제본)
- **스토리지**: 100GB SSD (권장)
- **네트워크**: 1Gbps

### 권장 요구사항
- **CPU**: 4+ cores (마스터), 2+ cores (복제본)
- **메모리**: 8GB+ (마스터), 4GB+ (복제본)
- **스토리지**: 500GB+ NVMe SSD
- **네트워크**: 10Gbps

## 지원되는 배포 환경

### Kubernetes
- **버전**: 1.20+
- **스토리지**: CSI 호환 스토리지 클래스
- **네트워킹**: CNI 플러그인 (Calico, Flannel 등)

### Docker Compose
- **Docker Engine**: 20.10+
- **Docker Compose**: 2.0+

### 클라우드 플랫폼
- **AWS**: EKS, EC2
- **Google Cloud**: GKE, Compute Engine
- **Azure**: AKS, Virtual Machines

## 설정 옵션

### MySQL 설정
- **버전**: MySQL ${{ values.mysqlVersion }}
- **데이터베이스**: ${{ values.databaseName }}
- **문자 집합**: ${{ values.charset }}
- **콜레이션**: ${{ values.collation }}
- **최대 연결**: ${{ values.maxConnections }}

### 복제 설정
{% if values.enableReplication %}
- **복제 모드**: ${{ values.replicationMode | title }}
- **복제본 수**: ${{ values.replicaCount }}개
- **GTID 모드**: 활성화
{% else %}
- **복제**: 비활성화
{% endif %}

### 백업 설정
{% if values.enableBackup %}
- **백업 스케줄**: ${{ values.backupSchedule }}
- **보존 기간**: ${{ values.backupRetention }}일
- **저장소**: ${{ values.backupStorage | title }}
{% if values.enableBinlogBackup %}
- **바이너리 로그 백업**: 활성화
{% endif %}
{% else %}
- **백업**: 비활성화
{% endif %}

## 성능 특성

### 처리량
- **읽기 QPS**: 10,000+ (복제본 포함)
- **쓰기 QPS**: 5,000+ (마스터)
- **동시 연결**: ${{ values.maxConnections }}개

### 지연 시간
- **쿼리 응답**: < 1ms (로컬)
- **복제 지연**: < 100ms (일반적)
- **백업 시간**: 데이터 크기에 따라 변동

## 모니터링 메트릭

### 핵심 메트릭
- `mysql_up`: MySQL 서버 상태
- `mysql_global_status_connections`: 총 연결 수
- `mysql_global_status_queries`: 실행된 쿼리 수
- `mysql_slave_lag_seconds`: 복제 지연 시간

### 성능 메트릭
- `mysql_global_status_innodb_buffer_pool_reads`: InnoDB 버퍼 풀 읽기
- `mysql_global_status_slow_queries`: 슬로우 쿼리 수
- `mysql_global_status_table_locks_waited`: 테이블 락 대기

## 보안 고려사항

### 네트워크 보안
{% if values.enableNetworkPolicies %}
- **네트워크 정책**: Kubernetes 네트워크 정책으로 트래픽 제한
{% endif %}
{% if values.enableTLS %}
- **내부 TLS**: 클러스터 내부 통신 암호화
{% endif %}
- **SSL 연결**: {% if values.enableSSL %}클라이언트 연결 암호화{% else %}비활성화{% endif %}

### 인증 및 권한
- **비밀번호 정책**: ${{ values.passwordComplexity | title }} 수준
- **최소 권한 원칙**: 필요한 권한만 부여
- **정기적인 권한 검토**: 분기별 권한 감사

## 운영 절차

### 일상 운영
1. **상태 모니터링**: Grafana 대시보드 확인
2. **백업 검증**: 백업 성공 여부 확인
3. **복제 상태**: 복제 지연 시간 모니터링
4. **디스크 사용량**: 스토리지 사용률 확인

### 정기 유지보수
1. **보안 패치**: 월별 보안 업데이트
2. **성능 튜닝**: 분기별 성능 최적화
3. **백업 테스트**: 월별 복구 테스트
4. **용량 계획**: 분기별 용량 검토

## 문제 해결

### 일반적인 문제
1. **연결 실패**: 네트워크 및 인증 확인
2. **복제 지연**: 네트워크 및 디스크 I/O 확인
3. **성능 저하**: 쿼리 최적화 및 인덱스 검토
4. **디스크 부족**: 로그 정리 및 용량 확장

### 응급 상황 대응
1. **마스터 장애**: 복제본을 마스터로 승격
2. **데이터 손실**: 백업에서 복구
3. **보안 침해**: 즉시 격리 및 조사
4. **성능 급락**: 트래픽 제한 및 원인 분석

## 다음 단계

1. [시작하기](getting-started.md) - 빠른 배포 가이드
2. [설정 옵션](configuration.md) - 상세한 설정 방법
3. [고가용성](high-availability.md) - HA 구성 가이드
4. [백업 및 복구](backup-recovery.md) - 데이터 보호 전략

---

**문서 버전**: 1.0  
**최종 업데이트**: {{ "now" | date("YYYY-MM-DD") }}  
**작성자**: ${{ values.owner }}