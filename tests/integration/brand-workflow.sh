#!/bin/bash

# Complete Brand User Story Workflow Test for Influmatch Phase 2

# Load test helpers
source "$(dirname "$0")/../utils/test-helpers.sh"

test_complete_brand_workflow() {
    log_info "Testing complete brand user workflow..."
    
    # Step 1: Brand Registration
    log_info "Step 1: Brand Registration"
    local brand_email=$(generate_test_email)
    local brand_data='{
        "name": "Test Brand Company",
        "email": "'$brand_email'",
        "password": "testpassword123",
        "userType": "brand",
        "bio": "Leading tech company for testing",
        "website": "https://testbrand.com"
    }'
    
    local brand_response=$(api_request "POST" "/auth/register" "$brand_data")
    local brand_status=$(echo "$brand_response" | tail -c 4)
    
    assert_http_status "$brand_response" "201" "Brand registration should succeed"
    
    if [ "$brand_status" != "201" ]; then
        log_error "Brand registration failed, cannot continue workflow"
        return 1
    fi
    
    local brand_token=$(echo "$brand_response" | sed '$d' | jq -r '.token')
    local brand_id=$(echo "$brand_response" | sed '$d' | jq -r '.user.id')
    log_success "Brand registered successfully (ID: $brand_id)"
    
    # Step 2: Brand Login
    log_info "Step 2: Brand Login"
    local login_data='{
        "email": "'$brand_email'",
        "password": "testpassword123"
    }'
    
    local login_response=$(api_request "POST" "/auth/login" "$login_data")
    local login_status=$(echo "$login_response" | tail -c 4)
    
    assert_http_status "$login_response" "200" "Brand login should succeed"
    log_success "Brand logged in successfully"
    
    # Step 3: Create Campaign
    log_info "Step 3: Create Campaign"
    local campaign_data='{
        "title": "Tech Product Launch Campaign",
        "description": "We are launching a revolutionary tech product and need influencers to help spread the word. Looking for tech-savvy influencers with engaged audiences.",
        "category": "Technology",
        "budget": 10000,
        "deadline": "'$(date -d '+45 days' -Iseconds)'",
        "requirements": "Must have 50k+ followers, tech-focused content, high engagement rate",
        "deliverables": "5 Instagram posts, 3 stories, 2 reels, 1 YouTube video"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand_token")
    local campaign_status=$(echo "$campaign_response" | tail -c 4)
    
    assert_http_status "$campaign_response" "201" "Campaign creation should succeed"
    
    if [ "$campaign_status" != "201" ]; then
        log_error "Campaign creation failed, cannot continue workflow"
        return 1
    fi
    
    local campaign_id=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
    log_success "Campaign created successfully (ID: $campaign_id)"
    
    # Step 4: View Campaign
    log_info "Step 4: View Created Campaign"
    local view_campaign_response=$(api_request "GET" "/api/listings/$campaign_id")
    local view_campaign_status=$(echo "$view_campaign_response" | tail -c 4)
    
    assert_http_status "$view_campaign_response" "200" "View campaign should succeed"
    
    if [ "$view_campaign_status" = "200" ]; then
        local campaign_body=$(echo "$view_campaign_response" | sed '$d')
        assert_contains "$campaign_body" "Tech Product Launch Campaign" "Campaign should contain correct title"
        log_success "Campaign viewed successfully"
    fi
    
    # Step 5: Create Test Influencers and Proposals
    log_info "Step 5: Setting up test influencers and proposals..."
    
    # Create Influencer 1
    local influencer1_email=$(generate_test_email)
    local influencer1_data='{
        "name": "Tech Influencer 1",
        "email": "'$influencer1_email'",
        "password": "testpassword123",
        "userType": "influencer",
        "bio": "Tech reviewer with 100k followers"
    }'
    
    local influencer1_response=$(api_request "POST" "/auth/register" "$influencer1_data")
    local influencer1_token=$(echo "$influencer1_response" | sed '$d' | jq -r '.token')
    
    # Create Influencer 2
    local influencer2_email=$(generate_test_email)
    local influencer2_data='{
        "name": "Tech Influencer 2",
        "email": "'$influencer2_email'",
        "password": "testpassword123",
        "userType": "influencer",
        "bio": "Gadget enthusiast with 75k followers"
    }'
    
    local influencer2_response=$(api_request "POST" "/auth/register" "$influencer2_data")
    local influencer2_token=$(echo "$influencer2_response" | sed '$d' | jq -r '.token')
    
    # Submit Proposal 1
    local proposal1_data='{
        "message": "I would love to collaborate on this tech product launch! I have a highly engaged tech audience and can create compelling content.",
        "proposedBudget": 8000,
        "timeline": "3 weeks"
    }'
    
    local proposal1_response=$(api_request "POST" "/api/listings/$campaign_id/proposals" "$proposal1_data" "$influencer1_token")
    local proposal1_id=$(echo "$proposal1_response" | sed '$d' | jq -r '.proposal.id')
    log_success "Proposal 1 submitted (ID: $proposal1_id)"
    
    # Submit Proposal 2
    local proposal2_data='{
        "message": "This product looks amazing! I specialize in gadget reviews and my audience loves tech content. I can deliver high-quality content within your timeline.",
        "proposedBudget": 6000,
        "timeline": "2 weeks"
    }'
    
    local proposal2_response=$(api_request "POST" "/api/listings/$campaign_id/proposals" "$proposal2_data" "$influencer2_token")
    local proposal2_id=$(echo "$proposal2_response" | sed '$d' | jq -r '.proposal.id')
    log_success "Proposal 2 submitted (ID: $proposal2_id)"
    
    # Step 6: View All Proposals for Campaign
    log_info "Step 6: View All Proposals for Campaign"
    local proposals_response=$(api_request "GET" "/api/listings/$campaign_id/proposals" "" "$brand_token")
    local proposals_status=$(echo "$proposals_response" | tail -c 4)
    
    assert_http_status "$proposals_response" "200" "View proposals should succeed"
    
    if [ "$proposals_status" = "200" ]; then
        local proposals_body=$(echo "$proposals_response" | sed '$d')
        assert_contains "$proposals_body" "proposals" "Should return proposals array"
        log_success "Proposals viewed successfully"
    fi
    
    # Step 7: Review and Accept First Proposal
    log_info "Step 7: Accept First Proposal"
    local accept_data='{"status": "accepted"}'
    local accept_response=$(api_request "PUT" "/api/proposals/$proposal1_id/status" "$accept_data" "$brand_token")
    local accept_status=$(echo "$accept_response" | tail -c 4)
    
    assert_http_status "$accept_response" "200" "Accept proposal should succeed"
    
    if [ "$accept_status" = "200" ]; then
        local accept_body=$(echo "$accept_response" | sed '$d')
        assert_contains "$accept_body" "accepted" "Proposal status should be accepted"
        log_success "First proposal accepted successfully"
    fi
    
    # Step 8: Reject Second Proposal
    log_info "Step 8: Reject Second Proposal"
    local reject_data='{"status": "rejected"}'
    local reject_response=$(api_request "PUT" "/api/proposals/$proposal2_id/status" "$reject_data" "$brand_token")
    local reject_status=$(echo "$reject_response" | tail -c 4)
    
    assert_http_status "$reject_response" "200" "Reject proposal should succeed"
    
    if [ "$reject_status" = "200" ]; then
        local reject_body=$(echo "$reject_response" | sed '$d')
        assert_contains "$reject_body" "rejected" "Proposal status should be rejected"
        log_success "Second proposal rejected successfully"
    fi
    
    # Step 9: Verify Final Status
    log_info "Step 9: Verify Final Proposal Statuses"
    local final_proposals_response=$(api_request "GET" "/api/listings/$campaign_id/proposals" "" "$brand_token")
    local final_proposals_body=$(echo "$final_proposals_response" | sed '$d')
    
    # Check that we have both proposals with correct statuses
    if echo "$final_proposals_body" | grep -q "accepted" && echo "$final_proposals_body" | grep -q "rejected"; then
        log_success "Final proposal statuses verified correctly"
    else
        log_error "Final proposal statuses not correct"
        return 1
    fi
    
    log_success "Complete brand workflow test passed!"
    return 0
}

test_brand_authorization() {
    log_info "Testing brand authorization scenarios..."
    
    # Create two brands
    local brand1_email=$(generate_test_email)
    local brand1_data='{
        "name": "Brand 1",
        "email": "'$brand1_email'",
        "password": "testpassword123",
        "userType": "brand"
    }'
    
    local brand1_response=$(api_request "POST" "/auth/register" "$brand1_data")
    local brand1_token=$(echo "$brand1_response" | sed '$d' | jq -r '.token')
    
    local brand2_email=$(generate_test_email)
    local brand2_data='{
        "name": "Brand 2",
        "email": "'$brand2_email'",
        "password": "testpassword123",
        "userType": "brand"
    }'
    
    local brand2_response=$(api_request "POST" "/auth/register" "$brand2_data")
    local brand2_token=$(echo "$brand2_response" | sed '$d' | jq -r '.token')
    
    # Brand 1 creates campaign
    local campaign_data='{
        "title": "Brand 1 Campaign",
        "description": "Campaign by Brand 1",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand1_token")
    local campaign_id=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
    
    # Test Brand 2 cannot access Brand 1's campaign proposals
    local unauthorized_response=$(api_request "GET" "/api/listings/$campaign_id/proposals" "" "$brand2_token")
    local unauthorized_status=$(echo "$unauthorized_response" | tail -c 4)
    
    assert_http_status "$unauthorized_response" "403" "Brand 2 should not access Brand 1's proposals"
    log_success "Brand authorization test passed"
}

main() {
    log_info "Starting Complete Brand Workflow Tests..."
    
    # Initialize test environment
    init_test_environment
    
    # Run brand workflow tests
    test_complete_brand_workflow
    test_brand_authorization
    
    # Print test summary
    print_test_summary
}

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi





