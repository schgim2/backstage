# 설정 옵션

이 페이지에서는 MySQL 클러스터의 다양한 설정 옵션에 대해 자세히 설명합니다.

## 기본 설정

### 데이터베이스 설정

#### MySQL 버전
```yaml
mysqlVersion: "${{ values.mysqlVersion }}"
```

지원되는 버전:
- **MySQL 8.0** (권장): 최신 기능과 성능 개선
- **MySQL 5.7**: 레거시 애플리케이션 지원
- **MySQL 8.4**: 최신 LTS 버전

#### 문자 집합 및 콜레이션
```yaml
charset: "${{ values.charset }}"
collation: "${{ values.collation }}"
```

권장 설정:
- **UTF8MB4**: 이모지 및 다국어 지원
- **UTF8**: 표준 유니코드 지원
- **Latin1**: 레거시 시스템 호환성

### 연결 설정

#### 최대 연결 수
```yaml
maxConnections: ${{ values.maxConnections }}
```

연결 수 계산 공식:
```
최대 연결 수 = (사용 가능한 RAM - OS 및 기타 프로세스) / 연결당 메모리 사용량
```

일반적인 가이드라인:
- **소규모**: 100-200 연결
- **중간 규모**: 200-500 연결  
- **대규모**: 500-1000+ 연결

## 고가용성 설정

### 복제 구성

#### 복제 활성화
```yaml
enableReplication: {{ values.enableReplication }}
replicaCount: {{ values.replicaCount }}
```

#### 복제 모드
```yaml
replicationMode: "${{ values.replicationMode }}"
```

**비동기 복제 (async)**
- 장점: 높은 성능, 낮은 지연 시간
- 단점: 데이터 손실 가능성
- 사용 사례: 읽기 성능 향상이 주목적

**반동기 복제 (semi-sync)**
- 장점: 데이터 일관성과 성능의 균형
- 단점: 약간의 성능 오버헤드
- 사용 사례: 대부분의 프로덕션 환경

**그룹 복제 (group-replication)**
- 장점: 강한 일관성, 자동 페일오버
- 단점: 복잡한 설정, 높은 오버헤드
- 사용 사례: 미션 크리티컬 애플리케이션

### ProxySQL 로드 밸런서

#### 활성화
```yaml
enableProxySQL: {{ values.enableProxySQL }}
```

ProxySQL 기능:
- **쿼리 라우팅**: SELECT는 복제본으로, 쓰기는 마스터로
- **연결 풀링**: 효율적인 연결 관리
- **헬스 체크**: 자동 장애 감지 및 복구
- **쿼리 캐싱**: 자주 사용되는 쿼리 결과 캐싱

## 백업 설정

### 자동 백업

#### 백업 활성화
```yaml
enableBackup: {{ values.enableBackup }}
backupSchedule: "${{ values.backupSchedule }}"
backupRetention: {{ values.backupRetention }}
```

#### 백업 스케줄 (Cron 형식)
```bash
# 매일 오전 2시
0 2 * * *

# 매주 일요일 오전 3시
0 3 * * 0

# 매월 1일 오전 1시
0 1 1 * *

# 매 6시간마다
0 */6 * * *
```

#### 백업 저장소
```yaml
backupStorage: "${{ values.backupStorage }}"
```

**로컬 스토리지**
- 장점: 빠른 백업/복구, 추가 비용 없음
- 단점: 디스크 장애 시 백업 손실
- 사용 사례: 개발/테스트 환경

**Amazon S3**
- 장점: 높은 내구성, 확장성
- 단점: 네트워크 의존성, 비용
- 설정: AWS 자격 증명 필요

**Google Cloud Storage**
- 장점: 글로벌 접근성, 자동 암호화
- 단점: 네트워크 의존성, 비용
- 설정: 서비스 계정 키 필요

**Azure Blob Storage**
- 장점: 엔터프라이즈 통합, 보안
- 단점: 복잡한 설정, 비용
- 설정: Azure 자격 증명 필요

### 바이너리 로그 백업

#### PITR (Point-in-Time Recovery) 활성화
```yaml
enableBinlogBackup: {{ values.enableBinlogBackup }}
```

바이너리 로그 백업의 이점:
- **정확한 복구**: 특정 시점으로 정확한 복구
- **최소 데이터 손실**: 마지막 백업 이후 변경사항 복구
- **증분 백업**: 전체 백업 대비 효율적

## 모니터링 설정

### Prometheus 메트릭

#### 모니터링 활성화
```yaml
enableMonitoring: {{ values.enableMonitoring }}
```

수집되는 주요 메트릭:
- **연결 메트릭**: 활성 연결, 최대 연결 수
- **성능 메트릭**: QPS, 응답 시간, 처리량
- **복제 메트릭**: 복제 지연, 복제 상태
- **리소스 메트릭**: CPU, 메모리, 디스크 사용량

### 슬로우 쿼리 로깅

#### 슬로우 쿼리 로그 활성화
```yaml
enableSlowQueryLog: {{ values.enableSlowQueryLog }}
slowQueryTime: {{ values.slowQueryTime }}
```

슬로우 쿼리 임계값 설정:
- **0.1초**: 매우 민감한 모니터링
- **1초**: 일반적인 웹 애플리케이션
- **2초**: 분석 워크로드
- **5초**: 배치 처리

### phpMyAdmin 웹 인터페이스

#### 웹 관리 도구 활성화
```yaml
enablePhpMyAdmin: {{ values.enablePhpMyAdmin }}
```

phpMyAdmin 기능:
- **데이터베이스 관리**: 테이블 생성, 수정, 삭제
- **쿼리 실행**: SQL 쿼리 직접 실행
- **데이터 가져오기/내보내기**: CSV, SQL 파일 처리
- **사용자 관리**: 권한 설정 및 관리

## 리소스 설정

### 마스터 노드 리소스

#### CPU 및 메모리
```yaml
masterResources:
  cpu: "${{ values.masterResources.cpu }}"
  memory: "${{ values.masterResources.memory }}"
  storage: "${{ values.masterResources.storage }}"
```

리소스 계산 가이드라인:

**CPU 요구사항**
- **1 Core**: 소규모 애플리케이션 (< 100 QPS)
- **2 Cores**: 중간 규모 애플리케이션 (100-500 QPS)
- **4+ Cores**: 대규모 애플리케이션 (500+ QPS)

**메모리 요구사항**
```
InnoDB Buffer Pool = 총 메모리의 70-80%
나머지 = OS + 연결 + 기타 버퍼
```

예시:
- **4GB 시스템**: InnoDB Buffer Pool 2.8GB
- **8GB 시스템**: InnoDB Buffer Pool 5.6GB
- **16GB 시스템**: InnoDB Buffer Pool 11.2GB

**스토리지 요구사항**
- **IOPS**: 최소 3000 IOPS (SSD 권장)
- **용량**: 데이터 크기의 2-3배 (로그, 백업 고려)
- **타입**: NVMe SSD > SATA SSD > HDD

### 복제본 노드 리소스

#### 읽기 전용 워크로드 최적화
```yaml
replicaResources:
  cpu: "${{ values.replicaResources.cpu }}"
  memory: "${{ values.replicaResources.memory }}"
  storage: "${{ values.replicaResources.storage }}"
```

복제본 리소스 고려사항:
- **CPU**: 마스터의 50-70% (읽기 전용)
- **메모리**: 마스터와 동일 (캐시 효율성)
- **스토리지**: 마스터와 동일 (데이터 복제)

## 보안 설정

### SSL/TLS 암호화

#### SSL 활성화
```yaml
enableSSL: {{ values.enableSSL }}
enableTLS: {{ values.enableTLS }}
```

SSL/TLS 설정 수준:
- **전송 암호화**: 클라이언트-서버 간 통신 암호화
- **내부 암호화**: 복제 트래픽 암호화
- **저장 암호화**: 디스크 데이터 암호화 (별도 설정)

### 네트워크 보안

#### 네트워크 정책
```yaml
enableNetworkPolicies: {{ values.enableNetworkPolicies }}
```

네트워크 정책 규칙:
- **Ingress**: 허용된 소스에서만 연결
- **Egress**: 필요한 대상으로만 연결
- **DNS**: DNS 해석 허용
- **복제**: MySQL 인스턴스 간 통신 허용

### 비밀번호 정책

#### 비밀번호 복잡성
```yaml
passwordComplexity: "${{ values.passwordComplexity }}"
```

**단순 (simple)**
- 최소 8자
- 영문자 또는 숫자

**보통 (medium)**
- 최소 12자
- 영문자 + 숫자 조합

**강력 (strong)**
- 최소 16자
- 영문자 + 숫자 + 특수문자 조합
- 대소문자 혼합

## 배포 환경 설정

### Kubernetes 설정

#### 네임스페이스 및 스토리지
```yaml
namespace: "${{ values.namespace }}"
storageClass: "${{ values.storageClass }}"
```

스토리지 클래스 선택:
- **standard**: 기본 스토리지 (HDD)
- **fast-ssd**: SSD 스토리지 (권장)
- **premium-ssd**: 고성능 SSD
- **local-storage**: 로컬 NVMe (최고 성능)

#### Pod 보안 정책
```yaml
enablePodSecurityPolicy: {{ values.enablePodSecurityPolicy }}
```

보안 정책 적용 사항:
- **비특권 실행**: root 권한 제한
- **읽기 전용 파일시스템**: 보안 강화
- **Capability 제한**: 최소 권한 원칙
- **네트워크 정책**: 트래픽 제한

## 성능 튜닝

### InnoDB 설정

#### 버퍼 풀 최적화
```sql
-- 버퍼 풀 크기 (메모리의 70-80%)
innodb_buffer_pool_size = {{ (values.masterResources.memory | replace('Gi', '') | int * 1024 * 0.7) | int }}M

-- 버퍼 풀 인스턴스 (CPU 코어당 1개)
innodb_buffer_pool_instances = {{ values.masterResources.cpu }}

-- 로그 파일 크기
innodb_log_file_size = 256M
innodb_log_buffer_size = 16M

-- 플러시 방법
innodb_flush_method = O_DIRECT
innodb_flush_log_at_trx_commit = 1
```

### 쿼리 캐시 설정

#### MySQL 5.7 전용
```sql
-- 쿼리 캐시 활성화 (MySQL 5.7만)
query_cache_type = 1
query_cache_size = 64M
query_cache_limit = 2M
```

**참고**: MySQL 8.0에서는 쿼리 캐시가 제거되었습니다.

### 연결 및 스레드 설정

#### 연결 풀 최적화
```sql
-- 최대 연결 수
max_connections = {{ values.maxConnections }}

-- 스레드 캐시
thread_cache_size = 50

-- 연결 타임아웃
interactive_timeout = 28800
wait_timeout = 28800

-- 최대 패킷 크기
max_allowed_packet = 64M
```

## 환경별 설정 예시

### 개발 환경
```yaml
# 최소 리소스, 단일 인스턴스
masterResources:
  cpu: "1"
  memory: "2Gi"
  storage: "50Gi"

enableReplication: false
enableBackup: false
enableMonitoring: false
enableSSL: false
```

### 스테이징 환경
```yaml
# 프로덕션과 유사한 구성, 축소된 리소스
masterResources:
  cpu: "2"
  memory: "4Gi"
  storage: "100Gi"

replicaResources:
  cpu: "1"
  memory: "2Gi"
  storage: "100Gi"

enableReplication: true
replicaCount: 1
enableBackup: true
enableMonitoring: true
enableSSL: true
```

### 프로덕션 환경
```yaml
# 고가용성, 완전한 기능
masterResources:
  cpu: "4"
  memory: "16Gi"
  storage: "500Gi"

replicaResources:
  cpu: "2"
  memory: "8Gi"
  storage: "500Gi"

enableReplication: true
replicaCount: 2
enableProxySQL: true
enableBackup: true
enableBinlogBackup: true
enableMonitoring: true
enableSSL: true
enableNetworkPolicies: true
enablePodSecurityPolicy: true
```

---

**다음**: [고가용성](high-availability.md)