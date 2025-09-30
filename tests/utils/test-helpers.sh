#!/bin/bash

# Test Helper Functions for Influmatch Phase 2 Testing

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Configuration
API_BASE_URL="http://localhost:5050"
FRONTEND_URL="http://localhost:3000"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test data storage
TEST_BRAND_TOKEN=""
TEST_INFLUENCER_TOKEN=""
TEST_BRAND_ID=""
TEST_INFLUENCER_ID=""
TEST_CAMPAIGN_ID=""
TEST_PROPOSAL_ID=""

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test assertion functions
assert_equals() {
    local expected="$1"
    local actual="$2"
    local test_name="$3"
    
    ((TOTAL_TESTS++))
    
    if [ "$expected" = "$actual" ]; then
        log_success "$test_name"
        return 0
    else
        log_error "$test_name - Expected: '$expected', Got: '$actual'"
        return 1
    fi
}

assert_contains() {
    local text="$1"
    local search="$2"
    local test_name="$3"
    
    ((TOTAL_TESTS++))
    
    if echo "$text" | grep -q "$search"; then
        log_success "$test_name"
        return 0
    else
        log_error "$test_name - Text '$search' not found in: '$text'"
        return 1
    fi
}

assert_http_status() {
    local response="$1"
    local expected_status="$2"
    local test_name="$3"
    
    ((TOTAL_TESTS++))
    
    local actual_status=$(echo "$response" | head -n1 | grep -o '[0-9]\{3\}')
    
    if [ "$expected_status" = "$actual_status" ]; then
        log_success "$test_name"
        return 0
    else
        log_error "$test_name - Expected HTTP $expected_status, Got HTTP $actual_status"
        return 1
    fi
}

# API helper functions
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local token="$4"
    
    local curl_cmd="curl -s -w '%{http_code}' -X $method"
    
    if [ -n "$token" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $token'"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$API_BASE_URL$endpoint'"
    
    eval "$curl_cmd"
}

# Test data generation
generate_test_email() {
    echo "test_$(date +%s)_$RANDOM@example.com"
}

generate_test_name() {
    echo "Test User $RANDOM"
}

# Cleanup function
cleanup_test_data() {
    log_info "Cleaning up test data..."
    
    # Note: In a real scenario, you'd want to delete test data
    # For now, we'll just log what would be cleaned up
    if [ -n "$TEST_BRAND_ID" ]; then
        log_info "Would delete brand user: $TEST_BRAND_ID"
    fi
    
    if [ -n "$TEST_INFLUENCER_ID" ]; then
        log_info "Would delete influencer user: $TEST_INFLUENCER_ID"
    fi
    
    if [ -n "$TEST_CAMPAIGN_ID" ]; then
        log_info "Would delete campaign: $TEST_CAMPAIGN_ID"
    fi
}

# Test summary
print_test_summary() {
    echo ""
    echo "=========================================="
    echo "           TEST SUMMARY"
    echo "=========================================="
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "Result: ${GREEN}ALL TESTS PASSED${NC}"
        return 0
    else
        echo -e "Result: ${RED}SOME TESTS FAILED${NC}"
        return 1
    fi
}

# Check if services are running
check_services() {
    log_info "Checking if services are running..."
    
    # Check backend
    if curl -s "$API_BASE_URL/health" > /dev/null; then
        log_success "Backend API is running"
    else
        log_error "Backend API is not running"
        return 1
    fi
    
    # Check frontend
    if curl -s "$FRONTEND_URL" > /dev/null; then
        log_success "Frontend is running"
    else
        log_error "Frontend is not running"
        return 1
    fi
    
    return 0
}

# Initialize test environment
init_test_environment() {
    log_info "Initializing test environment..."
    
    # Reset counters
    TOTAL_TESTS=0
    PASSED_TESTS=0
    FAILED_TESTS=0
    
    # Check services
    if ! check_services; then
        log_error "Services not ready. Please start backend and frontend."
        exit 1
    fi
    
    log_success "Test environment ready"
}



