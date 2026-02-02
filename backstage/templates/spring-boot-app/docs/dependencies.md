# Dependencies

Spring Boot 애플리케이션의 의존성 관리 및 추가 방법에 대한 상세 가이드입니다.

## 📦 핵심 의존성

### Spring Boot Starters

Spring Boot는 일반적인 의존성 조합을 미리 패키징한 "Starter" 의존성을 제공합니다.

#### 웹 개발
```xml
<!-- Spring Web MVC -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- WebFlux (Reactive Web) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

#### 데이터 액세스
```xml
<!-- JPA with Hibernate -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- MongoDB -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>

<!-- Redis -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

#### 보안
```xml
<!-- Spring Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- OAuth2 Resource Server -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

## 🗄️ 데이터베이스 드라이버

### 관계형 데이터베이스

#### PostgreSQL
```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/myapp
    username: ${DB_USERNAME:myapp}
    password: ${DB_PASSWORD:secret}
    driver-class-name: org.postgresql.Driver
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
```

#### MySQL
```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/myapp
    username: ${DB_USERNAME:myapp}
    password: ${DB_PASSWORD:secret}
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    database-platform: org.hibernate.dialect.MySQLDialect
```

#### H2 (개발/테스트용)
```xml
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

### NoSQL 데이터베이스

#### MongoDB
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>
```

```java
@Document(collection = "users")
public class User {
    @Id
    private String id;
    
    @Indexed(unique = true)
    private String username;
    
    private String email;
}
```

## 🔧 유틸리티 라이브러리

### JSON 처리
```xml
<!-- Jackson (기본 포함) -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
</dependency>

<!-- Gson (대안) -->
<dependency>
    <groupId>com.google.code.gson</groupId>
    <artifactId>gson</artifactId>
</dependency>
```

### 날짜/시간 처리
```xml
<!-- Java 8 Time API 지원 -->
<dependency>
    <groupId>com.fasterxml.jackson.datatype</groupId>
    <artifactId>jackson-datatype-jsr310</artifactId>
</dependency>
```

### 검증 (Validation)
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

```java
public class CreateUserRequest {
    @NotBlank(message = "사용자명은 필수입니다")
    @Size(min = 3, max = 20)
    private String username;
    
    @Email(message = "올바른 이메일 형식이 아닙니다")
    private String email;
    
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$", 
             message = "비밀번호는 최소 8자, 영문자와 숫자를 포함해야 합니다")
    private String password;
}
```

## 📊 모니터링 및 관찰성

### Spring Boot Actuator
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

### Micrometer (메트릭)
```xml
<!-- Prometheus 메트릭 -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>

<!-- 분산 추적 -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
```

### 로깅
```xml
<!-- Logback (기본 포함) -->
<dependency>
    <groupId>ch.qos.logback</groupId>
    <artifactId>logback-classic</artifactId>
</dependency>

<!-- Structured Logging -->
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

## 🧪 테스팅 의존성

### 기본 테스트 스택
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

포함된 라이브러리:
- **JUnit 5** - 테스트 프레임워크
- **Mockito** - 모킹 프레임워크
- **AssertJ** - 유창한 어설션
- **Hamcrest** - 매처 라이브러리
- **Spring Test** - Spring 통합 테스트

### TestContainers
```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>

<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

```java
@Testcontainers
class UserRepositoryTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

## 📚 API 문서화

### OpenAPI/Swagger
```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>
```

```java
@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "My API",
        version = "1.0",
        description = "API Documentation",
        contact = @Contact(name = "API Support", email = "support@example.com")
    ),
    servers = {
        @Server(url = "http://localhost:8080", description = "Development"),
        @Server(url = "https://api.example.com", description = "Production")
    }
)
public class OpenApiConfig {
}
```

## 🔐 보안 관련 의존성

### JWT 토큰 처리
```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
```

### 암호화
```xml
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-crypto</artifactId>
</dependency>
```

## 🚀 성능 최적화

### 캐싱
```xml
<!-- Spring Cache -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>

<!-- Redis Cache -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>

<!-- Caffeine Cache -->
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
```

### 비동기 처리
```xml
<!-- Spring WebFlux -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

## 📋 의존성 관리 모범 사례

### 1. 버전 관리
```xml
<properties>
    <java.version>17</java.version>
    <spring-cloud.version>2023.0.0</spring-cloud.version>
    <testcontainers.version>1.19.3</testcontainers.version>
</properties>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>${spring-cloud.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### 2. 스코프 관리
```xml
<!-- 런타임에만 필요한 의존성 -->
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- 테스트에만 필요한 의존성 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>

<!-- 컴파일 시에만 필요한 의존성 -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <scope>provided</scope>
</dependency>
```

### 3. 불필요한 의존성 제외
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
    </exclusions>
</dependency>

<!-- Jetty 사용 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jetty</artifactId>
</dependency>
```

## 🔍 의존성 분석 도구

### Maven 명령어
```bash
# 의존성 트리 확인
./mvnw dependency:tree

# 의존성 분석
./mvnw dependency:analyze

# 업데이트 가능한 의존성 확인
./mvnw versions:display-dependency-updates

# 플러그인 업데이트 확인
./mvnw versions:display-plugin-updates
```

### Gradle 명령어
```bash
# 의존성 트리 확인
./gradlew dependencies

# 의존성 인사이트
./gradlew dependencyInsight --dependency spring-boot-starter-web

# 업데이트 가능한 의존성 확인 (플러그인 필요)
./gradlew dependencyUpdates
```

## 📈 의존성 업데이트 전략

### 1. 정기적인 업데이트
- **보안 패치**: 즉시 적용
- **마이너 버전**: 월 1회 검토
- **메이저 버전**: 분기별 검토

### 2. 테스트 전략
```bash
# 의존성 업데이트 후 전체 테스트 실행
./mvnw clean test

# 통합 테스트 실행
./mvnw verify

# 보안 취약점 검사
./mvnw org.owasp:dependency-check-maven:check
```

### 3. 호환성 확인
- Spring Boot 버전 호환성 매트릭스 확인
- Java 버전 호환성 검증
- 서드파티 라이브러리 호환성 테스트

---

다음: **[Database Setup](database-setup.md)** - 데이터베이스 설정 가이드