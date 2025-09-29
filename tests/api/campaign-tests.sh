#!/bin/bash

# Campaign Management Tests for Influmatch Phase 2

# Load test helpers
source "$(dirname "$0")/../utils/test-helpers.sh"

# Load test data if available
if [ -f "$(dirname "$0")/../data/test-data.env" ]; then
    source "$(dirname "$0")/../data/test-data.env"
fi

test_campaign_creation() {
    log_info "Testing campaign creation..."
    
    # Create a test brand user first
    local brand_email=$(generate_test_email)
    local brand_data='{
        "name": "Test Brand",
        "email": "'$brand_email'",
        "password": "testpassword123",
        "userType": "brand",
        "bio": "Test brand bio"
    }'
    
    local brand_response=$(api_request "POST" "/auth/register" "$brand_data")
    local brand_token=$(echo "$brand_response" | sed '$d' | jq -r '.token')
    
    # Test campaign creation
    local campaign_data='{
        "title": "Test Campaign",
        "description": "This is a test campaign for automated testing",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'",
        "requirements": "Must have 10k+ followers",
        "deliverables": "3 posts, 2 stories"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand_token")
    local campaign_status=$(echo "$campaign_response" | tail -c 4)
    
    assert_http_status "$campaign_response" "201" "Campaign creation should return 201"
    
    if [ "$campaign_status" = "201" ]; then
        local campaign_body=$(echo "$campaign_response" | sed '$d')
        assert_contains "$campaign_body" "listing" "Campaign creation should return listing data"
        assert_contains "$campaign_body" "brand" "Campaign creation should include brand info"
        
        # Store campaign ID for other tests
        local campaign_id=$(echo "$campaign_body" | jq -r '.listing.id')
        log_info "Created campaign ID: $campaign_id"
    fi
}

test_campaign_creation_unauthorized() {
    log_info "Testing campaign creation without authentication..."
    
    local campaign_data='{
        "title": "Unauthorized Campaign",
        "description": "This should fail",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local unauthorized_response=$(api_request "POST" "/api/listings" "$campaign_data")
    local unauthorized_status=$(echo "$unauthorized_response" | tail -c 4)
    
    assert_http_status "$unauthorized_response" "401" "Unauthorized campaign creation should return 401"
}

test_campaign_creation_missing_fields() {
    log_info "Testing campaign creation with missing fields..."
    
    # Create a test brand user
    local brand_email=$(generate_test_email)
    local brand_data='{
        "name": "Test Brand",
        "email": "'$brand_email'",
        "password": "testpassword123",
        "userType": "brand"
    }'
    
    local brand_response=$(api_request "POST" "/auth/register" "$brand_data")
    local brand_token=$(echo "$brand_response" | sed '$d' | jq -r '.token')
    
    # Test missing title
    local missing_title_data='{
        "description": "Missing title",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local missing_title_response=$(api_request "POST" "/api/listings" "$missing_title_data" "$brand_token")
    local missing_title_status=$(echo "$missing_title_response" | tail -c 4)
    assert_http_status "$missing_title_response" "400" "Missing title should return 400"
    
    # Test missing budget
    local missing_budget_data='{
        "title": "Missing Budget",
        "description": "Missing budget field",
        "category": "Technology",
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local missing_budget_response=$(api_request "POST" "/api/listings" "$missing_budget_data" "$brand_token")
    local missing_budget_status=$(echo "$missing_budget_response" | tail -c 4)
    assert_http_status "$missing_budget_response" "400" "Missing budget should return 400"
}

test_campaign_retrieval() {
    log_info "Testing campaign retrieval..."
    
    # Create a test campaign first
    local brand_email=$(generate_test_email)
    local brand_data='{
        "name": "Test Brand",
        "email": "'$brand_email'",
        "password": "testpassword123",
        "userType": "brand"
    }'
    
    local brand_response=$(api_request "POST" "/auth/register" "$brand_data")
    local brand_token=$(echo "$brand_response" | sed '$d' | jq -r '.token')
    
    local campaign_data='{
        "title": "Retrieval Test Campaign",
        "description": "Campaign for retrieval testing",
        "category": "Technology",
        "budget": 3000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand_token")
    local campaign_id=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
    
    # Test get all campaigns
    local all_campaigns_response=$(api_request "GET" "/api/listings")
    local all_campaigns_status=$(echo "$all_campaigns_response" | tail -c 4)
    
    assert_http_status "$all_campaigns_response" "200" "Get all campaigns should return 200"
    
    if [ "$all_campaigns_status" = "200" ]; then
        local all_campaigns_body=$(echo "$all_campaigns_response" | sed '$d')
        assert_contains "$all_campaigns_body" "listings" "Get all campaigns should return listings array"
    fi
    
    # Test get specific campaign
    local specific_campaign_response=$(api_request "GET" "/api/listings/$campaign_id")
    local specific_campaign_status=$(echo "$specific_campaign_response" | tail -c 4)
    
    assert_http_status "$specific_campaign_response" "200" "Get specific campaign should return 200"
    
    if [ "$specific_campaign_status" = "200" ]; then
        local specific_campaign_body=$(echo "$specific_campaign_response" | sed '$d')
        assert_contains "$specific_campaign_body" "listing" "Get specific campaign should return listing data"
        assert_contains "$specific_campaign_body" "Retrieval Test Campaign" "Should return correct campaign title"
    fi
}

test_campaign_validation() {
    log_info "Testing campaign validation..."
    
    # Create a test brand user
    local brand_email=$(generate_test_email)
    local brand_data='{
        "name": "Test Brand",
        "email": "'$brand_email'",
        "password": "testpassword123",
        "userType": "brand"
    }'
    
    local brand_response=$(api_request "POST" "/auth/register" "$brand_data")
    local brand_token=$(echo "$brand_response" | sed '$d' | jq -r '.token')
    
    # Test invalid budget (negative)
    local invalid_budget_data='{
        "title": "Invalid Budget Campaign",
        "description": "Campaign with negative budget",
        "category": "Technology",
        "budget": -1000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local invalid_budget_response=$(api_request "POST" "/api/listings" "$invalid_budget_data" "$brand_token")
    local invalid_budget_status=$(echo "$invalid_budget_response" | tail -c 4)
    assert_http_status "$invalid_budget_response" "400" "Negative budget should return 400"
    
    # Test invalid deadline (past date)
    local invalid_deadline_data='{
        "title": "Invalid Deadline Campaign",
        "description": "Campaign with past deadline",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '-1 day' -Iseconds)'"
    }'
    
    local invalid_deadline_response=$(api_request "POST" "/api/listings" "$invalid_deadline_data" "$brand_token")
    local invalid_deadline_status=$(echo "$invalid_deadline_response" | tail -c 4)
    assert_http_status "$invalid_deadline_response" "400" "Past deadline should return 400"
}

test_campaign_proposals_access() {
    log_info "Testing campaign proposals access..."
    
    # Create test data
    local brand_email=$(generate_test_email)
    local brand_data='{
        "name": "Test Brand",
        "email": "'$brand_email'",
        "password": "testpassword123",
        "userType": "brand"
    }'
    
    local brand_response=$(api_request "POST" "/auth/register" "$brand_data")
    local brand_token=$(echo "$brand_response" | sed '$d' | jq -r '.token')
    
    local campaign_data='{
        "title": "Proposals Test Campaign",
        "description": "Campaign for proposals testing",
        "category": "Technology",
        "budget": 4000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand_token")
    local campaign_id=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
    
    # Test brand can access proposals for their campaign
    local brand_proposals_response=$(api_request "GET" "/api/listings/$campaign_id/proposals" "" "$brand_token")
    local brand_proposals_status=$(echo "$brand_proposals_response" | tail -c 4)
    
    assert_http_status "$brand_proposals_response" "200" "Brand should access their campaign proposals"
    
    # Test unauthorized access (different brand)
    local other_brand_email=$(generate_test_email)
    local other_brand_data='{
        "name": "Other Brand",
        "email": "'$other_brand_email'",
        "password": "testpassword123",
        "userType": "brand"
    }'
    
    local other_brand_response=$(api_request "POST" "/auth/register" "$other_brand_data")
    local other_brand_token=$(echo "$other_brand_response" | sed '$d' | jq -r '.token')
    
    local unauthorized_proposals_response=$(api_request "GET" "/api/listings/$campaign_id/proposals" "" "$other_brand_token")
    local unauthorized_proposals_status=$(echo "$unauthorized_proposals_response" | tail -c 4)
    
    assert_http_status "$unauthorized_proposals_response" "403" "Other brand should not access campaign proposals"
}

main() {
    log_info "Starting Campaign Management Tests..."
    
    # Initialize test environment
    init_test_environment
    
    # Run all campaign tests
    test_campaign_creation
    test_campaign_creation_unauthorized
    test_campaign_creation_missing_fields
    test_campaign_retrieval
    test_campaign_validation
    test_campaign_proposals_access
    
    # Print test summary
    print_test_summary
}

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
