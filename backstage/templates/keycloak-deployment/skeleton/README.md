# ${{ values.name }}

${{ values.description }}

## Overview

This repository contains the deployment configuration for Red Hat Keycloak with the following specifications:

- **Keycloak Version**: ${{ values.keycloakVersion }}
- **Deployment Mode**: ${{ values.deploymentMode }}
- **Replicas**: ${{ values.replicas }}
- **Database**: ${{ values.databaseType }} ({{ values.databaseMode }})
- **SSL/TLS**: {% if values.enableSSL %}Enabled ({{ values.sslProvider }}){% else %}Disabled{% endif %}
- **High Availability**: {% if values.replicas > 1 %}Enabled{% else %}Disabled{% endif %}
- **Monitoring**: {% if values.enableMonitoring %}Enabled{% else %}Disabled{% endif %}

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                           │
│                   (Ingress/ALB)                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                 Keycloak Service                           │
├─────────────────────────────────────────────────────────────┤
│  Keycloak Pod 1 │  Keycloak Pod 2 │  Keycloak Pod 3 │ ... │
│  (Port 8080)    │  (Port 8080)    │  (Port 8080)    │     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│              {{ values.databaseType | title }} Database                          │
{% if values.enableDatabaseHA %}
├─────────────────────────────────────────────────────────────┤
│  Primary DB     │  Replica DB 1   │  Replica DB 2   │     │
└─────────────────────────────────────────────────────────────┘
{% else %}
│                 Single Instance                            │
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

{% if values.deploymentType == "kubernetes" or values.deploymentType == "both" %}
- Kubernetes cluster (1.21+)
- kubectl configured
- Helm 3.x (optional)
{% if values.enableSSL and values.sslProvider == "cert-manager" %}
- cert-manager installed in cluster
{% endif %}
{% endif %}
{% if values.deploymentType == "docker-compose" or values.deploymentType == "both" %}
- Docker and Docker Compose
{% endif %}
{% if values.domain %}
- Domain `{{ values.domain }}` pointing to your load balancer
{% endif %}
{% if values.enableVault %}
- HashiCorp Vault instance
{% endif %}

### Deployment

{% if values.deploymentType == "kubernetes" or values.deploymentType == "both" %}
#### Kubernetes Deployment

1. Clone this repository:
   ```bash
   git clone ${{ values.repoUrl }}
   cd ${{ values.name }}
   ```

2. Create namespace:
   ```bash
   kubectl create namespace {{ values.namespace }}
   ```

3. Configure secrets:
   ```bash
   # Create admin credentials
   kubectl create secret generic keycloak-admin-creds \
     --from-literal=username={{ values.adminUser }} \
     --from-literal=password=$(openssl rand -base64 32) \
     -n {{ values.namespace }}
   
   # Create database credentials
   kubectl create secret generic keycloak-db-creds \
     --from-literal=username=keycloak \
     --from-literal=password=$(openssl rand -base64 32) \
     --from-literal=database=keycloak \
     -n {{ values.namespace }}
   ```

4. Apply configurations:
   ```bash
   kubectl apply -f k8s/
   ```

5. Wait for pods to be ready:
   ```bash
   kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=keycloak -n {{ values.namespace }} --timeout=600s
   ```

6. Get admin password:
   ```bash
   kubectl get secret keycloak-admin-creds -n {{ values.namespace }} -o jsonpath='{.data.password}' | base64 -d
   ```
{% endif %}

{% if values.deploymentType == "docker-compose" or values.deploymentType == "both" %}
#### Docker Compose Deployment

1. Clone and configure:
   ```bash
   git clone ${{ values.repoUrl }}
   cd ${{ values.name }}
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. Start services:
   ```bash
   docker-compose up -d
   ```

3. Wait for Keycloak to be ready:
   ```bash
   docker-compose logs -f keycloak
   ```

4. Access admin console:
   ```bash
   echo "Admin URL: http://localhost:8080/admin"
   echo "Username: {{ values.adminUser }}"
   echo "Password: $(grep KEYCLOAK_ADMIN_PASSWORD .env | cut -d'=' -f2)"
   ```
{% endif %}

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `KEYCLOAK_ADMIN` | Admin username | `{{ values.adminUser }}` |
| `KEYCLOAK_ADMIN_PASSWORD` | Admin password | `auto-generated` |
| `KC_DB` | Database type | `{{ values.databaseType }}` |
| `KC_DB_URL` | Database connection URL | `auto-configured` |
| `KC_HOSTNAME` | Keycloak hostname | `{{ values.domain }}` |
| `KC_LOG_LEVEL` | Log level | `{{ values.logLevel }}` |

### Database Configuration

{% if values.databaseMode == "managed" %}
**Managed Database**: {{ values.databaseType | title }}
- **Storage**: {{ values.databaseSize }}
- **High Availability**: {% if values.enableDatabaseHA %}Enabled{% else %}Disabled{% endif %}
- **Backup**: {% if values.databaseBackup %}Enabled (daily){% else %}Disabled{% endif %}

Database connection details are automatically configured via Kubernetes secrets.
{% elif values.databaseMode == "external" %}
**External Database**: {{ values.databaseType | title }}
- Configure connection details in `k8s/secrets.yaml`
- Ensure database is accessible from Kubernetes cluster
- Create database and user manually
{% else %}
**Development Database**: H2 (embedded)
- **Warning**: Not suitable for production use
- Data is not persistent across restarts
- Use only for development and testing
{% endif %}

### SSL/TLS Configuration

{% if values.enableSSL %}
**SSL Provider**: {{ values.sslProvider }}

{% if values.sslProvider == "cert-manager" %}
SSL certificates are automatically managed by cert-manager:
- **Domain**: {{ values.domain }}
- **Certificate Authority**: Let's Encrypt
- **Auto-renewal**: Enabled

Certificate status:
```bash
kubectl get certificate -n {{ values.namespace }}
kubectl describe certificate keycloak-tls -n {{ values.namespace }}
```
{% elif values.sslProvider == "manual" %}
Manual SSL certificate management:
1. Obtain SSL certificates for your domain
2. Create Kubernetes secret:
   ```bash
   kubectl create secret tls keycloak-tls \
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
{% else %}
SSL/TLS is disabled. To enable HTTPS:
1. Set `enableSSL: true` in template parameters
2. Configure domain and SSL provider
3. Redeploy the service
{% endif %}

## Authentication Providers

### Identity Providers

{% if values.enableOIDC %}
**OpenID Connect**: Enabled
- Configure OIDC providers in Keycloak admin console
- Supports Google, Microsoft, Auth0, and custom OIDC providers
{% endif %}

{% if values.enableSAML %}
**SAML**: Enabled
- Configure SAML identity providers
- Supports ADFS, Okta, and custom SAML providers
{% endif %}

{% if values.enableLDAP %}
**LDAP/Active Directory**: Enabled
- Configure LDAP user federation
- Supports user import and synchronization
- Group mapping and role assignment
{% endif %}

{% if values.enableSocialLogin %}
**Social Login**: Enabled
- Supports GitHub, Google, Facebook, Twitter
- Configure OAuth applications in respective platforms
{% endif %}

### User Federation

{% if values.enableUserFederation %}
User federation is enabled for:
- LDAP/Active Directory integration
- Custom user storage providers
- User synchronization and mapping
{% endif %}

## Features and Extensions

### Custom Themes

{% if values.enableThemes %}
Custom themes are enabled:
- Login page customization
- Admin console themes
- Email templates
- Custom CSS and JavaScript

Theme files location: `themes/custom/`
{% endif %}

### Event Listeners

{% if values.enableEventListeners %}
Event listeners are configured for:
- User login/logout events
- Admin actions
- Authentication failures
- Custom event processing

Configure listeners in: `config/event-listeners.json`
{% endif %}

### Admin REST API

{% if values.enableAdminAPI %}
Admin REST API is enabled:
- **Endpoint**: `https://{{ values.domain }}/admin/realms`
- **Authentication**: Bearer token or basic auth
- **Documentation**: Available in admin console

API access example:
```bash
# Get access token
TOKEN=$(curl -X POST "https://{{ values.domain }}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username={{ values.adminUser }}" \
  -d "password=YOUR_PASSWORD" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

# List realms
curl -H "Authorization: Bearer $TOKEN" \
  "https://{{ values.domain }}/admin/realms"
```
{% endif %}

## Monitoring and Logging

{% if values.enableMonitoring %}
### Prometheus Metrics

Keycloak metrics are exposed for Prometheus:
- **Metrics endpoint**: `/metrics`
- **Port**: `9990`

Key metrics to monitor:
- `keycloak_logins_total`
- `keycloak_login_failures_total`
- `keycloak_user_registrations_total`
- `keycloak_sessions_active`
- `keycloak_database_connections_active`

### Grafana Dashboard

Import the provided Grafana dashboard from `monitoring/grafana-dashboard.json`.

### Health Checks

Health check endpoints:
- **Health**: `/health`
- **Ready**: `/health/ready`
- **Live**: `/health/live`
{% endif %}

### Logging

{% if values.enableLogging %}
Centralized logging is configured:
- **Log Level**: {{ values.logLevel }}
- **Format**: JSON structured logs
- **Destination**: stdout (collected by log aggregator)

{% if values.enableAuditLogs %}
**Audit Logging**: Enabled
- User authentication events
- Admin actions
- Configuration changes
- Security events

Audit logs are stored in: `/opt/keycloak/data/log/`
{% endif %}

Log analysis:
```bash
# View recent logs
kubectl logs -f deployment/keycloak -n {{ values.namespace }}

# Search for authentication failures
kubectl logs deployment/keycloak -n {{ values.namespace }} | grep "LOGIN_ERROR"
```
{% endif %}

## Security

### Network Policies

{% if values.enableNetworkPolicies %}
Network policies are configured to:
- Allow ingress traffic only from ingress controller
- Allow database connections only from Keycloak pods
- Block all other inter-pod communication
- Allow egress for external identity providers
{% endif %}

### Secrets Management

{% if values.enableVault %}
**HashiCorp Vault Integration**: Enabled
- Database credentials stored in Vault
- SSL certificates managed by Vault
- Dynamic secrets rotation
- Audit logging of secret access
{% else %}
**Kubernetes Secrets**: Used for sensitive data
- Admin credentials
- Database passwords
- SSL certificates
- OIDC client secrets
{% endif %}

### Security Best Practices

- Admin console access restricted by network policies
- Database connections encrypted
- Session cookies secured with HttpOnly and Secure flags
- CSRF protection enabled
- Rate limiting configured for authentication endpoints

## Realm Configuration

### Default Realm Setup

After deployment, configure your first realm:

1. Access admin console: `https://{{ values.domain }}/admin`
2. Login with admin credentials
3. Create a new realm or configure the master realm
4. Set up clients, users, and roles
5. Configure authentication flows
6. Set up identity providers (if needed)

### Example Client Configuration

```json
{
  "clientId": "my-app",
  "name": "My Application",
  "protocol": "openid-connect",
  "publicClient": false,
  "redirectUris": ["https://my-app.com/*"],
  "webOrigins": ["https://my-app.com"],
  "standardFlowEnabled": true,
  "implicitFlowEnabled": false,
  "directAccessGrantsEnabled": true
}
```

## Backup and Recovery

{% if values.databaseBackup %}
### Automated Backups

Database backups are configured:
- **Schedule**: Daily at 2 AM UTC
- **Retention**: 7 daily, 4 weekly, 12 monthly
- **Storage**: Persistent volume snapshots
- **Encryption**: AES-256

### Manual Backup

```bash
# Create database backup
kubectl exec -it postgresql-0 -n {{ values.namespace }} -- \
  pg_dump -U keycloak keycloak > keycloak-backup-$(date +%Y%m%d).sql

# Backup Keycloak configuration
kubectl get configmap keycloak-config -n {{ values.namespace }} -o yaml > keycloak-config-backup.yaml
```

### Disaster Recovery

1. Restore database from backup
2. Apply Kubernetes configurations
3. Restore Keycloak configuration
4. Verify realm and client configurations
5. Test authentication flows
{% endif %}

## Scaling

### Horizontal Scaling

Scale Keycloak instances:
```bash
kubectl scale deployment keycloak --replicas=5 -n {{ values.namespace }}
```

### Database Scaling

{% if values.enableDatabaseHA %}
Database is configured in HA mode with automatic failover.
{% else %}
For production workloads, consider enabling database HA:
1. Set `enableDatabaseHA: true` in template parameters
2. Redeploy with database cluster configuration
{% endif %}

## Troubleshooting

### Common Issues

1. **Keycloak not starting**
   ```bash
   # Check pod logs
   kubectl logs -f deployment/keycloak -n {{ values.namespace }}
   
   # Check database connectivity
   kubectl exec -it deployment/keycloak -n {{ values.namespace }} -- \
     nc -zv postgresql 5432
   ```

2. **SSL certificate issues**
   ```bash
   # Check certificate status
   kubectl get certificate -n {{ values.namespace }}
   
   # Check cert-manager logs
   kubectl logs -n cert-manager deployment/cert-manager
   ```

3. **Database connection issues**
   ```bash
   # Check database pod status
   kubectl get pods -l app=postgresql -n {{ values.namespace }}
   
   # Test database connection
   kubectl exec -it postgresql-0 -n {{ values.namespace }} -- \
     psql -U keycloak -d keycloak -c "SELECT version();"
   ```

### Performance Tuning

1. **JVM Settings**
   - Adjust heap size based on load
   - Configure garbage collection
   - Set connection pool sizes

2. **Database Optimization**
   - Configure connection pooling
   - Optimize database queries
   - Set appropriate indexes

3. **Caching**
   - Enable Infinispan clustering
   - Configure cache sizes
   - Set cache expiration policies

## Maintenance

### Updates

1. Update Keycloak version in configuration
2. Test in staging environment
3. Perform rolling update:
   ```bash
   kubectl set image deployment/keycloak \
     keycloak=quay.io/keycloak/keycloak:NEW_VERSION \
     -n {{ values.namespace }}
   ```

### Health Monitoring

```bash
# Check overall system health
curl -f https://{{ values.domain }}/health

# Check database health
kubectl exec -it postgresql-0 -n {{ values.namespace }} -- \
  pg_isready -U keycloak

# Check cluster status (if HA enabled)
curl -f https://{{ values.domain }}/admin/realms/master/cluster-status
```

## Support

For issues and questions:
- Create an issue in this repository
- Contact the platform team
- Check the [Keycloak documentation](https://www.keycloak.org/documentation)
- Visit the [Keycloak community](https://www.keycloak.org/community)

## License

This deployment configuration is licensed under MIT License.