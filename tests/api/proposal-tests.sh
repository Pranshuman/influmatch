#!/bin/bash

# Proposal Management Tests for Influmatch Phase 2

# Load test helpers
source "$(dirname "$0")/../utils/test-helpers.sh"

# Load test data if available
if [ -f "$(dirname "$0")/../data/test-data.env" ]; then
    source "$(dirname "$0")/../data/test-data.env"
fi

test_proposal_submission() {
    log_info "Testing proposal submission..."
    
    # Create test brand and campaign
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
        "title": "Proposal Test Campaign",
        "description": "Campaign for proposal testing",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand_token")
    local campaign_id=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
    
    # Create test influencer
    local influencer_email=$(generate_test_email)
    local influencer_data='{
        "name": "Test Influencer",
        "email": "'$influencer_email'",
        "password": "testpassword123",
        "userType": "influencer"
    }'
    
    local influencer_response=$(api_request "POST" "/auth/register" "$influencer_data")
    local influencer_token=$(echo "$influencer_response" | sed '$d' | jq -r '.token')
    
    # Test proposal submission
    local proposal_data='{
        "message": "I am very interested in this campaign!",
        "proposedBudget": 4500,
        "timeline": "2 weeks"
    }'
    
    local proposal_response=$(api_request "POST" "/api/listings/$campaign_id/proposals" "$proposal_data" "$influencer_token")
    local proposal_status=$(echo "$proposal_response" | tail -c 4)
    
    assert_http_status "$proposal_response" "201" "Proposal submission should return 201"
    
    if [ "$proposal_status" = "201" ]; then
        local proposal_body=$(echo "$proposal_response" | sed '$d')
        assert_contains "$proposal_body" "proposal" "Proposal submission should return proposal data"
        assert_contains "$proposal_body" "influencer" "Proposal should include influencer info"
        
        # Store proposal ID for other tests
        local proposal_id=$(echo "$proposal_body" | jq -r '.proposal.id')
        log_info "Created proposal ID: $proposal_id"
    fi
}

test_proposal_submission_unauthorized() {
    log_info "Testing proposal submission without authentication..."
    
    # Create test campaign first
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
        "title": "Unauthorized Proposal Test",
        "description": "Campaign for unauthorized proposal testing",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand_token")
    local campaign_id=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
    
    # Test proposal submission without token
    local proposal_data='{
        "message": "Unauthorized proposal",
        "proposedBudget": 4000,
        "timeline": "1 week"
    }'
    
    local unauthorized_response=$(api_request "POST" "/api/listings/$campaign_id/proposals" "$proposal_data")
    local unauthorized_status=$(echo "$unauthorized_response" | tail -c 4)
    
    assert_http_status "$unauthorized_response" "401" "Unauthorized proposal submission should return 401"
}

test_proposal_submission_missing_fields() {
    log_info "Testing proposal submission with missing fields..."
    
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
        "title": "Missing Fields Test",
        "description": "Campaign for missing fields testing",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand_token")
    local campaign_id=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
    
    local influencer_email=$(generate_test_email)
    local influencer_data='{
        "name": "Test Influencer",
        "email": "'$influencer_email'",
        "password": "testpassword123",
        "userType": "influencer"
    }'
    
    local influencer_response=$(api_request "POST" "/auth/register" "$influencer_data")
    local influencer_token=$(echo "$influencer_response" | sed '$d' | jq -r '.token')
    
    # Test missing message
    local missing_message_data='{
        "proposedBudget": 4000,
        "timeline": "1 week"
    }'
    
    local missing_message_response=$(api_request "POST" "/api/listings/$campaign_id/proposals" "$missing_message_data" "$influencer_token")
    local missing_message_status=$(echo "$missing_message_response" | tail -c 4)
    assert_http_status "$missing_message_response" "400" "Missing message should return 400"
    
    # Test missing proposedBudget
    local missing_budget_data='{
        "message": "Test proposal",
        "timeline": "1 week"
    }'
    
    local missing_budget_response=$(api_request "POST" "/api/listings/$campaign_id/proposals" "$missing_budget_data" "$influencer_token")
    local missing_budget_status=$(echo "$missing_budget_response" | tail -c 4)
    assert_http_status "$missing_budget_response" "400" "Missing proposedBudget should return 400"
}

test_proposal_status_management() {
    log_info "Testing proposal status management..."
    
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
        "title": "Status Test Campaign",
        "description": "Campaign for status testing",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand_token")
    local campaign_id=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
    
    local influencer_email=$(generate_test_email)
    local influencer_data='{
        "name": "Test Influencer",
        "email": "'$influencer_email'",
        "password": "testpassword123",
        "userType": "influencer"
    }'
    
    local influencer_response=$(api_request "POST" "/auth/register" "$influencer_data")
    local influencer_token=$(echo "$influencer_response" | sed '$d' | jq -r '.token')
    
    # Submit proposal
    local proposal_data='{
        "message": "Status test proposal",
        "proposedBudget": 4000,
        "timeline": "1 week"
    }'
    
    local proposal_response=$(api_request "POST" "/api/listings/$campaign_id/proposals" "$proposal_data" "$influencer_token")
    local proposal_id=$(echo "$proposal_response" | sed '$d' | jq -r '.proposal.id')
    
    # Test status update to accepted
    local accept_data='{"status": "accepted"}'
    local accept_response=$(api_request "PUT" "/api/proposals/$proposal_id/status" "$accept_data" "$brand_token")
    local accept_status=$(echo "$accept_response" | tail -c 4)
    
    assert_http_status "$accept_response" "200" "Status update to accepted should return 200"
    
    if [ "$accept_status" = "200" ]; then
        local accept_body=$(echo "$accept_response" | sed '$d')
        assert_contains "$accept_body" "accepted" "Proposal status should be updated to accepted"
    fi
    
    # Test status update to rejected
    local reject_data='{"status": "rejected"}'
    local reject_response=$(api_request "PUT" "/api/proposals/$proposal_id/status" "$reject_data" "$brand_token")
    local reject_status=$(echo "$reject_response" | tail -c 4)
    
    assert_http_status "$reject_response" "200" "Status update to rejected should return 200"
}

test_proposal_status_unauthorized() {
    log_info "Testing proposal status update by unauthorized user..."
    
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
        "title": "Unauthorized Status Test",
        "description": "Campaign for unauthorized status testing",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand_token")
    local campaign_id=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
    
    local influencer_email=$(generate_test_email)
    local influencer_data='{
        "name": "Test Influencer",
        "email": "'$influencer_email'",
        "password": "testpassword123",
        "userType": "influencer"
    }'
    
    local influencer_response=$(api_request "POST" "/auth/register" "$influencer_data")
    local influencer_token=$(echo "$influencer_response" | sed '$d' | jq -r '.token')
    
    # Submit proposal
    local proposal_data='{
        "message": "Unauthorized status test proposal",
        "proposedBudget": 4000,
        "timeline": "1 week"
    }'
    
    local proposal_response=$(api_request "POST" "/api/listings/$campaign_id/proposals" "$proposal_data" "$influencer_token")
    local proposal_id=$(echo "$proposal_response" | sed '$d' | jq -r '.proposal.id')
    
    # Test influencer trying to update status (should fail)
    local status_data='{"status": "accepted"}'
    local unauthorized_status_response=$(api_request "PUT" "/api/proposals/$proposal_id/status" "$status_data" "$influencer_token")
    local unauthorized_status_status=$(echo "$unauthorized_status_response" | tail -c 4)
    
    assert_http_status "$unauthorized_status_response" "403" "Influencer should not be able to update proposal status"
}

test_proposal_editing() {
    log_info "Testing proposal editing..."
    
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
        "title": "Edit Test Campaign",
        "description": "Campaign for editing testing",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand_token")
    local campaign_id=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
    
    local influencer_email=$(generate_test_email)
    local influencer_data='{
        "name": "Test Influencer",
        "email": "'$influencer_email'",
        "password": "testpassword123",
        "userType": "influencer"
    }'
    
    local influencer_response=$(api_request "POST" "/auth/register" "$influencer_data")
    local influencer_token=$(echo "$influencer_response" | sed '$d' | jq -r '.token')
    
    # Submit proposal
    local proposal_data='{
        "message": "Original proposal message",
        "proposedBudget": 4000,
        "timeline": "1 week"
    }'
    
    local proposal_response=$(api_request "POST" "/api/listings/$campaign_id/proposals" "$proposal_data" "$influencer_token")
    local proposal_id=$(echo "$proposal_response" | sed '$d' | jq -r '.proposal.id')
    
    # Test editing proposal (should work when status is under_review)
    local edit_data='{
        "message": "Updated proposal message",
        "proposedBudget": 3500,
        "timeline": "2 weeks"
    }'
    
    local edit_response=$(api_request "PUT" "/api/proposals/$proposal_id" "$edit_data" "$influencer_token")
    local edit_status=$(echo "$edit_response" | tail -c 4)
    
    assert_http_status "$edit_response" "200" "Proposal editing should work when under_review"
    
    # Accept the proposal first
    local accept_data='{"status": "accepted"}'
    api_request "PUT" "/api/proposals/$proposal_id/status" "$accept_data" "$brand_token" > /dev/null
    
    # Test editing accepted proposal (should fail)
    local edit_accepted_response=$(api_request "PUT" "/api/proposals/$proposal_id" "$edit_data" "$influencer_token")
    local edit_accepted_status=$(echo "$edit_accepted_response" | tail -c 4)
    
    assert_http_status "$edit_accepted_response" "400" "Editing accepted proposal should fail"
}

test_my_proposals_endpoint() {
    log_info "Testing my proposals endpoint..."
    
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
        "title": "My Proposals Test",
        "description": "Campaign for my proposals testing",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand_token")
    local campaign_id=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
    
    local influencer_email=$(generate_test_email)
    local influencer_data='{
        "name": "Test Influencer",
        "email": "'$influencer_email'",
        "password": "testpassword123",
        "userType": "influencer"
    }'
    
    local influencer_response=$(api_request "POST" "/auth/register" "$influencer_data")
    local influencer_token=$(echo "$influencer_response" | sed '$d' | jq -r '.token')
    
    # Submit proposal
    local proposal_data='{
        "message": "My proposals test",
        "proposedBudget": 4000,
        "timeline": "1 week"
    }'
    
    api_request "POST" "/api/listings/$campaign_id/proposals" "$proposal_data" "$influencer_token" > /dev/null
    
    # Test my proposals endpoint
    local my_proposals_response=$(api_request "GET" "/api/proposals/my-proposals" "" "$influencer_token")
    local my_proposals_status=$(echo "$my_proposals_response" | tail -c 4)
    
    assert_http_status "$my_proposals_response" "200" "My proposals endpoint should return 200"
    
    if [ "$my_proposals_status" = "200" ]; then
        local my_proposals_body=$(echo "$my_proposals_response" | sed '$d')
        assert_contains "$my_proposals_body" "proposals" "My proposals should return proposals array"
        assert_contains "$my_proposals_body" "brand" "My proposals should include brand info"
    fi
    
    # Test brand accessing my proposals (should fail)
    local brand_my_proposals_response=$(api_request "GET" "/api/proposals/my-proposals" "" "$brand_token")
    local brand_my_proposals_status=$(echo "$brand_my_proposals_response" | tail -c 4)
    
    assert_http_status "$brand_my_proposals_response" "403" "Brand should not access my proposals endpoint"
}

main() {
    log_info "Starting Proposal Management Tests..."
    
    # Initialize test environment
    init_test_environment
    
    # Run all proposal tests
    test_proposal_submission
    test_proposal_submission_unauthorized
    test_proposal_submission_missing_fields
    test_proposal_status_management
    test_proposal_status_unauthorized
    test_proposal_editing
    test_my_proposals_endpoint
    
    # Print test summary
    print_test_summary
}

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi





