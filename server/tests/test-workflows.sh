#!/bin/bash

# ERP System Comprehensive Workflow Testing Script
# Tests all major workflows and API endpoints

API_URL="http://localhost:5001/api/v1"
FRONTEND_URL="http://localhost:5173"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test results
print_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}║   🧪 ERP System Comprehensive Workflow Testing           ║${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Server Health Check
echo -e "${YELLOW}[1/15] Testing Server Health...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/../health)
[ "$RESPONSE" = "200" ]
print_test $? "Server health check"

# Test 2: Frontend Accessibility
echo -e "\n${YELLOW}[2/15] Testing Frontend Accessibility...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)
[ "$RESPONSE" = "200" ]
print_test $? "Frontend accessible"

# Test 3: Authentication Workflow
echo -e "\n${YELLOW}[3/15] Testing Authentication Workflow...${NC}"

# Login as CEO
CEO_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@edutechglobal.com","password":"ceo123"}')

CEO_TOKEN=$(echo $CEO_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)
[ ! -z "$CEO_TOKEN" ]
print_test $? "CEO login successful"

# Login as Superadmin
SUPERADMIN_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@erp.com","password":"superadmin123"}')

SUPERADMIN_TOKEN=$(echo $SUPERADMIN_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)
[ ! -z "$SUPERADMIN_TOKEN" ]
print_test $? "Superadmin login successful"

# Login as Operations Admin
OPS_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ops.admin@edutechglobal.com","password":"opsadmin123"}')

OPS_TOKEN=$(echo $OPS_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)
[ ! -z "$OPS_TOKEN" ]
print_test $? "Operations Admin login successful"

# Login as Finance Admin
FINANCE_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"finance.admin@edutechglobal.com","password":"finance123"}')

FINANCE_TOKEN=$(echo $FINANCE_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)
[ ! -z "$FINANCE_TOKEN" ]
print_test $? "Finance Admin login successful"

# Login as HR Admin
HR_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"hr.admin@edutechglobal.com","password":"hradmin123"}')

HR_TOKEN=$(echo $HR_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)
[ ! -z "$HR_TOKEN" ]
print_test $? "HR Admin login successful"

# Test 4: Organization Management (Superadmin)
echo -e "\n${YELLOW}[4/15] Testing Organization Management...${NC}"

# Get organizations
ORGS=$(curl -s -X GET "$API_URL/organizations" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN")
echo $ORGS | grep -q "success"
print_test $? "Fetch organizations"

# Get licenses
LICENSES=$(curl -s -X GET "$API_URL/licenses" \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN")
echo $LICENSES | grep -q "success"
print_test $? "Fetch licenses"

# Test 5: Department Management
echo -e "\n${YELLOW}[5/15] Testing Department Management...${NC}"

# Get departments
DEPTS=$(curl -s -X GET "$API_URL/departments" \
  -H "Authorization: Bearer $CEO_TOKEN")
echo $DEPTS | grep -q "success"
print_test $? "Fetch departments"

# Test 6: User Management
echo -e "\n${YELLOW}[6/15] Testing User Management...${NC}"

# Get users
USERS=$(curl -s -X GET "$API_URL/users" \
  -H "Authorization: Bearer $CEO_TOKEN")
echo $USERS | grep -q "success"
print_test $? "Fetch users"

# Get current user profile
PROFILE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $CEO_TOKEN")
echo $PROFILE | grep -q "success"
print_test $? "Fetch user profile"

# Test 7: Task Management Workflow
echo -e "\n${YELLOW}[7/15] Testing Task Management Workflow...${NC}"

# Get tasks
TASKS=$(curl -s -X GET "$API_URL/tasks" \
  -H "Authorization: Bearer $OPS_TOKEN")
echo $TASKS | grep -q "success"
print_test $? "Fetch tasks"

# Create a task
NEW_TASK=$(curl -s -X POST "$API_URL/tasks" \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task - Workflow Verification",
    "description": "Testing task creation workflow",
    "priority": "high",
    "dueDate": "2026-03-15T00:00:00.000Z"
  }')
echo $NEW_TASK | grep -q "success"
print_test $? "Create task"

TASK_ID=$(echo $NEW_TASK | grep -o '"_id":"[^"]*' | cut -d'"' -f4 | head -1)

# Update task status
if [ ! -z "$TASK_ID" ]; then
  UPDATE_TASK=$(curl -s -X PUT "$API_URL/tasks/$TASK_ID" \
    -H "Authorization: Bearer $OPS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"status": "in_progress"}')
  echo $UPDATE_TASK | grep -q "success"
  print_test $? "Update task status"
fi

# Test 8: HR Workflows
echo -e "\n${YELLOW}[8/15] Testing HR Workflows...${NC}"

# Get vacancies
VACANCIES=$(curl -s -X GET "$API_URL/hr/vacancies" \
  -H "Authorization: Bearer $HR_TOKEN")
echo $VACANCIES | grep -q "success"
print_test $? "Fetch vacancies"

# Get leave requests
LEAVES=$(curl -s -X GET "$API_URL/hr/leaves" \
  -H "Authorization: Bearer $HR_TOKEN")
echo $LEAVES | grep -q "success"
print_test $? "Fetch leave requests"

# Get attendance records
ATTENDANCE=$(curl -s -X GET "$API_URL/hr/attendance" \
  -H "Authorization: Bearer $HR_TOKEN")
echo $ATTENDANCE | grep -q "success"
print_test $? "Fetch attendance records"

# Get holidays
HOLIDAYS=$(curl -s -X GET "$API_URL/hr/holidays" \
  -H "Authorization: Bearer $HR_TOKEN")
echo $HOLIDAYS | grep -q "success"
print_test $? "Fetch holidays"

# Get complaints
COMPLAINTS=$(curl -s -X GET "$API_URL/hr/complaints" \
  -H "Authorization: Bearer $HR_TOKEN")
echo $COMPLAINTS | grep -q "success"
print_test $? "Fetch complaints"

# Test 9: Operations Workflows
echo -e "\n${YELLOW}[9/15] Testing Operations Workflows...${NC}"

# Get universities
UNIVERSITIES=$(curl -s -X GET "$API_URL/operations/universities" \
  -H "Authorization: Bearer $OPS_TOKEN")
echo $UNIVERSITIES | grep -q "success"
print_test $? "Fetch universities"

# Get programs
PROGRAMS=$(curl -s -X GET "$API_URL/operations/programs" \
  -H "Authorization: Bearer $OPS_TOKEN")
echo $PROGRAMS | grep -q "success"
print_test $? "Fetch programs"

# Get study centers
CENTERS=$(curl -s -X GET "$API_URL/operations/centers" \
  -H "Authorization: Bearer $OPS_TOKEN")
echo $CENTERS | grep -q "success"
print_test $? "Fetch study centers"

# Get admission sessions
SESSIONS=$(curl -s -X GET "$API_URL/operations/sessions" \
  -H "Authorization: Bearer $OPS_TOKEN")
echo $SESSIONS | grep -q "success"
print_test $? "Fetch admission sessions"

# Get internal marks
MARKS=$(curl -s -X GET "$API_URL/operations/marks" \
  -H "Authorization: Bearer $OPS_TOKEN")
echo $MARKS | grep -q "success"
print_test $? "Fetch internal marks"

# Get announcements
ANNOUNCEMENTS=$(curl -s -X GET "$API_URL/operations/announcements" \
  -H "Authorization: Bearer $OPS_TOKEN")
echo $ANNOUNCEMENTS | grep -q "success"
print_test $? "Fetch announcements"

# Test 10: Finance Workflows
echo -e "\n${YELLOW}[10/15] Testing Finance Workflows...${NC}"

# Get invoices
INVOICES=$(curl -s -X GET "$API_URL/finance/invoices" \
  -H "Authorization: Bearer $FINANCE_TOKEN")
echo $INVOICES | grep -q "success"
print_test $? "Fetch invoices"

# Get payments
PAYMENTS=$(curl -s -X GET "$API_URL/finance/payments" \
  -H "Authorization: Bearer $FINANCE_TOKEN")
echo $PAYMENTS | grep -q "success"
print_test $? "Fetch payments"

# Get expense claims
EXPENSES=$(curl -s -X GET "$API_URL/finance/expenses" \
  -H "Authorization: Bearer $FINANCE_TOKEN")
echo $EXPENSES | grep -q "success"
print_test $? "Fetch expense claims"

# Get targets
TARGETS=$(curl -s -X GET "$API_URL/finance/targets" \
  -H "Authorization: Bearer $FINANCE_TOKEN")
echo $TARGETS | grep -q "success"
print_test $? "Fetch targets"

# Get fee structures
FEES=$(curl -s -X GET "$API_URL/finance/fees" \
  -H "Authorization: Bearer $FINANCE_TOKEN")
echo $FEES | grep -q "success"
print_test $? "Fetch fee structures"

# Test 11: Sales Workflows
echo -e "\n${YELLOW}[11/15] Testing Sales Workflows...${NC}"

# Get leads
LEADS=$(curl -s -X GET "$API_URL/sales/leads" \
  -H "Authorization: Bearer $OPS_TOKEN")
echo $LEADS | grep -q "success"
print_test $? "Fetch leads"

# Test 12: Student Management
echo -e "\n${YELLOW}[12/15] Testing Student Management...${NC}"

# Get students
STUDENTS=$(curl -s -X GET "$API_URL/students" \
  -H "Authorization: Bearer $OPS_TOKEN")
echo $STUDENTS | grep -q "success"
print_test $? "Fetch students"

# Test 13: Dashboard & Metrics
echo -e "\n${YELLOW}[13/15] Testing Dashboard & Metrics...${NC}"

# Get dashboard metrics
METRICS=$(curl -s -X GET "$API_URL/dashboard/metrics" \
  -H "Authorization: Bearer $CEO_TOKEN")
echo $METRICS | grep -q "success"
print_test $? "Fetch dashboard metrics"

# Test 14: Escalation System
echo -e "\n${YELLOW}[14/15] Testing Escalation System...${NC}"

# Get escalations
ESCALATIONS=$(curl -s -X GET "$API_URL/escalations" \
  -H "Authorization: Bearer $CEO_TOKEN")
echo $ESCALATIONS | grep -q "success"
print_test $? "Fetch escalations"

# Test 15: Authorization & Security
echo -e "\n${YELLOW}[15/15] Testing Authorization & Security...${NC}"

# Test unauthorized access (no token)
UNAUTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/users")
[ "$UNAUTH" = "401" ]
print_test $? "Unauthorized access blocked"

# Test invalid token
INVALID=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/users" \
  -H "Authorization: Bearer invalid_token_12345")
[ "$INVALID" = "401" ]
print_test $? "Invalid token rejected"

# Summary
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}║   📊 Test Results Summary                                ║${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}║   Total Tests: ${TOTAL_TESTS}                                        ║${NC}"
echo -e "${BLUE}║   ${GREEN}Passed: ${PASSED_TESTS}${BLUE}                                           ║${NC}"
echo -e "${BLUE}║   ${RED}Failed: ${FAILED_TESTS}${BLUE}                                            ║${NC}"
echo -e "${BLUE}║                                                           ║${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${BLUE}║   ${GREEN}✓ All workflows working correctly!${BLUE}                   ║${NC}"
else
    echo -e "${BLUE}║   ${RED}✗ Some tests failed - check logs above${BLUE}               ║${NC}"
fi

echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    exit 0
else
    exit 1
fi
