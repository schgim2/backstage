# Database Setup

Spring Boot 애플리케이션에서 다양한 데이터베이스를 설정하고 사용하는 방법에 대한 상세 가이드입니다.

## 🗄️ 지원 데이터베이스

### 관계형 데이터베이스 (RDBMS)
- **PostgreSQL** - 프로덕션 권장
- **MySQL** - 널리 사용되는 오픈소스 DB
- **H2** - 개발/테스트용 인메모리 DB
- **Oracle** - 엔터프라이즈 환경
- **SQL Server** - Microsoft 환경

### NoSQL 데이터베이스
- **MongoDB** - 문서 지향 데이터베이스
- **Redis** - 인메모리 키-값 저장소
- **Elasticsearch** - 검색 및 분석 엔진

## 🐘 PostgreSQL 설정

### 1. 의존성 추가
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

### 2. 데이터베이스 설치 및 설정

#### Docker로 PostgreSQL 실행
```bash
# PostgreSQL 컨테이너 실행
docker run --name postgres-db \
  -e POSTGRES_DB=myapp \
  -e POSTGRES_USER=myapp \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 \
  -d postgres:15

# 데이터베이스 접속 확인
docker exec -it postgres-db psql -U myapp -d myapp
```

#### Docker Compose 설정
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: postgres-db
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    networks:
      - app-network

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
```

### 3. Spring Boot 설정

#### application.yml
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/myapp
    username: ${DATABASE_USERNAME:myapp}
    password: ${DATABASE_PASSWORD:secret}
    driver-class-name: org.postgresql.Driver
    
  jpa:
    hibernate:
      ddl-auto: validate  # 프로덕션에서는 validate 사용
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
        jdbc:
          time_zone: UTC
    
  # 연결 풀 설정
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
      leak-detection-threshold: 60000
```

#### 환경별 설정
```yaml
# application-dev.yml
spring:
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
  datasource:
    url: jdbc:postgresql://localhost:5432/myapp_dev

---
# application-prod.yml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
```

### 4. 엔티티 예제
```java
@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true, length = 50)
    private String username;
    
    @Column(nullable = false, unique = true, length = 100)
    private String email;
    
    @Column(nullable = false)
    private String password;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // 생성자, getter, setter
}
```

## 🐬 MySQL 설정

### 1. 의존성 추가
```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```

### 2. Docker로 MySQL 실행
```bash
docker run --name mysql-db \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=myapp \
  -e MYSQL_USER=myapp \
  -e MYSQL_PASSWORD=secret \
  -p 3306:3306 \
  -d mysql:8.0
```

### 3. Spring Boot 설정
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/myapp?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
    username: ${DATABASE_USERNAME:myapp}
    password: ${DATABASE_PASSWORD:secret}
    driver-class-name: com.mysql.cj.jdbc.Driver
    
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
```

## 💾 H2 데이터베이스 (개발/테스트용)

### 1. 의존성 추가
```xml
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

### 2. 설정
```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb
    driver-class-name: org.h2.Driver
    username: sa
    password: 
    
  h2:
    console:
      enabled: true
      path: /h2-console
      settings:
        web-allow-others: false
        
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
```

### 3. 초기 데이터 설정
```sql
-- src/main/resources/data.sql
INSERT INTO users (username, email, password, created_at) VALUES 
('admin', 'admin@example.com', '$2a$10$...', NOW()),
('user1', 'user1@example.com', '$2a$10$...', NOW());
```

## 🍃 MongoDB 설정

### 1. 의존성 추가
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>
```

### 2. Docker로 MongoDB 실행
```bash
docker run --name mongo-db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=secret \
  -e MONGO_INITDB_DATABASE=myapp \
  -p 27017:27017 \
  -d mongo:7.0
```

### 3. Spring Boot 설정
```yaml
spring:
  data:
    mongodb:
      uri: mongodb://admin:secret@localhost:27017/myapp?authSource=admin
      # 또는 개별 설정
      host: localhost
      port: 27017
      database: myapp
      username: admin
      password: secret
      authentication-database: admin
```

### 4. Document 예제
```java
@Document(collection = "users")
public class User {
    
    @Id
    private String id;
    
    @Indexed(unique = true)
    private String username;
    
    @Indexed(unique = true)
    private String email;
    
    private String password;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    // 생성자, getter, setter
}

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    List<User> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
```

## 🔴 Redis 설정

### 1. 의존성 추가
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

### 2. Docker로 Redis 실행
```bash
docker run --name redis-cache \
  -p 6379:6379 \
  -d redis:7.2-alpine redis-server --requirepass secret
```

### 3. Spring Boot 설정
```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      password: secret
      timeout: 2000ms
      lettuce:
        pool:
          max-active: 8
          max-idle: 8
          min-idle: 0
```

### 4. Redis 사용 예제
```java
@Service
public class CacheService {
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    public void setValue(String key, Object value, Duration timeout) {
        redisTemplate.opsForValue().set(key, value, timeout);
    }
    
    public Object getValue(String key) {
        return redisTemplate.opsForValue().get(key);
    }
    
    public void deleteValue(String key) {
        redisTemplate.delete(key);
    }
}

// 캐시 어노테이션 사용
@Service
public class UserService {
    
    @Cacheable(value = "users", key = "#id")
    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
    
    @CacheEvict(value = "users", key = "#user.id")
    public User updateUser(User user) {
        return userRepository.save(user);
    }
}
```

## 🔄 데이터베이스 마이그레이션

### Flyway 설정
```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
    validate-on-migrate: true
```

#### 마이그레이션 스크립트 예제
```sql
-- src/main/resources/db/migration/V1__Create_users_table.sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

```sql
-- src/main/resources/db/migration/V2__Add_user_roles.sql
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

INSERT INTO roles (name, description) VALUES 
('ADMIN', '관리자 권한'),
('USER', '일반 사용자 권한');
```

## 🔧 데이터베이스 연결 풀 최적화

### HikariCP 설정 (기본)
```yaml
spring:
  datasource:
    hikari:
      # 연결 풀 크기
      maximum-pool-size: 20
      minimum-idle: 5
      
      # 타임아웃 설정
      connection-timeout: 30000  # 30초
      idle-timeout: 600000       # 10분
      max-lifetime: 1800000      # 30분
      
      # 연결 누수 감지
      leak-detection-threshold: 60000  # 1분
      
      # 연결 테스트
      connection-test-query: SELECT 1
      validation-timeout: 5000
```

### 성능 모니터링
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,hikaricp
  endpoint:
    health:
      show-details: always
  metrics:
    export:
      prometheus:
        enabled: true
```

## 🧪 테스트 데이터베이스 설정

### TestContainers 사용
```java
@SpringBootTest
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
    
    @Autowired
    private UserRepository userRepository;
    
    @Test
    void shouldSaveAndFindUser() {
        // Given
        User user = new User("testuser", "test@example.com", "password");
        
        // When
        User saved = userRepository.save(user);
        Optional<User> found = userRepository.findByUsername("testuser");
        
        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("test@example.com");
    }
}
```

### 테스트 프로파일 설정
```yaml
# application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    driver-class-name: org.h2.Driver
    username: sa
    password: 
    
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
    
  sql:
    init:
      mode: always
      data-locations: classpath:test-data.sql
```

## 🔍 데이터베이스 모니터링

### 메트릭 수집
```java
@Component
public class DatabaseMetrics {
    
    private final MeterRegistry meterRegistry;
    private final DataSource dataSource;
    
    public DatabaseMetrics(MeterRegistry meterRegistry, DataSource dataSource) {
        this.meterRegistry = meterRegistry;
        this.dataSource = dataSource;
        
        // 커스텀 메트릭 등록
        Gauge.builder("database.connections.active")
                .register(meterRegistry, this, DatabaseMetrics::getActiveConnections);
    }
    
    private double getActiveConnections(DatabaseMetrics metrics) {
        if (dataSource instanceof HikariDataSource) {
            return ((HikariDataSource) dataSource).getHikariPoolMXBean().getActiveConnections();
        }
        return 0;
    }
}
```

### 헬스 체크
```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    
    private final DataSource dataSource;
    
    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }
    
    @Override
    public Health health() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(1)) {
                return Health.up()
                        .withDetail("database", "PostgreSQL")
                        .withDetail("validationQuery", "SELECT 1")
                        .build();
            }
        } catch (SQLException e) {
            return Health.down()
                    .withDetail("error", e.getMessage())
                    .build();
        }
        
        return Health.down().build();
    }
}
```

## 🚀 성능 최적화 팁

### 1. 인덱스 최적화
```sql
-- 자주 조회되는 컬럼에 인덱스 생성
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 복합 인덱스
CREATE INDEX idx_users_status_created ON users(status, created_at);
```

### 2. 쿼리 최적화
```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // N+1 문제 해결
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.id = :id")
    Optional<User> findByIdWithRoles(@Param("id") Long id);
    
    // 페이징 처리
    @Query("SELECT u FROM User u WHERE u.createdAt >= :since")
    Page<User> findRecentUsers(@Param("since") LocalDateTime since, Pageable pageable);
    
    // 네이티브 쿼리 (성능이 중요한 경우)
    @Query(value = "SELECT * FROM users WHERE email = ?1 LIMIT 1", nativeQuery = true)
    Optional<User> findByEmailNative(String email);
}
```

### 3. 연결 풀 튜닝
```yaml
spring:
  datasource:
    hikari:
      # CPU 코어 수 * 2 + 디스크 수
      maximum-pool-size: 20
      
      # 최소 유지 연결 수
      minimum-idle: 5
      
      # 연결 획득 대기 시간
      connection-timeout: 30000
      
      # 유휴 연결 유지 시간
      idle-timeout: 600000
```

---

다음: **[Security](security.md)** - 보안 설정 및 인증 가이드