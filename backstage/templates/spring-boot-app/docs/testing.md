# Testing

Spring Boot 애플리케이션의 포괄적인 테스트 전략, 도구, 모범 사례에 대한 가이드입니다.

## 🧪 테스트 전략

### 테스트 피라미드
```
        /\
       /  \
      / E2E \     ← 적은 수의 End-to-End 테스트
     /______\
    /        \
   /Integration\ ← 중간 수의 통합 테스트
  /____________\
 /              \
/   Unit Tests   \ ← 많은 수의 단위 테스트
/________________\
```

### 테스트 유형별 비율
- **단위 테스트 (70%)**: 개별 컴포넌트 테스트
- **통합 테스트 (20%)**: 컴포넌트 간 상호작용 테스트
- **E2E 테스트 (10%)**: 전체 애플리케이션 플로우 테스트

## 🔧 테스트 환경 설정

### 1. 의존성 추가
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>

<!-- TestContainers -->
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

<!-- WireMock -->
<dependency>
    <groupId>com.github.tomakehurst</groupId>
    <artifactId>wiremock-jre8</artifactId>
    <scope>test</scope>
</dependency>
```

### 2. 테스트 설정 파일
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
    properties:
      hibernate:
        format_sql: true
        
  sql:
    init:
      mode: always
      data-locations: classpath:test-data.sql
      
logging:
  level:
    com.example: DEBUG
    org.springframework.web: DEBUG
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

## 🎯 단위 테스트 (Unit Tests)

### 1. Service 계층 테스트
```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @InjectMocks
    private UserService userService;
    
    @Test
    @DisplayName("사용자 생성 - 성공")
    void createUser_Success() {
        // Given
        CreateUserRequest request = new CreateUserRequest("testuser", "test@example.com", "password123");
        User savedUser = new User("testuser", "test@example.com", "encodedPassword");
        savedUser.setId(1L);
        
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
    }
    
    @Test
    @DisplayName("사용자 생성 - 중복 사용자명으로 실패")
    void createUser_DuplicateUsername_ThrowsException() {
        // Given
        CreateUserRequest request = new CreateUserRequest("existinguser", "test@example.com", "password123");
        when(userRepository.existsByUsername("existinguser")).thenReturn(true);
        
        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
                .isInstanceOf(DuplicateUserException.class)
                .hasMessage("사용자명이 이미 존재합니다: existinguser");
        
        verify(userRepository).existsByUsername("existinguser");
        verify(userRepository, never()).save(any(User.class));
    }
    
    @ParameterizedTest
    @DisplayName("사용자 검색 - 다양한 조건")
    @CsvSource({
        "john, john@example.com, true",
        "jane, jane@example.com, true",
        "nonexistent, none@example.com, false"
    })
    void findUser_VariousConditions(String username, String email, boolean shouldExist) {
        // Given
        if (shouldExist) {
            User user = new User(username, email, "password");
            when(userRepository.findByUsername(username)).thenReturn(Optional.of(user));
        } else {
            when(userRepository.findByUsername(username)).thenReturn(Optional.empty());
        }
        
        // When
        Optional<User> result = userService.findByUsername(username);
        
        // Then
        assertThat(result.isPresent()).isEqualTo(shouldExist);
        if (shouldExist) {
            assertThat(result.get().getUsername()).isEqualTo(username);
            assertThat(result.get().getEmail()).isEqualTo(email);
        }
    }
}
```

### 2. Repository 계층 테스트
```java
@DataJpaTest
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class UserRepositoryTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private UserRepository userRepository;
    
    @Test
    @DisplayName("사용자명으로 사용자 찾기")
    void findByUsername_ExistingUser_ReturnsUser() {
        // Given
        User user = new User("testuser", "test@example.com", "password");
        entityManager.persistAndFlush(user);
        
        // When
        Optional<User> found = userRepository.findByUsername("testuser");
        
        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getUsername()).isEqualTo("testuser");
        assertThat(found.get().getEmail()).isEqualTo("test@example.com");
    }
    
    @Test
    @DisplayName("이메일로 사용자 찾기")
    void findByEmail_ExistingUser_ReturnsUser() {
        // Given
        User user = new User("testuser", "test@example.com", "password");
        entityManager.persistAndFlush(user);
        
        // When
        Optional<User> found = userRepository.findByEmail("test@example.com");
        
        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("test@example.com");
    }
    
    @Test
    @DisplayName("생성일 범위로 사용자 찾기")
    void findByCreatedAtBetween_ReturnsUsersInRange() {
        // Given
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now().plusDays(1);
        
        User user1 = new User("user1", "user1@example.com", "password");
        User user2 = new User("user2", "user2@example.com", "password");
        entityManager.persistAndFlush(user1);
        entityManager.persistAndFlush(user2);
        
        // When
        List<User> users = userRepository.findByCreatedAtBetween(start, end);
        
        // Then
        assertThat(users).hasSize(2);
        assertThat(users).extracting(User::getUsername)
                .containsExactlyInAnyOrder("user1", "user2");
    }
}
```

## 🔗 통합 테스트 (Integration Tests)

### 1. Web 계층 테스트
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
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
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    
    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }
    
    @Test
    @DisplayName("사용자 등록 - 성공")
    void registerUser_Success() {
        // Given
        SignUpRequest request = new SignUpRequest("John Doe", "johndoe", "john@example.com", "password123");
        
        // When
        ResponseEntity<ApiResponse> response = restTemplate.postForEntity(
                "/api/auth/register", request, ApiResponse.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getSuccess()).isTrue();
        assertThat(response.getBody().getMessage()).contains("성공적으로 등록");
        
        // 데이터베이스 확인
        Optional<User> savedUser = userRepository.findByUsername("johndoe");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getEmail()).isEqualTo("john@example.com");
    }
    
    @Test
    @DisplayName("사용자 로그인 - 성공")
    void loginUser_Success() {
        // Given
        User user = new User("John Doe", "johndoe", "john@example.com", 
                           passwordEncoder.encode("password123"));
        userRepository.save(user);
        
        LoginRequest request = new LoginRequest("johndoe", "password123");
        
        // When
        ResponseEntity<JwtAuthenticationResponse> response = restTemplate.postForEntity(
                "/api/auth/login", request, JwtAuthenticationResponse.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getAccessToken()).isNotBlank();
        assertThat(response.getBody().getRefreshToken()).isNotBlank();
    }
    
    @Test
    @DisplayName("인증된 사용자 정보 조회")
    void getCurrentUser_WithValidToken_ReturnsUserInfo() {
        // Given
        User user = createAndSaveUser();
        String token = generateTokenForUser(user);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        // When
        ResponseEntity<UserSummary> response = restTemplate.exchange(
                "/api/user/me", HttpMethod.GET, entity, UserSummary.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getUsername()).isEqualTo(user.getUsername());
        assertThat(response.getBody().getEmail()).isEqualTo(user.getEmail());
    }
}
```

### 2. MockMvc를 사용한 웹 계층 테스트
```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private UserService userService;
    
    @MockBean
    private JwtTokenProvider tokenProvider;
    
    @Test
    @DisplayName("사용자 목록 조회 - 관리자 권한")
    @WithMockUser(roles = "ADMIN")
    void getAllUsers_WithAdminRole_ReturnsUserList() throws Exception {
        // Given
        List<User> users = Arrays.asList(
                new User("user1", "user1@example.com", "password"),
                new User("user2", "user2@example.com", "password")
        );
        when(userService.findAll()).thenReturn(users);
        
        // When & Then
        mockMvc.perform(get("/api/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].username", is("user1")))
                .andExpect(jsonPath("$[1].username", is("user2")));
        
        verify(userService).findAll();
    }
    
    @Test
    @DisplayName("사용자 생성 - 유효하지 않은 입력")
    @WithMockUser(roles = "ADMIN")
    void createUser_InvalidInput_ReturnsBadRequest() throws Exception {
        // Given
        CreateUserRequest invalidRequest = new CreateUserRequest("", "invalid-email", "123");
        
        // When & Then
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors", hasSize(greaterThan(0))));
    }
}
```

## 🐳 TestContainers를 사용한 통합 테스트

### 1. 데이터베이스 통합 테스트
```java
@SpringBootTest
@Testcontainers
class DatabaseIntegrationTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test")
            .withInitScript("init-test-data.sql");
    
    @Container
    static RedisContainer redis = new RedisContainer("redis:7.2-alpine")
            .withExposedPorts(6379);
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        // PostgreSQL 설정
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        
        // Redis 설정
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", redis::getFirstMappedPort);
    }
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    
    @Test
    @DisplayName("데이터베이스와 캐시 통합 테스트")
    void databaseAndCacheIntegration() {
        // Given
        User user = new User("testuser", "test@example.com", "password");
        
        // When
        User savedUser = userRepository.save(user);
        redisTemplate.opsForValue().set("user:" + savedUser.getId(), savedUser);
        
        // Then
        Optional<User> foundUser = userRepository.findById(savedUser.getId());
        Object cachedUser = redisTemplate.opsForValue().get("user:" + savedUser.getId());
        
        assertThat(foundUser).isPresent();
        assertThat(cachedUser).isNotNull();
    }
}
```

### 2. 외부 API 모킹
```java
@SpringBootTest
@Testcontainers
class ExternalApiIntegrationTest {
    
    @Container
    static WireMockContainer wireMock = new WireMockContainer("wiremock/wiremock:2.35.0")
            .withMappingFromResource("external-api-mappings.json");
    
    @Autowired
    private ExternalApiClient externalApiClient;
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("external.api.base-url", 
                () -> "http://localhost:" + wireMock.getFirstMappedPort());
    }
    
    @Test
    @DisplayName("외부 API 호출 테스트")
    void callExternalApi_Success() {
        // Given
        wireMock.stubFor(get(urlEqualTo("/api/users/1"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"id\":1,\"name\":\"John Doe\"}")));
        
        // When
        ExternalUser user = externalApiClient.getUser(1L);
        
        // Then
        assertThat(user).isNotNull();
        assertThat(user.getId()).isEqualTo(1L);
        assertThat(user.getName()).isEqualTo("John Doe");
    }
}
```

## 🎭 테스트 더블 (Test Doubles)

### 1. Mock 사용
```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    
    @Mock
    private PaymentService paymentService;
    
    @Mock
    private InventoryService inventoryService;
    
    @Mock
    private NotificationService notificationService;
    
    @InjectMocks
    private OrderService orderService;
    
    @Test
    @DisplayName("주문 처리 - 성공 시나리오")
    void processOrder_Success() {
        // Given
        Order order = new Order(1L, "PRODUCT_001", 2, BigDecimal.valueOf(100));
        
        when(inventoryService.isAvailable("PRODUCT_001", 2)).thenReturn(true);
        when(paymentService.processPayment(order.getTotalAmount())).thenReturn(true);
        
        // When
        OrderResult result = orderService.processOrder(order);
        
        // Then
        assertThat(result.isSuccess()).isTrue();
        
        verify(inventoryService).isAvailable("PRODUCT_001", 2);
        verify(inventoryService).reserveItems("PRODUCT_001", 2);
        verify(paymentService).processPayment(BigDecimal.valueOf(200));
        verify(notificationService).sendOrderConfirmation(order);
    }
    
    @Test
    @DisplayName("주문 처리 - 재고 부족으로 실패")
    void processOrder_InsufficientInventory_Fails() {
        // Given
        Order order = new Order(1L, "PRODUCT_001", 10, BigDecimal.valueOf(100));
        
        when(inventoryService.isAvailable("PRODUCT_001", 10)).thenReturn(false);
        
        // When
        OrderResult result = orderService.processOrder(order);
        
        // Then
        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getErrorMessage()).contains("재고 부족");
        
        verify(inventoryService).isAvailable("PRODUCT_001", 10);
        verify(paymentService, never()).processPayment(any());
        verify(notificationService, never()).sendOrderConfirmation(any());
    }
}
```

### 2. Spy 사용
```java
@ExtendWith(MockitoExtension.class)
class CacheServiceTest {
    
    @Spy
    private CacheService cacheService = new CacheService();
    
    @Test
    @DisplayName("캐시 히트 테스트")
    void cache_Hit_DoesNotCallExpensiveOperation() {
        // Given
        String key = "test-key";
        String cachedValue = "cached-value";
        doReturn(cachedValue).when(cacheService).getFromCache(key);
        
        // When
        String result = cacheService.getValue(key);
        
        // Then
        assertThat(result).isEqualTo(cachedValue);
        verify(cacheService).getFromCache(key);
        verify(cacheService, never()).expensiveOperation(key);
    }
}
```

## 🔄 테스트 데이터 관리

### 1. 테스트 데이터 빌더 패턴
```java
public class UserTestDataBuilder {
    
    private String name = "Test User";
    private String username = "testuser";
    private String email = "test@example.com";
    private String password = "password123";
    private Set<Role> roles = new HashSet<>();
    
    public static UserTestDataBuilder aUser() {
        return new UserTestDataBuilder();
    }
    
    public UserTestDataBuilder withName(String name) {
        this.name = name;
        return this;
    }
    
    public UserTestDataBuilder withUsername(String username) {
        this.username = username;
        return this;
    }
    
    public UserTestDataBuilder withEmail(String email) {
        this.email = email;
        return this;
    }
    
    public UserTestDataBuilder withPassword(String password) {
        this.password = password;
        return this;
    }
    
    public UserTestDataBuilder withRole(Role role) {
        this.roles.add(role);
        return this;
    }
    
    public User build() {
        User user = new User(name, username, email, password);
        user.setRoles(roles);
        return user;
    }
}

// 사용 예시
@Test
void testUserCreation() {
    User admin = UserTestDataBuilder.aUser()
            .withUsername("admin")
            .withEmail("admin@example.com")
            .withRole(Role.ADMIN)
            .build();
    
    User regularUser = UserTestDataBuilder.aUser()
            .withUsername("user")
            .withRole(Role.USER)
            .build();
}
```

### 2. 테스트 픽스처
```java
@TestConfiguration
public class TestDataConfig {
    
    @Bean
    @Primary
    public TestDataInitializer testDataInitializer() {
        return new TestDataInitializer();
    }
}

@Component
public class TestDataInitializer {
    
    public User createTestUser() {
        return UserTestDataBuilder.aUser()
                .withUsername("testuser")
                .withEmail("test@example.com")
                .build();
    }
    
    public User createAdminUser() {
        return UserTestDataBuilder.aUser()
                .withUsername("admin")
                .withEmail("admin@example.com")
                .withRole(Role.ADMIN)
                .build();
    }
    
    public List<User> createMultipleUsers(int count) {
        return IntStream.range(0, count)
                .mapToObj(i -> UserTestDataBuilder.aUser()
                        .withUsername("user" + i)
                        .withEmail("user" + i + "@example.com")
                        .build())
                .collect(Collectors.toList());
    }
}
```

## 📊 테스트 커버리지

### 1. JaCoCo 설정
```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.8</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
        <execution>
            <id>check</id>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>PACKAGE</element>
                        <limits>
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.80</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### 2. 커버리지 리포트 생성
```bash
# 테스트 실행 및 커버리지 리포트 생성
./mvnw clean test jacoco:report

# 커버리지 체크
./mvnw jacoco:check

# 리포트 확인
open target/site/jacoco/index.html
```

## 🚀 성능 테스트

### 1. JMH를 사용한 마이크로 벤치마크
```java
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@State(Scope.Benchmark)
public class UserServiceBenchmark {
    
    private UserService userService;
    private UserRepository userRepository;
    
    @Setup
    public void setup() {
        userRepository = Mockito.mock(UserRepository.class);
        userService = new UserService(userRepository, new BCryptPasswordEncoder());
    }
    
    @Benchmark
    public User testUserCreation() {
        CreateUserRequest request = new CreateUserRequest("testuser", "test@example.com", "password");
        return userService.createUser(request);
    }
    
    @Benchmark
    public Optional<User> testUserSearch() {
        when(userRepository.findByUsername("testuser"))
                .thenReturn(Optional.of(new User("testuser", "test@example.com", "password")));
        return userService.findByUsername("testuser");
    }
}
```

### 2. 부하 테스트 (Gatling)
```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._

class UserApiLoadTest extends Simulation {
  
  val httpProtocol = http
    .baseUrl("http://localhost:8080")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
  
  val scn = scenario("User API Load Test")
    .exec(http("Create User")
      .post("/api/users")
      .body(StringBody("""{"username":"user${userId}","email":"user${userId}@example.com","password":"password123"}"""))
      .check(status.is(201)))
    .pause(1)
    .exec(http("Get User")
      .get("/api/users/${userId}")
      .check(status.is(200)))
  
  setUp(
    scn.inject(rampUsers(100) during (30 seconds))
  ).protocols(httpProtocol)
}
```

## 🔧 테스트 실행 및 자동화

### 1. Maven 테스트 실행
```bash
# 모든 테스트 실행
./mvnw test

# 특정 테스트 클래스 실행
./mvnw test -Dtest=UserServiceTest

# 특정 테스트 메서드 실행
./mvnw test -Dtest=UserServiceTest#createUser_Success

# 통합 테스트만 실행
./mvnw test -Dtest=**/*IntegrationTest

# 테스트 스킵
./mvnw install -DskipTests

# 병렬 테스트 실행
./mvnw test -T 4
```

### 2. 테스트 프로파일 설정
```yaml
# application-test.yml
spring:
  profiles:
    active: test
  test:
    database:
      replace: none
  jpa:
    show-sql: true
    hibernate:
      ddl-auto: create-drop

logging:
  level:
    org.springframework.test: DEBUG
    org.testcontainers: INFO
```

### 3. CI/CD 파이프라인에서 테스트
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Cache Maven dependencies
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
      
      - name: Run tests
        run: ./mvnw clean test
      
      - name: Generate test report
        run: ./mvnw jacoco:report
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./target/site/jacoco/jacoco.xml
```

## 📋 테스트 모범 사례

### 1. 테스트 명명 규칙
```java
// Given-When-Then 패턴
@Test
@DisplayName("사용자 생성 - 유효한 입력으로 성공")
void createUser_WithValidInput_ReturnsCreatedUser() {
    // Given (준비)
    CreateUserRequest request = new CreateUserRequest("testuser", "test@example.com", "password123");
    
    // When (실행)
    User result = userService.createUser(request);
    
    // Then (검증)
    assertThat(result).isNotNull();
    assertThat(result.getUsername()).isEqualTo("testuser");
}
```

### 2. 어설션 모범 사례
```java
// AssertJ 사용 권장
assertThat(users)
    .hasSize(3)
    .extracting(User::getUsername)
    .containsExactlyInAnyOrder("user1", "user2", "user3");

// 복합 어설션
assertThat(user)
    .satisfies(u -> {
        assertThat(u.getUsername()).isEqualTo("testuser");
        assertThat(u.getEmail()).isEqualTo("test@example.com");
        assertThat(u.getCreatedAt()).isNotNull();
    });
```

### 3. 테스트 격리
```java
@TestMethodOrder(OrderAnnotation.class)
class UserServiceIntegrationTest {
    
    @BeforeEach
    void setUp() {
        // 각 테스트 전에 데이터 초기화
        userRepository.deleteAll();
    }
    
    @AfterEach
    void tearDown() {
        // 각 테스트 후에 정리
        userRepository.deleteAll();
    }
}
```

---

다음: **[Deployment](deployment.md)** - 배포 및 운영 가이드