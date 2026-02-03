# Security Guide

이 가이드는 ${{ values.name }} 서비스의 보안 설정 및 모범 사례를 설명합니다.

## SSL/TLS 설정

{% if values.enableSSL %}
### 인증서 관리

#### ${{ values.sslProvider }} 설정

{% if values.sslProvider == "cert-manager" %}
Cert-Manager를 사용한 자동 인증서 관리:

```yaml
# certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${{ values.name }}-tls
  namespace: ${{ values.namespace }}
spec:
  secretName: ${{ values.name }}-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - ${{ values.domain }}
  {% if values.additionalDomains %}
  {% for domain in values.additionalDomains %}
  - {{ domain }}
  {% endfor %}
  {% endif %}
```

ClusterIssuer 설정:

```yaml
# cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@company.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: ${{ values.ingressClass }}
```
{% elif values.sslProvider == "manual" %}
수동 인증서 관리:

```bash
# 인증서 생성 (Let's Encrypt)
certbot certonly --webroot -w /usr/share/nginx/html -d ${{ values.domain }}{% if values.additionalDomains %} {% for domain in values.additionalDomains %}-d {{ domain }} {% endfor %}{% endif %}

# Kubernetes Secret 생성
kubectl create secret tls ${{ values.name }}-tls \
  --cert=/etc/letsencrypt/live/${{ values.domain }}/fullchain.pem \
  --key=/etc/letsencrypt/live/${{ values.domain }}/privkey.pem \
  -n ${{ values.namespace }}
```
{% elif values.sslProvider == "self-signed" %}
자체 서명 인증서 (개발용):

```bash
# 자체 서명 인증서 생성
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=${{ values.domain }}/O=${{ values.name }}"

# Kubernetes Secret 생성
kubectl create secret tls ${{ values.name }}-tls \
  --cert=tls.crt --key=tls.key -n ${{ values.namespace }}
```
{% endif %}

### NGINX SSL 설정

```nginx
server {
    listen 443 ssl http2;
    server_name ${{ values.domain }}{% if values.additionalDomains %} ${{ values.additionalDomains | join(' ') }}{% endif %};

    # SSL 인증서
    ssl_certificate /etc/nginx/ssl/tls.crt;
    ssl_certificate_key /etc/nginx/ssl/tls.key;

    # SSL 프로토콜 및 암호화
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;

    # SSL 세션 설정
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/nginx/ssl/chain.pem;

    # 보안 헤더
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 나머지 설정...
}

# HTTP to HTTPS 리다이렉트
server {
    listen 80;
    server_name ${{ values.domain }}{% if values.additionalDomains %} ${{ values.additionalDomains | join(' ') }}{% endif %};
    return 301 https://$server_name$request_uri;
}
```
{% endif %}

## 접근 제어

{% if values.enableBasicAuth %}
### HTTP Basic Authentication

```nginx
# .htpasswd 파일 생성
htpasswd -c /etc/nginx/.htpasswd admin

# NGINX 설정
location / {
    auth_basic "Restricted Area";
    auth_basic_user_file /etc/nginx/.htpasswd;
    # 나머지 설정...
}
```

Kubernetes Secret으로 관리:

```bash
# htpasswd 파일을 Secret으로 생성
kubectl create secret generic ${{ values.name }}-auth \
  --from-file=.htpasswd=/path/to/.htpasswd \
  -n ${{ values.namespace }}
```
{% endif %}

{% if values.allowedIPs %}
### IP 기반 접근 제어

```nginx
# 허용된 IP만 접근 가능
location / {
    {% for ip in values.allowedIPs %}
    allow {{ ip }};
    {% endfor %}
    deny all;
    
    # 나머지 설정...
}

# 관리자 영역 보호
location /admin {
    allow 192.168.1.0/24;  # 내부 네트워크만
    deny all;
    
    # 나머지 설정...
}
```
{% endif %}

### OAuth2/OIDC 인증

OAuth2 Proxy를 사용한 인증:

```yaml
# oauth2-proxy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-proxy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: oauth2-proxy
  template:
    metadata:
      labels:
        app: oauth2-proxy
    spec:
      containers:
      - name: oauth2-proxy
        image: quay.io/oauth2-proxy/oauth2-proxy:latest
        args:
        - --provider=oidc
        - --email-domain=*
        - --upstream=http://${{ values.name }}:80
        - --http-address=0.0.0.0:4180
        - --oidc-issuer-url=https://your-oidc-provider.com
        env:
        - name: OAUTH2_PROXY_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: oauth2-proxy-secret
              key: client-id
        - name: OAUTH2_PROXY_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: oauth2-proxy-secret
              key: client-secret
        - name: OAUTH2_PROXY_COOKIE_SECRET
          valueFrom:
            secretKeyRef:
              name: oauth2-proxy-secret
              key: cookie-secret
```

## 보안 헤더

### 필수 보안 헤더

```nginx
# 보안 헤더 설정
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;" always;

{% if values.enableSSL %}
# HSTS (HTTPS 전용)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
{% endif %}

# 서버 정보 숨기기
server_tokens off;
more_clear_headers Server;
```

### CSP (Content Security Policy) 설정

```nginx
# 엄격한 CSP 정책
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://trusted-cdn.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https:;
    connect-src 'self' https://api.example.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
" always;
```

## 속도 제한 및 DDoS 방어

{% if values.enableRateLimit %}
### 기본 속도 제한

```nginx
# IP별 속도 제한
limit_req_zone $binary_remote_addr zone=api:10m rate=${{ values.rateLimitRpm }}r/m;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

# 연결 수 제한
limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;

server {
    # 일반 요청 제한
    limit_req zone=api burst=20 nodelay;
    
    # 연결 수 제한
    limit_conn conn_limit_per_ip 10;
    
    # 로그인 페이지 보호
    location /login {
        limit_req zone=login burst=5 nodelay;
        # 나머지 설정...
    }
}
```
{% endif %}

### 고급 DDoS 방어

```nginx
# 대용량 요청 차단
client_max_body_size 10m;
client_body_buffer_size 128k;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;

# 느린 공격 방어
client_body_timeout 12;
client_header_timeout 12;
keepalive_timeout 15;
send_timeout 10;

# 의심스러운 User-Agent 차단
map $http_user_agent $blocked_agent {
    ~*malicious 1;
    ~*bot 1;
    ~*crawler 1;
    default 0;
}

server {
    if ($blocked_agent) {
        return 403;
    }
}
```

## 로그 보안

### 민감 정보 마스킹

```nginx
# 민감한 파라미터 로깅 제외
map $request_uri $loggable {
    ~*password 0;
    ~*token 0;
    ~*secret 0;
    default 1;
}

# 조건부 로깅
access_log /var/log/nginx/access.log combined if=$loggable;

# 민감 정보 마스킹 로그 형식
log_format secure '$remote_addr - $remote_user [$time_local] '
                  '"$request_method $uri $server_protocol" '
                  '$status $body_bytes_sent '
                  '"$http_referer" "$http_user_agent"';
```

### 로그 파일 보안

```bash
# 로그 파일 권한 설정
chmod 640 /var/log/nginx/*.log
chown nginx:adm /var/log/nginx/*.log

# 로그 로테이션 보안 설정
# /etc/logrotate.d/nginx
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 nginx adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

## 컨테이너 보안

### Docker 보안 설정

```dockerfile
# Dockerfile 보안 모범 사례
FROM nginx:${{ values.nginxVersion }}

# 비특권 사용자로 실행
RUN groupadd -r nginx && useradd -r -g nginx nginx

# 불필요한 패키지 제거
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 파일 권한 설정
COPY --chown=nginx:nginx config/ /etc/nginx/
COPY --chown=nginx:nginx html/ /usr/share/nginx/html/

# 보안 설정
RUN chmod -R 644 /etc/nginx/ && \
    chmod -R 644 /usr/share/nginx/html/ && \
    chmod 755 /etc/nginx/conf.d/

USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

### Kubernetes 보안 설정

```yaml
# security-context.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${{ values.name }}
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 101
        runAsGroup: 101
        fsGroup: 101
      containers:
      - name: nginx
        image: nginx:${{ values.nginxVersion }}
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
            add:
            - NET_BIND_SERVICE
        resources:
          limits:
            memory: "128Mi"
            cpu: "500m"
          requests:
            memory: "64Mi"
            cpu: "250m"
```

### Pod Security Standards

```yaml
# pod-security-policy.yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: ${{ values.name }}-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## 네트워크 보안

### Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ${{ values.name }}-netpol
  namespace: ${{ values.namespace }}
spec:
  podSelector:
    matchLabels:
      app: ${{ values.name }}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 80
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
```

### Service Mesh 보안 (Istio)

```yaml
# istio-security.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: ${{ values.name }}-peer-auth
  namespace: ${{ values.namespace }}
spec:
  selector:
    matchLabels:
      app: ${{ values.name }}
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: ${{ values.name }}-authz
  namespace: ${{ values.namespace }}
spec:
  selector:
    matchLabels:
      app: ${{ values.name }}
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"]
```

## 보안 스캐닝

### 컨테이너 이미지 스캔

```bash
# Trivy를 사용한 취약점 스캔
trivy image nginx:${{ values.nginxVersion }}

# Clair를 사용한 스캔
clairctl analyze nginx:${{ values.nginxVersion }}
```

### 설정 보안 검사

```bash
# NGINX 설정 보안 검사
nginx -t -c /etc/nginx/nginx.conf

# SSL 설정 테스트
testssl.sh {% if values.domain %}${{ values.domain }}{% else %}localhost{% endif %}

# 보안 헤더 검사
curl -I {% if values.enableSSL and values.domain %}https://${{ values.domain }}{% else %}http://localhost:${{ values.port }}{% endif %}
```

## 보안 모니터링

### 보안 이벤트 로깅

```nginx
# 보안 이벤트 로그 형식
log_format security '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time ua="$upstream_addr" '
                    'us="$upstream_status" ut="$upstream_response_time"';

# 보안 이벤트만 별도 로깅
map $status $security_log {
    ~^4 1;  # 4xx 에러
    ~^5 1;  # 5xx 에러
    default 0;
}

access_log /var/log/nginx/security.log security if=$security_log;
```

### 침입 탐지

```bash
# Fail2ban 설정
# /etc/fail2ban/jail.local
[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600

[nginx-noscript]
enabled = true
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6
bantime = 86400
```

## 보안 체크리스트

### 배포 전 체크리스트

- [ ] SSL/TLS 인증서 설정 및 검증
- [ ] 보안 헤더 설정 확인
- [ ] 접근 제어 정책 검토
- [ ] 속도 제한 설정 확인
- [ ] 로그 설정 및 민감 정보 마스킹
- [ ] 컨테이너 보안 설정 검토
- [ ] 네트워크 정책 설정
- [ ] 취약점 스캔 실행
- [ ] 보안 테스트 수행

### 정기 보안 점검

- [ ] 인증서 만료일 확인
- [ ] 보안 패치 적용
- [ ] 로그 분석 및 이상 징후 확인
- [ ] 접근 권한 검토
- [ ] 백업 및 복구 테스트
- [ ] 보안 정책 업데이트

## 문제 해결

보안 관련 문제가 발생하면 [Troubleshooting](troubleshooting.md) 가이드를 참조하세요.