# Monitoring

Spring Boot 애플리케이션의 모니터링, 로깅, 알림 시스템 구축에 대한 포괄적인 가이드입니다.

## 📊 모니터링 아키텍처

### 모니터링 스택
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───►│   Prometheus    │───►│     Grafana     │
│   (Metrics)     │    │   (Collection)  │    │  (Visualization)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Logs          │───►│   ELK Stack     │───►│   Alertmanager  │
│   (Logback)     │    │   (Aggregation) │    │   (Alerting)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 관찰성 3요소
- **메트릭 (Metrics)** - 시스템 성능 지표
- **로그 (Logs)** - 애플리케이션 이벤트 기록
- **추적 (Traces)** - 분산 시스템 요청 추적

## 🎯 Spring Boot Actuator

### 1. Actuator 설정
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>

<!-- Micrometer Prometheus -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>

<!-- Distributed Tracing -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-brave</artifactId>
</dependency>
<dependency>
    <groupId>io.zipkin.reporter2</groupId>
    <artifactId>zipkin-reporter-brave</artifactId>
</dependency>
```

### 2. Actuator 엔드포인트 설정
```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,loggers,env,configprops
      base-path: /actuator
  endpoint:
    health:
      show-details: always
      show-components: always
      probes:
        enabled: true
    metrics:
      enabled: true
    prometheus:
      enabled: true
  
  # 메트릭 설정
  metrics:
    export:
      prometheus:
        enabled: true
        step: 10s
    distribution:
      percentiles-histogram:
        http.server.requests: true
        spring.data.repository.invocations: true
      percentiles:
        http.server.requests: 0.5, 0.95, 0.99
        spring.data.repository.invocations: 0.5, 0.95, 0.99
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active}
  
  # 추적 설정
  tracing:
    sampling:
      probability: 1.0
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans

# 애플리케이션 정보
info:
  app:
    name: ${spring.application.name}
    description: Spring Boot Application
    version: @project.version@
    encoding: @project.build.sourceEncoding@
    java:
      version: @java.version@
```

### 3. 커스텀 헬스 인디케이터
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
                        .withDetail("connectionPool", getConnectionPoolInfo())
                        .build();
            }
        } catch (SQLException e) {
            return Health.down()
                    .withDetail("database", "PostgreSQL")
                    .withDetail("error", e.getMessage())
                    .build();
        }
        
        return Health.down()
                .withDetail("database", "PostgreSQL")
                .withDetail("error", "Connection validation failed")
                .build();
    }
    
    private Map<String, Object> getConnectionPoolInfo() {
        Map<String, Object> details = new HashMap<>();
        if (dataSource instanceof HikariDataSource) {
            HikariPoolMXBean poolMXBean = ((HikariDataSource) dataSource).getHikariPoolMXBean();
            details.put("active", poolMXBean.getActiveConnections());
            details.put("idle", poolMXBean.getIdleConnections());
            details.put("total", poolMXBean.getTotalConnections());
            details.put("waiting", poolMXBean.getThreadsAwaitingConnection());
        }
        return details;
    }
}

@Component
public class ExternalServiceHealthIndicator implements HealthIndicator {
    
    private final RestTemplate restTemplate;
    
    @Value("${external.service.url}")
    private String externalServiceUrl;
    
    @Override
    public Health health() {
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    externalServiceUrl + "/health", String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                return Health.up()
                        .withDetail("externalService", "Available")
                        .withDetail("responseTime", measureResponseTime())
                        .build();
            } else {
                return Health.down()
                        .withDetail("externalService", "Unavailable")
                        .withDetail("statusCode", response.getStatusCode())
                        .build();
            }
        } catch (Exception e) {
            return Health.down()
                    .withDetail("externalService", "Unavailable")
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
    
    private long measureResponseTime() {
        long start = System.currentTimeMillis();
        try {
            restTemplate.getForEntity(externalServiceUrl + "/health", String.class);
        } catch (Exception e) {
            // 무시
        }
        return System.currentTimeMillis() - start;
    }
}
```

## 📈 커스텀 메트릭

### 1. 비즈니스 메트릭 수집
```java
@Service
public class UserService {
    
    private final UserRepository userRepository;
    private final Counter userRegistrationCounter;
    private final Timer userSearchTimer;
    private final Gauge activeUsersGauge;
    
    public UserService(UserRepository userRepository, MeterRegistry meterRegistry) {
        this.userRepository = userRepository;
        
        // 카운터 메트릭
        this.userRegistrationCounter = Counter.builder("user.registrations")
                .description("Number of user registrations")
                .tag("type", "registration")
                .register(meterRegistry);
        
        // 타이머 메트릭
        this.userSearchTimer = Timer.builder("user.search.duration")
                .description("User search duration")
                .register(meterRegistry);
        
        // 게이지 메트릭
        this.activeUsersGauge = Gauge.builder("user.active.count")
                .description("Number of active users")
                .register(meterRegistry, this, UserService::getActiveUserCount);
    }
    
    public User createUser(CreateUserRequest request) {
        User user = new User(request.getUsername(), request.getEmail(), request.getPassword());
        User savedUser = userRepository.save(user);
        
        // 메트릭 증가
        userRegistrationCounter.increment(
                Tags.of("source", request.getSource(), "plan", request.getPlan()));
        
        return savedUser;
    }
    
    public Optional<User> findByUsername(String username) {
        return Timer.Sample.start()
                .stop(userSearchTimer.tag("method", "username"))
                .recordCallable(() -> userRepository.findByUsername(username));
    }
    
    private double getActiveUserCount() {
        return userRepository.countByLastLoginAfter(
                LocalDateTime.now().minusDays(30));
    }
}
```

### 2. HTTP 요청 메트릭
```java
@Component
public class HttpMetricsFilter implements Filter {
    
    private final MeterRegistry meterRegistry;
    private final Timer httpRequestTimer;
    private final Counter httpRequestCounter;
    
    public HttpMetricsFilter(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.httpRequestTimer = Timer.builder("http.requests")
                .description("HTTP request duration")
                .register(meterRegistry);
        this.httpRequestCounter = Counter.builder("http.requests.total")
                .description("Total HTTP requests")
                .register(meterRegistry);
    }
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        Timer.Sample sample = Timer.Sample.start(meterRegistry);
        
        try {
            chain.doFilter(request, response);
        } finally {
            String method = httpRequest.getMethod();
            String uri = httpRequest.getRequestURI();
            String status = String.valueOf(httpResponse.getStatus());
            
            Tags tags = Tags.of(
                    "method", method,
                    "uri", uri,
                    "status", status
            );
            
            sample.stop(httpRequestTimer.tag(tags));
            httpRequestCounter.increment(tags);
        }
    }
}
```

### 3. 데이터베이스 메트릭
```java
@Component
public class DatabaseMetrics {
    
    private final DataSource dataSource;
    private final MeterRegistry meterRegistry;
    
    public DatabaseMetrics(DataSource dataSource, MeterRegistry meterRegistry) {
        this.dataSource = dataSource;
        this.meterRegistry = meterRegistry;
        
        // 연결 풀 메트릭
        if (dataSource instanceof HikariDataSource) {
            HikariDataSource hikariDataSource = (HikariDataSource) dataSource;
            
            Gauge.builder("hikari.connections.active")
                    .register(meterRegistry, hikariDataSource, 
                            ds -> ds.getHikariPoolMXBean().getActiveConnections());
            
            Gauge.builder("hikari.connections.idle")
                    .register(meterRegistry, hikariDataSource,
                            ds -> ds.getHikariPoolMXBean().getIdleConnections());
            
            Gauge.builder("hikari.connections.pending")
                    .register(meterRegistry, hikariDataSource,
                            ds -> ds.getHikariPoolMXBean().getThreadsAwaitingConnection());
        }
    }
    
    @EventListener
    public void handleQueryExecution(QueryExecutionEvent event) {
        Timer.builder("database.query.duration")
                .tag("query.type", event.getQueryType())
                .tag("table", event.getTableName())
                .register(meterRegistry)
                .record(event.getDuration(), TimeUnit.MILLISECONDS);
    }
}
```

## 📝 로깅 시스템

### 1. Logback 설정
```xml
<!-- logback-spring.xml -->
<configuration>
    <springProfile name="!prod">
        <!-- 개발 환경 설정 -->
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
            </encoder>
        </appender>
        
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>
    
    <springProfile name="prod">
        <!-- 프로덕션 환경 설정 -->
        <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
            <file>logs/application.log</file>
            <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
                <fileNamePattern>logs/application.%d{yyyy-MM-dd}.%i.gz</fileNamePattern>
                <maxFileSize>100MB</maxFileSize>
                <maxHistory>30</maxHistory>
                <totalSizeCap>3GB</totalSizeCap>
            </rollingPolicy>
            <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
                <providers>
                    <timestamp/>
                    <version/>
                    <logLevel/>
                    <message/>
                    <mdc/>
                    <arguments/>
                    <stackTrace/>
                    <pattern>
                        <pattern>
                            {
                                "traceId": "%X{traceId:-}",
                                "spanId": "%X{spanId:-}",
                                "service": "${spring.application.name:-}",
                                "environment": "${spring.profiles.active:-}"
                            }
                        </pattern>
                    </pattern>
                </providers>
            </encoder>
        </appender>
        
        <appender name="ERROR_FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
            <file>logs/error.log</file>
            <filter class="ch.qos.logback.classic.filter.LevelFilter">
                <level>ERROR</level>
                <onMatch>ACCEPT</onMatch>
                <onMismatch>DENY</onMismatch>
            </filter>
            <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
                <fileNamePattern>logs/error.%d{yyyy-MM-dd}.%i.gz</fileNamePattern>
                <maxFileSize>50MB</maxFileSize>
                <maxHistory>60</maxHistory>
            </rollingPolicy>
            <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
                <providers>
                    <timestamp/>
                    <logLevel/>
                    <message/>
                    <mdc/>
                    <stackTrace/>
                </providers>
            </encoder>
        </appender>
        
        <root level="INFO">
            <appender-ref ref="FILE"/>
            <appender-ref ref="ERROR_FILE"/>
        </root>
    </springProfile>
    
    <!-- 특정 패키지 로그 레벨 설정 -->
    <logger name="com.example.myapp" level="DEBUG"/>
    <logger name="org.springframework.security" level="DEBUG"/>
    <logger name="org.hibernate.SQL" level="DEBUG"/>
    <logger name="org.hibernate.type.descriptor.sql.BasicBinder" level="TRACE"/>
    
    <!-- 외부 라이브러리 로그 레벨 조정 -->
    <logger name="org.apache.http" level="WARN"/>
    <logger name="org.springframework.web.client" level="WARN"/>
</configuration>
```

### 2. 구조화된 로깅
```java
@RestController
@Slf4j
public class UserController {
    
    private final UserService userService;
    
    @PostMapping("/api/users")
    public ResponseEntity<User> createUser(@RequestBody @Valid CreateUserRequest request) {
        // MDC를 사용한 컨텍스트 정보 추가
        MDC.put("operation", "createUser");
        MDC.put("username", request.getUsername());
        
        try {
            log.info("Creating user: username={}, email={}", 
                    request.getUsername(), request.getEmail());
            
            User user = userService.createUser(request);
            
            log.info("User created successfully: userId={}, username={}", 
                    user.getId(), user.getUsername());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(user);
            
        } catch (DuplicateUserException e) {
            log.warn("User creation failed - duplicate username: username={}", 
                    request.getUsername(), e);
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

@Component
@Slf4j
public class AuditLogger {
    
    public void logUserAction(String username, String action, Object details) {
        Map<String, Object> auditLog = Map.of(
                "timestamp", Instant.now(),
                "username", username,
                "action", action,
                "details", details,
                "sessionId", getSessionId(),
                "ipAddress", getClientIpAddress()
        );
        
        log.info("AUDIT: {}", auditLog);
    }
    
    private String getSessionId() {
        // 세션 ID 추출 로직
        return "session-id";
    }
    
    private String getClientIpAddress() {
        // 클라이언트 IP 추출 로직
        return "client-ip";
    }
}
```

### 3. 로그 집중화 (ELK Stack)
```yaml
# docker-compose.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    ports:
      - "5044:5044"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.0
    user: root
    volumes:
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - logstash

volumes:
  elasticsearch_data:
```

## 🔍 분산 추적 (Distributed Tracing)

### 1. Zipkin 설정
```yaml
# application.yml
management:
  tracing:
    sampling:
      probability: 1.0
  zipkin:
    tracing:
      endpoint: http://zipkin:9411/api/v2/spans

logging:
  pattern:
    level: "%5p [${spring.application.name:},%X{traceId:-},%X{spanId:-}]"
```

### 2. 커스텀 스팬 생성
```java
@Service
@Slf4j
public class UserService {
    
    private final UserRepository userRepository;
    private final Tracer tracer;
    
    public UserService(UserRepository userRepository, Tracer tracer) {
        this.userRepository = userRepository;
        this.tracer = tracer;
    }
    
    public User createUser(CreateUserRequest request) {
        Span span = tracer.nextSpan()
                .name("user-creation")
                .tag("user.username", request.getUsername())
                .tag("user.email", request.getEmail())
                .start();
        
        try (Tracer.SpanInScope ws = tracer.withSpanInScope(span)) {
            log.info("Creating user: {}", request.getUsername());
            
            // 비즈니스 로직 실행
            User user = new User(request.getUsername(), request.getEmail(), request.getPassword());
            
            // 데이터베이스 저장 (자동으로 스팬 생성됨)
            User savedUser = userRepository.save(user);
            
            span.tag("user.id", String.valueOf(savedUser.getId()));
            span.event("user.created");
            
            return savedUser;
            
        } catch (Exception e) {
            span.tag("error", e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
    
    @NewSpan("user-search")
    public Optional<User> findByUsername(@SpanTag("username") String username) {
        return userRepository.findByUsername(username);
    }
}
```

## 📊 Prometheus & Grafana

### 1. Prometheus 설정
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'spring-boot-app'
    static_configs:
      - targets: ['app:8080']
    metrics_path: '/actuator/prometheus'
    scrape_interval: 10s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### 2. 알림 규칙
```yaml
# alert_rules.yml
groups:
  - name: spring-boot-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }} seconds"

      - alert: DatabaseConnectionPoolExhausted
        expr: hikari_connections_active / hikari_connections_max > 0.9
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Connection pool usage is {{ $value | humanizePercentage }}"

      - alert: ApplicationDown
        expr: up{job="spring-boot-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Application is down"
          description: "Spring Boot application has been down for more than 1 minute"
```

### 3. Grafana 대시보드
```json
{
  "dashboard": {
    "title": "Spring Boot Application Dashboard",
    "panels": [
      {
        "title": "HTTP Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{uri}}"
          }
        ]
      },
      {
        "title": "Response Time Percentiles",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile"
          },
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "99th percentile"
          }
        ]
      },
      {
        "title": "Database Connection Pool",
        "type": "graph",
        "targets": [
          {
            "expr": "hikari_connections_active",
            "legendFormat": "Active Connections"
          },
          {
            "expr": "hikari_connections_idle",
            "legendFormat": "Idle Connections"
          },
          {
            "expr": "hikari_connections_pending",
            "legendFormat": "Pending Connections"
          }
        ]
      },
      {
        "title": "JVM Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "jvm_memory_used_bytes{area=\"heap\"}",
            "legendFormat": "Heap Used"
          },
          {
            "expr": "jvm_memory_max_bytes{area=\"heap\"}",
            "legendFormat": "Heap Max"
          }
        ]
      }
    ]
  }
}
```

## 🚨 알림 시스템

### 1. Alertmanager 설정
```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@example.com'
  smtp_auth_username: 'alerts@example.com'
  smtp_auth_password: 'password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://webhook:5000/alerts'

  - name: 'critical-alerts'
    email_configs:
      - to: 'oncall@example.com'
        subject: 'CRITICAL: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        title: 'CRITICAL Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

  - name: 'warning-alerts'
    email_configs:
      - to: 'team@example.com'
        subject: 'WARNING: {{ .GroupLabels.alertname }}'
```

### 2. 애플리케이션 내 알림
```java
@Component
@Slf4j
public class AlertService {
    
    private final SlackWebhookClient slackClient;
    private final EmailService emailService;
    private final MeterRegistry meterRegistry;
    
    @EventListener
    public void handleCriticalError(CriticalErrorEvent event) {
        log.error("Critical error occurred: {}", event.getMessage(), event.getException());
        
        // 메트릭 증가
        meterRegistry.counter("alerts.critical.total",
                Tags.of("type", event.getType(), "component", event.getComponent()))
                .increment();
        
        // Slack 알림
        sendSlackAlert(event);
        
        // 이메일 알림
        sendEmailAlert(event);
    }
    
    private void sendSlackAlert(CriticalErrorEvent event) {
        SlackMessage message = SlackMessage.builder()
                .channel("#alerts")
                .username("AlertBot")
                .iconEmoji(":warning:")
                .text("🚨 CRITICAL ERROR 🚨")
                .attachment(SlackAttachment.builder()
                        .color("danger")
                        .title("Critical Error in " + event.getComponent())
                        .text(event.getMessage())
                        .field(SlackField.builder()
                                .title("Environment")
                                .value(getEnvironment())
                                .shortField(true)
                                .build())
                        .field(SlackField.builder()
                                .title("Timestamp")
                                .value(event.getTimestamp().toString())
                                .shortField(true)
                                .build())
                        .build())
                .build();
        
        slackClient.send(message);
    }
    
    private void sendEmailAlert(CriticalErrorEvent event) {
        EmailAlert alert = EmailAlert.builder()
                .to("oncall@example.com")
                .subject("CRITICAL: " + event.getComponent() + " Error")
                .body(buildEmailBody(event))
                .priority(EmailPriority.HIGH)
                .build();
        
        emailService.send(alert);
    }
}
```

## 📱 모니터링 대시보드

### 1. 실시간 대시보드
```java
@RestController
@RequestMapping("/api/monitoring")
public class MonitoringController {
    
    private final MeterRegistry meterRegistry;
    private final HealthEndpoint healthEndpoint;
    
    @GetMapping("/dashboard")
    public ResponseEntity<DashboardData> getDashboardData() {
        DashboardData data = DashboardData.builder()
                .health(getHealthStatus())
                .metrics(getCurrentMetrics())
                .alerts(getActiveAlerts())
                .build();
        
        return ResponseEntity.ok(data);
    }
    
    @GetMapping("/metrics/summary")
    public ResponseEntity<MetricsSummary> getMetricsSummary() {
        MetricsSummary summary = MetricsSummary.builder()
                .requestRate(getRequestRate())
                .errorRate(getErrorRate())
                .responseTime(getAverageResponseTime())
                .activeUsers(getActiveUserCount())
                .databaseConnections(getDatabaseConnectionInfo())
                .build();
        
        return ResponseEntity.ok(summary);
    }
    
    private double getRequestRate() {
        return meterRegistry.get("http.requests")
                .functionCounter()
                .count();
    }
    
    private double getErrorRate() {
        return meterRegistry.get("http.requests")
                .tags("status", "500")
                .functionCounter()
                .count();
    }
}
```

### 2. 모니터링 웹 인터페이스
```html
<!DOCTYPE html>
<html>
<head>
    <title>Application Monitoring Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="dashboard">
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>Request Rate</h3>
                <div id="request-rate-chart"></div>
            </div>
            <div class="metric-card">
                <h3>Response Time</h3>
                <div id="response-time-chart"></div>
            </div>
            <div class="metric-card">
                <h3>Error Rate</h3>
                <div id="error-rate-chart"></div>
            </div>
            <div class="metric-card">
                <h3>Database Connections</h3>
                <div id="db-connections-chart"></div>
            </div>
        </div>
    </div>
    
    <script>
        // 실시간 데이터 업데이트
        setInterval(updateDashboard, 5000);
        
        function updateDashboard() {
            fetch('/api/monitoring/metrics/summary')
                .then(response => response.json())
                .then(data => {
                    updateCharts(data);
                });
        }
        
        function updateCharts(data) {
            // 차트 업데이트 로직
        }
    </script>
</body>
</html>
```

---

다음: **[Best Practices](best-practices.md)** - 개발 모범 사례 가이드