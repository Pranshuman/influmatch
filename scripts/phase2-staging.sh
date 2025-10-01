#!/bin/bash

# Phase 2: Staging Deployment Script
# This script deploys the application to staging environment

set -e  # Exit on any error

echo "🚀 Starting Phase 2: Staging Deployment"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Phase 1 is complete
check_phase1_completion() {
    log_info "Checking Phase 1 completion..."
    
    if [ ! -f .env.production ]; then
        log_error "Phase 1 not completed. Please run phase1-setup.sh first."
        exit 1
    fi
    
    if [ ! -f scripts/postgres-schema.sql ]; then
        log_error "PostgreSQL schema not found. Please complete Phase 1 first."
        exit 1
    fi
    
    log_success "Phase 1 completion verified"
}

# Deploy backend to staging
deploy_backend_staging() {
    log_info "Deploying backend to staging..."
    
    # Create staging environment file
    cat > .env.staging << EOF
NODE_ENV=staging
PORT=5050
DATABASE_URL=\${DATABASE_URL}
JWT_SECRET=\${JWT_SECRET}
CORS_ORIGIN=https://staging.influmatch.com,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
EOF
    
    # Create staging deployment script
    cat > scripts/deploy-staging.sh << 'EOF'
#!/bin/bash

echo "🚀 Deploying to staging environment..."

# Install dependencies
npm install

# Run database migrations
npm run migrate:staging

# Run tests
npm run test:staging

# Start staging server
npm run start:staging
EOF
    
    chmod +x scripts/deploy-staging.sh
    
    log_success "Backend staging deployment prepared"
    log_info "To deploy: ./scripts/deploy-staging.sh"
}

# Deploy frontend to staging
deploy_frontend_staging() {
    log_info "Preparing frontend for staging deployment..."
    
    # Create staging environment for frontend
    cat > frontend/.env.staging << EOF
NEXT_PUBLIC_API_URL=https://staging-api.influmatch.com
NEXT_PUBLIC_ENVIRONMENT=staging
EOF
    
    # Create staging build script
    cat > frontend/scripts/build-staging.sh << 'EOF'
#!/bin/bash

echo "🏗️ Building frontend for staging..."

# Install dependencies
npm install

# Build for staging
npm run build:staging

# Export static files
npm run export:staging

echo "✅ Frontend staging build completed"
EOF
    
    chmod +x frontend/scripts/build-staging.sh
    
    log_success "Frontend staging deployment prepared"
    log_info "To build: cd frontend && ./scripts/build-staging.sh"
}

# Create staging test suite
create_staging_tests() {
    log_info "Creating staging test suite..."
    
    cat > tests/staging-tests.sh << 'EOF'
#!/bin/bash

# Staging Environment Tests
source "$(dirname "$0")/utils/test-helpers.sh"

STAGING_API_URL="https://staging-api.influmatch.com"
STAGING_FRONTEND_URL="https://staging.influmatch.com"

test_staging_health() {
    log_info "Testing staging health endpoints..."
    
    # Test backend health
    local backend_health=$(curl -s -w '%{http_code}' "$STAGING_API_URL/health")
    local backend_status=$(echo "$backend_health" | tail -c 4)
    
    assert_http_status "$backend_health" "200" "Backend health check"
    
    # Test frontend health
    local frontend_health=$(curl -s -w '%{http_code}' "$STAGING_FRONTEND_URL")
    local frontend_status=$(echo "$frontend_health" | tail -c 4)
    
    assert_http_status "$frontend_health" "200" "Frontend health check"
}

test_staging_auth() {
    log_info "Testing staging authentication..."
    
    # Test user registration
    local test_email="staging_test_$(date +%s)@example.com"
    local user_data='{
        "name": "Staging Test User",
        "email": "'$test_email'",
        "password": "testpassword123",
        "userType": "brand"
    }'
    
    local register_response=$(curl -s -w '%{http_code}' -X POST \
        -H "Content-Type: application/json" \
        -d "$user_data" \
        "$STAGING_API_URL/auth/register")
    
    local register_status=$(echo "$register_response" | tail -c 4)
    assert_http_status "$register_response" "201" "User registration"
    
    # Test user login
    local login_data='{
        "email": "'$test_email'",
        "password": "testpassword123"
    }'
    
    local login_response=$(curl -s -w '%{http_code}' -X POST \
        -H "Content-Type: application/json" \
        -d "$login_data" \
        "$STAGING_API_URL/auth/login")
    
    local login_status=$(echo "$login_response" | tail -c 4)
    assert_http_status "$login_response" "200" "User login"
}

test_staging_api() {
    log_info "Testing staging API endpoints..."
    
    # Test listings endpoint
    local listings_response=$(curl -s -w '%{http_code}' "$STAGING_API_URL/api/listings")
    local listings_status=$(echo "$listings_response" | tail -c 4)
    assert_http_status "$listings_response" "200" "Listings endpoint"
    
    # Test users endpoint (should require auth)
    local users_response=$(curl -s -w '%{http_code}' "$STAGING_API_URL/api/users/1")
    local users_status=$(echo "$users_response" | tail -c 4)
    assert_http_status "$users_response" "401" "Users endpoint auth check"
}

main() {
    log_info "Starting staging environment tests..."
    
    init_test_environment
    
    test_staging_health
    test_staging_auth
    test_staging_api
    
    print_test_summary
}

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
EOF
    
    chmod +x tests/staging-tests.sh
    
    log_success "Staging test suite created"
}

# Create monitoring setup
setup_staging_monitoring() {
    log_info "Setting up staging monitoring..."
    
    cat > scripts/setup-monitoring.sh << 'EOF'
#!/bin/bash

echo "📊 Setting up staging monitoring..."

# Create monitoring configuration
cat > monitoring/staging-config.json << 'MONITORING_EOF'
{
  "monitoring": {
    "enabled": true,
    "environment": "staging",
    "endpoints": [
      {
        "name": "Health Check",
        "url": "https://staging-api.influmatch.com/health",
        "interval": 30000,
        "timeout": 5000
      },
      {
        "name": "API Response Time",
        "url": "https://staging-api.influmatch.com/api/listings",
        "interval": 60000,
        "timeout": 10000
      }
    ],
    "alerts": {
      "email": "admin@influmatch.com",
      "slack": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
    }
  }
}
MONITORING_EOF

echo "✅ Monitoring configuration created"
EOF
    
    chmod +x scripts/setup-monitoring.sh
    
    log_success "Staging monitoring setup prepared"
}

# Create staging documentation
create_staging_docs() {
    log_info "Creating staging documentation..."
    
    cat > STAGING_GUIDE.md << 'EOF'
# Staging Environment Guide

## 🚀 Staging Environment Overview

The staging environment is a production-like environment used for testing and validation before the public launch.

## 🔗 Staging URLs

- **Frontend**: https://staging.influmatch.com
- **Backend API**: https://staging-api.influmatch.com
- **Database**: PostgreSQL (staging instance)

## 🧪 Testing the Staging Environment

### 1. Health Checks
```bash
# Test backend health
curl https://staging-api.influmatch.com/health

# Test frontend
curl https://staging.influmatch.com
```

### 2. Run Full Test Suite
```bash
./tests/staging-tests.sh
```

### 3. Manual Testing Checklist
- [ ] User registration works
- [ ] User login works
- [ ] Campaign creation works
- [ ] Proposal submission works
- [ ] Status management works
- [ ] All pages load correctly
- [ ] Mobile responsiveness
- [ ] Performance is acceptable

## 🐛 Reporting Issues

If you find issues in staging:
1. Document the issue with steps to reproduce
2. Check the browser console for errors
3. Check the network tab for failed requests
4. Report to the development team

## 🔄 Deployment Process

### Backend Deployment
```bash
./scripts/deploy-staging.sh
```

### Frontend Deployment
```bash
cd frontend
./scripts/build-staging.sh
```

## 📊 Monitoring

The staging environment includes:
- Health check monitoring
- Performance monitoring
- Error tracking
- User activity tracking

## 🔐 Access

Staging environment access:
- **Admin**: Contact development team
- **Test Users**: Use staging test accounts
- **Database**: Read-only access for debugging

## 🚨 Important Notes

- Staging data is reset weekly
- Use test data only
- Do not use real user data
- Report all issues immediately
EOF
    
    log_success "Staging documentation created"
}

# Main execution
main() {
    echo "Starting Phase 2 staging deployment..."
    
    check_phase1_completion
    deploy_backend_staging
    deploy_frontend_staging
    create_staging_tests
    setup_staging_monitoring
    create_staging_docs
    
    echo ""
    echo "✅ Phase 2 staging deployment prepared!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set up staging hosting (Railway/Render for backend, Vercel for frontend)"
    echo "2. Deploy backend: ./scripts/deploy-staging.sh"
    echo "3. Deploy frontend: cd frontend && ./scripts/build-staging.sh"
    echo "4. Run staging tests: ./tests/staging-tests.sh"
    echo "5. Perform manual testing"
    echo "6. Proceed to Phase 3: Beta Launch"
    echo ""
    echo "🔗 Staging URLs (update with your actual URLs):"
    echo "  - Frontend: https://staging.influmatch.com"
    echo "  - Backend: https://staging-api.influmatch.com"
}

# Run main function
main "$@"





