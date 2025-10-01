#!/bin/bash

# Authentication Tests for Influmatch Phase 2

# Load test helpers
source "$(dirname "$0")/../utils/test-helpers.sh"

test_user_registration() {
    log_info "Testing user registration..."
    
    # Test brand registration
    local brand_email=$(generate_test_email)
    local brand_data='{
        "name": "Test Brand",
        "email": "'$brand_email'",
        "password": "testpassword123",
        "userType": "brand",
        "bio": "Test brand bio",
        "website": "https://testbrand.com"
    }'
    
    local brand_response=$(api_request "POST" "/auth/register" "$brand_data")
    local brand_status=$(echo "$brand_response" | tail -c 4)
    
    assert_http_status "$brand_response" "201" "Brand registration should return 201"
    
    if [ "$brand_status" = "201" ]; then
        local brand_body=$(echo "$brand_response" | sed '$d')
        assert_contains "$brand_body" "token" "Brand registration should return token"
        assert_contains "$brand_body" "user" "Brand registration should return user data"
        assert_contains "$brand_body" "brand" "Brand registration should have userType brand"
    fi
    
    # Test influencer registration
    local influencer_email=$(generate_test_email)
    local influencer_data='{
        "name": "Test Influencer",
        "email": "'$influencer_email'",
        "password": "testpassword123",
        "userType": "influencer",
        "bio": "Test influencer bio",
        "website": "https://testinfluencer.com"
    }'
    
    local influencer_response=$(api_request "POST" "/auth/register" "$influencer_data")
    local influencer_status=$(echo "$influencer_response" | tail -c 4)
    
    assert_http_status "$influencer_response" "201" "Influencer registration should return 201"
    
    if [ "$influencer_status" = "201" ]; then
        local influencer_body=$(echo "$influencer_response" | sed '$d')
        assert_contains "$influencer_body" "token" "Influencer registration should return token"
        assert_contains "$influencer_body" "influencer" "Influencer registration should have userType influencer"
    fi
}

test_user_login() {
    log_info "Testing user login..."
    
    # First register a user
    local test_email=$(generate_test_email)
    local register_data='{
        "name": "Test User",
        "email": "'$test_email'",
        "password": "testpassword123",
        "userType": "brand",
        "bio": "Test bio"
    }'
    
    api_request "POST" "/auth/register" "$register_data" > /dev/null
    
    # Test login
    local login_data='{
        "email": "'$test_email'",
        "password": "testpassword123"
    }'
    
    local login_response=$(api_request "POST" "/auth/login" "$login_data")
    local login_status=$(echo "$login_response" | tail -c 4)
    
    assert_http_status "$login_response" "200" "Login should return 200"
    
    if [ "$login_status" = "200" ]; then
        local login_body=$(echo "$login_response" | sed '$d')
        assert_contains "$login_body" "token" "Login should return token"
        assert_contains "$login_body" "user" "Login should return user data"
    fi
}

test_invalid_login() {
    log_info "Testing invalid login scenarios..."
    
    # Test with non-existent user
    local invalid_login_data='{
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
    }'
    
    local invalid_response=$(api_request "POST" "/auth/login" "$invalid_login_data")
    local invalid_status=$(echo "$invalid_response" | tail -c 4)
    
    assert_http_status "$invalid_response" "401" "Invalid login should return 401"
    
    # Test with wrong password
    local test_email=$(generate_test_email)
    local register_data='{
        "name": "Test User",
        "email": "'$test_email'",
        "password": "correctpassword",
        "userType": "brand"
    }'
    
    api_request "POST" "/auth/register" "$register_data" > /dev/null
    
    local wrong_password_data='{
        "email": "'$test_email'",
        "password": "wrongpassword"
    }'
    
    local wrong_password_response=$(api_request "POST" "/auth/login" "$wrong_password_data")
    local wrong_password_status=$(echo "$wrong_password_response" | tail -c 4)
    
    assert_http_status "$wrong_password_response" "401" "Wrong password should return 401"
}

test_duplicate_registration() {
    log_info "Testing duplicate registration..."
    
    local test_email=$(generate_test_email)
    local register_data='{
        "name": "Test User",
        "email": "'$test_email'",
        "password": "testpassword123",
        "userType": "brand"
    }'
    
    # First registration should succeed
    local first_response=$(api_request "POST" "/auth/register" "$register_data")
    local first_status=$(echo "$first_response" | tail -c 4)
    assert_http_status "$first_response" "201" "First registration should succeed"
    
    # Second registration with same email should fail
    local second_response=$(api_request "POST" "/auth/register" "$register_data")
    local second_status=$(echo "$second_response" | tail -c 4)
    assert_http_status "$second_response" "400" "Duplicate registration should return 400"
}

test_missing_fields() {
    log_info "Testing registration with missing fields..."
    
    # Test missing email
    local missing_email_data='{
        "name": "Test User",
        "password": "testpassword123",
        "userType": "brand"
    }'
    
    local missing_email_response=$(api_request "POST" "/auth/register" "$missing_email_data")
    local missing_email_status=$(echo "$missing_email_response" | tail -c 4)
    assert_http_status "$missing_email_response" "400" "Missing email should return 400"
    
    # Test missing password
    local missing_password_data='{
        "name": "Test User",
        "email": "'$(generate_test_email)'",
        "userType": "brand"
    }'
    
    local missing_password_response=$(api_request "POST" "/auth/register" "$missing_password_data")
    local missing_password_status=$(echo "$missing_password_response" | tail -c 4)
    assert_http_status "$missing_password_response" "400" "Missing password should return 400"
    
    # Test missing userType
    local missing_usertype_data='{
        "name": "Test User",
        "email": "'$(generate_test_email)'",
        "password": "testpassword123"
    }'
    
    local missing_usertype_response=$(api_request "POST" "/auth/register" "$missing_usertype_data")
    local missing_usertype_status=$(echo "$missing_usertype_response" | tail -c 4)
    assert_http_status "$missing_usertype_response" "400" "Missing userType should return 400"
}

test_token_validation() {
    log_info "Testing token validation..."
    
    # Test with valid token
    local test_email=$(generate_test_email)
    local register_data='{
        "name": "Test User",
        "email": "'$test_email'",
        "password": "testpassword123",
        "userType": "brand"
    }'
    
    local register_response=$(api_request "POST" "/auth/register" "$register_data")
    local token=$(echo "$register_response" | sed '$d' | jq -r '.token')
    
    # Test protected endpoint with valid token
    local protected_response=$(api_request "GET" "/api/users/1" "" "$token")
    local protected_status=$(echo "$protected_response" | tail -c 4)
    
    # Should not return 401 (unauthorized) with valid token
    if [ "$protected_status" = "401" ]; then
        log_error "Valid token should not return 401"
        ((FAILED_TESTS++))
    else
        log_success "Valid token authentication works"
        ((PASSED_TESTS++))
    fi
    
    # Test with invalid token
    local invalid_token_response=$(api_request "GET" "/api/users/1" "" "invalid_token")
    local invalid_token_status=$(echo "$invalid_token_response" | tail -c 4)
    assert_http_status "$invalid_token_response" "403" "Invalid token should return 403"
}

main() {
    log_info "Starting Authentication Tests..."
    
    # Initialize test environment
    init_test_environment
    
    # Run all authentication tests
    test_user_registration
    test_user_login
    test_invalid_login
    test_duplicate_registration
    test_missing_fields
    test_token_validation
    
    # Print test summary
    print_test_summary
}

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi




