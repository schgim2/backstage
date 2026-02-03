# Configuration

이 문서는 ${{ values.name }} 서비스의 상세 설정 옵션을 설명합니다.

## NGINX 설정

### 메인 설정 (nginx.conf)

`config/nginx.conf` 파일은 NGINX의 전역 설정을 담고 있습니다:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # 로그 형식
    {% if values.logFormat == "json" %}
    log_format json_combined escape=json
        '{'
        '"time_local":"$time_local",'
        '"remote_addr":"$remote_addr",'
        '"remote_user":"$remote_user",'
        '"request":"$request",'
        '"status": "$status",'
        '"body_bytes_sent":"$body_bytes_sent",'
        '"request_time":"$request_time",'
        '"http_referrer":"$http_referer",'
        '"http_user_agent":"$http_user_agent"'
        '}';
    {% endif %}
    
    # 성능 최적화
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    {% if values.enableGzip %}
    # Gzip 압축
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    {% endif %}
    
    {% if values.enableBrotli %}
    # Brotli 압축
    brotli on;
    brotli_comp_level 6;
    brotli_types
        text/plain
        text/css
        application/json
        application/javascript
        text/xml
        application/xml
        application/xml+rss
        text/javascript;
    {% endif %}
    
    include /etc/nginx/conf.d/*.conf;
}
```

### 사이트 설정 (default.conf)

`config/default.conf` 파일은 웹사이트별 설정을 담고 있습니다:

{% if values.serviceType == "static-site" %}
#### 정적 사이트 설정

```nginx
server {
    listen 80;
    {% if values.domain %}
    server_name ${{ values.domain }}{% if values.additionalDomains %} ${{ values.additionalDomains | join(' ') }}{% endif %};
    {% endif %}
    
    root /usr/share/nginx/html;
    index index.html index.htm;
    
    {% if values.enableCaching %}
    # 정적 자산 캐싱
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    {% endif %}
    
    {% if values.enableRateLimit %}
    # 속도 제한
    limit_req_zone $binary_remote_addr zone=api:10m rate=${{ values.rateLimitRpm }}r/m;
    limit_req zone=api burst=20 nodelay;
    {% endif %}
    
    location / {
        try_files $uri $uri/ =404;
    }
}
```
{% elif values.serviceType == "reverse-proxy" %}
#### 리버스 프록시 설정

```nginx
upstream backend {
    server backend1:8080;
    server backend2:8080;
    server backend3:8080;
}

server {
    listen 80;
    {% if values.domain %}
    server_name ${{ values.domain }}{% if values.additionalDomains %} ${{ values.additionalDomains | join(' ') }}{% endif %};
    {% endif %}
    
    {% if values.enableRateLimit %}
    # 속도 제한
    limit_req_zone $binary_remote_addr zone=api:10m rate=${{ values.rateLimitRpm }}r/m;
    limit_req zone=api burst=20 nodelay;
    {% endif %}
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 타임아웃 설정
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
```
{% elif values.serviceType == "spa-application" %}
#### SPA 애플리케이션 설정

```nginx
server {
    listen 80;
    {% if values.domain %}
    server_name ${{ values.domain }}{% if values.additionalDomains %} ${{ values.additionalDomains | join(' ') }}{% endif %};
    {% endif %}
    
    root /usr/share/nginx/html;
    index index.html;
    
    {% if values.enableCaching %}
    # 정적 자산 캐싱
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    {% endif %}
    
    # SPA 라우팅 지원
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API 프록시 (필요시)
    location /api/ {
        proxy_pass http://api-backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
{% endif %}

## 환경 변수

### Docker Compose 환경 변수

`.env` 파일에서 설정할 수 있는 주요 환경 변수:

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `SERVICE_NAME` | ${{ values.name }} | 서비스 이름 |
| `SERVICE_PORT` | ${{ values.port }} | 서비스 포트 |
| `NGINX_VERSION` | ${{ values.nginxVersion }} | NGINX Docker 이미지 버전 |
{% if values.domain %}
| `DOMAIN` | ${{ values.domain }} | 주 도메인 |
{% endif %}
{% if values.enableSSL %}
| `SSL_ENABLED` | true | SSL/TLS 활성화 여부 |
| `SSL_PROVIDER` | ${{ values.sslProvider }} | SSL 인증서 제공자 |
{% endif %}
{% if values.enableMonitoring %}
| `MONITORING_ENABLED` | true | 모니터링 활성화 여부 |
{% endif %}

### Kubernetes 환경 변수

Kubernetes 배포 시 ConfigMap과 Secret을 통해 설정:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${{ values.name }}-config
data:
  NGINX_VERSION: "${{ values.nginxVersion }}"
  SERVICE_PORT: "${{ values.port }}"
  {% if values.enableCaching %}
  CACHE_SIZE: "${{ values.cacheSize }}"
  {% endif %}
  {% if values.enableRateLimit %}
  RATE_LIMIT_RPM: "${{ values.rateLimitRpm }}"
  {% endif %}
```

## 보안 설정

{% if values.enableBasicAuth %}
### HTTP Basic Authentication

기본 인증을 활성화하려면 `.htpasswd` 파일을 생성하세요:

```bash
# 사용자 추가
htpasswd -c .htpasswd username

# NGINX 설정에 추가
auth_basic "Restricted Area";
auth_basic_user_file /etc/nginx/.htpasswd;
```
{% endif %}

{% if values.allowedIPs %}
### IP 접근 제한

특정 IP만 접근을 허용하려면:

```nginx
location / {
    {% for ip in values.allowedIPs %}
    allow {{ ip }};
    {% endfor %}
    deny all;
    
    # 나머지 설정...
}
```
{% endif %}

### 보안 헤더

보안을 강화하기 위한 HTTP 헤더:

```nginx
# 보안 헤더 추가
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

## 성능 튜닝

### Worker 프로세스 설정

```nginx
# CPU 코어 수에 맞춰 자동 설정
worker_processes auto;

# 연결 수 최적화
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}
```

### 버퍼 크기 조정

```nginx
http {
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;
}
```

{% if values.enableCaching %}
### 캐시 설정

```nginx
# 프록시 캐시 설정
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:${{ values.cacheSize }} 
                 max_size=1g inactive=60m use_temp_path=off;

location / {
    proxy_cache my_cache;
    proxy_cache_revalidate on;
    proxy_cache_min_uses 3;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_background_update on;
    proxy_cache_lock on;
}
```
{% endif %}

## 로깅 설정

### 접근 로그 형식

{% if values.logFormat == "json" %}
JSON 형식 로그:

```nginx
log_format json_combined escape=json
    '{'
    '"time_local":"$time_local",'
    '"remote_addr":"$remote_addr",'
    '"request":"$request",'
    '"status": "$status",'
    '"body_bytes_sent":"$body_bytes_sent",'
    '"request_time":"$request_time",'
    '"http_referrer":"$http_referer",'
    '"http_user_agent":"$http_user_agent"'
    '}';

access_log /var/log/nginx/access.log json_combined;
```
{% else %}
표준 형식 로그:

```nginx
log_format combined '$remote_addr - $remote_user [$time_local] '
                   '"$request" $status $body_bytes_sent '
                   '"$http_referer" "$http_user_agent"';

access_log /var/log/nginx/access.log combined;
```
{% endif %}

### 로그 로테이션

```bash
# logrotate 설정 (/etc/logrotate.d/nginx)
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nginx nginx
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

## 문제 해결

설정 관련 문제가 발생하면 [Troubleshooting](troubleshooting.md) 가이드를 참조하세요.