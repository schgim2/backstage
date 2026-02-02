# 모니터링

PostgreSQL 클러스터의 성능 모니터링, 알림 설정, 대시보드 구성을 안내합니다.

## 📊 모니터링 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │───►│   Prometheus    │───►│    Grafana      │
│   + Exporter    │    │   (Metrics)     │    │  (Dashboard)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Log Files     │───►│   Loki/ELK      │───►│   AlertManager  │
│   (Structured)  │    │   (Logs)        │    │   (Alerts)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Prometheus 설정

### PostgreSQL Exporter 설정

```yaml
# postgres-exporter-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgresql-exporter-config
  namespace: database
data:
  queries.yaml: |
    # 데이터베이스 통계
    pg_database:
      query: |
        SELECT datname,
               numbackends,
               xact_commit,
               xact_rollback,
               blks_read,
               blks_hit,
               tup_returned,
               tup_fetched,
               tup_inserted,
               tup_updated,
               tup_deleted,
               conflicts,
               temp_files,
               temp_bytes,
               deadlocks,
               blk_read_time,
               blk_write_time
        FROM pg_stat_database
        WHERE datname NOT IN ('template0', 'template1', 'postgres')
      metrics:
        - datname:
            usage: "LABEL"
            description: "Database name"
        - numbackends:
            usage: "GAUGE"
            description: "Number of backends currently connected to this database"
        - xact_commit:
            usage: "COUNTER"
            description: "Number of transactions in this database that have been committed"
        - xact_rollback:
            usage: "COUNTER"
            description: "Number of transactions in this database that have been rolled back"
        - blks_read:
            usage: "COUNTER"
            description: "Number of disk blocks read in this database"
        - blks_hit:
            usage: "COUNTER"
            description: "Number of times disk blocks were found already in the buffer cache"

    # 복제 통계
    pg_replication:
      query: |
        SELECT client_addr,
               application_name,
               state,
               pg_wal_lsn_diff(sent_lsn, '0/0') as sent_lsn_bytes,
               pg_wal_lsn_diff(write_lsn, '0/0') as write_lsn_bytes,
               pg_wal_lsn_diff(flush_lsn, '0/0') as flush_lsn_bytes,
               pg_wal_lsn_diff(replay_lsn, '0/0') as replay_lsn_bytes,
               pg_wal_lsn_diff(sent_lsn, write_lsn) as write_lag_bytes,
               pg_wal_lsn_diff(write_lsn, flush_lsn) as flush_lag_bytes,
               pg_wal_lsn_diff(flush_lsn, replay_lsn) as replay_lag_bytes
        FROM pg_stat_replication
      metrics:
        - client_addr:
            usage: "LABEL"
            description: "IP address of the client connected to this WAL sender"
        - application_name:
            usage: "LABEL"
            description: "Name of the application that is connected to this WAL sender"
        - state:
            usage: "LABEL"
            description: "Current WAL sender state"
        - sent_lsn_bytes:
            usage: "GAUGE"
            description: "Last write-ahead log location sent on this connection"
        - write_lsn_bytes:
            usage: "GAUGE"
            description: "Last write-ahead log location written to disk by this standby server"

    # 테이블 통계
    pg_stat_user_tables:
      query: |
        SELECT schemaname,
               tablename,
               seq_scan,
               seq_tup_read,
               idx_scan,
               idx_tup_fetch,
               n_tup_ins,
               n_tup_upd,
               n_tup_del,
               n_tup_hot_upd,
               n_live_tup,
               n_dead_tup,
               vacuum_count,
               autovacuum_count,
               analyze_count,
               autoanalyze_count
        FROM pg_stat_user_tables
      metrics:
        - schemaname:
            usage: "LABEL"
            description: "Name of the schema that this table is in"
        - tablename:
            usage: "LABEL"
            description: "Name of this table"
        - seq_scan:
            usage: "COUNTER"
            description: "Number of sequential scans initiated on this table"
        - idx_scan:
            usage: "COUNTER"
            description: "Number of index scans initiated on this table"
        - n_live_tup:
            usage: "GAUGE"
            description: "Estimated number of live rows"
        - n_dead_tup:
            usage: "GAUGE"
            description: "Estimated number of dead rows"

    # 인덱스 통계
    pg_stat_user_indexes:
      query: |
        SELECT schemaname,
               tablename,
               indexname,
               idx_scan,
               idx_tup_read,
               idx_tup_fetch
        FROM pg_stat_user_indexes
      metrics:
        - schemaname:
            usage: "LABEL"
            description: "Name of the schema that this table is in"
        - tablename:
            usage: "LABEL"
            description: "Name of the table for this index"
        - indexname:
            usage: "LABEL"
            description: "Name of this index"
        - idx_scan:
            usage: "COUNTER"
            description: "Number of index scans initiated on this index"

    # 연결 통계
    pg_stat_activity:
      query: |
        SELECT state,
               COUNT(*) as count
        FROM pg_stat_activity
        WHERE state IS NOT NULL
        GROUP BY state
      metrics:
        - state:
            usage: "LABEL"
            description: "Current overall state of this backend"
        - count:
            usage: "GAUGE"
            description: "Number of connections in this state"

    # 느린 쿼리 (pg_stat_statements 필요)
    pg_stat_statements:
      query: |
        SELECT query,
               calls,
               total_time,
               mean_time,
               rows,
               100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        ORDER BY mean_time DESC
        LIMIT 10
      metrics:
        - query:
            usage: "LABEL"
            description: "Text of a representative statement"
        - calls:
            usage: "COUNTER"
            description: "Number of times executed"
        - total_time:
            usage: "COUNTER"
            description: "Total time spent in the statement, in milliseconds"
        - mean_time:
            usage: "GAUGE"
            description: "Mean time spent in the statement, in milliseconds"
        - rows:
            usage: "COUNTER"
            description: "Total number of rows retrieved or affected by the statement"
        - hit_percent:
            usage: "GAUGE"
            description: "Percentage of shared block hits"
```

### Prometheus 스크래핑 설정

```yaml
# prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    rule_files:
      - "/etc/prometheus/rules/*.yml"

    scrape_configs:
    # PostgreSQL 메트릭
    - job_name: 'postgresql'
      static_configs:
      - targets: ['postgresql-master.database.svc.cluster.local:9187']
        labels:
          instance: 'postgresql-master'
          role: 'master'
      - targets: ['postgresql-replica-0.database.svc.cluster.local:9187']
        labels:
          instance: 'postgresql-replica-0'
          role: 'replica'
      - targets: ['postgresql-replica-1.database.svc.cluster.local:9187']
        labels:
          instance: 'postgresql-replica-1'
          role: 'replica'
      scrape_interval: 30s
      metrics_path: /metrics

    # PgBouncer 메트릭
    - job_name: 'pgbouncer'
      static_configs:
      - targets: ['postgresql-pgbouncer.database.svc.cluster.local:9127']
      scrape_interval: 30s

    # 노드 메트릭
    - job_name: 'node-exporter'
      kubernetes_sd_configs:
      - role: node
      relabel_configs:
      - source_labels: [__address__]
        regex: '(.*):10250'
        target_label: __address__
        replacement: '${1}:9100'
```

## 📈 Grafana 대시보드

### PostgreSQL 개요 대시보드

```json
{
  "dashboard": {
    "id": null,
    "title": "PostgreSQL Overview",
    "tags": ["postgresql", "database"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Database Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(pg_stat_activity_count) by (instance)",
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
                {"color": "green", "value": null},
                {"color": "yellow", "value": 80},
                {"color": "red", "value": 150}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Transactions per Second",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(pg_stat_database_xact_commit[5m]) + rate(pg_stat_database_xact_rollback[5m])",
            "legendFormat": "{{datname}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Cache Hit Ratio",
        "type": "stat",
        "targets": [
          {
            "expr": "100 * sum(pg_stat_database_blks_hit) / (sum(pg_stat_database_blks_hit) + sum(pg_stat_database_blks_read))",
            "legendFormat": "Cache Hit %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100,
            "thresholds": {
              "steps": [
                {"color": "red", "value": null},
                {"color": "yellow", "value": 85},
                {"color": "green", "value": 95}
              ]
            }
          }
        }
      },
      {
        "id": 4,
        "title": "Replication Lag",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_replication_lag_bytes",
            "legendFormat": "{{application_name}}"
          }
        ]
      },
      {
        "id": 5,
        "title": "Database Size",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_database_size_bytes",
            "legendFormat": "{{datname}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "bytes"
          }
        }
      },
      {
        "id": 6,
        "title": "Top Slow Queries",
        "type": "table",
        "targets": [
          {
            "expr": "topk(10, pg_stat_statements_mean_time_seconds)",
            "format": "table"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### 복제 모니터링 대시보드

```json
{
  "dashboard": {
    "title": "PostgreSQL Replication",
    "panels": [
      {
        "id": 1,
        "title": "Replication Status",
        "type": "stat",
        "targets": [
          {
            "expr": "pg_replication_is_replica",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "id": 2,
        "title": "Replication Lag (Bytes)",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_replication_lag_bytes",
            "legendFormat": "{{application_name}} - {{client_addr}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "WAL Generation Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(pg_stat_wal_bytes[5m])",
            "legendFormat": "WAL Bytes/sec"
          }
        ]
      },
      {
        "id": 4,
        "title": "Standby Servers",
        "type": "table",
        "targets": [
          {
            "expr": "pg_stat_replication_info",
            "format": "table"
          }
        ]
      }
    ]
  }
}
```

## 🚨 알림 규칙

### Prometheus 알림 규칙

```yaml
# postgresql-alerts.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgresql-alert-rules
  namespace: monitoring
data:
  postgresql.yml: |
    groups:
    - name: postgresql
      rules:
      # PostgreSQL 서버 다운
      - alert: PostgreSQLDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL server is down"
          description: "PostgreSQL server {{ $labels.instance }} has been down for more than 1 minute."

      # 높은 연결 수
      - alert: PostgreSQLHighConnections
        expr: sum(pg_stat_activity_count) by (instance) > 180
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL high number of connections"
          description: "PostgreSQL server {{ $labels.instance }} has {{ $value }} connections (threshold: 180)."

      # 낮은 캐시 히트율
      - alert: PostgreSQLLowCacheHitRatio
        expr: 100 * sum(pg_stat_database_blks_hit) / (sum(pg_stat_database_blks_hit) + sum(pg_stat_database_blks_read)) < 90
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL low cache hit ratio"
          description: "PostgreSQL cache hit ratio is {{ $value }}% (threshold: 90%)."

      # 복제 지연
      - alert: PostgreSQLReplicationLag
        expr: pg_replication_lag_bytes > 1073741824  # 1GB
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL replication lag"
          description: "PostgreSQL replication lag on {{ $labels.application_name }} is {{ $value | humanize1024 }}B."

      # 복제 중단
      - alert: PostgreSQLReplicationBroken
        expr: pg_replication_is_replica == 0 and pg_replication_lag_bytes > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL replication broken"
          description: "PostgreSQL replication on {{ $labels.instance }} appears to be broken."

      # 데드락 증가
      - alert: PostgreSQLDeadlocks
        expr: rate(pg_stat_database_deadlocks[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL deadlocks detected"
          description: "PostgreSQL deadlock rate is {{ $value }} per second on {{ $labels.datname }}."

      # 디스크 사용량 높음
      - alert: PostgreSQLHighDiskUsage
        expr: (pg_database_size_bytes / (1024^3)) > 80  # 80GB
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL high disk usage"
          description: "PostgreSQL database {{ $labels.datname }} size is {{ $value | humanize1024 }}B."

      # 느린 쿼리
      - alert: PostgreSQLSlowQueries
        expr: pg_stat_statements_mean_time_seconds > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL slow queries detected"
          description: "PostgreSQL has queries with mean execution time > 5 seconds."

      # WAL 파일 증가
      - alert: PostgreSQLWALFilesHigh
        expr: pg_stat_wal_files > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL high WAL files count"
          description: "PostgreSQL has {{ $value }} WAL files (threshold: 100)."

      # 백업 실패
      - alert: PostgreSQLBackupFailed
        expr: time() - postgresql_backup_last_success_timestamp > 86400  # 24시간
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL backup failed"
          description: "PostgreSQL backup has not succeeded for more than 24 hours."
```

### AlertManager 설정

```yaml
# alertmanager-config.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      smtp_smarthost: 'smtp.gmail.com:587'
      smtp_from: 'alerts@company.com'
      smtp_auth_username: 'alerts@company.com'
      smtp_auth_password: 'password'

    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 1h
      receiver: 'default'
      routes:
      - match:
          severity: critical
        receiver: 'critical-alerts'
      - match:
          severity: warning
        receiver: 'warning-alerts'

    receivers:
    - name: 'default'
      email_configs:
      - to: 'admin@company.com'
        subject: 'PostgreSQL Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Severity: {{ .Labels.severity }}
          {{ end }}

    - name: 'critical-alerts'
      email_configs:
      - to: 'oncall@company.com'
        subject: 'CRITICAL: PostgreSQL Alert'
        body: |
          {{ range .Alerts }}
          CRITICAL ALERT: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Time: {{ .StartsAt }}
          {{ end }}
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        title: 'CRITICAL: PostgreSQL Alert'
        text: |
          {{ range .Alerts }}
          {{ .Annotations.summary }}
          Instance: {{ .Labels.instance }}
          {{ end }}

    - name: 'warning-alerts'
      email_configs:
      - to: 'team@company.com'
        subject: 'WARNING: PostgreSQL Alert'
        body: |
          {{ range .Alerts }}
          Warning: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          {{ end }}
```

## 📊 로그 모니터링

### 구조화된 로깅 설정

```ini
# postgresql.conf
log_destination = 'jsonlog'
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.json'
log_rotation_age = 1d
log_rotation_size = 100MB

# 로그 내용 설정
log_line_prefix = ''
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0
log_autovacuum_min_duration = 0
log_error_verbosity = default

# 느린 쿼리 로깅
log_min_duration_statement = 1000
log_statement = 'mod'
```

### Fluentd 로그 수집 설정

```yaml
# fluentd-postgresql.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-postgresql-config
  namespace: logging
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/postgresql/*.json
      pos_file /var/log/fluentd/postgresql.log.pos
      tag postgresql.log
      format json
      time_key timestamp
      time_format %Y-%m-%d %H:%M:%S.%L %Z
    </source>

    <filter postgresql.log>
      @type parser
      key_name message
      reserve_data true
      <parse>
        @type regexp
        expression /^(?<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \w+) \[(?<pid>\d+)\] (?<level>\w+): (?<message>.*)$/
      </parse>
    </filter>

    <match postgresql.log>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      index_name postgresql-logs
      type_name _doc
      include_tag_key true
      tag_key @log_name
      flush_interval 10s
    </match>
```

### 로그 분석 쿼리

```sql
-- Elasticsearch/Kibana 쿼리 예시

-- 에러 로그 분석
GET postgresql-logs/_search
{
  "query": {
    "bool": {
      "must": [
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"term": {"level": "ERROR"}}
      ]
    }
  },
  "aggs": {
    "error_types": {
      "terms": {"field": "message.keyword", "size": 10}
    }
  }
}

-- 느린 쿼리 분석
GET postgresql-logs/_search
{
  "query": {
    "bool": {
      "must": [
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"wildcard": {"message": "*duration:*"}}
      ]
    }
  },
  "sort": [{"@timestamp": {"order": "desc"}}]
}

-- 연결 패턴 분석
GET postgresql-logs/_search
{
  "query": {
    "bool": {
      "should": [
        {"match": {"message": "connection received"}},
        {"match": {"message": "connection authorized"}},
        {"match": {"message": "disconnection"}}
      ]
    }
  },
  "aggs": {
    "connection_timeline": {
      "date_histogram": {
        "field": "@timestamp",
        "interval": "5m"
      }
    }
  }
}
```

## 🔍 성능 모니터링

### 쿼리 성능 분석

```sql
-- pg_stat_statements를 사용한 성능 분석
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- 인덱스 사용률 분석
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- 테이블 크기 및 사용률
SELECT 
    schemaname,
    tablename,
    n_live_tup,
    n_dead_tup,
    seq_scan,
    idx_scan,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 자동 성능 리포트

```bash
#!/bin/bash
# performance_report.sh

REPORT_FILE="/tmp/postgresql_performance_$(date +%Y%m%d_%H%M%S).html"

cat > ${REPORT_FILE} << EOF
<!DOCTYPE html>
<html>
<head>
    <title>PostgreSQL Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .metric { background-color: #e7f3ff; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>PostgreSQL Performance Report</h1>
    <p>Generated: $(date)</p>
    
    <h2>Database Overview</h2>
    <div class="metric">
        <strong>Total Connections:</strong> $(psql -h postgresql-master -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;")
    </div>
    <div class="metric">
        <strong>Cache Hit Ratio:</strong> $(psql -h postgresql-master -U postgres -t -c "SELECT round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) || '%' FROM pg_stat_database;")
    </div>
    
    <h2>Top 10 Slow Queries</h2>
    <table>
        <tr><th>Query</th><th>Calls</th><th>Mean Time (ms)</th><th>Total Time (ms)</th></tr>
EOF

psql -h postgresql-master -U postgres -H -c "
SELECT 
    left(query, 100) as query,
    calls,
    round(mean_time::numeric, 2) as mean_time,
    round(total_time::numeric, 2) as total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;" >> ${REPORT_FILE}

cat >> ${REPORT_FILE} << EOF
    </table>
    
    <h2>Database Sizes</h2>
    <table>
        <tr><th>Database</th><th>Size</th></tr>
EOF

psql -h postgresql-master -U postgres -H -c "
SELECT 
    datname,
    pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database 
WHERE datname NOT IN ('template0', 'template1', 'postgres')
ORDER BY pg_database_size(datname) DESC;" >> ${REPORT_FILE}

cat >> ${REPORT_FILE} << EOF
    </table>
</body>
</html>
EOF

echo "Performance report generated: ${REPORT_FILE}"

# 이메일 발송 (선택사항)
if [ ! -z "$REPORT_EMAIL" ]; then
    mail -s "PostgreSQL Performance Report" -a "Content-Type: text/html" $REPORT_EMAIL < ${REPORT_FILE}
fi
```

## 📚 다음 단계

모니터링 설정이 완료되면 다음 문서들을 참고하세요:

- **[Security](security.md)** - 보안 모니터링
- **[Troubleshooting](troubleshooting.md)** - 문제 해결
- **[Best Practices](best-practices.md)** - 모니터링 모범 사례

---

**이전**: [Backup & Recovery](backup-recovery.md) | **다음**: [Security](security.md)