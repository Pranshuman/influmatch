# Influmatch Phase 2 Test Suite

## 🧪 **Comprehensive Testing for Phase 2 Features**

This test suite provides complete coverage of all Phase 2 functionality including user authentication, campaign management, proposal submission, and status management.

## 📋 **Test Structure**

```
tests/
├── run-all-tests.sh           # Master test runner
├── utils/
│   └── test-helpers.sh        # Common test functions and utilities
├── data/
│   └── setup-test-data.sh     # Test data creation and management
├── api/
│   ├── auth-tests.sh          # Authentication and authorization tests
│   ├── campaign-tests.sh      # Campaign CRUD and validation tests
│   └── proposal-tests.sh      # Proposal submission and status tests
└── integration/
    ├── brand-workflow.sh      # Complete brand user story workflow
    └── influencer-workflow.sh # Complete influencer user story workflow
```

## 🚀 **Quick Start**

### **Run All Tests**
```bash
cd /Users/pranshumansinghbhouriyal/Desktop/Influmatch-IG-backend
./tests/run-all-tests.sh
```

### **Run Individual Test Suites**
```bash
# Authentication tests only
./tests/api/auth-tests.sh

# Campaign management tests only
./tests/api/campaign-tests.sh

# Proposal management tests only
./tests/api/proposal-tests.sh

# Complete brand workflow
./tests/integration/brand-workflow.sh

# Complete influencer workflow
./tests/integration/influencer-workflow.sh
```

## 📊 **Test Coverage**

### **API Tests**
- ✅ **Authentication Tests** (`auth-tests.sh`)
  - User registration (brand & influencer)
  - User login and token validation
  - Invalid login scenarios
  - Duplicate registration handling
  - Missing field validation
  - Token-based authorization

- ✅ **Campaign Tests** (`campaign-tests.sh`)
  - Campaign creation with validation
  - Unauthorized campaign creation
  - Missing field validation
  - Campaign retrieval (all & specific)
  - Campaign validation (budget, deadline)
  - Proposal access authorization

- ✅ **Proposal Tests** (`proposal-tests.sh`)
  - Proposal submission with validation
  - Unauthorized proposal submission
  - Missing field validation
  - Proposal status management
  - Unauthorized status updates
  - Proposal editing restrictions
  - My proposals endpoint

### **Integration Tests**
- ✅ **Brand Workflow** (`brand-workflow.sh`)
  - Complete brand user story
  - Registration → Login → Create Campaign
  - Review Proposals → Accept/Reject
  - Authorization verification

- ✅ **Influencer Workflow** (`influencer-workflow.sh`)
  - Complete influencer user story
  - Registration → Login → Browse Campaigns
  - Submit Proposal → Edit Proposal
  - View Status Updates → Handle Rejections

## 🎯 **User Stories Tested**

### **Brand User Stories**
1. **As a brand, I want to register and login** ✅
2. **As a brand, I want to create marketing campaigns** ✅
3. **As a brand, I want to view proposals for my campaigns** ✅
4. **As a brand, I want to accept or reject proposals** ✅
5. **As a brand, I want to accept multiple proposals per campaign** ✅
6. **As a brand, I want to manage my campaign proposals** ✅

### **Influencer User Stories**
1. **As an influencer, I want to register and login** ✅
2. **As an influencer, I want to browse available campaigns** ✅
3. **As an influencer, I want to submit proposals to campaigns** ✅
4. **As an influencer, I want to edit my proposals when under review** ✅
5. **As an influencer, I want to view all my submitted proposals** ✅
6. **As an influencer, I want to see the status of my proposals** ✅

### **System User Stories**
1. **As a system, I want to validate all user inputs** ✅
2. **As a system, I want to enforce proper authorization** ✅
3. **As a system, I want to maintain data integrity** ✅
4. **As a system, I want to handle errors gracefully** ✅

## 🔧 **Test Features**

### **Automated Test Data Management**
- Creates unique test users for each test run
- Generates test campaigns and proposals
- Handles cleanup after tests
- Exports test data for cross-script usage

### **Comprehensive Assertions**
- HTTP status code validation
- Response content verification
- Authorization testing
- Data integrity checks
- Error handling validation

### **Detailed Reporting**
- Color-coded test results
- Pass/fail statistics
- Detailed error messages
- Test execution summaries

## 📈 **Test Results**

### **Expected Results**
When all tests pass, you should see:
```
🎉 ALL TESTS PASSED! 🎉
Phase 2 functionality is working correctly.

✅ User Authentication & Authorization
✅ Campaign Creation & Management
✅ Proposal Submission & Status Management
✅ Complete User Workflows
✅ Data Validation & Error Handling
✅ Authorization & Access Control

The Influmatch platform is ready for production!
```

### **Test Statistics**
- **Total Test Cases**: 50+ individual test scenarios
- **API Endpoints Tested**: 15+ endpoints
- **User Workflows**: 2 complete end-to-end workflows
- **Authorization Scenarios**: 10+ access control tests
- **Validation Tests**: 15+ input validation scenarios

## 🛠️ **Prerequisites**

### **Services Must Be Running**
- **Backend API**: `http://localhost:5050`
- **Frontend**: `http://localhost:3000`
- **Database**: SQLite database accessible

### **Required Commands**
```bash
# Start backend
npm run dev:sqlite

# Start frontend (in separate terminal)
cd frontend && npm run dev

# Start database browser (optional)
npm run browse:web
```

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Services Not Running**
   ```
   ❌ Backend API is not running
   ❌ Frontend is not running
   ```
   **Solution**: Start the required services before running tests

2. **Test Data Conflicts**
   ```
   ❌ User already exists
   ```
   **Solution**: Tests use unique emails with timestamps, but you may need to clean the database

3. **Permission Issues**
   ```
   ❌ Permission denied
   ```
   **Solution**: Make sure test scripts are executable: `chmod +x tests/*.sh`

### **Debug Mode**
To see detailed output from individual tests:
```bash
# Run with verbose output
bash -x ./tests/api/auth-tests.sh
```

## 📝 **Adding New Tests**

### **API Test Template**
```bash
#!/bin/bash
source "$(dirname "$0")/../utils/test-helpers.sh"

test_new_feature() {
    log_info "Testing new feature..."
    
    # Your test code here
    local response=$(api_request "GET" "/api/endpoint")
    assert_http_status "$response" "200" "New feature should work"
    
    log_success "New feature test passed"
}

main() {
    init_test_environment
    test_new_feature
    print_test_summary
}

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
```

## 🎉 **Success Criteria**

Phase 2 is considered **COMPLETE** when:
- ✅ All API tests pass (100%)
- ✅ All integration tests pass (100%)
- ✅ All user stories are validated
- ✅ Authorization is properly enforced
- ✅ Data validation works correctly
- ✅ Error handling is comprehensive

---

**Last Updated**: September 29, 2025  
**Test Suite Version**: 1.0.0  
**Phase 2 Status**: Ready for Testing




