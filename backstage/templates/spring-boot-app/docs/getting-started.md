# Getting Started

Spring Boot 애플리케이션 템플릿으로 생성된 프로젝트를 시작하는 방법을 안내합니다.

## 📋 사전 요구사항

### 필수 도구
- **Java 17+** - OpenJDK 또는 Oracle JDK
- **Maven 3.8+** 또는 **Gradle 7.0+** - 빌드 도구
- **Git** - 버전 관리
- **IDE** - IntelliJ IDEA, Eclipse, VS Code 등

### 권장 도구
- **Docker** - 컨테이너 실행 환경
- **Postman** - API 테스트 도구
- **DBeaver** - 데이터베이스 관리 도구

## 🚀 프로젝트 설정

### 1. 저장소 클론
```bash
git clone <your-repository-url>
cd <your-project-name>
```

### 2. 의존성 설치
```bash
# Maven 사용 시
./mvnw clean install

# Gradle 사용 시
./gradlew build
```

### 3. 애플리케이션 실행
```bash
# Maven 사용 시
./mvnw spring-boot:run

# Gradle 사용 시
./gradlew bootRun

# JAR 파일 실행
java -jar target/<your-app-name>-0.0.1-SNAPSHOT.jar
```

### 4. 애플리케이션 확인
브라우저에서 다음 URL들을 확인해보세요:

- **메인 페이지**: http://localhost:8080
- **Health Check**: http://localhost:8080/actuator/health
- **API 문서**: http://localhost:8080/swagger-ui.html (Swagger 포함 시)

## 🏗️ 프로젝트 구조

```
src/
├── main/
│   ├── java/
│   │   └── com/example/demo/
│   │       ├── DemoApplication.java          # 메인 애플리케이션 클래스
│   │       ├── controller/                   # REST 컨트롤러
│   │       ├── service/                      # 비즈니스 로직
│   │       ├── repository/                   # 데이터 액세스 계층
│   │       ├── model/                        # 엔티티 및 DTO
│   │       └── config/                       # 설정 클래스
│   └── resources/
│       ├── application.yml                   # 애플리케이션 설정
│       ├── application-dev.yml               # 개발 환경 설정
│       ├── application-prod.yml              # 프로덕션 환경 설정
│       └── static/                           # 정적 리소스
└── test/
    └── java/
        └── com/example/demo/
            ├── DemoApplicationTests.java     # 통합 테스트
            ├── controller/                   # 컨트롤러 테스트
            └── service/                      # 서비스 테스트
```

## ⚙️ 환경 설정

### 개발 환경 (application-dev.yml)
```yaml
server:
  port: 8080
  
spring:
  datasource:
    url: jdbc:h2:mem:devdb
    driver-class-name: org.h2.Driver
    username: sa
    password: 
  
  h2:
    console:
      enabled: true
      path: /h2-console
  
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
    
logging:
  level:
    com.example.demo: DEBUG
```

### 프로덕션 환경 (application-prod.yml)
```yaml
server:
  port: 8080
  
spring:
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/myapp}
    username: ${DATABASE_USERNAME:myapp}
    password: ${DATABASE_PASSWORD:secret}
    driver-class-name: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    
logging:
  level:
    com.example.demo: INFO
    org.springframework.security: INFO
```

## 🔧 개발 도구 설정

### IDE 설정 (IntelliJ IDEA)
1. **프로젝트 열기**: `File → Open → 프로젝트 디렉토리 선택`
2. **JDK 설정**: `File → Project Structure → Project → Project SDK`
3. **Maven/Gradle 동기화**: 자동으로 의존성 다운로드
4. **Spring Boot 플러그인**: 기본적으로 활성화됨

### VS Code 설정
필요한 확장 프로그램:
- **Extension Pack for Java**
- **Spring Boot Extension Pack**
- **REST Client** (API 테스트용)

## 🧪 첫 번째 API 만들기

### 1. 컨트롤러 생성
```java
@RestController
@RequestMapping("/api/hello")
public class HelloController {
    
    @GetMapping
    public ResponseEntity<String> hello() {
        return ResponseEntity.ok("Hello, Spring Boot!");
    }
    
    @GetMapping("/{name}")
    public ResponseEntity<String> helloName(@PathVariable String name) {
        return ResponseEntity.ok("Hello, " + name + "!");
    }
}
```

### 2. API 테스트
```bash
# 기본 인사
curl http://localhost:8080/api/hello

# 이름과 함께 인사
curl http://localhost:8080/api/hello/World
```

## 🗄️ 데이터베이스 연결

### H2 데이터베이스 (개발용)
1. 애플리케이션 실행
2. http://localhost:8080/h2-console 접속
3. JDBC URL: `jdbc:h2:mem:devdb`
4. 사용자명: `sa`, 비밀번호: (공백)

### PostgreSQL 연결 (프로덕션용)
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/myapp
    username: myapp
    password: secret
    driver-class-name: org.postgresql.Driver
```

## 🐳 Docker로 실행

### 1. Docker 이미지 빌드
```bash
# Maven 사용 시
./mvnw spring-boot:build-image

# Gradle 사용 시
./gradlew bootBuildImage
```

### 2. 컨테이너 실행
```bash
docker run -p 8080:8080 <your-app-name>:0.0.1-SNAPSHOT
```

### 3. Docker Compose 사용
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=dev
    depends_on:
      - postgres
      
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"
```

## 🔍 문제 해결

### 일반적인 문제들

**포트 충돌**
```bash
# 다른 포트 사용
java -jar app.jar --server.port=8081
```

**메모리 부족**
```bash
# 힙 메모리 증가
java -Xmx1024m -jar app.jar
```

**데이터베이스 연결 실패**
- 데이터베이스 서버 실행 상태 확인
- 연결 정보 (URL, 사용자명, 비밀번호) 확인
- 방화벽 설정 확인

### 로그 확인
```bash
# 애플리케이션 로그
tail -f logs/spring.log

# 특정 패키지 로그 레벨 변경
logging.level.com.example.demo=DEBUG
```

## 📚 다음 단계

1. **[Configuration Options](configuration-options.md)** - 상세한 설정 방법
2. **[Dependencies](dependencies.md)** - 추가 의존성 관리
3. **[Database Setup](database-setup.md)** - 데이터베이스 설정
4. **[Security](security.md)** - 보안 설정
5. **[Testing](testing.md)** - 테스트 작성 방법

---

문제가 발생하면 GitHub Issues에 문의해 주세요! 🚀