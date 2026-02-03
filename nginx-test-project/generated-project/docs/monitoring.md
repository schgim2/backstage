# Monitoring & Observability

이 가이드는 ${{ values.name }} 서비스의 모니터링 및 관찰 가능성 설정을 설명합니다.

{% if values.enableMonitoring %}
## Prometheus 메트릭

### NGINX Exporter 설정

NGINX Prometheus Exporter가 자동으로 설정되어 다음 메트릭을 수집합니다:

#### 기본 메트릭

- `nginx_connections_active` - 활성 연결 수
- `nginx_connections_reading` - 읽기 중인 연결 수
- `nginx_connections_writing` - 쓰기 중인 연결 수
- `nginx_connections_waiting` - 대기 중인 연결 수
- `nginx_http_requests_total` - 총 HTTP 요청 수

#### 성능 메트릭

- `nginx_http_request_duration_seconds` - 요청 처리 시간
- `nginx_http_request_size_bytes` - 요청 크기
- `nginx_http_response_size_bytes` - 응답 크기

### 메트릭 엔드포인트

```bash
# 메트릭 확인
curl http://localhost:9114/metrics

# 특정 메트릭 필터링
curl http://localhost:9114/metrics | grep nginx_connections
```

### Prometheus 설정

`prometheus.yml` 설정 예시:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nginx-${{ values.name }}'
    static_configs:
      - targets: ['localhost:9114']
    scrape_interval: 5s
    metrics_path: /metrics
    scheme: http
```

## Grafana 대시보드

### 대시보드 설정

1. Grafana에 Prometheus 데이터소스 추가
2. NGINX 대시보드 임포트 (ID: 12708)
3. 커스텀 대시보드 생성

### 주요 패널

#### 연결 상태 패널

```json
{
  "targets": [
    {
      "expr": "nginx_connections_active{job=\"nginx-${{ values.name }}\"}",
      "legendFormat": "Active Connections"
    },
    {
      "expr": "nginx_connections_waiting{job=\"nginx-${{ values.name }}\"}",
      "legendFormat": "Waiting Connections"
    }
  ]
}
```

#### 요청 처리율 패널

```json
{
  "targets": [
    {
      "expr": "rate(nginx_http_requests_total{job=\"nginx-${{ values.name }}\"}[5m])",
      "legendFormat": "Requests/sec"
    }
  ]
}
```

#### 응답 시간 패널

```json
{
  "targets": [
    {
      "expr": "histogram_quantile(0.95, rate(nginx_http_request_duration_seconds_bucket{job=\"nginx-${{ values.name }}\"}[5m]))",
      "legendFormat": "95th percentile"
    },
    {
      "expr": "histogram_quantile(0.50, rate(nginx_http_request_duration_seconds_bucket{job=\"nginx-${{ values.name }}\"}[5m]))",
      "legendFormat": "50th percentile"
    }
  ]
}
```
{% endif %}

## 로그 모니터링

{% if values.enableAccessLogs %}
### 접근 로그 분석

{% if values.logFormat == "json" %}
JSON 형식 로그를 사용하여 구조화된 분석이 가능합니다:

```bash
# 상위 IP 주소 분석
cat /var/log/nginx/access.log | jq -r '.remote_addr' | sort | uniq -c | sort -nr | head -10

# 응답 시간 분석
cat /var/log/nginx/access.log | jq -r '.request_time' | awk '{sum+=$1; count++} END {print "Average:", sum/count}'

# 상태 코드 분포
cat /var/log/nginx/access.log | jq -r '.status' | sort | uniq -c | sort -nr
```
{% else %}
표준 로그 형식 분석:

```bash
# 상위 IP 주소
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10

# 상태 코드 분포
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -nr

# 요청 URL 분석
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10
```
{% endif %}

### ELK Stack 연동

#### Filebeat 설정

```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/nginx/access.log
  {% if values.logFormat == "json" %}
  json.keys_under_root: true
  json.add_error_key: true
  {% endif %}
  fields:
    service: ${{ values.name }}
    environment: production

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "nginx-${{ values.name }}-%{+yyyy.MM.dd}"

setup.template.name: "nginx-${{ values.name }}"
setup.template.pattern: "nginx-${{ values.name }}-*"
```

#### Logstash 설정

```ruby
# logstash.conf
input {
  beats {
    port => 5044
  }
}

filter {
  if [service] == "${{ values.name }}" {
    {% if values.logFormat == "json" %}
    # JSON 로그는 이미 파싱됨
    {% else %}
    grok {
      match => { "message" => "%{NGINXACCESS}" }
    }
    {% endif %}
    
    date {
      match => [ "time_local", "dd/MMM/yyyy:HH:mm:ss Z" ]
    }
    
    mutate {
      convert => { "response_time" => "float" }
      convert => { "status" => "integer" }
      convert => { "body_bytes_sent" => "integer" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "nginx-${{ values.name }}-%{+YYYY.MM.dd}"
  }
}
```
{% endif %}

## 알림 설정

### Prometheus Alertmanager

#### 알림 규칙

```yaml
# nginx-alerts.yml
groups:
- name: nginx-${{ values.name }}
  rules:
  - alert: NginxDown
    expr: up{job="nginx-${{ values.name }}"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "NGINX service is down"
      description: "NGINX service ${{ values.name }} has been down for more than 1 minute"

  - alert: NginxHighErrorRate
    expr: rate(nginx_http_requests_total{job="nginx-${{ values.name }}",status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} errors per second"

  - alert: NginxHighLatency
    expr: histogram_quantile(0.95, rate(nginx_http_request_duration_seconds_bucket{job="nginx-${{ values.name }}"}[5m])) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High latency detected"
      description: "95th percentile latency is {{ $value }} seconds"

  - alert: NginxHighConnections
    expr: nginx_connections_active{job="nginx-${{ values.name }}"} > 1000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High number of active connections"
      description: "Active connections: {{ $value }}"
```

#### Alertmanager 설정

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@company.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  email_configs:
  - to: 'admin@company.com'
    subject: 'NGINX Alert: {{ .GroupLabels.alertname }}'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      {{ end }}
  
  slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#alerts'
    title: 'NGINX Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

## 헬스 체크

### NGINX 헬스 체크 엔드포인트

```nginx
# health check location
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}

# nginx status (for monitoring)
location /nginx_status {
    stub_status on;
    access_log off;
    allow 127.0.0.1;
    allow 10.0.0.0/8;
    deny all;
}
```

### Kubernetes 헬스 체크

```yaml
# deployment.yaml에 추가
livenessProbe:
  httpGet:
    path: /health
    port: 80
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 80
  initialDelaySeconds: 5
  periodSeconds: 5
```

### 외부 헬스 체크

```bash
#!/bin/bash
# health-check.sh

URL="{% if values.enableSSL and values.domain %}https://${{ values.domain }}{% else %}http://localhost:${{ values.port }}{% endif %}/health"
TIMEOUT=10

response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT $URL)

if [ $response -eq 200 ]; then
    echo "Service is healthy"
    exit 0
else
    echo "Service is unhealthy (HTTP $response)"
    exit 1
fi
```

## 성능 모니터링

### 주요 성능 지표

1. **처리량 (Throughput)**
   - 초당 요청 수 (RPS)
   - 초당 전송 바이트

2. **지연 시간 (Latency)**
   - 평균 응답 시간
   - 95th/99th 백분위수

3. **에러율 (Error Rate)**
   - 4xx/5xx 응답 비율
   - 타임아웃 비율

4. **리소스 사용률**
   - CPU 사용률
   - 메모리 사용률
   - 네트워크 I/O

### 성능 벤치마킹

```bash
# Apache Bench 테스트
ab -n 10000 -c 100 {% if values.enableSSL and values.domain %}https://${{ values.domain }}{% else %}http://localhost:${{ values.port }}{% endif %}/

# wrk 테스트
wrk -t12 -c400 -d30s {% if values.enableSSL and values.domain %}https://${{ values.domain }}{% else %}http://localhost:${{ values.port }}{% endif %}/

# siege 테스트
siege -c 100 -t 60s {% if values.enableSSL and values.domain %}https://${{ values.domain }}{% else %}http://localhost:${{ values.port }}{% endif %}/
```

## 트레이싱

### OpenTelemetry 설정

```nginx
# nginx.conf에 추가
load_module modules/ngx_http_opentelemetry_module.so;

http {
    opentelemetry_config /etc/nginx/otel-nginx.toml;
    
    location / {
        opentelemetry on;
        opentelemetry_operation_name $request_method$uri;
        opentelemetry_propagate;
        # 기존 설정...
    }
}
```

### Jaeger 연동

```toml
# otel-nginx.toml
[exporter]
host = "jaeger-collector"
port = 14268

[service]
name = "${{ values.name }}"
namespace = "${{ values.namespace }}"
```

## 대시보드 예시

### 주요 메트릭 대시보드

1. **서비스 개요**
   - 요청 처리율
   - 평균 응답 시간
   - 에러율
   - 활성 연결 수

2. **성능 분석**
   - 응답 시간 분포
   - 처리량 트렌드
   - 리소스 사용률

3. **에러 분석**
   - 에러 코드 분포
   - 에러율 트렌드
   - 실패한 요청 상세

4. **인프라 모니터링**
   - CPU/메모리 사용률
   - 네트워크 I/O
   - 디스크 사용률

## 문제 해결

모니터링 관련 문제가 발생하면 [Troubleshooting](troubleshooting.md) 가이드를 참조하세요.