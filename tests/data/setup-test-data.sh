#!/bin/bash

# Setup Test Data for Influmatch Phase 2 Testing

# Load test helpers
source "$(dirname "$0")/../utils/test-helpers.sh"

# Test data variables
TEST_BRAND_EMAIL=""
TEST_INFLUENCER_EMAIL=""
TEST_CAMPAIGN_TITLE="Test Campaign $(date +%s)"

setup_test_users() {
    log_info "Setting up test users..."
    
    # Generate unique test emails
    TEST_BRAND_EMAIL=$(generate_test_email)
    TEST_INFLUENCER_EMAIL=$(generate_test_email)
    
    log_info "Brand email: $TEST_BRAND_EMAIL"
    log_info "Influencer email: $TEST_INFLUENCER_EMAIL"
    
    # Register test brand
    local brand_data='{
        "name": "Test Brand Company",
        "email": "'$TEST_BRAND_EMAIL'",
        "password": "testpassword123",
        "userType": "brand",
        "bio": "Test brand for automated testing",
        "website": "https://testbrand.com"
    }'
    
    local brand_response=$(api_request "POST" "/auth/register" "$brand_data")
    local brand_status=$(echo "$brand_response" | tail -c 4)
    
    if [ "$brand_status" = "201" ]; then
        log_success "Test brand user created"
        TEST_BRAND_TOKEN=$(echo "$brand_response" | sed '$d' | jq -r '.token')
        TEST_BRAND_ID=$(echo "$brand_response" | sed '$d' | jq -r '.user.id')
        log_info "Brand ID: $TEST_BRAND_ID"
    else
        log_error "Failed to create test brand user"
        return 1
    fi
    
    # Register test influencer
    local influencer_data='{
        "name": "Test Influencer",
        "email": "'$TEST_INFLUENCER_EMAIL'",
        "password": "testpassword123",
        "userType": "influencer",
        "bio": "Test influencer for automated testing",
        "website": "https://testinfluencer.com"
    }'
    
    local influencer_response=$(api_request "POST" "/auth/register" "$influencer_data")
    local influencer_status=$(echo "$influencer_response" | tail -c 4)
    
    if [ "$influencer_status" = "201" ]; then
        log_success "Test influencer user created"
        TEST_INFLUENCER_TOKEN=$(echo "$influencer_response" | sed '$d' | jq -r '.token')
        TEST_INFLUENCER_ID=$(echo "$influencer_response" | sed '$d' | jq -r '.user.id')
        log_info "Influencer ID: $TEST_INFLUENCER_ID"
    else
        log_error "Failed to create test influencer user"
        return 1
    fi
    
    return 0
}

setup_test_campaign() {
    log_info "Setting up test campaign..."
    
    if [ -z "$TEST_BRAND_TOKEN" ]; then
        log_error "Brand token not available"
        return 1
    fi
    
    # Create test campaign
    local campaign_data='{
        "title": "'$TEST_CAMPAIGN_TITLE'",
        "description": "This is a test campaign created for automated testing purposes.",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'",
        "requirements": "Must have 10k+ followers, tech-focused content",
        "deliverables": "3 Instagram posts, 2 stories, 1 reel"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$TEST_BRAND_TOKEN")
    local campaign_status=$(echo "$campaign_response" | tail -c 4)
    
    if [ "$campaign_status" = "201" ]; then
        log_success "Test campaign created"
        TEST_CAMPAIGN_ID=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
        log_info "Campaign ID: $TEST_CAMPAIGN_ID"
    else
        log_error "Failed to create test campaign"
        log_error "Response: $campaign_response"
        return 1
    fi
    
    return 0
}

setup_test_proposal() {
    log_info "Setting up test proposal..."
    
    if [ -z "$TEST_INFLUENCER_TOKEN" ] || [ -z "$TEST_CAMPAIGN_ID" ]; then
        log_error "Influencer token or campaign ID not available"
        return 1
    fi
    
    # Create test proposal
    local proposal_data='{
        "message": "I am very interested in this campaign and would love to collaborate!",
        "proposedBudget": 4500,
        "timeline": "2 weeks"
    }'
    
    local proposal_response=$(api_request "POST" "/api/listings/$TEST_CAMPAIGN_ID/proposals" "$proposal_data" "$TEST_INFLUENCER_TOKEN")
    local proposal_status=$(echo "$proposal_response" | tail -c 4)
    
    if [ "$proposal_status" = "201" ]; then
        log_success "Test proposal created"
        TEST_PROPOSAL_ID=$(echo "$proposal_response" | sed '$d' | jq -r '.proposal.id')
        log_info "Proposal ID: $TEST_PROPOSAL_ID"
    else
        log_error "Failed to create test proposal"
        log_error "Response: $proposal_response"
        return 1
    fi
    
    return 0
}

export_test_data() {
    log_info "Exporting test data for other test scripts..."
    
    # Create test data file
    cat > "$(dirname "$0")/test-data.env" << EOF
# Test Data for Influmatch Phase 2 Testing
# Generated on $(date)

TEST_BRAND_EMAIL="$TEST_BRAND_EMAIL"
TEST_INFLUENCER_EMAIL="$TEST_INFLUENCER_EMAIL"
TEST_BRAND_TOKEN="$TEST_BRAND_TOKEN"
TEST_INFLUENCER_TOKEN="$TEST_INFLUENCER_TOKEN"
TEST_BRAND_ID="$TEST_BRAND_ID"
TEST_INFLUENCER_ID="$TEST_INFLUENCER_ID"
TEST_CAMPAIGN_ID="$TEST_CAMPAIGN_ID"
TEST_PROPOSAL_ID="$TEST_PROPOSAL_ID"
TEST_CAMPAIGN_TITLE="$TEST_CAMPAIGN_TITLE"
EOF
    
    log_success "Test data exported to test-data.env"
}

main() {
    log_info "Setting up test data for Phase 2 testing..."
    
    # Initialize test environment
    init_test_environment
    
    # Setup test data
    if setup_test_users && setup_test_campaign && setup_test_proposal; then
        export_test_data
        log_success "Test data setup completed successfully"
        return 0
    else
        log_error "Test data setup failed"
        return 1
    fi
}

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi


