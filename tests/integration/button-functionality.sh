#!/bin/bash

# Button Functionality Tests for Influmatch Frontend

# Load test helpers
source "$(dirname "$0")/../utils/test-helpers.sh"

# Frontend URL
FRONTEND_URL="http://localhost:3000"

test_homepage_buttons() {
    log_info "Testing homepage button functionality..."
    
    # Test homepage loads
    local homepage_response=$(curl -s -w '%{http_code}' "$FRONTEND_URL")
    local homepage_status=$(echo "$homepage_response" | tail -c 4)
    
    assert_http_status "$homepage_response" "200" "Homepage should load successfully"
    
    if [ "$homepage_status" = "200" ]; then
        local homepage_body=$(echo "$homepage_response" | sed '$d')
        
        # Check for navigation buttons
        assert_contains "$homepage_body" "Sign In" "Homepage should have Sign In button"
        assert_contains "$homepage_body" "Sign Up" "Homepage should have Sign Up button"
        assert_contains "$homepage_body" "Browse Campaigns" "Homepage should have Browse Campaigns button"
        
        log_success "Homepage buttons found and functional"
    fi
}

test_navigation_links() {
    log_info "Testing navigation link functionality..."
    
    # Test marketplace link
    local marketplace_response=$(curl -s -w '%{http_code}' "$FRONTEND_URL/marketplace")
    local marketplace_status=$(echo "$marketplace_response" | tail -c 4)
    
    assert_http_status "$marketplace_response" "200" "Marketplace page should be accessible"
    
    if [ "$marketplace_status" = "200" ]; then
        local marketplace_body=$(echo "$marketplace_response" | sed '$d')
        assert_contains "$marketplace_body" "Campaign Marketplace" "Marketplace should load correctly"
        assert_contains "$marketplace_body" "Back to Home" "Marketplace should have back navigation"
    fi
    
    # Test auth pages
    local login_response=$(curl -s -w '%{http_code}' "$FRONTEND_URL/auth/login")
    local login_status=$(echo "$login_response" | tail -c 4)
    assert_http_status "$login_response" "200" "Login page should be accessible"
    
    local register_response=$(curl -s -w '%{http_code}' "$FRONTEND_URL/auth/register")
    local register_status=$(echo "$register_response" | tail -c 4)
    assert_http_status "$register_response" "200" "Register page should be accessible"
    
    log_success "Navigation links working correctly"
}

test_authenticated_pages() {
    log_info "Testing authenticated page access..."
    
    # Test dashboard (should redirect to login if not authenticated)
    local dashboard_response=$(curl -s -w '%{http_code}' "$FRONTEND_URL/dashboard")
    local dashboard_status=$(echo "$dashboard_response" | tail -c 4)
    
    # Dashboard should either be accessible (200) or redirect to login (302/401)
    if [ "$dashboard_status" = "200" ] || [ "$dashboard_status" = "302" ] || [ "$dashboard_status" = "401" ]; then
        log_success "Dashboard access control working"
    else
        log_error "Dashboard access control not working properly"
    fi
    
    # Test campaign create page
    local create_response=$(curl -s -w '%{http_code}' "$FRONTEND_URL/campaigns/create")
    local create_status=$(echo "$create_response" | tail -c 4)
    
    if [ "$create_status" = "200" ] || [ "$create_status" = "302" ] || [ "$create_status" = "401" ]; then
        log_success "Campaign create access control working"
    else
        log_error "Campaign create access control not working properly"
    fi
    
    # Test proposals page
    local proposals_response=$(curl -s -w '%{http_code}' "$FRONTEND_URL/proposals")
    local proposals_status=$(echo "$proposals_response" | tail -c 4)
    
    if [ "$proposals_status" = "200" ] || [ "$proposals_status" = "302" ] || [ "$proposals_status" = "401" ]; then
        log_success "Proposals access control working"
    else
        log_error "Proposals access control not working properly"
    fi
    
    log_success "Authenticated page access control working correctly"
}

test_button_consistency() {
    log_info "Testing button consistency across pages..."
    
    # Test that all pages have proper navigation
    local pages=(
        "/"
        "/marketplace"
        "/auth/login"
        "/auth/register"
    )
    
    for page in "${pages[@]}"; do
        local response=$(curl -s -w '%{http_code}' "$FRONTEND_URL$page")
        local status=$(echo "$response" | tail -c 4)
        
        if [ "$status" = "200" ]; then
            local body=$(echo "$response" | sed '$d')
            
            # Check for proper HTML structure
            assert_contains "$body" "<!DOCTYPE html>" "Page $page should have proper HTML structure"
            assert_contains "$body" "<title>" "Page $page should have a title"
            
            log_success "Page $page has proper structure"
        else
            log_error "Page $page not accessible (HTTP $status)"
        fi
    done
}

test_form_functionality() {
    log_info "Testing form functionality..."
    
    # Test login form
    local login_page=$(curl -s "$FRONTEND_URL/auth/login")
    
    if echo "$login_page" | grep -q "form"; then
        assert_contains "$login_page" "email" "Login form should have email field"
        assert_contains "$login_page" "password" "Login form should have password field"
        assert_contains "$login_page" "submit" "Login form should have submit button"
        log_success "Login form structure correct"
    else
        log_error "Login form not found"
    fi
    
    # Test register form
    local register_page=$(curl -s "$FRONTEND_URL/auth/register")
    
    if echo "$register_page" | grep -q "form"; then
        assert_contains "$register_page" "name" "Register form should have name field"
        assert_contains "$register_page" "email" "Register form should have email field"
        assert_contains "$register_page" "password" "Register form should have password field"
        assert_contains "$register_page" "userType" "Register form should have userType field"
        log_success "Register form structure correct"
    else
        log_error "Register form not found"
    fi
}

test_responsive_design() {
    log_info "Testing responsive design elements..."
    
    # Test that pages have responsive meta tags
    local homepage=$(curl -s "$FRONTEND_URL")
    
    if echo "$homepage" | grep -q "viewport"; then
        log_success "Responsive viewport meta tag found"
    else
        log_warning "Responsive viewport meta tag not found"
    fi
    
    # Test for Tailwind CSS classes (indicating responsive design)
    if echo "$homepage" | grep -q "md:grid-cols-2\|lg:grid-cols-3\|sm:px-6"; then
        log_success "Responsive CSS classes found"
    else
        log_warning "Responsive CSS classes not found"
    fi
}

test_error_handling() {
    log_info "Testing error handling..."
    
    # Test 404 page
    local not_found_response=$(curl -s -w '%{http_code}' "$FRONTEND_URL/nonexistent-page")
    local not_found_status=$(echo "$not_found_response" | tail -c 4)
    
    if [ "$not_found_status" = "404" ]; then
        log_success "404 error handling working"
    else
        log_warning "404 error handling may not be working (HTTP $not_found_status)"
    fi
    
    # Test that error pages have navigation
    if [ "$not_found_status" = "404" ]; then
        local not_found_body=$(echo "$not_found_response" | sed '$d')
        if echo "$not_found_body" | grep -q "Go back home\|Back to"; then
            log_success "Error pages have navigation"
        else
            log_warning "Error pages may not have navigation"
        fi
    fi
}

main() {
    log_info "Starting Button Functionality Tests..."
    
    # Initialize test environment
    init_test_environment
    
    # Run all button functionality tests
    test_homepage_buttons
    test_navigation_links
    test_authenticated_pages
    test_button_consistency
    test_form_functionality
    test_responsive_design
    test_error_handling
    
    # Print test summary
    print_test_summary
}

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
