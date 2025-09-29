#!/bin/bash

# Complete Influencer User Story Workflow Test for Influmatch Phase 2

# Load test helpers
source "$(dirname "$0")/../utils/test-helpers.sh"

test_complete_influencer_workflow() {
    log_info "Testing complete influencer user workflow..."
    
    # Step 1: Influencer Registration
    log_info "Step 1: Influencer Registration"
    local influencer_email=$(generate_test_email)
    local influencer_data='{
        "name": "Tech Influencer Pro",
        "email": "'$influencer_email'",
        "password": "testpassword123",
        "userType": "influencer",
        "bio": "Tech reviewer and gadget enthusiast with 100k+ followers",
        "website": "https://techinfluencer.com"
    }'
    
    local influencer_response=$(api_request "POST" "/auth/register" "$influencer_data")
    local influencer_status=$(echo "$influencer_response" | tail -c 4)
    
    assert_http_status "$influencer_response" "201" "Influencer registration should succeed"
    
    if [ "$influencer_status" != "201" ]; then
        log_error "Influencer registration failed, cannot continue workflow"
        return 1
    fi
    
    local influencer_token=$(echo "$influencer_response" | sed '$d' | jq -r '.token')
    local influencer_id=$(echo "$influencer_response" | sed '$d' | jq -r '.user.id')
    log_success "Influencer registered successfully (ID: $influencer_id)"
    
    # Step 2: Influencer Login
    log_info "Step 2: Influencer Login"
    local login_data='{
        "email": "'$influencer_email'",
        "password": "testpassword123"
    }'
    
    local login_response=$(api_request "POST" "/auth/login" "$login_data")
    local login_status=$(echo "$login_response" | tail -c 4)
    
    assert_http_status "$login_response" "200" "Influencer login should succeed"
    log_success "Influencer logged in successfully"
    
    # Step 3: Browse Available Campaigns
    log_info "Step 3: Browse Available Campaigns"
    local campaigns_response=$(api_request "GET" "/api/listings")
    local campaigns_status=$(echo "$campaigns_response" | tail -c 4)
    
    assert_http_status "$campaigns_response" "200" "Browse campaigns should succeed"
    
    if [ "$campaigns_status" = "200" ]; then
        local campaigns_body=$(echo "$campaigns_response" | sed '$d')
        assert_contains "$campaigns_body" "listings" "Should return listings array"
        log_success "Campaigns browsed successfully"
    fi
    
    # Step 4: Create Test Campaign for Proposals
    log_info "Step 4: Setting up test campaign..."
    
    # Create a brand and campaign
    local brand_email=$(generate_test_email)
    local brand_data='{
        "name": "Test Brand Company",
        "email": "'$brand_email'",
        "password": "testpassword123",
        "userType": "brand",
        "bio": "Tech company for testing"
    }'
    
    local brand_response=$(api_request "POST" "/auth/register" "$brand_data")
    local brand_token=$(echo "$brand_response" | sed '$d' | jq -r '.token')
    
    local campaign_data='{
        "title": "Smartphone Review Campaign",
        "description": "We need influencers to review our latest smartphone. Looking for tech reviewers with engaged audiences.",
        "category": "Technology",
        "budget": 8000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'",
        "requirements": "Must have 25k+ followers, tech-focused content",
        "deliverables": "3 Instagram posts, 2 stories, 1 YouTube video"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand_token")
    local campaign_id=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
    log_success "Test campaign created (ID: $campaign_id)"
    
    # Step 5: View Specific Campaign Details
    log_info "Step 5: View Campaign Details"
    local campaign_details_response=$(api_request "GET" "/api/listings/$campaign_id")
    local campaign_details_status=$(echo "$campaign_details_response" | tail -c 4)
    
    assert_http_status "$campaign_details_response" "200" "View campaign details should succeed"
    
    if [ "$campaign_details_status" = "200" ]; then
        local campaign_details_body=$(echo "$campaign_details_response" | sed '$d')
        assert_contains "$campaign_details_body" "Smartphone Review Campaign" "Should contain correct campaign title"
        assert_contains "$campaign_details_body" "brand" "Should contain brand information"
        log_success "Campaign details viewed successfully"
    fi
    
    # Step 6: Submit Proposal
    log_info "Step 6: Submit Proposal"
    local proposal_data='{
        "message": "I am very interested in reviewing your smartphone! I have a highly engaged tech audience of 100k+ followers and specialize in detailed gadget reviews. I can create compelling content including unboxing, features overview, and real-world usage tests.",
        "proposedBudget": 7500,
        "timeline": "2 weeks"
    }'
    
    local proposal_response=$(api_request "POST" "/api/listings/$campaign_id/proposals" "$proposal_data" "$influencer_token")
    local proposal_status=$(echo "$proposal_response" | tail -c 4)
    
    assert_http_status "$proposal_response" "201" "Proposal submission should succeed"
    
    if [ "$proposal_status" != "201" ]; then
        log_error "Proposal submission failed, cannot continue workflow"
        return 1
    fi
    
    local proposal_id=$(echo "$proposal_response" | sed '$d' | jq -r '.proposal.id')
    log_success "Proposal submitted successfully (ID: $proposal_id)"
    
    # Step 7: View My Proposals
    log_info "Step 7: View My Proposals"
    local my_proposals_response=$(api_request "GET" "/api/proposals/my-proposals" "" "$influencer_token")
    local my_proposals_status=$(echo "$my_proposals_response" | tail -c 4)
    
    assert_http_status "$my_proposals_response" "200" "View my proposals should succeed"
    
    if [ "$my_proposals_status" = "200" ]; then
        local my_proposals_body=$(echo "$my_proposals_response" | sed '$d')
        assert_contains "$my_proposals_body" "proposals" "Should return proposals array"
        assert_contains "$my_proposals_body" "brand" "Should include brand information"
        assert_contains "$my_proposals_body" "under_review" "Proposal should have under_review status"
        log_success "My proposals viewed successfully"
    fi
    
    # Step 8: Edit Proposal (while under_review)
    log_info "Step 8: Edit Proposal"
    local edit_data='{
        "message": "Updated proposal: I am very interested in reviewing your smartphone! I have a highly engaged tech audience of 100k+ followers and specialize in detailed gadget reviews. I can create compelling content including unboxing, features overview, and real-world usage tests. I can also provide additional coverage on my YouTube channel.",
        "proposedBudget": 7000,
        "timeline": "2.5 weeks"
    }'
    
    local edit_response=$(api_request "PUT" "/api/proposals/$proposal_id" "$edit_data" "$influencer_token")
    local edit_status=$(echo "$edit_response" | tail -c 4)
    
    assert_http_status "$edit_response" "200" "Proposal editing should succeed"
    
    if [ "$edit_status" = "200" ]; then
        local edit_body=$(echo "$edit_response" | sed '$d')
        assert_contains "$edit_body" "YouTube channel" "Should contain updated message"
        log_success "Proposal edited successfully"
    fi
    
    # Step 9: Brand Reviews and Accepts Proposal
    log_info "Step 9: Brand Accepts Proposal"
    local accept_data='{"status": "accepted"}'
    local accept_response=$(api_request "PUT" "/api/proposals/$proposal_id/status" "$accept_data" "$brand_token")
    local accept_status=$(echo "$accept_response" | tail -c 4)
    
    assert_http_status "$accept_response" "200" "Brand accepting proposal should succeed"
    log_success "Proposal accepted by brand"
    
    # Step 10: View Updated Proposal Status
    log_info "Step 10: View Updated Proposal Status"
    local updated_proposals_response=$(api_request "GET" "/api/proposals/my-proposals" "" "$influencer_token")
    local updated_proposals_body=$(echo "$updated_proposals_response" | sed '$d')
    
    if echo "$updated_proposals_body" | grep -q "accepted"; then
        log_success "Proposal status updated to accepted"
    else
        log_error "Proposal status not updated correctly"
        return 1
    fi
    
    # Step 11: Try to Edit Accepted Proposal (should fail)
    log_info "Step 11: Try to Edit Accepted Proposal"
    local edit_accepted_response=$(api_request "PUT" "/api/proposals/$proposal_id" "$edit_data" "$influencer_token")
    local edit_accepted_status=$(echo "$edit_accepted_response" | tail -c 4)
    
    assert_http_status "$edit_accepted_response" "400" "Editing accepted proposal should fail"
    log_success "Cannot edit accepted proposal (correct behavior)"
    
    # Step 12: Create Another Campaign and Submit Multiple Proposals
    log_info "Step 12: Submit Multiple Proposals"
    
    local campaign2_data='{
        "title": "Gaming Laptop Campaign",
        "description": "Review our new gaming laptop",
        "category": "Technology",
        "budget": 6000,
        "deadline": "'$(date -d '+25 days' -Iseconds)'"
    }'
    
    local campaign2_response=$(api_request "POST" "/api/listings" "$campaign2_data" "$brand_token")
    local campaign2_id=$(echo "$campaign2_response" | sed '$d' | jq -r '.listing.id')
    
    local proposal2_data='{
        "message": "I would love to review this gaming laptop!",
        "proposedBudget": 5500,
        "timeline": "1 week"
    }'
    
    local proposal2_response=$(api_request "POST" "/api/listings/$campaign2_id/proposals" "$proposal2_data" "$influencer_token")
    local proposal2_id=$(echo "$proposal2_response" | sed '$d' | jq -r '.proposal.id')
    
    # Brand rejects this proposal
    local reject_data='{"status": "rejected"}'
    api_request "PUT" "/api/proposals/$proposal2_id/status" "$reject_data" "$brand_token" > /dev/null
    
    # Step 13: View All Proposals with Different Statuses
    log_info "Step 13: View All Proposals with Different Statuses"
    local all_proposals_response=$(api_request "GET" "/api/proposals/my-proposals" "" "$influencer_token")
    local all_proposals_body=$(echo "$all_proposals_response" | sed '$d')
    
    # Should have both accepted and rejected proposals
    if echo "$all_proposals_body" | grep -q "accepted" && echo "$all_proposals_body" | grep -q "rejected"; then
        log_success "Multiple proposals with different statuses viewed successfully"
    else
        log_error "Multiple proposals not found or statuses incorrect"
        return 1
    fi
    
    log_success "Complete influencer workflow test passed!"
    return 0
}

test_influencer_authorization() {
    log_info "Testing influencer authorization scenarios..."
    
    # Create two influencers
    local influencer1_email=$(generate_test_email)
    local influencer1_data='{
        "name": "Influencer 1",
        "email": "'$influencer1_email'",
        "password": "testpassword123",
        "userType": "influencer"
    }'
    
    local influencer1_response=$(api_request "POST" "/auth/register" "$influencer1_data")
    local influencer1_token=$(echo "$influencer1_response" | sed '$d' | jq -r '.token')
    
    local influencer2_email=$(generate_test_email)
    local influencer2_data='{
        "name": "Influencer 2",
        "email": "'$influencer2_email'",
        "password": "testpassword123",
        "userType": "influencer"
    }'
    
    local influencer2_response=$(api_request "POST" "/auth/register" "$influencer2_data")
    local influencer2_token=$(echo "$influencer2_response" | sed '$d' | jq -r '.token')
    
    # Create brand and campaign
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
        "title": "Authorization Test Campaign",
        "description": "Campaign for authorization testing",
        "category": "Technology",
        "budget": 5000,
        "deadline": "'$(date -d '+30 days' -Iseconds)'"
    }'
    
    local campaign_response=$(api_request "POST" "/api/listings" "$campaign_data" "$brand_token")
    local campaign_id=$(echo "$campaign_response" | sed '$d' | jq -r '.listing.id')
    
    # Influencer 1 submits proposal
    local proposal_data='{
        "message": "Test proposal",
        "proposedBudget": 4000,
        "timeline": "1 week"
    }'
    
    local proposal_response=$(api_request "POST" "/api/listings/$campaign_id/proposals" "$proposal_data" "$influencer1_token")
    local proposal_id=$(echo "$proposal_response" | sed '$d' | jq -r '.proposal.id')
    
    # Test Influencer 2 cannot edit Influencer 1's proposal
    local edit_data='{
        "message": "Unauthorized edit",
        "proposedBudget": 3000,
        "timeline": "2 weeks"
    }'
    
    local unauthorized_edit_response=$(api_request "PUT" "/api/proposals/$proposal_id" "$edit_data" "$influencer2_token")
    local unauthorized_edit_status=$(echo "$unauthorized_edit_response" | tail -c 4)
    
    assert_http_status "$unauthorized_edit_response" "403" "Influencer 2 should not edit Influencer 1's proposal"
    
    # Test Influencer 2 cannot update proposal status
    local status_data='{"status": "accepted"}'
    local unauthorized_status_response=$(api_request "PUT" "/api/proposals/$proposal_id/status" "$status_data" "$influencer2_token")
    local unauthorized_status_status=$(echo "$unauthorized_status_response" | tail -c 4)
    
    assert_http_status "$unauthorized_status_response" "403" "Influencer 2 should not update proposal status"
    
    log_success "Influencer authorization test passed"
}

main() {
    log_info "Starting Complete Influencer Workflow Tests..."
    
    # Initialize test environment
    init_test_environment
    
    # Run influencer workflow tests
    test_complete_influencer_workflow
    test_influencer_authorization
    
    # Print test summary
    print_test_summary
}

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi

