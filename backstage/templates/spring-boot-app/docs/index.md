# Spring Boot Application Template

Spring Boot 기반의 엔터프라이즈급 Java 애플리케이션을 빠르게 생성할 수 있는 포괄적인 템플릿입니다.

## 🚀 개요

이 템플릿은 현대적인 Spring Boot 애플리케이션 개발을 위한 모든 필수 구성 요소와 모범 사례를 포함하고 있습니다. 프로덕션 환경에서 바로 사용할 수 있는 안정적이고 확장 가능한 애플리케이션을 구축할 수 있습니다.

## ✨ 주요 기능

### 🏗️ 핵심 기술 스택
- **Spring Boot 3.2.2** - 최신 Spring Boot 프레임워크
- **Java 17/11/21** - 선택 가능한 Java 버전
- **Maven/Gradle** - 유연한 빌드 도구 선택
- **JAR/WAR** - 배포 형태 선택

### 🔧 개발 도구
- **Spring Boot DevTools** - 개발 생산성 향상
- **Spring Boot Actuator** - 애플리케이션 모니터링
- **OpenAPI/Swagger** - API 문서 자동 생성
- **Bean Validation** - 데이터 검증

### 🗄️ 데이터베이스 지원
- **H2** - 개발/테스트용 인메모리 데이터베이스
- **PostgreSQL** - 프로덕션 권장 데이터베이스
- **MySQL** - 널리 사용되는 관계형 데이터베이스
- **MongoDB** - NoSQL 데이터베이스

### 🔐 보안 및 인증
- **Spring Security** - 포괄적인 보안 프레임워크
- **JWT 토큰** - 무상태 인증
- **OAuth2** - 소셜 로그인 지원

### 🧪 테스팅
- **JUnit 5** - 최신 테스트 프레임워크
- **TestContainers** - 통합 테스트를 위한 컨테이너
- **MockMvc** - 웹 계층 테스트

### 🐳 배포 및 운영
- **Docker** - 컨테이너화 지원
- **GitHub Actions** - CI/CD 파이프라인
- **Kubernetes** - 오케스트레이션 지원
- **Prometheus/Grafana** - 메트릭 수집 및 모니터링

## 🎯 사용 사례

이 템플릿은 다음과 같은 프로젝트에 적합합니다:

- **REST API 서버** - RESTful 웹 서비스 개발
- **마이크로서비스** - 분산 시스템 아키텍처
- **웹 애플리케이션** - 전통적인 웹 애플리케이션
- **배치 처리** - 대용량 데이터 처리
- **실시간 서비스** - WebSocket 기반 실시간 통신

## 📋 템플릿 매개변수

### 기본 정보
- **애플리케이션 이름** - 프로젝트 식별자
- **설명** - 프로젝트 설명
- **저장소 위치** - GitHub/GitLab 저장소

### Spring Boot 설정
- **Spring Boot 버전** - 3.2.2, 3.1.8, 2.7.18
- **Java 버전** - 17, 11, 21
- **빌드 도구** - Maven, Gradle
- **패키징** - JAR, WAR
- **언어** - Java, Kotlin

### 의존성 선택
- **Spring Web** - REST API 개발
- **Spring Data JPA** - 데이터베이스 액세스
- **Spring Security** - 보안 기능
- **Spring Boot Actuator** - 모니터링

### 개발 도구
- **Spring Boot DevTools** - 개발 편의성
- **TestContainers** - 통합 테스트
- **Docker** - 컨테이너화
- **CI/CD** - GitHub Actions

## 🏃‍♂️ 빠른 시작

1. **Backstage에서 템플릿 선택**
   ```
   Create Component → Choose Template → Spring Boot Application
   ```

2. **기본 정보 입력**
   - 애플리케이션 이름: `my-spring-app`
   - 설명: `My awesome Spring Boot application`
   - 저장소: GitHub 저장소 선택

3. **기술 스택 선택**
   - Spring Boot 3.2.2
   - Java 17
   - Maven
   - JAR 패키징

4. **의존성 선택**
   - ✅ Spring Web
   - ✅ Spring Data JPA
   - ✅ Spring Boot Actuator
   - ✅ H2 Database

5. **생성 완료**
   - 저장소에 코드 푸시
   - Backstage 카탈로그에 등록
   - CI/CD 파이프라인 자동 설정

## 📚 문서 구조

- **[Getting Started](getting-started.md)** - 개발 환경 설정 및 첫 실행
- **[Configuration Options](configuration-options.md)** - 상세한 설정 옵션
- **[Dependencies](dependencies.md)** - 의존성 관리 및 추가
- **[Database Setup](database-setup.md)** - 데이터베이스 설정 가이드
- **[Security](security.md)** - 보안 설정 및 인증
- **[Testing](testing.md)** - 테스트 전략 및 실행
- **[Deployment](deployment.md)** - 배포 및 운영 가이드
- **[Monitoring](monitoring.md)** - 모니터링 및 로깅
- **[Best Practices](best-practices.md)** - 개발 모범 사례

## 🤝 지원 및 기여

문제가 발생하거나 개선 사항이 있다면 언제든지 연락해 주세요:

- **이슈 리포트** - GitHub Issues
- **기능 요청** - Feature Request
- **문서 개선** - Pull Request

---

**버전**: 1.0.0  
**최종 업데이트**: 2026년 2월  
**호환성**: Spring Boot 3.x, Java 17+