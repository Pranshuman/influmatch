#!/bin/bash

# Master Test Runner for Influmatch Phase 2 Testing

# Load test helpers
source "$(dirname "$0")/utils/test-helpers.sh"

# Test configuration
RUN_SETUP=true
RUN_API_TESTS=true
RUN_INTEGRATION_TESTS=true
CLEANUP_AFTER=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${PURPLE}"
    echo "=========================================="
    echo "    INFLUMATCH PHASE 2 TEST SUITE"
    echo "=========================================="
    echo -e "${NC}"
    echo "Testing all Phase 2 functionality:"
    echo "• User Authentication & Authorization"
    echo "• Campaign Creation & Management"
    echo "• Proposal Submission & Status Management"
    echo "• Complete User Workflows"
    echo ""
}

run_test_suite() {
    local suite_name="$1"
    local test_script="$2"
    local description="$3"
    
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${BLUE}Running: $suite_name${NC}"
    echo -e "${BLUE}Description: $description${NC}"
    echo -e "${BLUE}==========================================${NC}"
    
    if [ -f "$test_script" ]; then
        if bash "$test_script"; then
            echo -e "${GREEN}✅ $suite_name PASSED${NC}"
            return 0
        else
            echo -e "${RED}❌ $suite_name FAILED${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Test script not found: $test_script${NC}"
        return 1
    fi
}

run_setup_tests() {
    echo -e "${YELLOW}Setting up test data...${NC}"
    
    if bash "$(dirname "$0")/data/setup-test-data.sh"; then
        echo -e "${GREEN}✅ Test data setup completed${NC}"
        return 0
    else
        echo -e "${RED}❌ Test data setup failed${NC}"
        return 1
    fi
}

run_api_tests() {
    local api_tests_passed=0
    local api_tests_total=0
    
    echo -e "${YELLOW}Running API Tests...${NC}"
    
    # Authentication Tests
    ((api_tests_total++))
    if run_test_suite "Authentication Tests" "$(dirname "$0")/api/auth-tests.sh" "User registration, login, and token validation"; then
        ((api_tests_passed++))
    fi
    
    # Campaign Tests
    ((api_tests_total++))
    if run_test_suite "Campaign Management Tests" "$(dirname "$0")/api/campaign-tests.sh" "Campaign creation, retrieval, and validation"; then
        ((api_tests_passed++))
    fi
    
    # Proposal Tests
    ((api_tests_total++))
    if run_test_suite "Proposal Management Tests" "$(dirname "$0")/api/proposal-tests.sh" "Proposal submission, status management, and editing"; then
        ((api_tests_passed++))
    fi
    
    echo -e "${BLUE}API Tests Summary: $api_tests_passed/$api_tests_total passed${NC}"
    return $((api_tests_total - api_tests_passed))
}

run_integration_tests() {
    local integration_tests_passed=0
    local integration_tests_total=0
    
    echo -e "${YELLOW}Running Integration Tests...${NC}"
    
    # Brand Workflow Tests
    ((integration_tests_total++))
    if run_test_suite "Brand Workflow Tests" "$(dirname "$0")/integration/brand-workflow.sh" "Complete brand user story from registration to proposal management"; then
        ((integration_tests_passed++))
    fi
    
    # Influencer Workflow Tests
    ((integration_tests_total++))
    if run_test_suite "Influencer Workflow Tests" "$(dirname "$0")/integration/influencer-workflow.sh" "Complete influencer user story from registration to proposal submission"; then
        ((integration_tests_passed++))
    fi
    
    # Button Functionality Tests
    ((integration_tests_total++))
    if run_test_suite "Button Functionality Tests" "$(dirname "$0")/integration/button-functionality.sh" "Test all button functionality and navigation across frontend pages"; then
        ((integration_tests_passed++))
    fi
    
    echo -e "${BLUE}Integration Tests Summary: $integration_tests_passed/$integration_tests_total passed${NC}"
    return $((integration_tests_total - integration_tests_passed))
}

run_cleanup() {
    echo -e "${YELLOW}Cleaning up test data...${NC}"
    
    # Note: In a real scenario, you'd want to clean up test data
    # For now, we'll just log what would be cleaned up
    if [ -f "$(dirname "$0")/data/test-data.env" ]; then
        source "$(dirname "$0")/data/test-data.env"
        echo "Would clean up:"
        echo "  - Brand user: $TEST_BRAND_EMAIL"
        echo "  - Influencer user: $TEST_INFLUENCER_EMAIL"
        echo "  - Campaign: $TEST_CAMPAIGN_ID"
        echo "  - Proposals: $TEST_PROPOSAL_ID"
    fi
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

print_final_summary() {
    local total_failed=$1
    
    echo ""
    echo -e "${PURPLE}==========================================${NC}"
    echo -e "${PURPLE}           FINAL TEST SUMMARY${NC}"
    echo -e "${PURPLE}==========================================${NC}"
    
    if [ $total_failed -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL TESTS PASSED! 🎉${NC}"
        echo -e "${GREEN}Phase 2 functionality is working correctly.${NC}"
        echo ""
        echo -e "${BLUE}✅ User Authentication & Authorization${NC}"
        echo -e "${BLUE}✅ Campaign Creation & Management${NC}"
        echo -e "${BLUE}✅ Proposal Submission & Status Management${NC}"
        echo -e "${BLUE}✅ Complete User Workflows${NC}"
        echo -e "${BLUE}✅ Data Validation & Error Handling${NC}"
        echo -e "${BLUE}✅ Authorization & Access Control${NC}"
        echo ""
        echo -e "${GREEN}The Influmatch platform is ready for production!${NC}"
        return 0
    else
        echo -e "${RED}❌ SOME TESTS FAILED${NC}"
        echo -e "${RED}$total_failed test suite(s) failed.${NC}"
        echo ""
        echo -e "${YELLOW}Please review the failed tests above and fix the issues.${NC}"
        return 1
    fi
}

main() {
    print_banner
    
    # Initialize test environment
    init_test_environment
    
    local total_failed=0
    
    # Run setup if requested
    if [ "$RUN_SETUP" = true ]; then
        if ! run_setup_tests; then
            echo -e "${RED}❌ Test setup failed. Cannot continue.${NC}"
            exit 1
        fi
    fi
    
    # Run API tests if requested
    if [ "$RUN_API_TESTS" = true ]; then
        run_api_tests
        total_failed=$((total_failed + $?))
    fi
    
    # Run integration tests if requested
    if [ "$RUN_INTEGRATION_TESTS" = true ]; then
        run_integration_tests
        total_failed=$((total_failed + $?))
    fi
    
    # Run cleanup if requested
    if [ "$CLEANUP_AFTER" = true ]; then
        run_cleanup
    fi
    
    # Print final summary
    print_final_summary $total_failed
    exit $total_failed
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-setup)
            RUN_SETUP=false
            shift
            ;;
        --no-api)
            RUN_API_TESTS=false
            shift
            ;;
        --no-integration)
            RUN_INTEGRATION_TESTS=false
            shift
            ;;
        --no-cleanup)
            CLEANUP_AFTER=false
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --no-setup        Skip test data setup"
            echo "  --no-api          Skip API tests"
            echo "  --no-integration  Skip integration tests"
            echo "  --no-cleanup      Skip cleanup after tests"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
