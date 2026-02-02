# ${{ values.name }}

${{ values.description }}

## Overview

This repository contains the deployment configuration for an NGINX-based web service with the following specifications:

- **Service Type**: ${{ values.serviceType }}
- **NGINX Version**: ${{ values.nginxVersion }}
- **Replicas**: ${{ values.replicas }}
- **SSL/TLS**: {% if values.enableSSL %}Enabled ({{ values.sslProvider }}){% else %}Disabled{% endif %}
- **Caching**: {% if values.enableCaching %}Enabled ({{ values.cacheSize }}){% else %}Disabled{% endif %}
- **Compression**: {% if values.enableGzip %}Gzip{% endif %}{% if values.enableBrotli %}, Brotli{% endif %}{% if not values.enableGzip and not values.enableBrotli %}Disabled{% endif %}
- **Monitoring**: {% if values.enableMonitoring %}Enabled{% else %}Disabled{% endif %}

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                           │
│                   (Ingress/ALB)                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                 NGINX Service                              │
├─────────────────────────────────────────────────────────────┤
│  NGINX Pod 1    │  NGINX Pod 2    │  NGINX Pod 3    │ ... │
│  (Port {{ values.port }})     │  (Port {{ values.port }})     │  (Port {{ values.port }})     │     │
└─────────────────────────────────────────────────────────────┘
{% if values.enableSSL %}
┌─────────────────────────────────────────────────────────────┐
│                SSL/TLS Termination                         │
│              ({{ values.sslProvider }})                              │
└─────────────────────────────────────────────────────────────┘
{% endif %}
{% if values.enableMonitoring %}
┌─────────────────────────────────────────────────────────────┐
│                   Monitoring                               │
│            (Prometheus + Grafana)                         │
└─────────────────────────────────────────────────────────────┘
{% endif %}
```

## Quick Start

### Prerequisites

{% if values.deploymentType == "docker-compose" or values.deploymentType == "both" %}
- Docker and Docker Compose
{% endif %}
{% if values.deploymentType == "kubernetes" or values.deploymentType == "both" %}
- Kubernetes cluster
- kubectl configured
{% if values.enableSSL and values.sslProvider == "cert-manager" %}
- cert-manager installed in cluster
{% endif %}
{% endif %}
{% if values.domain %}
- Domain `{{ values.domain }}` pointing to your load balancer
{% endif %}

### Deployment

{% if values.deploymentType == "docker-compose" or values.deploymentType == "both" %}
#### Docker Compose Deployment

1. Clone this repository:
   ```bash
   git clone ${{ values.repoUrl }}
   cd ${{ values.name }}
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start the service:
   ```bash
   docker-compose up -d
   ```

4. Verify deployment:
   ```bash
   curl http://localhost:{{ values.port }}
   ```
{% endif %}

{% if values.deploymentType == "kubernetes" or values.deploymentType == "both" %}
#### Kubernetes Deployment

1. Create namespace:
   ```bash
   kubectl create namespace {{ values.namespace }}
   ```

2. Apply configurations:
   ```bash
   kubectl apply -f k8s/
   ```

3. Wait for pods to be ready:
   ```bash
   kubectl wait --for=condition=ready pod -l app={{ values.name }} -n {{ values.namespace }} --timeout=300s
   ```

4. Check service status:
   ```bash
   kubectl get pods,svc,ingress -n {{ values.namespace }}
   ```
{% endif %}

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NGINX_PORT` | NGINX listening port | `{{ values.port }}` |
| `NGINX_WORKER_PROCESSES` | Number of worker processes | `auto` |
| `NGINX_WORKER_CONNECTIONS` | Worker connections | `1024` |
{% if values.enableBasicAuth %}
| `BASIC_AUTH_USER` | Basic auth username | `admin` |
| `BASIC_AUTH_PASSWORD` | Basic auth password | `auto-generated` |
{% endif %}
{% if values.enableRateLimit %}
| `RATE_LIMIT_RPM` | Rate limit per minute | `{{ values.rateLimitRpm }}` |
{% endif %}

### NGINX Configuration

The NGINX configuration is optimized for:
- **Performance**: Efficient worker processes and connections
- **Security**: Security headers and access controls
- **Caching**: {% if values.enableCaching %}Static asset caching enabled{% else %}Disabled{% endif %}
- **Compression**: {% if values.enableGzip %}Gzip{% endif %}{% if values.enableBrotli %} and Brotli{% endif %} compression
- **SSL/TLS**: {% if values.enableSSL %}Modern SSL configuration with strong ciphers{% else %}HTTP only{% endif %}

## Content Management

### Content Source: {{ values.contentSource }}

{% if values.contentSource == "git" %}
Content is automatically pulled from the Git repository:
- **Repository**: {{ values.gitRepo }}
- **Path**: {{ values.contentPath }}
- **Update Method**: Git webhook or periodic sync

To update content:
1. Push changes to the content repository
2. Trigger deployment pipeline
3. Content will be automatically updated
{% elif values.contentSource == "s3" %}
Content is served from S3 bucket:
- Configure S3 bucket details in environment variables
- Content is cached locally for performance
{% elif values.contentSource == "configmap" %}
Content is stored in Kubernetes ConfigMap:
- Update ConfigMap to change content
- Pods will automatically reload configuration
{% else %}
Empty content directory provided:
- Add your static files to the `html/` directory
- Rebuild and redeploy to update content
{% endif %}

## SSL/TLS Configuration

{% if values.enableSSL %}
### SSL Provider: {{ values.sslProvider }}

{% if values.sslProvider == "cert-manager" %}
SSL certificates are automatically managed by cert-manager:
- **Primary Domain**: {{ values.domain }}
{% if values.additionalDomains %}
- **Additional Domains**: {{ values.additionalDomains | join(", ") }}
{% endif %}
- **Certificate Authority**: Let's Encrypt
- **Auto-renewal**: Enabled

Certificate status:
```bash
kubectl get certificate -n {{ values.namespace }}
kubectl describe certificate {{ values.name }}-tls -n {{ values.namespace }}
```
{% elif values.sslProvider == "manual" %}
Manual SSL certificate management:
1. Obtain SSL certificates for your domain(s)
2. Create Kubernetes secret with certificates:
   ```bash
   kubectl create secret tls {{ values.name }}-tls \
     --cert=path/to/cert.pem \
     --key=path/to/key.pem \
     -n {{ values.namespace }}
   ```
{% elif values.sslProvider == "self-signed" %}
Self-signed certificates are generated automatically:
- **Warning**: Not suitable for production use
- Browsers will show security warnings
- Use only for development/testing
{% endif %}

### SSL Security Features
- TLS 1.2 and 1.3 support
- Strong cipher suites
- HSTS headers
- Perfect Forward Secrecy
- OCSP stapling
{% else %}
SSL/TLS is disabled. To enable HTTPS:
1. Set `enableSSL: true` in template parameters
2. Configure domain and SSL provider
3. Redeploy the service
{% endif %}

## Performance Optimization

### Caching Strategy

{% if values.enableCaching %}
NGINX caching is enabled with the following configuration:
- **Cache Size**: {{ values.cacheSize }}
- **Cache Location**: `/var/cache/nginx`
- **Cache Duration**: 
  - Static assets (CSS, JS, images): 1 year
  - HTML files: 1 hour
  - API responses: 5 minutes

Cache management:
```bash
# Clear cache (Kubernetes)
kubectl exec -it deployment/{{ values.name }} -n {{ values.namespace }} -- rm -rf /var/cache/nginx/*

# Cache statistics
kubectl exec -it deployment/{{ values.name }} -n {{ values.namespace }} -- nginx -T | grep cache
```
{% else %}
Caching is disabled. To enable caching:
1. Set `enableCaching: true` in template parameters
2. Configure cache size
3. Redeploy the service
{% endif %}

### Compression

{% if values.enableGzip or values.enableBrotli %}
Compression is enabled:
{% if values.enableGzip %}
- **Gzip**: Enabled for text files, JSON, CSS, JS
{% endif %}
{% if values.enableBrotli %}
- **Brotli**: Enabled (better compression than gzip)
{% endif %}

Compression levels:
- Gzip: Level 6 (balanced speed/compression)
- Brotli: Level 6 (balanced speed/compression)
{% else %}
Compression is disabled. Enable it for better performance:
1. Set `enableGzip: true` and/or `enableBrotli: true`
2. Redeploy the service
{% endif %}

## Security

### Access Control

{% if values.enableBasicAuth %}
Basic authentication is enabled:
- Username/password required for access
- Credentials stored in Kubernetes secret
- Change default credentials after deployment
{% endif %}

{% if values.allowedIPs %}
IP-based access control:
- **Allowed IPs**: {{ values.allowedIPs | join(", ") }}
- All other IPs are blocked
- Configure in NGINX configuration
{% endif %}

{% if values.enableRateLimit %}
Rate limiting is enabled:
- **Limit**: {{ values.rateLimitRpm }} requests per minute per IP
- Burst allowance: {{ values.rateLimitRpm // 4 }} requests
- Returns 429 status when exceeded
{% endif %}

### Security Headers

The following security headers are automatically added:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
{% if values.enableSSL %}
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
{% endif %}

## Monitoring

{% if values.enableMonitoring %}
### Prometheus Metrics

NGINX metrics are exposed via nginx-prometheus-exporter:
- **Metrics endpoint**: `/metrics`
- **Port**: `9113`

Key metrics to monitor:
- `nginx_http_requests_total`
- `nginx_http_request_duration_seconds`
- `nginx_connections_active`
- `nginx_connections_reading`
- `nginx_connections_writing`
- `nginx_connections_waiting`

### Grafana Dashboard

Import the provided Grafana dashboard from `monitoring/grafana-dashboard.json`.

### Health Checks

Health check endpoints:
- **Liveness**: `/health`
- **Readiness**: `/ready`
- **Status**: `/nginx_status` (internal)
{% else %}
Monitoring is disabled. To enable monitoring:
1. Set `enableMonitoring: true` in template parameters
2. Ensure Prometheus is available in your cluster
3. Redeploy the service
{% endif %}

### Logging

{% if values.enableAccessLogs %}
Access logging is enabled:
- **Format**: {{ values.logFormat }}
- **Location**: `/var/log/nginx/access.log`
- **Rotation**: Daily with 7-day retention

Log analysis:
```bash
# View recent access logs
kubectl logs -f deployment/{{ values.name }} -n {{ values.namespace }}

# Analyze traffic patterns
kubectl exec -it deployment/{{ values.name }} -n {{ values.namespace }} -- tail -f /var/log/nginx/access.log
```
{% else %}
Access logging is disabled for performance.
{% endif %}

## Custom Error Pages

{% if values.enableErrorPages %}
Custom error pages are enabled for:
- 404 Not Found
- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable

Error pages are located in `/usr/share/nginx/html/errors/`.
{% else %}
Default NGINX error pages are used.
{% endif %}

## Scaling

### Horizontal Scaling

Scale the number of replicas:
```bash
# Kubernetes
kubectl scale deployment {{ values.name }} --replicas=5 -n {{ values.namespace }}

# Docker Compose
docker-compose up -d --scale {{ values.name }}=5
```

### Vertical Scaling

Adjust resource limits in:
- `k8s/deployment.yaml` (Kubernetes)
- `docker-compose.yml` (Docker Compose)

## Troubleshooting

### Common Issues

1. **Service not accessible**
   ```bash
   # Check pod status
   kubectl get pods -n {{ values.namespace }}
   
   # Check service endpoints
   kubectl get endpoints -n {{ values.namespace }}
   
   # Check ingress
   kubectl describe ingress {{ values.name }} -n {{ values.namespace }}
   ```

2. **SSL certificate issues**
   ```bash
   # Check certificate status
   kubectl get certificate -n {{ values.namespace }}
   
   # Check cert-manager logs
   kubectl logs -n cert-manager deployment/cert-manager
   ```

3. **Performance issues**
   ```bash
   # Check resource usage
   kubectl top pods -n {{ values.namespace }}
   
   # Analyze access logs
   kubectl logs deployment/{{ values.name }} -n {{ values.namespace }} | grep "HTTP/1.1\" 5"
   ```

### Health Checks

```bash
# Overall service health
curl -f http://{{ values.domain }}/health

# NGINX status (if enabled)
curl http://{{ values.domain }}/nginx_status

# SSL certificate check
openssl s_client -connect {{ values.domain }}:443 -servername {{ values.domain }}
```

## Maintenance

### Updates

1. Update NGINX version in configuration
2. Test in staging environment
3. Perform rolling update:
   ```bash
   kubectl rollout restart deployment/{{ values.name }} -n {{ values.namespace }}
   ```

### Backup

Important files to backup:
- SSL certificates (if manually managed)
- Custom configuration files
- Static content (if stored locally)

### Log Rotation

Logs are automatically rotated:
- **Frequency**: Daily
- **Retention**: 7 days
- **Compression**: Enabled

## Support

For issues and questions:
- Create an issue in this repository
- Contact the platform team
- Check the [NGINX documentation](https://nginx.org/en/docs/)

## License

This deployment configuration is licensed under MIT License.