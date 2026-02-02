# 모니터링

MySQL 클러스터의 성능, 상태, 보안을 모니터링하기 위한 종합 가이드입니다.

## 모니터링 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     MySQL       │───►│ MySQL Exporter  │───►│   Prometheus    │
│   (Metrics)     │    │   (Collector)   │    │   (Storage)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
┌─────────────────┐    ┌─────────────────┐             ▼
│   AlertManager  │◄───│    Grafana      │    ┌─────────────────┐
│  (Alerting)     │    │ (Visualization) │    │   Prometheus    │
└─────────────────┘    └─────────────────┘    │    (Query)      │
                                              └─────────────────┘
```

## 핵심 메트릭

### 가용성 메트릭

#### MySQL 서버 상태
```promql
# MySQL 서버 가동 상태 (1=UP, 0=DOWN)
mysql_up

# MySQL 버전 정보
mysql_version_info

# 서버 가동 시간 (초)
mysql_global_status_uptime
```

#### 복제 상태
```promql
# 복제 지연 시간 (초)
mysql_slave_lag_seconds

# 복제 실행 상태 (1=실행중, 0=중지)
mysql_slave_running

# 복제 SQL 스레드 상태
mysql_slave_sql_running

# 복제 IO 스레드 상태  
mysql_slave_io_running
```

### 성능 메트릭

#### 연결 및 스레드
```promql
# 현재 연결 수
mysql_global_status_threads_connected

# 최대 연결 수
mysql_global_variables_max_connections

# 연결 사용률 (%)
(mysql_global_status_threads_connected / mysql_global_variables_max_connections) * 100

# 실행 중인 스레드 수
mysql_global_status_threads_running

# 총 연결 시도 수
mysql_global_status_connections
```

#### 쿼리 성능
```promql
# 초당 쿼리 수 (QPS)
rate(mysql_global_status_queries[5m])

# 초당 SELECT 쿼리 수
rate(mysql_global_status_com_select[5m])

# 초당 INSERT 쿼리 수
rate(mysql_global_status_com_insert[5m])

# 초당 UPDATE 쿼리 수
rate(mysql_global_status_com_update[5m])

# 초당 DELETE 쿼리 수
rate(mysql_global_status_com_delete[5m])

# 슬로우 쿼리 수
mysql_global_status_slow_queries

# 슬로우 쿼리 비율 (%)
(mysql_global_status_slow_queries / mysql_global_status_queries) * 100
```

### 리소스 메트릭

#### InnoDB 버퍼 풀
```promql
# 버퍼 풀 크기 (바이트)
mysql_global_variables_innodb_buffer_pool_size

# 버퍼 풀 사용량 (바이트)
mysql_global_status_innodb_buffer_pool_bytes_data

# 버퍼 풀 사용률 (%)
(mysql_global_status_innodb_buffer_pool_bytes_data / mysql_global_variables_innodb_buffer_pool_size) * 100

# 버퍼 풀 히트율 (%)
(mysql_global_status_innodb_buffer_pool_read_requests / (mysql_global_status_innodb_buffer_pool_read_requests + mysql_global_status_innodb_buffer_pool_reads)) * 100

# 버퍼 풀 더티 페이지 비율 (%)
(mysql_global_status_innodb_buffer_pool_pages_dirty / mysql_global_status_innodb_buffer_pool_pages_total) * 100
```

#### 테이블 락 및 대기
```promql
# 테이블 락 대기 수
mysql_global_status_table_locks_waited

# 테이블 락 즉시 획득 수
mysql_global_status_table_locks_immediate

# 테이블 락 대기 비율 (%)
(mysql_global_status_table_locks_waited / (mysql_global_status_table_locks_waited + mysql_global_status_table_locks_immediate)) * 100
```

## Grafana 대시보드

### MySQL 개요 대시보드

#### 패널 구성
1. **서버 상태**
   - MySQL 가동 상태
   - 서버 가동 시간
   - MySQL 버전

2. **연결 현황**
   - 현재 연결 수
   - 최대 연결 수
   - 연결 사용률

3. **쿼리 성능**
   - QPS (초당 쿼리 수)
   - 쿼리 유형별 분포
   - 슬로우 쿼리 수

4. **복제 상태**
   - 복제 지연 시간
   - 복제 상태
   - 마스터/슬레이브 상태

#### 대시보드 JSON 설정
```json
{
  "dashboard": {
    "title": "MySQL Cluster Overview",
    "panels": [
      {
        "title": "MySQL Server Status",
        "type": "stat",
        "targets": [
          {
            "expr": "mysql_up",
            "legendFormat": "{{instance}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "green", "value": 1}
              ]
            }
          }
        }
      },
      {
        "title": "Queries Per Second",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(mysql_global_status_queries[5m])",
            "legendFormat": "QPS - {{instance}}"
          }
        ]
      },
      {
        "title": "Connection Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "mysql_global_status_threads_connected",
            "legendFormat": "Connected - {{instance}}"
          },
          {
            "expr": "mysql_global_variables_max_connections",
            "legendFormat": "Max Connections - {{instance}}"
          }
        ]
      }
    ]
  }
}
```

### 성능 대시보드

#### InnoDB 메트릭
```json
{
  "panels": [
    {
      "title": "InnoDB Buffer Pool Hit Ratio",
      "type": "stat",
      "targets": [
        {
          "expr": "(mysql_global_status_innodb_buffer_pool_read_requests / (mysql_global_status_innodb_buffer_pool_read_requests + mysql_global_status_innodb_buffer_pool_reads)) * 100",
          "legendFormat": "Hit Ratio %"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "percent",
          "thresholds": {
            "steps": [
              {"color": "red", "value": 0},
              {"color": "yellow", "value": 90},
              {"color": "green", "value": 95}
            ]
          }
        }
      }
    },
    {
      "title": "InnoDB Buffer Pool Usage",
      "type": "graph",
      "targets": [
        {
          "expr": "mysql_global_status_innodb_buffer_pool_bytes_data",
          "legendFormat": "Data - {{instance}}"
        },
        {
          "expr": "mysql_global_variables_innodb_buffer_pool_size",
          "legendFormat": "Total Size - {{instance}}"
        }
      ]
    }
  ]
}
```

## 알림 설정

### Prometheus 알림 규칙

#### 가용성 알림
```yaml
groups:
- name: mysql-availability
  rules:
  - alert: MySQLDown
    expr: mysql_up == 0
    for: 1m
    labels:
      severity: critical
      service: mysql
    annotations:
      summary: "MySQL server is down"
      description: "MySQL server {{ $labels.instance }} has been down for more than 1 minute"
      runbook_url: "https://wiki.company.com/mysql-down-runbook"

  - alert: MySQLReplicationStopped
    expr: mysql_slave_running == 0
    for: 1m
    labels:
      severity: critical
      service: mysql
    annotations:
      summary: "MySQL replication has stopped"
      description: "MySQL replication on {{ $labels.instance }} has stopped"

  - alert: MySQLReplicationLag
    expr: mysql_slave_lag_seconds > 30
    for: 2m
    labels:
      severity: warning
      service: mysql
    annotations:
      summary: "MySQL replication lag is high"
      description: "MySQL replication lag is {{ $value }} seconds on {{ $labels.instance }}"
```

#### 성능 알림
```yaml
- name: mysql-performance
  rules:
  - alert: MySQLHighConnections
    expr: (mysql_global_status_threads_connected / mysql_global_variables_max_connections) * 100 > 80
    for: 5m
    labels:
      severity: warning
      service: mysql
    annotations:
      summary: "MySQL connection usage is high"
      description: "MySQL connection usage is {{ $value }}% on {{ $labels.instance }}"

  - alert: MySQLSlowQueries
    expr: rate(mysql_global_status_slow_queries[5m]) > 10
    for: 5m
    labels:
      severity: warning
      service: mysql
    annotations:
      summary: "High number of slow queries"
      description: "{{ $value }} slow queries per second on {{ $labels.instance }}"

  - alert: MySQLLowBufferPoolHitRatio
    expr: (mysql_global_status_innodb_buffer_pool_read_requests / (mysql_global_status_innodb_buffer_pool_read_requests + mysql_global_status_innodb_buffer_pool_reads)) * 100 < 90
    for: 10m
    labels:
      severity: warning
      service: mysql
    annotations:
      summary: "Low InnoDB buffer pool hit ratio"
      description: "InnoDB buffer pool hit ratio is {{ $value }}% on {{ $labels.instance }}"
```

### AlertManager 설정

#### 알림 라우팅
```yaml
global:
  smtp_smarthost: 'smtp.company.com:587'
  smtp_from: 'alerts@company.com'

route:
  group_by: ['alertname', 'service']
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
  - url: 'http://slack-webhook/alerts'

- name: 'critical-alerts'
  email_configs:
  - to: 'oncall@company.com'
    subject: 'CRITICAL: MySQL Alert - {{ .GroupLabels.alertname }}'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      Instance: {{ .Labels.instance }}
      {{ end }}
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/xxx'
    channel: '#alerts-critical'
    title: 'MySQL Critical Alert'
    text: '{{ .CommonAnnotations.summary }}'

- name: 'warning-alerts'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/xxx'
    channel: '#alerts-warning'
    title: 'MySQL Warning Alert'
    text: '{{ .CommonAnnotations.summary }}'
```

## 로그 모니터링

### MySQL 에러 로그

#### 로그 수집 설정
```yaml
# Fluentd 설정 예시
<source>
  @type tail
  path /var/lib/mysql/error.log
  pos_file /var/log/fluentd/mysql-error.log.pos
  tag mysql.error
  format multiline
  format_firstline /^\d{4}-\d{2}-\d{2}/
  format1 /^(?<time>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (?<thread_id>\d+) \[(?<level>\w+)\] (?<message>.*)/
</source>

<match mysql.error>
  @type elasticsearch
  host elasticsearch.logging.svc.cluster.local
  port 9200
  index_name mysql-logs
  type_name error
</match>
```

#### 슬로우 쿼리 로그 분석
```bash
# mysqldumpslow를 사용한 슬로우 쿼리 분석
kubectl exec -it mysql-master-0 -- mysqldumpslow -s c -t 10 /var/lib/mysql/slow.log

# 가장 느린 쿼리 10개
kubectl exec -it mysql-master-0 -- mysqldumpslow -s t -t 10 /var/lib/mysql/slow.log

# 가장 많이 실행된 슬로우 쿼리 10개
kubectl exec -it mysql-master-0 -- mysqldumpslow -s c -t 10 /var/lib/mysql/slow.log
```

### 바이너리 로그 모니터링

#### 바이너리 로그 크기 추적
```promql
# 바이너리 로그 총 크기
mysql_info_schema_innodb_metrics_log_lsn

# 바이너리 로그 생성 속도
rate(mysql_info_schema_innodb_metrics_log_lsn[5m])
```

## 커스텀 메트릭

### 애플리케이션별 메트릭

#### 비즈니스 메트릭 수집
```sql
-- 사용자 등록 수 (일일)
SELECT COUNT(*) as daily_registrations 
FROM users 
WHERE DATE(created_at) = CURDATE();

-- 활성 사용자 수
SELECT COUNT(*) as active_users 
FROM users 
WHERE last_login_at > DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 주문 수 (시간별)
SELECT COUNT(*) as hourly_orders 
FROM orders 
WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR);
```

#### 커스텀 Exporter 설정
```python
# custom_mysql_exporter.py
from prometheus_client import start_http_server, Gauge
import mysql.connector
import time

# 메트릭 정의
daily_registrations = Gauge('mysql_daily_registrations', 'Daily user registrations')
active_users = Gauge('mysql_active_users', 'Active users in last 30 days')
hourly_orders = Gauge('mysql_hourly_orders', 'Orders in last hour')

def collect_metrics():
    conn = mysql.connector.connect(
        host='mysql-master',
        user='monitoring_user',
        password='monitoring_password',
        database='myapp'
    )
    cursor = conn.cursor()
    
    # 일일 등록 수
    cursor.execute("SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()")
    daily_registrations.set(cursor.fetchone()[0])
    
    # 활성 사용자 수
    cursor.execute("SELECT COUNT(*) FROM users WHERE last_login_at > DATE_SUB(NOW(), INTERVAL 30 DAY)")
    active_users.set(cursor.fetchone()[0])
    
    # 시간별 주문 수
    cursor.execute("SELECT COUNT(*) FROM orders WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)")
    hourly_orders.set(cursor.fetchone()[0])
    
    conn.close()

if __name__ == '__main__':
    start_http_server(8000)
    while True:
        collect_metrics()
        time.sleep(60)  # 1분마다 수집
```

## 성능 분석

### 쿼리 성능 분석

#### Performance Schema 활용
```sql
-- 가장 느린 쿼리 TOP 10
SELECT 
    DIGEST_TEXT,
    COUNT_STAR,
    AVG_TIMER_WAIT/1000000000 as avg_time_sec,
    MAX_TIMER_WAIT/1000000000 as max_time_sec
FROM performance_schema.events_statements_summary_by_digest 
ORDER BY AVG_TIMER_WAIT DESC 
LIMIT 10;

-- 테이블별 I/O 통계
SELECT 
    OBJECT_SCHEMA,
    OBJECT_NAME,
    COUNT_READ,
    COUNT_WRITE,
    SUM_TIMER_READ/1000000000 as read_time_sec,
    SUM_TIMER_WRITE/1000000000 as write_time_sec
FROM performance_schema.table_io_waits_summary_by_table 
WHERE OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema')
ORDER BY SUM_TIMER_READ + SUM_TIMER_WRITE DESC;

-- 인덱스 사용 통계
SELECT 
    OBJECT_SCHEMA,
    OBJECT_NAME,
    INDEX_NAME,
    COUNT_FETCH,
    COUNT_INSERT,
    COUNT_UPDATE,
    COUNT_DELETE
FROM performance_schema.table_io_waits_summary_by_index_usage 
WHERE OBJECT_SCHEMA NOT IN ('mysql', 'performance_schema', 'information_schema')
ORDER BY COUNT_FETCH DESC;
```

### 리소스 사용량 분석

#### 메모리 사용량 분석
```sql
-- 메모리 사용량 상위 이벤트
SELECT 
    EVENT_NAME,
    CURRENT_COUNT_USED,
    CURRENT_SIZE_ALLOCATED,
    HIGH_COUNT_USED,
    HIGH_SIZE_ALLOCATED
FROM performance_schema.memory_summary_global_by_event_name 
WHERE CURRENT_SIZE_ALLOCATED > 0 
ORDER BY CURRENT_SIZE_ALLOCATED DESC 
LIMIT 10;

-- 연결별 메모리 사용량
SELECT 
    PROCESSLIST_ID,
    PROCESSLIST_USER,
    PROCESSLIST_HOST,
    CURRENT_CONNECTIONS,
    TOTAL_CONNECTIONS
FROM performance_schema.accounts 
WHERE CURRENT_CONNECTIONS > 0;
```

## 모니터링 자동화

### 헬스 체크 스크립트

#### 종합 헬스 체크
```bash
#!/bin/bash
# mysql-health-check.sh

MYSQL_HOST="mysql-master"
MYSQL_USER="root"
MYSQL_PASSWORD="$MYSQL_ROOT_PASSWORD"

echo "=== MySQL Health Check ==="
echo "Timestamp: $(date)"

# 1. 연결 테스트
echo "1. Connection Test:"
if mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD -e "SELECT 1" >/dev/null 2>&1; then
    echo "   ✓ Connection successful"
else
    echo "   ✗ Connection failed"
    exit 1
fi

# 2. 복제 상태 확인
echo "2. Replication Status:"
SLAVE_STATUS=$(mysql -h mysql-replica-0 -u $MYSQL_USER -p$MYSQL_PASSWORD -e "SHOW SLAVE STATUS\G" 2>/dev/null)
if echo "$SLAVE_STATUS" | grep -q "Slave_IO_Running: Yes" && echo "$SLAVE_STATUS" | grep -q "Slave_SQL_Running: Yes"; then
    LAG=$(echo "$SLAVE_STATUS" | grep "Seconds_Behind_Master" | awk '{print $2}')
    echo "   ✓ Replication running (lag: ${LAG}s)"
else
    echo "   ✗ Replication issues detected"
fi

# 3. 디스크 사용량 확인
echo "3. Disk Usage:"
DISK_USAGE=$(kubectl exec mysql-master-0 -- df -h /var/lib/mysql | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
    echo "   ✓ Disk usage: ${DISK_USAGE}%"
else
    echo "   ⚠ High disk usage: ${DISK_USAGE}%"
fi

# 4. 연결 수 확인
echo "4. Connection Count:"
CONNECTIONS=$(mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD -e "SHOW STATUS LIKE 'Threads_connected'" | tail -1 | awk '{print $2}')
MAX_CONNECTIONS=$(mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD -e "SHOW VARIABLES LIKE 'max_connections'" | tail -1 | awk '{print $2}')
CONNECTION_USAGE=$((CONNECTIONS * 100 / MAX_CONNECTIONS))

if [ $CONNECTION_USAGE -lt 80 ]; then
    echo "   ✓ Connections: ${CONNECTIONS}/${MAX_CONNECTIONS} (${CONNECTION_USAGE}%)"
else
    echo "   ⚠ High connection usage: ${CONNECTIONS}/${MAX_CONNECTIONS} (${CONNECTION_USAGE}%)"
fi

echo "=== Health Check Complete ==="
```

---

**다음**: [보안](security.md)