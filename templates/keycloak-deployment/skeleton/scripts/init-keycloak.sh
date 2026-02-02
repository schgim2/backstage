#!/bin/bash

# Keycloak Initialization Script
# This script initializes Keycloak with basic configuration

set -euo pipefail

# Configuration
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD}"
REALM_NAME="${REALM_NAME:-master}"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to wait for Keycloak to be ready
wait_for_keycloak() {
    log "Waiting for Keycloak to be ready..."
    
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$KEYCLOAK_URL/health/ready" > /dev/null; then
            log "Keycloak is ready"
            return 0
        fi
        
        log "Attempt $attempt/$max_attempts: Keycloak not ready yet, waiting..."
        sleep 10
        ((attempt++))
    done
    
    log "ERROR: Keycloak failed to become ready within expected time"
    return 1
}

# Function to get admin access token
get_admin_token() {
    local token_response=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$ADMIN_USER" \
        -d "password=$ADMIN_PASSWORD" \
        -d "grant_type=password" \
        -d "client_id=admin-cli")
    
    echo "$token_response" | jq -r '.access_token'
}

# Function to create a realm
create_realm() {
    local realm_name="$1"
    local token="$2"
    
    log "Creating realm: $realm_name"
    
    local realm_config='{
        "realm": "'$realm_name'",
        "enabled": true,
        "displayName": "'$realm_name'",
        "registrationAllowed": true,
        "registrationEmailAsUsername": true,
        "rememberMe": true,
        "verifyEmail": true,
        "loginWithEmailAllowed": true,
        "duplicateEmailsAllowed": false,
        "resetPasswordAllowed": true,
        "editUsernameAllowed": false,
        "bruteForceProtected": true,
        "permanentLockout": false,
        "maxFailureWaitSeconds": 900,
        "minimumQuickLoginWaitSeconds": 60,
        "waitIncrementSeconds": 60,
        "quickLoginCheckMilliSeconds": 1000,
        "maxDeltaTimeSeconds": 43200,
        "failureFactor": 30,
        "defaultRoles": ["offline_access", "uma_authorization"],
        "requiredCredentials": ["password"],
        "passwordPolicy": "length(8) and digits(1) and lowerCase(1) and upperCase(1) and specialChars(1) and notUsername",
        "otpPolicyType": "totp",
        "otpPolicyAlgorithm": "HmacSHA1",
        "otpPolicyInitialCounter": 0,
        "otpPolicyDigits": 6,
        "otpPolicyLookAheadWindow": 1,
        "otpPolicyPeriod": 30,
        "sslRequired": "external",
        "internationalizationEnabled": true,
        "supportedLocales": ["en", "de", "fr", "es", "ja", "ko", "zh-CN"],
        "defaultLocale": "en"
    }'
    
    local response=$(curl -s -w "%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$realm_config")
    
    local http_code="${response: -3}"
    
    if [ "$http_code" = "201" ]; then
        log "Realm '$realm_name' created successfully"
    elif [ "$http_code" = "409" ]; then
        log "Realm '$realm_name' already exists"
    else
        log "ERROR: Failed to create realm '$realm_name' (HTTP $http_code)"
        return 1
    fi
}

# Function to create a client
create_client() {
    local realm_name="$1"
    local client_id="$2"
    local client_name="$3"
    local redirect_uris="$4"
    local token="$5"
    
    log "Creating client: $client_id in realm $realm_name"
    
    local client_config='{
        "clientId": "'$client_id'",
        "name": "'$client_name'",
        "description": "Auto-generated client for '$client_name'",
        "enabled": true,
        "clientAuthenticatorType": "client-secret",
        "redirectUris": ['$redirect_uris'],
        "webOrigins": ["*"],
        "protocol": "openid-connect",
        "publicClient": false,
        "bearerOnly": false,
        "consentRequired": false,
        "standardFlowEnabled": true,
        "implicitFlowEnabled": false,
        "directAccessGrantsEnabled": true,
        "serviceAccountsEnabled": true,
        "authorizationServicesEnabled": false,
        "fullScopeAllowed": true,
        "nodeReRegistrationTimeout": -1,
        "defaultClientScopes": ["web-origins", "role_list", "profile", "roles", "email"],
        "optionalClientScopes": ["address", "phone", "offline_access", "microprofile-jwt"]
    }'
    
    local response=$(curl -s -w "%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms/$realm_name/clients" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$client_config")
    
    local http_code="${response: -3}"
    
    if [ "$http_code" = "201" ]; then
        log "Client '$client_id' created successfully"
        
        # Get client secret
        local client_uuid=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$realm_name/clients?clientId=$client_id" \
            -H "Authorization: Bearer $token" | jq -r '.[0].id')
        
        local client_secret=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$realm_name/clients/$client_uuid/client-secret" \
            -H "Authorization: Bearer $token" | jq -r '.value')
        
        log "Client secret for '$client_id': $client_secret"
        
    elif [ "$http_code" = "409" ]; then
        log "Client '$client_id' already exists"
    else
        log "ERROR: Failed to create client '$client_id' (HTTP $http_code)"
        return 1
    fi
}

# Function to create a user
create_user() {
    local realm_name="$1"
    local username="$2"
    local email="$3"
    local first_name="$4"
    local last_name="$5"
    local password="$6"
    local token="$7"
    
    log "Creating user: $username in realm $realm_name"
    
    local user_config='{
        "username": "'$username'",
        "email": "'$email'",
        "firstName": "'$first_name'",
        "lastName": "'$last_name'",
        "enabled": true,
        "emailVerified": true,
        "credentials": [{
            "type": "password",
            "value": "'$password'",
            "temporary": false
        }]
    }'
    
    local response=$(curl -s -w "%{http_code}" -X POST "$KEYCLOAK_URL/admin/realms/$realm_name/users" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$user_config")
    
    local http_code="${response: -3}"
    
    if [ "$http_code" = "201" ]; then
        log "User '$username' created successfully"
    elif [ "$http_code" = "409" ]; then
        log "User '$username' already exists"
    else
        log "ERROR: Failed to create user '$username' (HTTP $http_code)"
        return 1
    fi
}

# Function to configure realm settings
configure_realm_settings() {
    local realm_name="$1"
    local token="$2"
    
    log "Configuring realm settings for: $realm_name"
    
    # Configure login settings
    local login_config='{
        "bruteForceProtected": true,
        "permanentLockout": false,
        "maxFailureWaitSeconds": 900,
        "minimumQuickLoginWaitSeconds": 60,
        "waitIncrementSeconds": 60,
        "quickLoginCheckMilliSeconds": 1000,
        "maxDeltaTimeSeconds": 43200,
        "failureFactor": 30
    }'
    
    curl -s -X PUT "$KEYCLOAK_URL/admin/realms/$realm_name" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$login_config" > /dev/null
    
    log "Realm settings configured successfully"
}

# Function to show initialization summary
show_summary() {
    log "=== Keycloak Initialization Summary ==="
    log "Keycloak URL: $KEYCLOAK_URL"
    log "Admin Console: $KEYCLOAK_URL/admin"
    log "Admin User: $ADMIN_USER"
    log "Realm: $REALM_NAME"
    log "=== End Summary ==="
}

# Main execution
main() {
    log "Starting Keycloak initialization..."
    
    # Wait for Keycloak to be ready
    if ! wait_for_keycloak; then
        exit 1
    fi
    
    # Get admin token
    log "Getting admin access token..."
    local admin_token=$(get_admin_token)
    
    if [ -z "$admin_token" ] || [ "$admin_token" = "null" ]; then
        log "ERROR: Failed to get admin access token"
        exit 1
    fi
    
    # Create example realm (if not master)
    if [ "$REALM_NAME" != "master" ]; then
        create_realm "$REALM_NAME" "$admin_token"
        configure_realm_settings "$REALM_NAME" "$admin_token"
        
        # Create example client
        create_client "$REALM_NAME" "example-app" "Example Application" '"http://localhost:3000/*", "http://localhost:8080/*"' "$admin_token"
        
        # Create example user
        create_user "$REALM_NAME" "testuser" "test@example.com" "Test" "User" "password123" "$admin_token"
    fi
    
    show_summary
    log "Keycloak initialization completed successfully"
}

# Execute main function
main "$@"