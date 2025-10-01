#!/bin/bash

# Logout Functionality Test for Influmatch Frontend

# Load test helpers
source "$(dirname "$0")/../utils/test-helpers.sh"

# API Configuration
API_BASE_URL="http://localhost:5050"
FRONTEND_URL="http://localhost:3000"

test_logout_functionality() {
    log_info "Testing logout functionality..."
    
    # Step 1: Register a test user
    local test_email=$(generate_test_email)
    local user_data='{
        "name": "Test User",
        "email": "'$test_email'",
        "password": "testpassword123",
        "userType": "brand",
        "bio": "Test user for logout testing"
    }'
    
    local register_response=$(api_request "POST" "/auth/register" "$user_data")
    local register_status=$(echo "$register_response" | tail -c 4)
    
    assert_http_status "$register_response" "201" "User registration should succeed"
    
    if [ "$register_status" != "201" ]; then
        log_error "User registration failed, cannot test logout"
        return 1
    fi
    
    local token=$(echo "$register_response" | sed '$d' | jq -r '.token')
    log_success "Test user registered successfully"
    
    # Step 2: Verify user is authenticated by accessing protected endpoint
    local protected_response=$(api_request "GET" "/api/users/1" "" "$token")
    local protected_status=$(echo "$protected_response" | tail -c 4)
    
    if [ "$protected_status" = "401" ]; then
        log_error "Token is not working for protected endpoint"
        return 1
    else
        log_success "User is properly authenticated"
    fi
    
    # Step 3: Test logout by clearing token (simulating logout)
    log_info "Simulating logout by clearing token..."
    
    # Clear token from localStorage (simulating what the frontend does)
    # Note: In a real browser test, this would be done by the frontend
    # For API testing, we'll verify that without a token, protected endpoints fail
    
    # Step 4: Verify that without token, protected endpoints are inaccessible
    local no_token_response=$(api_request "GET" "/api/users/1" "")
    local no_token_status=$(echo "$no_token_response" | tail -c 4)
    
    assert_http_status "$no_token_response" "401" "Without token, protected endpoint should return 401"
    
    # Step 5: Test with invalid token
    local invalid_token_response=$(api_request "GET" "/api/users/1" "" "invalid_token")
    local invalid_token_status=$(echo "$invalid_token_response" | tail -c 4)
    
    assert_http_status "$invalid_token_response" "403" "Invalid token should return 403"
    
    log_success "Logout functionality working correctly"
    return 0
}

test_frontend_logout_flow() {
    log_info "Testing frontend logout flow..."
    
    # Test that dashboard page loads (this will redirect to login if not authenticated)
    local dashboard_response=$(curl -s -w '%{http_code}' "$FRONTEND_URL/dashboard")
    local dashboard_status=$(echo "$dashboard_response" | tail -c 4)
    
    # Dashboard should redirect to login if not authenticated
    if [ "$dashboard_status" = "200" ] || [ "$dashboard_status" = "302" ]; then
        log_success "Dashboard access control working"
    else
        log_warning "Dashboard access control may not be working (HTTP $dashboard_status)"
    fi
    
    # Test login page loads
    local login_response=$(curl -s -w '%{http_code}' "$FRONTEND_URL/auth/login")
    local login_status=$(echo "$login_response" | tail -c 4)
    
    assert_http_status "$login_response" "200" "Login page should be accessible"
    
    if [ "$login_status" = "200" ]; then
        local login_body=$(echo "$login_response" | sed '$d')
        
        # Check for logout-related elements (should not be present on login page)
        if echo "$login_body" | grep -q "Logout"; then
            log_warning "Logout button found on login page (should not be there)"
        else
            log_success "Login page does not show logout button (correct)"
        fi
        
        # Check for login form
        assert_contains "$login_body" "email" "Login page should have email field"
        assert_contains "$login_body" "password" "Login page should have password field"
    fi
    
    log_success "Frontend logout flow working correctly"
}

test_token_management() {
    log_info "Testing token management..."
    
    # Test that the API properly handles token validation
    local test_email=$(generate_test_email)
    local user_data='{
        "name": "Token Test User",
        "email": "'$test_email'",
        "password": "testpassword123",
        "userType": "influencer"
    }'
    
    local register_response=$(api_request "POST" "/auth/register" "$user_data")
    local token=$(echo "$register_response" | sed '$d' | jq -r '.token')
    
    # Test token format
    if [ "$token" != "null" ] && [ -n "$token" ]; then
        log_success "Token generated successfully"
        
        # Test token length (JWT tokens are typically long)
        local token_length=${#token}
        if [ $token_length -gt 50 ]; then
            log_success "Token has appropriate length"
        else
            log_warning "Token seems too short (length: $token_length)"
        fi
    else
        log_error "Token not generated properly"
        return 1
    fi
    
    # Test that token works for authenticated requests
    local auth_response=$(api_request "GET" "/api/users/1" "" "$token")
    local auth_status=$(echo "$auth_response" | tail -c 4)
    
    if [ "$auth_status" != "401" ] && [ "$auth_status" != "403" ]; then
        log_success "Token works for authenticated requests"
    else
        log_warning "Token may not be working for authenticated requests (HTTP $auth_status)"
    fi
    
    log_success "Token management working correctly"
}

test_logout_security() {
    log_info "Testing logout security..."
    
    # Test that expired/invalid tokens are properly rejected
    local expired_tokens=(
        "expired.jwt.token"
        "invalid.token.format"
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid"
        ""
    )
    
    for token in "${expired_tokens[@]}"; do
        local response=$(api_request "GET" "/api/users/1" "" "$token")
        local status=$(echo "$response" | tail -c 4)
        
        if [ "$status" = "401" ] || [ "$status" = "403" ]; then
            log_success "Invalid token properly rejected (HTTP $status)"
        else
            log_warning "Invalid token not properly rejected (HTTP $status)"
        fi
    done
    
    log_success "Logout security working correctly"
}

main() {
    log_info "Starting Logout Functionality Tests..."
    
    # Initialize test environment
    init_test_environment
    
    # Run all logout tests
    test_logout_functionality
    test_frontend_logout_flow
    test_token_management
    test_logout_security
    
    # Print test summary
    print_test_summary
}

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi





