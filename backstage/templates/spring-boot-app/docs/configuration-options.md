# Configuration Options

Spring Boot 애플리케이션 템플릿의 모든 설정 옵션에 대한 상세한 가이드입니다.

## 🎛️ 템플릿 매개변수

### 기본 정보 설정

#### 애플리케이션 이름 (name)
- **타입**: 문자열
- **필수**: ✅
- **패턴**: `^[a-zA-Z][-a-zA-Z0-9]*[a-zA-Z0-9]$`
- **설명**: 프로젝트의 고유 식별자
- **예시**: `my-spring-app`, `user-service`, `payment-api`

#### 설명 (description)
- **타입**: 문자열
- **필수**: ✅
- **설명**: 프로젝트에 대한 간단한 설명
- **예시**: "사용자 관리를 위한 REST API 서비스"

#### 저장소 위치 (repoUrl)
- **타입**: URL
- **필수**: ✅
- **지원 호스트**: GitHub, GitLab
- **설명**: 소스 코드가 저장될 Git 저장소

### Spring Boot 설정

#### Spring Boot 버전 (springBootVersion)
- **기본값**: `3.2.2`
- **선택 옵션**:
  - `3.2.2` - 최신 안정 버전 (권장)
  - `3.1.8` - 이전 LTS 버전
  - `2.7.18` - 레거시 지원

```yaml
# 버전별 주요 특징
3.2.2:
  - Java 17+ 필수
  - 최신 보안 패치
  - 성능 개선
  
3.1.8:
  - Java 17+ 권장
  - 안정적인 LTS 버전
  
2.7.18:
  - Java 8+ 지원
  - 레거시 시스템 호환
```

#### Java 버전 (javaVersion)
- **기본값**: `17`
- **선택 옵션**:
  - `21` - 최신 LTS 버전
  - `17` - 현재 LTS 버전 (권장)
  - `11` - 이전 LTS 버전

```java
// Java 버전별 특징
Java 21:
  - Virtual Threads (Project Loom)
  - Pattern Matching 개선
  - 최신 성능 최적화

Java 17:
  - Records, Sealed Classes
  - Text Blocks
  - 안정적인 LTS 지원

Java 11:
  - HTTP Client API
  - 레거시 시스템 호환
```

#### 빌드 도구 (buildTool)
- **기본값**: `maven`
- **선택 옵션**:
  - `maven` - 전통적이고 안정적
  - `gradle` - 현대적이고 유연함

```xml
<!-- Maven 장점 -->
- XML 기반 설정
- 광범위한 플러그인 생태계
- 기업 환경에서 널리 사용
```

```groovy
// Gradle 장점
- Groovy/Kotlin DSL
- 빠른 빌드 성능
- 유연한 빌드 스크립트
```

#### 패키징 타입 (packaging)
- **기본값**: `jar`
- **선택 옵션**:
  - `jar` - 독립 실행 가능한 JAR (권장)
  - `war` - 전통적인 웹 애플리케이션

#### 프로그래밍 언어 (language)
- **기본값**: `java`
- **선택 옵션**:
  - `java` - 전통적인 Java
  - `kotlin` - 현대적인 JVM 언어

## 🔧 의존성 설정

### 웹 계층

#### Spring Web (includeWeb)
- **기본값**: `true`
- **포함 내용**:
  - Spring MVC
  - Embedded Tomcat
  - RESTful 웹 서비스 지원
  - JSON 직렬화/역직렬화

```java
@RestController
@RequestMapping("/api")
public class ApiController {
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }
}
```

### 데이터 계층

#### Spring Data JPA (includeJPA)
- **기본값**: `true`
- **포함 내용**:
  - Hibernate ORM
  - JPA Repository 패턴
  - 자동 쿼리 생성
  - 트랜잭션 관리

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String username;
}

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
}
```

#### 데이터베이스 선택 (database)
- **기본값**: `h2`
- **선택 옵션**:

**H2 Database**
```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb
    driver-class-name: org.h2.Driver
  h2:
    console:
      enabled: true
```

**PostgreSQL**
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/myapp
    username: ${DB_USERNAME:myapp}
    password: ${DB_PASSWORD:secret}
    driver-class-name: org.postgresql.Driver
```

**MySQL**
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/myapp
    username: ${DB_USERNAME:myapp}
    password: ${DB_PASSWORD:secret}
    driver-class-name: com.mysql.cj.jdbc.Driver
```

**MongoDB**
```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/myapp
```

### 보안 계층

#### Spring Security (includeSecurity)
- **기본값**: `false`
- **포함 내용**:
  - 인증 및 권한 부여
  - CSRF 보호
  - 세션 관리
  - 암호화 지원

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(OAuth2ResourceServerConfigurer::jwt);
        return http.build();
    }
}
```

### 모니터링

#### Spring Boot Actuator (includeActuator)
- **기본값**: `true`
- **제공 엔드포인트**:
  - `/actuator/health` - 애플리케이션 상태
  - `/actuator/metrics` - 메트릭 정보
  - `/actuator/info` - 애플리케이션 정보
  - `/actuator/env` - 환경 변수

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: when-authorized
```

## 🛠️ 개발 도구

#### Spring Boot DevTools (includeDevTools)
- **기본값**: `true`
- **기능**:
  - 자동 재시작
  - 라이브 리로드
  - 개발 시간 단축

#### TestContainers (includeTestContainers)
- **기본값**: `false`
- **기능**:
  - 실제 데이터베이스로 테스트
  - Docker 컨테이너 기반
  - 통합 테스트 지원

```java
@Testcontainers
class UserRepositoryTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");
    
    @Test
    void shouldSaveUser() {
        // 테스트 코드
    }
}
```

#### Docker 지원 (includeDocker)
- **기본값**: `true`
- **포함 파일**:
  - `Dockerfile`
  - `docker-compose.yml`
  - `.dockerignore`

```dockerfile
FROM openjdk:17-jre-slim
COPY target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

#### CI/CD (includeCI)
- **기본값**: `true`
- **포함 내용**:
  - GitHub Actions 워크플로우
  - 자동 빌드 및 테스트
  - Docker 이미지 빌드

```yaml
name: CI/CD Pipeline
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
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      - name: Run tests
        run: ./mvnw test
```

## 📝 추가 기능

#### OpenAPI/Swagger (includeSwagger)
- **기본값**: `true`
- **기능**:
  - API 문서 자동 생성
  - Swagger UI 제공
  - API 테스트 인터페이스

```java
@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "My API",
        version = "1.0",
        description = "API Documentation"
    )
)
public class OpenApiConfig {
}
```

#### Bean Validation (includeValidation)
- **기본값**: `true`
- **기능**:
  - 입력 데이터 검증
  - 어노테이션 기반 검증
  - 커스텀 검증 규칙

```java
public class CreateUserRequest {
    @NotBlank(message = "사용자명은 필수입니다")
    @Size(min = 3, max = 20, message = "사용자명은 3-20자여야 합니다")
    private String username;
    
    @Email(message = "올바른 이메일 형식이 아닙니다")
    private String email;
}
```

#### Spring Cache (includeCache)
- **기본값**: `false`
- **기능**:
  - 메모리 캐싱
  - Redis 연동 지원
  - 성능 최적화

```java
@Service
public class UserService {
    
    @Cacheable("users")
    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
    
    @CacheEvict("users")
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}
```

## 🔧 환경별 설정

### 개발 환경 (dev)
```yaml
spring:
  profiles:
    active: dev
  datasource:
    url: jdbc:h2:mem:devdb
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
logging:
  level:
    com.example: DEBUG
```

### 테스트 환경 (test)
```yaml
spring:
  profiles:
    active: test
  datasource:
    url: jdbc:h2:mem:testdb
  jpa:
    hibernate:
      ddl-auto: create-drop
```

### 프로덕션 환경 (prod)
```yaml
spring:
  profiles:
    active: prod
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
logging:
  level:
    com.example: INFO
```

## 📊 성능 튜닝

### JVM 옵션
```bash
# 메모리 설정
-Xms512m -Xmx1024m

# GC 튜닝
-XX:+UseG1GC -XX:MaxGCPauseMillis=200

# 프로파일링
-XX:+FlightRecorder -XX:StartFlightRecording=duration=60s,filename=app.jfr
```

### 데이터베이스 연결 풀
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
```

---

다음: **[Dependencies](dependencies.md)** - 의존성 관리 및 추가 방법