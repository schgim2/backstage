# Best Practices

Spring Boot 애플리케이션 개발을 위한 모범 사례와 권장사항에 대한 포괄적인 가이드입니다.

## 🏗️ 아키텍처 모범 사례

### 1. 계층형 아키텍처
```
┌─────────────────────────────────────────┐
│              Presentation Layer          │  ← Controllers, DTOs
├─────────────────────────────────────────┤
│              Business Layer             │  ← Services, Domain Logic
├─────────────────────────────────────────┤
│              Persistence Layer          │  ← Repositories, Entities
├─────────────────────────────────────────┤
│              Infrastructure Layer       │  ← External Services, Config
└─────────────────────────────────────────┘
```

### 2. 패키지 구조
```
src/main/java/com/example/myapp/
├── config/                 # 설정 클래스
│   ├── SecurityConfig.java
│   ├── DatabaseConfig.java
│   └── WebConfig.java
├── controller/             # REST 컨트롤러
│   ├── UserController.java
│   └── AuthController.java
├── service/                # 비즈니스 로직
│   ├── UserService.java
│   └── AuthService.java
├── repository/             # 데이터 액세스
│   ├── UserRepository.java
│   └── RoleRepository.java
├── model/                  # 도메인 모델
│   ├── entity/
│   │   ├── User.java
│   │   └── Role.java
│   └── dto/
│       ├── CreateUserRequest.java
│       └── UserResponse.java
├── exception/              # 예외 처리
│   ├── GlobalExceptionHandler.java
│   └── CustomExceptions.java
├── util/                   # 유틸리티 클래스
│   ├── DateUtils.java
│   └── ValidationUtils.java
└── MyAppApplication.java   # 메인 클래스
```

### 3. 의존성 주입 모범 사례
```java
// ✅ 좋은 예: 생성자 주입 사용
@Service
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    
    // 생성자 주입 (권장)
    public UserService(UserRepository userRepository, 
                      PasswordEncoder passwordEncoder,
                      EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }
}

// ❌ 나쁜 예: 필드 주입
@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;  // 테스트하기 어려움
    
    @Autowired
    private PasswordEncoder passwordEncoder;
}
```

## 📝 코딩 모범 사례

### 1. 컨트롤러 설계
```java
@RestController
@RequestMapping("/api/users")
@Validated
@Slf4j
public class UserController {
    
    private final UserService userService;
    
    public UserController(UserService userService) {
        this.userService = userService;
    }
    
    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        log.info("Creating user: username={}", request.getUsername());
        
        User user = userService.createUser(request);
        UserResponse response = UserResponse.from(user);
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .location(URI.create("/api/users/" + user.getId()))
                .body(response);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable @Positive Long id) {
        return userService.findById(id)
                .map(UserResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping
    public ResponseEntity<Page<UserResponse>> getUsers(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "id") String sort) {
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(sort));
        Page<UserResponse> users = userService.findAll(pageable)
                .map(UserResponse::from);
        
        return ResponseEntity.ok(users);
    }
}
```

### 2. 서비스 계층 설계
```java
@Service
@Transactional(readOnly = true)
@Slf4j
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;
    
    public UserService(UserRepository userRepository, 
                      PasswordEncoder passwordEncoder,
                      ApplicationEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.eventPublisher = eventPublisher;
    }
    
    @Transactional
    public User createUser(CreateUserRequest request) {
        // 비즈니스 규칙 검증
        validateUserCreation(request);
        
        // 엔티티 생성
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();
        
        // 저장
        User savedUser = userRepository.save(user);
        
        // 이벤트 발행
        eventPublisher.publishEvent(new UserCreatedEvent(savedUser));
        
        log.info("User created: id={}, username={}", savedUser.getId(), savedUser.getUsername());
        
        return savedUser;
    }
    
    private void validateUserCreation(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateUserException("Username already exists: " + request.getUsername());
        }
        
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateUserException("Email already exists: " + request.getEmail());
        }
    }
    
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }
    
    public Page<User> findAll(Pageable pageable) {
        return userRepository.findAll(pageable);
    }
}
```

### 3. 엔티티 설계
```java
@Entity
@Table(name = "users", 
       uniqueConstraints = {
           @UniqueConstraint(columnNames = "username"),
           @UniqueConstraint(columnNames = "email")
       },
       indexes = {
           @Index(name = "idx_user_email", columnList = "email"),
           @Index(name = "idx_user_created_at", columnList = "created_at")
       })
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@EqualsAndHashCode(of = "id")
@ToString(exclude = {"password", "roles"})
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 50)
    @NotBlank
    @Size(min = 3, max = 50)
    private String username;
    
    @Column(nullable = false, length = 100)
    @NotBlank
    @Email
    private String email;
    
    @Column(nullable = false)
    @NotBlank
    @Size(min = 8)
    private String password;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;
    
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "user_roles",
               joinColumns = @JoinColumn(name = "user_id"),
               inverseJoinColumns = @JoinColumn(name = "role_id"))
    @Builder.Default
    private Set<Role> roles = new HashSet<>();
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // 비즈니스 메서드
    public void activate() {
        this.status = UserStatus.ACTIVE;
    }
    
    public void deactivate() {
        this.status = UserStatus.INACTIVE;
    }
    
    public boolean isActive() {
        return status == UserStatus.ACTIVE;
    }
    
    public void addRole(Role role) {
        this.roles.add(role);
    }
    
    public void removeRole(Role role) {
        this.roles.remove(role);
    }
    
    public boolean hasRole(String roleName) {
        return roles.stream()
                .anyMatch(role -> role.getName().equals(roleName));
    }
}
```

### 4. DTO 설계
```java
// 요청 DTO
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequest {
    
    @NotBlank(message = "사용자명은 필수입니다")
    @Size(min = 3, max = 50, message = "사용자명은 3-50자여야 합니다")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "사용자명은 영문, 숫자, 언더스코어만 허용됩니다")
    private String username;
    
    @NotBlank(message = "이메일은 필수입니다")
    @Email(message = "올바른 이메일 형식이 아닙니다")
    private String email;
    
    @NotBlank(message = "비밀번호는 필수입니다")
    @Size(min = 8, message = "비밀번호는 최소 8자여야 합니다")
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$",
             message = "비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다")
    private String password;
    
    @NotBlank(message = "이름은 필수입니다")
    @Size(max = 100, message = "이름은 100자를 초과할 수 없습니다")
    private String name;
}

// 응답 DTO
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    
    private Long id;
    private String username;
    private String email;
    private String name;
    private UserStatus status;
    private Set<String> roles;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .name(user.getName())
                .status(user.getStatus())
                .roles(user.getRoles().stream()
                        .map(Role::getName)
                        .collect(Collectors.toSet()))
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
```

## 🔒 보안 모범 사례

### 1. 입력 검증
```java
@RestController
@Validated
public class UserController {
    
    @PostMapping("/api/users")
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody CreateUserRequest request,
            HttpServletRequest httpRequest) {
        
        // 추가 보안 검증
        validateSecurityConstraints(request, httpRequest);
        
        User user = userService.createUser(request);
        return ResponseEntity.ok(UserResponse.from(user));
    }
    
    private void validateSecurityConstraints(CreateUserRequest request, HttpServletRequest httpRequest) {
        // Rate limiting 체크
        if (isRateLimitExceeded(httpRequest.getRemoteAddr())) {
            throw new RateLimitExceededException("Too many requests");
        }
        
        // 악성 입력 체크
        if (containsMaliciousContent(request.getUsername()) || 
            containsMaliciousContent(request.getEmail())) {
            throw new SecurityException("Malicious input detected");
        }
    }
}
```

### 2. 민감한 정보 보호
```java
@Entity
public class User {
    
    @Column(nullable = false)
    @JsonIgnore  // JSON 직렬화에서 제외
    private String password;
    
    @Convert(converter = EncryptedStringConverter.class)  // 자동 암호화
    private String socialSecurityNumber;
    
    @Transient  // 데이터베이스에 저장하지 않음
    private String temporaryToken;
}

// 로그에서 민감한 정보 제외
@ToString(exclude = {"password", "socialSecurityNumber"})
public class User {
    // ...
}
```

### 3. 권한 부여
```java
@RestController
@PreAuthorize("hasRole('USER')")
public class UserController {
    
    @GetMapping("/api/users/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        // 관리자이거나 본인의 정보만 조회 가능
    }
    
    @PutMapping("/api/users/{id}")
    @PreAuthorize("@userSecurity.canModifyUser(authentication, #id)")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id, 
                                                  @RequestBody UpdateUserRequest request) {
        // 커스텀 보안 규칙 적용
    }
}
```

## 🚀 성능 최적화

### 1. 데이터베이스 최적화
```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // N+1 문제 해결
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.id = :id")
    Optional<User> findByIdWithRoles(@Param("id") Long id);
    
    // 페이징 최적화
    @Query("SELECT u FROM User u WHERE u.status = :status")
    Page<User> findByStatus(@Param("status") UserStatus status, Pageable pageable);
    
    // 프로젝션 사용으로 필요한 필드만 조회
    @Query("SELECT new com.example.dto.UserSummary(u.id, u.username, u.email) FROM User u")
    List<UserSummary> findAllSummaries();
    
    // 네이티브 쿼리 (복잡한 쿼리)
    @Query(value = "SELECT * FROM users u WHERE u.created_at >= :since AND u.status = 'ACTIVE'", 
           nativeQuery = true)
    List<User> findActiveUsersSince(@Param("since") LocalDateTime since);
}
```

### 2. 캐싱 전략
```java
@Service
@CacheConfig(cacheNames = "users")
public class UserService {
    
    @Cacheable(key = "#id")
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }
    
    @Cacheable(key = "#username")
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }
    
    @CacheEvict(key = "#user.id")
    public User updateUser(User user) {
        return userRepository.save(user);
    }
    
    @CacheEvict(allEntries = true)
    public void clearUserCache() {
        // 전체 캐시 삭제
    }
    
    // 조건부 캐싱
    @Cacheable(condition = "#id > 0", unless = "#result.isEmpty()")
    public Optional<User> findByIdConditional(Long id) {
        return userRepository.findById(id);
    }
}
```

### 3. 비동기 처리
```java
@Service
public class NotificationService {
    
    @Async("taskExecutor")
    public CompletableFuture<Void> sendWelcomeEmail(User user) {
        try {
            emailService.sendWelcomeEmail(user.getEmail(), user.getName());
            log.info("Welcome email sent to: {}", user.getEmail());
        } catch (Exception e) {
            log.error("Failed to send welcome email to: {}", user.getEmail(), e);
        }
        return CompletableFuture.completedFuture(null);
    }
    
    @EventListener
    @Async
    public void handleUserCreatedEvent(UserCreatedEvent event) {
        // 비동기로 사용자 생성 후 처리
        sendWelcomeEmail(event.getUser());
        updateUserStatistics();
        notifyAdministrators(event.getUser());
    }
}

@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean(name = "taskExecutor")
    public TaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}
```

## 🧪 테스트 모범 사례

### 1. 단위 테스트
```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @Mock
    private ApplicationEventPublisher eventPublisher;
    
    @InjectMocks
    private UserService userService;
    
    @Test
    @DisplayName("사용자 생성 - 성공 시나리오")
    void createUser_Success() {
        // Given
        CreateUserRequest request = CreateUserRequest.builder()
                .username("testuser")
                .email("test@example.com")
                .password("password123")
                .name("Test User")
                .build();
        
        User savedUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encodedPassword")
                .name("Test User")
                .build();
        
        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        
        // When
        User result = userService.createUser(request);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getUsername()).isEqualTo("testuser");
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        
        verify(userRepository).existsByUsername("testuser");
        verify(userRepository).existsByEmail("test@example.com");
        verify(passwordEncoder).encode("password123");
        verify(userRepository).save(any(User.class));
        verify(eventPublisher).publishEvent(any(UserCreatedEvent.class));
    }
    
    @ParameterizedTest
    @DisplayName("사용자 생성 - 유효성 검증 실패")
    @MethodSource("invalidUserRequests")
    void createUser_ValidationFailure(CreateUserRequest request, Class<? extends Exception> expectedException) {
        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(expectedException);
        
        verify(userRepository, never()).save(any(User.class));
    }
    
    static Stream<Arguments> invalidUserRequests() {
        return Stream.of(
                Arguments.of(
                        CreateUserRequest.builder().username("").build(),
                        ValidationException.class
                ),
                Arguments.of(
                        CreateUserRequest.builder().username("existinguser").build(),
                        DuplicateUserException.class
                )
        );
    }
}
```

### 2. 통합 테스트
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@Transactional
class UserControllerIntegrationTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private UserRepository userRepository;
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    
    @Test
    @DisplayName("사용자 생성 API - 성공")
    void createUser_Success() {
        // Given
        CreateUserRequest request = CreateUserRequest.builder()
                .username("newuser")
                .email("newuser@example.com")
                .password("password123")
                .name("New User")
                .build();
        
        // When
        ResponseEntity<UserResponse> response = restTemplate.postForEntity(
                "/api/users", request, UserResponse.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getUsername()).isEqualTo("newuser");
        
        // 데이터베이스 확인
        Optional<User> savedUser = userRepository.findByUsername("newuser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getEmail()).isEqualTo("newuser@example.com");
    }
}
```

## 📊 모니터링 및 로깅

### 1. 구조화된 로깅
```java
@RestController
@Slf4j
public class UserController {
    
    @PostMapping("/api/users")
    public ResponseEntity<UserResponse> createUser(@RequestBody CreateUserRequest request) {
        String correlationId = UUID.randomUUID().toString();
        
        // MDC를 사용한 컨텍스트 정보 추가
        MDC.put("correlationId", correlationId);
        MDC.put("operation", "createUser");
        MDC.put("username", request.getUsername());
        
        try {
            log.info("User creation started: username={}, email={}", 
                    request.getUsername(), request.getEmail());
            
            User user = userService.createUser(request);
            
            log.info("User creation completed: userId={}, username={}", 
                    user.getId(), user.getUsername());
            
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(UserResponse.from(user));
            
        } catch (DuplicateUserException e) {
            log.warn("User creation failed - duplicate: username={}, reason={}", 
                    request.getUsername(), e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("User creation failed: username={}", 
                    request.getUsername(), e);
            throw e;
        } finally {
            MDC.clear();
        }
    }
}
```

### 2. 메트릭 수집
```java
@Component
public class UserMetrics {
    
    private final Counter userCreationCounter;
    private final Timer userSearchTimer;
    private final Gauge activeUsersGauge;
    
    public UserMetrics(MeterRegistry meterRegistry, UserRepository userRepository) {
        this.userCreationCounter = Counter.builder("users.created.total")
                .description("Total number of users created")
                .register(meterRegistry);
        
        this.userSearchTimer = Timer.builder("users.search.duration")
                .description("User search duration")
                .register(meterRegistry);
        
        this.activeUsersGauge = Gauge.builder("users.active.count")
                .description("Number of active users")
                .register(meterRegistry, userRepository, this::countActiveUsers);
    }
    
    public void incrementUserCreation(String source) {
        userCreationCounter.increment(Tags.of("source", source));
    }
    
    public void recordSearchTime(Duration duration, String searchType) {
        userSearchTimer.record(duration, Tags.of("type", searchType));
    }
    
    private double countActiveUsers(UserRepository repository) {
        return repository.countByStatus(UserStatus.ACTIVE);
    }
}
```

## 🔧 설정 관리

### 1. 환경별 설정
```yaml
# application.yml (공통 설정)
spring:
  application:
    name: myapp
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:dev}

server:
  port: ${SERVER_PORT:8080}

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics

---
# application-dev.yml (개발 환경)
spring:
  config:
    activate:
      on-profile: dev
  
  datasource:
    url: jdbc:h2:mem:devdb
    driver-class-name: org.h2.Driver
  
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true

logging:
  level:
    com.example: DEBUG

---
# application-prod.yml (프로덕션 환경)
spring:
  config:
    activate:
      on-profile: prod
  
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

### 2. 외부 설정
```java
@ConfigurationProperties(prefix = "app")
@Data
@Component
public class AppProperties {
    
    private Security security = new Security();
    private Email email = new Email();
    private Storage storage = new Storage();
    
    @Data
    public static class Security {
        private String jwtSecret;
        private int jwtExpirationMs = 86400000;
        private int maxLoginAttempts = 5;
    }
    
    @Data
    public static class Email {
        private String host;
        private int port = 587;
        private String username;
        private String password;
        private boolean enabled = true;
    }
    
    @Data
    public static class Storage {
        private String type = "local";
        private String path = "/tmp/uploads";
        private long maxFileSize = 10485760; // 10MB
    }
}
```

## 📋 코드 품질

### 1. 정적 분석 도구
```xml
<!-- PMD -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-pmd-plugin</artifactId>
    <version>3.21.0</version>
    <configuration>
        <rulesets>
            <ruleset>/category/java/bestpractices.xml</ruleset>
            <ruleset>/category/java/codestyle.xml</ruleset>
            <ruleset>/category/java/design.xml</ruleset>
            <ruleset>/category/java/errorprone.xml</ruleset>
            <ruleset>/category/java/performance.xml</ruleset>
            <ruleset>/category/java/security.xml</ruleset>
        </rulesets>
    </configuration>
</plugin>

<!-- SpotBugs -->
<plugin>
    <groupId>com.github.spotbugs</groupId>
    <artifactId>spotbugs-maven-plugin</artifactId>
    <version>4.7.3.6</version>
</plugin>

<!-- Checkstyle -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-checkstyle-plugin</artifactId>
    <version>3.3.0</version>
    <configuration>
        <configLocation>checkstyle.xml</configLocation>
    </configuration>
</plugin>
```

### 2. 코드 포맷팅
```xml
<!-- Prettier Java -->
<plugin>
    <groupId>com.hubspot.maven.plugins</groupId>
    <artifactId>prettier-maven-plugin</artifactId>
    <version>0.19</version>
    <configuration>
        <prettierJavaVersion>2.0.0</prettierJavaVersion>
        <printWidth>120</printWidth>
        <tabWidth>4</tabWidth>
        <useTabs>false</useTabs>
    </configuration>
</plugin>
```

## 🚀 배포 및 운영

### 1. 헬스체크
```java
@Component
public class ApplicationHealthIndicator implements HealthIndicator {
    
    @Override
    public Health health() {
        // 애플리케이션 상태 확인 로직
        boolean isHealthy = checkApplicationHealth();
        
        if (isHealthy) {
            return Health.up()
                    .withDetail("status", "Application is running")
                    .withDetail("version", getClass().getPackage().getImplementationVersion())
                    .build();
        } else {
            return Health.down()
                    .withDetail("status", "Application is not healthy")
                    .build();
        }
    }
    
    private boolean checkApplicationHealth() {
        // 실제 헬스체크 로직 구현
        return true;
    }
}
```

### 2. Graceful Shutdown
```yaml
# application.yml
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

```java
@Component
@Slf4j
public class GracefulShutdownHandler {
    
    @PreDestroy
    public void onShutdown() {
        log.info("Application is shutting down gracefully...");
        
        // 진행 중인 작업 완료 대기
        // 리소스 정리
        // 연결 종료
        
        log.info("Application shutdown completed");
    }
}
```

---

이제 Spring Boot 애플리케이션 템플릿의 모든 문서가 완성되었습니다. 각 문서는 실무에서 바로 활용할 수 있는 상세한 가이드와 예제 코드를 포함하고 있습니다.