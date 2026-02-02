# Backstage Template Development Environment

이 문서는 생성된 템플릿들(Redis Cluster, NGINX Web Service, Keycloak Deployment)을 테스트하기 위한 로컬 Backstage 환경 설정 및 사용 방법을 설명합니다.

## 🚀 빠른 시작

### 1. Backstage 접속
Backstage가 실행 중이면 브라우저에서 다음 주소로 접속하세요:
```
http://localhost:3000
```

### 2. 템플릿 확인
- 좌측 메뉴에서 **"Create"** 클릭
- 사용 가능한 템플릿 목록에서 다음 템플릿들을 확인할 수 있습니다:
  - **Redis Cluster Deployment** - Redis 클러스터 배포 템플릿
  - **NGINX Web Service** - NGINX 기반 웹서비스 템플릿  
  - **Red Hat Keycloak Identity and Access Management** - Keycloak IAM 템플릿

## 📋 사용 가능한 템플릿

### 1. Redis Cluster Deployment
- **설명**: 고가용성 Redis 클러스터 배포
- **기능**: 
  - Master-Slave 복제
  - Redis Sentinel을 통한 자동 장애조치
  - 모니터링 및 백업 설정
  - Docker Compose 및 Kubernetes 배포 지원

### 2. NGINX Web Service  
- **설명**: NGINX 기반 웹서비스 배포
- **기능**:
  - 정적 사이트, SPA, 리버스 프록시 지원
  - SSL/TLS 자동 설정
  - 캐싱 및 압축 최적화
  - 보안 헤더 및 모니터링

### 3. Keycloak Identity and Access Management
- **설명**: 엔터프라이즈급 인증 및 권한 관리 시스템
- **기능**:
  - 고가용성 클러스터 배포
  - 다양한 데이터베이스 지원 (PostgreSQL, MySQL 등)
  - LDAP, SAML, OIDC 통합
  - 커스텀 테마 및 모니터링

## 🛠️ 개발 도구

### 템플릿 검증
```bash
# 모든 템플릿 검증
yarn validate-templates

# 특정 템플릿 검증
node scripts/validate-templates.js
```

### 템플릿 감시 (Hot Reload)
```bash
# 템플릿 파일 변경 감시 및 자동 검증
yarn watch-templates

# 또는 직접 실행
node scripts/watch-templates.js
```

### 개발 서버 실행
```bash
# Backstage 개발 서버 시작
yarn start

# 또는 설정 파일 지정하여 시작
yarn dev
```

## 📁 프로젝트 구조

```
backstage/
├── app-config.yaml              # 메인 설정 파일
├── app-config.local.yaml        # 로컬 개발 설정
├── templates/                   # 템플릿 디렉토리
│   ├── redis-cluster/          # Redis 클러스터 템플릿
│   ├── nginx-web-service/      # NGINX 웹서비스 템플릿
│   └── keycloak-deployment/    # Keycloak 배포 템플릿
├── scripts/                    # 개발 도구 스크립트
│   ├── validate-templates.js   # 템플릿 검증 스크립트
│   └── watch-templates.js      # 템플릿 감시 스크립트
└── packages/                   # Backstage 패키지
    ├── app/                    # 프론트엔드
    └── backend/                # 백엔드
```

## 🧪 템플릿 테스트 방법

### 1. 웹 UI를 통한 테스트
1. `http://localhost:3000` 접속
2. 좌측 메뉴에서 **"Create"** 선택
3. 테스트할 템플릿 선택
4. 필수 파라미터 입력:
   - **Service Name**: 서비스 이름
   - **Description**: 서비스 설명  
   - **Repository Location**: GitHub 저장소 URL
   - 각 템플릿별 특화 설정들
5. **"Review"** → **"Create"** 클릭
6. 생성된 프로젝트 구조 확인

### 2. 템플릿별 테스트 포인트

#### Redis Cluster Template
- [ ] 클러스터 모드 설정 (3-master, 6-node 등)
- [ ] 복제 설정 (replica 수)
- [ ] 모니터링 활성화
- [ ] 백업 설정
- [ ] 네트워크 정책 설정

#### NGINX Web Service Template  
- [ ] 서비스 타입 선택 (static-site, spa, reverse-proxy)
- [ ] SSL 설정 (cert-manager, manual, self-signed)
- [ ] 도메인 설정
- [ ] 캐싱 및 압축 설정
- [ ] 보안 헤더 설정

#### Keycloak Deployment Template
- [ ] 배포 모드 (development, production, ha-cluster)
- [ ] 데이터베이스 타입 및 모드
- [ ] SSL/TLS 설정
- [ ] 인증 제공자 설정 (LDAP, SAML, OIDC)
- [ ] 모니터링 및 로깅 설정

## 🔧 설정 커스터마이징

### 템플릿 추가
새로운 템플릿을 추가하려면:

1. `templates/` 디렉토리에 새 템플릿 폴더 생성
2. `template.yaml` 파일 작성
3. `skeleton/` 디렉토리에 템플릿 파일들 배치
4. `app-config.yaml`에 템플릿 위치 추가:
```yaml
catalog:
  locations:
    - type: file
      target: ../../templates/your-template/template.yaml
      rules:
        - allow: [Template]
```

### 개발 설정 수정
`app-config.local.yaml` 파일을 수정하여 개발 환경을 커스터마이징할 수 있습니다.

## 🐛 문제 해결

### 일반적인 문제들

1. **템플릿이 보이지 않는 경우**
   ```bash
   # 템플릿 검증 실행
   yarn validate-templates
   
   # Backstage 재시작
   yarn start
   ```

2. **YAML 구문 오류**
   ```bash
   # 템플릿 검증으로 오류 확인
   node scripts/validate-templates.js
   ```

3. **포트 충돌**
   - 기본 포트: Frontend(3000), Backend(7007)
   - `app-config.local.yaml`에서 포트 변경 가능

4. **권한 오류**
   ```bash
   # 스크립트 실행 권한 부여
   chmod +x scripts/*.js
   ```

### 로그 확인
```bash
# Backstage 로그 확인 (개발 서버 실행 중)
# 터미널에서 실시간 로그 확인 가능

# 템플릿 검증 로그
yarn validate-templates

# 템플릿 감시 로그  
yarn watch-templates
```

## 📚 추가 리소스

- [Backstage 공식 문서](https://backstage.io/docs)
- [Backstage 템플릿 가이드](https://backstage.io/docs/features/software-templates)
- [YAML 스키마 참조](https://backstage.io/docs/features/software-templates/writing-templates)

## 🤝 기여하기

템플릿 개선이나 새로운 템플릿 추가를 원하시면:

1. 템플릿 검증 도구로 품질 확인
2. 문서화 및 예제 추가
3. 테스트 케이스 작성
4. Pull Request 생성

---

**Happy Template Development! 🎉**