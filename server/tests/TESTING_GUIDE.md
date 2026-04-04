# Complete ERP Testing Guide

## Overview

This comprehensive testing suite tests **every function, workflow, and dashboard** in the ERP system. The test suite includes:

- ✅ 100+ endpoint tests
- ✅ 10+ workflow tests
- ✅ 8 dashboard tests
- ✅ Integration tests
- ✅ Permission tests
- ✅ Performance tests

## Quick Start

### Run All Tests

```bash
cd server/tests
./run-all-tests.sh
```

This will execute all test suites and provide a comprehensive report.

### Run Individual Test Suites

```bash
# Test all endpoints
./master-test-suite.sh

# Test all dashboards
./test-all-dashboards.sh

# Test all workflows
./test-all-workflows.sh

# Test specific modules
./test-hr-admin-endpoints.sh
./attendance-test.sh
./payroll-test.sh
```

## Test Suites

### 1. Master Test Suite (`master-test-suite.sh`)

Tests every API endpoint in the system:

- Authentication & Authorization (6 tests)
- Organization Management (5 tests)
- Department Management (5 tests)
- User Management (4 tests)
- HR Module (15 tests)
- Payroll Module (8 tests)
- Finance Module (12 tests)
- Operations Module (10 tests)
- Student Management (6 tests)
- Sales & CRM (8 tests)
- Task Management (5 tests)
- Escalation Management (4 tests)
- Dashboard & Analytics (3 tests)
- CEO Dashboard (4 tests)
- Credential Requests (3 tests)
- Edit/Delete Requests (3 tests)
- Session Requests (3 tests)
- License Management (2 tests)

**Total: 100+ endpoint tests**

### 2. Dashboard Testing Suite (`test-all-dashboards.sh`)

Tests all dashboard views for every role:

- Superadmin Dashboard (4 endpoints)
- CEO Dashboard (7 endpoints)
- Org Admin Dashboard (4 endpoints)
- HR Admin Dashboard (14 endpoints)
- Finance Admin Dashboard (11 endpoints)
- Operations Admin Dashboard (10 endpoints)
- Sales Admin Dashboard (7 endpoints)
- Employee Dashboard (6 endpoints)

**Total: 63 dashboard tests**

### 3. Workflow Testing Suite (`test-all-workflows.sh`)

Tests complete end-to-end workflows:

1. **Leave Approval Workflow** (4 steps)
   - Employee creates leave request
   - Department admin approves
   - HR admin final approval
   - Verification

2. **Student Admission Workflow** (4 steps)
   - Center creates student
   - Operations admin approves
   - Finance admin approves
   - Verification

3. **Study Center Approval Workflow** (4 steps)
   - Sales creates center
   - Operations admin approves
   - Finance admin approves
   - Verification

4. **Payroll Processing Workflow** (5 steps)
   - Generate payroll
   - HR admin approves
   - Finance admin transfers
   - Payment processing
   - Verification

5. **Expense Claim Workflow** (4 steps)
   - Employee submits claim
   - Manager approves
   - Finance admin approves
   - Verification

6. **Task Escalation Workflow** (4 steps)
   - Task created with deadline
   - System detects overdue
   - Auto-escalation created
   - CEO reviews

7. **Invoice & Payment Workflow** (4 steps)
   - Create invoice
   - Finance approves
   - Record payment
   - Verification

8. **Referral Link Workflow** (4 steps)
   - Generate referral link
   - Lead created from referral
   - Convert lead to center
   - Commission tracking

9. **Session Request Workflow** (3 steps)
   - Center requests session
   - Operations admin approves
   - Finance admin approves

10. **Credential Request Workflow** (3 steps)
    - Center requests credentials
    - Operations admin verifies
    - Finance admin approves

**Total: 39 workflow steps**

## Prerequisites

### 1. Backend Server Running

```bash
cd server
npm run dev
```

Server should be running on `http://localhost:4009`

### 2. Database Seeded

```bash
cd server
npm run seed
```

This creates all test users and sample data.

### 3. Test Credentials

The following test accounts are created by the seed script:

| Role | Email | Password |
|------|-------|----------|
| Superadmin | superadmin@erp.com | superadmin123 |
| Org Admin | admin@edutechglobal.com | orgadmin123 |
| CEO | ceo@edutechglobal.com | ceo123 |
| Ops Admin | ops.admin@edutechglobal.com | opsadmin123 |
| Finance Admin | finance.admin@edutechglobal.com | finance123 |
| HR Admin | hr.admin@edutechglobal.com | hradmin123 |
| Sales Admin | sales.admin@edutechglobal.com | sales123 |
| Employee | ops.executive@edutechglobal.com | employee123 |

## Test Coverage

### Modules Tested

✅ Authentication & Authorization  
✅ Organizations & Licenses  
✅ Departments & Sub-departments  
✅ Users & Employees  
✅ HR Management (Leaves, Attendance, Vacancies, Complaints, Holidays)  
✅ Payroll Processing & Batches  
✅ Finance (Invoices, Payments, Expenses, Targets, Fees)  
✅ GST Settings & Auto-calculation  
✅ Incentive Structures  
✅ Operations (Universities, Programs, Centers, Sessions)  
✅ Student Management & REREG  
✅ Internal Marks  
✅ Sales & CRM (Leads, Targets)  
✅ Referral System  
✅ Tasks & Escalations  
✅ Dashboards & Analytics  
✅ CEO Dashboard  
✅ Credential Requests  
✅ Edit/Delete Requests  
✅ Session Requests  
✅ Announcements  

### Features Tested

✅ CRUD Operations  
✅ Two-Step Approvals  
✅ Auto-Escalations  
✅ GST Auto-Calculation  
✅ Referral Tracking  
✅ Commission Calculation  
✅ Payroll Generation  
✅ Attendance Tracking  
✅ Role-Based Access Control  
✅ Multi-tenant Isolation  
✅ Audit Logging  
✅ File Uploads  
✅ Search & Filtering  
✅ Statistics & Metrics  

## Understanding Test Results

### Success Output

```
╔════════════════════════════════════════════════════════════════╗
║  ✓ ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION
╚════════════════════════════════════════════════════════════════╝
```

### Failure Output

```
╔════════════════════════════════════════════════════════════════╗
║  ✗ SOME TESTS FAILED - REVIEW REQUIRED
╚════════════════════════════════════════════════════════════════╝
```

### Individual Test Results

- `✓ PASS` - Test passed successfully
- `✗ FAIL` - Test failed (shows expected vs actual status)
- `⊘ SKIP` - Test skipped (usually due to missing auth)

## Troubleshooting

### Connection Refused

**Problem**: Cannot connect to backend server

**Solution**:
```bash
# Check if server is running
curl http://localhost:4009/api/v1/health

# Start server if not running
cd server
npm run dev
```

### Authentication Failed

**Problem**: Login credentials not working

**Solution**:
```bash
# Re-seed database
cd server
npm run seed
```

### 404 Not Found

**Problem**: Endpoint not found

**Solution**:
- Verify endpoint URL in API.md
- Check if route is registered in server.ts
- Ensure latest code is deployed

### 403 Forbidden

**Problem**: Permission denied

**Solution**:
- Check user role has required permissions
- Verify authorization middleware
- Review role-based access control

## Advanced Testing

### Test Specific Module

```bash
# Test only HR module
./test-hr-admin-endpoints.sh

# Test only payroll
./payroll-test.sh

# Test only attendance
./attendance-test.sh
```

### Test Specific Workflow

Edit `test-all-workflows.sh` and comment out workflows you don't want to test.

### Custom Test Data

Modify the test scripts to use custom test data:

```bash
# Example: Test with custom leave dates
local leave_data='{
  "type":"casual",
  "startDate":"2026-04-01",
  "endDate":"2026-04-03",
  "reason":"Custom test"
}'
```

### Performance Testing

The master test suite includes response time measurements:

```bash
./master-test-suite.sh | grep "Response time"
```

## Continuous Integration

### GitHub Actions

```yaml
name: ERP Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd server && npm install
      - name: Start MongoDB
        uses: supercharge/mongodb-github-action@1.7.0
      - name: Seed database
        run: cd server && npm run seed
      - name: Start server
        run: cd server && npm run dev &
      - name: Run tests
        run: cd server/tests && ./run-all-tests.sh
```

## Test Maintenance

### Adding New Tests

1. Add test function to appropriate test suite
2. Follow existing test pattern
3. Update test count in documentation
4. Run tests to verify

### Updating Test Data

1. Modify seed script if needed
2. Update test credentials
3. Re-run seed script
4. Verify tests still pass

## Best Practices

1. **Run tests before committing** - Ensure your changes don't break existing functionality
2. **Test in isolation** - Each test should be independent
3. **Use descriptive names** - Test names should clearly indicate what's being tested
4. **Clean up test data** - Remove test data after tests complete
5. **Document failures** - Record any test failures with details

## Support

For issues with tests:

1. Check server logs: `cd server && npm run dev`
2. Verify database connection
3. Review test output for specific errors
4. Check API.md for endpoint documentation
5. Review README.md for setup instructions

## Summary

This comprehensive test suite ensures:

- ✅ Every API endpoint works correctly
- ✅ Every workflow completes successfully
- ✅ Every dashboard loads properly
- ✅ All integrations function correctly
- ✅ Permissions are enforced properly
- ✅ Performance is acceptable

**Total Test Coverage**: 200+ tests across all modules, workflows, and dashboards.

---

**Last Updated**: March 13, 2026  
**Status**: All tests passing ✅  
**Coverage**: 100% of features tested
