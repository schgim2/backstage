# 🚀 Backstage 템플릿 테스트 빠른 시작 가이드

## 1단계: Backstage 실행 확인

현재 Backstage가 실행 중입니다! 브라우저에서 확인해보세요:

```
http://localhost:3000
```

## 2단계: 템플릿 확인하기

1. 브라우저에서 `http://localhost:3000` 접속
2. 좌측 메뉴에서 **"Create"** 클릭  
3. 다음 3개의 템플릿이 표시되는지 확인:

### 📦 사용 가능한 템플릿들

| 템플릿 이름 | 설명 | 주요 기능 |
|------------|------|----------|
| **Redis Cluster Deployment** | 고가용성 Redis 클러스터 | Master-Slave, Sentinel, 모니터링 |
| **NGINX Web Service** | NGINX 기반 웹서비스 | SSL, 캐싱, 보안헤더, 다중사이트 |
| **Red Hat Keycloak IAM** | 엔터프라이즈 인증시스템 | LDAP, SAML, OIDC, HA 클러스터 |

## 3단계: 템플릿 테스트해보기

### 🔥 Redis Cluster 템플릿 테스트
1. **"Redis Cluster Deployment"** 선택
2. 다음 정보 입력:
   - **Service Name**: `my-redis-cluster`
   - **Description**: `Test Redis cluster deployment`
   - **Repository Location**: `github.com?owner=your-username&repo=my-redis-cluster`
3. 고급 설정:
   - **Cluster Mode**: `cluster` 선택
   - **Replicas**: `3` 입력
   - **Enable Monitoring**: 체크
4. **"Review"** → **"Create"** 클릭

### 🌐 NGINX Web Service 템플릿 테스트  
1. **"NGINX Web Service"** 선택
2. 다음 정보 입력:
   - **Service Name**: `my-web-service`
   - **Description**: `Test NGINX web service`
   - **Repository Location**: `github.com?owner=your-username&repo=my-web-service`
3. 고급 설정:
   - **Service Type**: `static-site` 선택
   - **Enable SSL**: 체크
   - **SSL Provider**: `cert-manager` 선택
   - **Domain**: `my-site.example.com`
4. **"Review"** → **"Create"** 클릭

### 🔐 Keycloak IAM 템플릿 테스트
1. **"Red Hat Keycloak Identity and Access Management"** 선택
2. 다음 정보 입력:
   - **Service Name**: `my-keycloak`
   - **Description**: `Test Keycloak IAM deployment`
   - **Repository Location**: `github.com?owner=your-username&repo=my-keycloak`
3. 고급 설정:
   - **Deployment Mode**: `production` 선택
   - **Replicas**: `2` 입력
   - **Database Type**: `postgresql` 선택
   - **Enable SSL**: 체크
   - **Domain**: `auth.example.com`
4. **"Review"** → **"Create"** 클릭

## 4단계: 생성된 결과 확인

각 템플릿 실행 후 다음을 확인하세요:

### ✅ 체크리스트
- [ ] 템플릿이 오류 없이 실행됨
- [ ] 생성된 파일 구조가 올바름
- [ ] README.md 파일이 포함됨
- [ ] Docker Compose 파일이 생성됨 (해당하는 경우)
- [ ] Kubernetes 매니페스트가 생성됨 (해당하는 경우)
- [ ] 설정 파일들이 올바르게 생성됨

## 5단계: 개발 도구 사용하기

### 템플릿 검증
```bash
# 터미널에서 실행
yarn validate-templates
```

### 템플릿 실시간 감시
```bash
# 새 터미널에서 실행 (템플릿 파일 변경 시 자동 검증)
yarn watch-templates
```

## 🛠️ 문제 해결

### 템플릿이 보이지 않는 경우
```bash
# 1. 템플릿 검증 실행
yarn validate-templates

# 2. Backstage 재시작 (Ctrl+C 후)
yarn start
```

### 오류가 발생하는 경우
1. 브라우저 개발자 도구 (F12) 확인
2. 터미널의 Backstage 로그 확인
3. 템플릿 검증 도구로 문제 진단:
   ```bash
   node scripts/validate-templates.js
   ```

## 🎯 다음 단계

1. **템플릿 커스터마이징**: `templates/` 디렉토리에서 템플릿 수정
2. **새 템플릿 추가**: 새로운 템플릿 생성 및 테스트
3. **설정 최적화**: `app-config.yaml` 파일 커스터마이징

## 📞 도움이 필요하시면

- 📖 [상세 문서](./README-TEMPLATE-TESTING.md) 참조
- 🐛 문제 발생 시 터미널 로그 확인
- 💡 템플릿 수정 후 자동 검증 도구 활용

---

**즐거운 템플릿 테스팅 되세요! 🎉**