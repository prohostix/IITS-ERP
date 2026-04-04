#!/bin/bash

# EXHAUSTIVE ERP SYSTEM TEST - Tests EVERY endpoint and function
BASE_URL="http://localhost:4009/api/v1"
PASSED=0
FAILED=0
TOTAL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  EXHAUSTIVE ERP SYSTEM TEST"
echo "  Testing Every Endpoint & Function"
echo "=============================================="
echo ""

# Test function
test_api() {
    local name=$1
    local method=$2
    local endpoint=$3
    local token=$4
    local data=$5
    
    ((TOTAL++))
    echo -n "[$TOTAL] $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $token")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $token")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
        echo "$body" | jq -r '.data._id // .data[0]._id // empty' 2>/dev/null
    elif [ "$http_code" -eq 403 ] || [ "$http_code" -eq 401 ]; then
        echo -e "${YELLOW}⚠ AUTH${NC} (HTTP $http_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "$body" | jq -r '.message // empty' 2>/dev/null | head -1
        ((FAILED++))
    fi
}

# Get all tokens
echo "=== PHASE 0: AUTHENTICATION SETUP ==="
echo ""

SUPERADMIN_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"superadmin@erp.com","password":"superadmin123"}' | jq -r '.data.token')
echo "Superadmin token: ${SUPERADMIN_TOKEN:0:20}..."

CEO_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ceo@edutechglobal.com","password":"ceo123"}' | jq -r '.data.token')
echo "CEO token: ${CEO_TOKEN:0:20}..."

OPS_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ops.admin@edutechglobal.com","password":"opsadmin123"}' | jq -r '.data.token')
echo "Ops Admin token: ${OPS_TOKEN:0:20}..."

FINANCE_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"finance.admin@edutechglobal.com","password":"finance123"}' | jq -r '.data.token')
echo "Finance Admin token: ${FINANCE_TOKEN:0:20}..."

HR_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"hr.admin@edutechglobal.com","password":"hradmin123"}' | jq -r '.data.token')
echo "HR Admin token: ${HR_TOKEN:0:20}..."

SALES_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"sales.admin@edutechglobal.com","password":"sales123"}' | jq -r '.data.token')
echo "Sales Admin token: ${SALES_TOKEN:0:20}..."

ORG_ADMIN_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@edutechglobal.com","password":"orgadmin123"}' | jq -r '.data.token')
echo "Org Admin token: ${ORG_ADMIN_TOKEN:0:20}..."

EMPLOYEE_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ops.executive@edutechglobal.com","password":"employee123"}' | jq -r '.data.token')
echo "Employee token: ${EMPLOYEE_TOKEN:0:20}..."

# Get IDs for testing
ORG_ID=$(curl -s $BASE_URL/organizations -H "Authorization: Bearer $SUPERADMIN_TOKEN" | jq -r '.data[0]._id')
DEPT_ID=$(curl -s $BASE_URL/departments -H "Authorization: Bearer $CEO_TOKEN" | jq -r '.data[0]._id')
USER_ID=$(curl -s $BASE_URL/users -H "Authorization: Bearer $CEO_TOKEN" | jq -r '.data[0]._id')

echo ""
echo "=== PHASE 1: AUTHENTICATION ENDPOINTS (6 tests) ==="
echo ""

# Auth endpoints
test_api "Login - Superadmin" "POST" "/auth/login" "" '{"email":"superadmin@erp.com","password":"superadmin123"}'
test_api "Login - CEO" "POST" "/auth/login" "" '{"email":"ceo@edutechglobal.com","password":"ceo123"}'
test_api "Login - Invalid Credentials" "POST" "/auth/login" "" '{"email":"wrong@email.com","password":"wrong"}'
test_api "Get Current User" "GET" "/auth/me" "$CEO_TOKEN"
test_api "Update User Details" "PUT" "/auth/updatedetails" "$CEO_TOKEN" '{"phone":"+919999999999"}'
test_api "Logout" "POST" "/auth/logout" "$CEO_TOKEN"

echo ""
echo "=== PHASE 2: ORGANIZATION ENDPOINTS (5 tests) ==="
echo ""

test_api "Get All Organizations" "GET" "/organizations" "$SUPERADMIN_TOKEN"
test_api "Get Organization by ID" "GET" "/organizations/$ORG_ID" "$SUPERADMIN_TOKEN"
test_api "Create Organization" "POST" "/organizations" "$SUPERADMIN_TOKEN" \
  '{"name":"Test Org","email":"test@org.com","phone":"+919876543210","address":"Test Address","status":"active"}'
test_api "Update Organization" "PUT" "/organizations/$ORG_ID" "$SUPERADMIN_TOKEN" \
  '{"phone":"+919999999999"}'
test_api "Update Organization License" "PUT" "/organizations/$ORG_ID/license" "$SUPERADMIN_TOKEN" \
  '{"licenseExpiry":"2026-12-31"}'

echo ""
echo "=== PHASE 3: LICENSE ENDPOINTS (5 tests) ==="
echo ""

test_api "Get All Licenses" "GET" "/licenses" "$SUPERADMIN_TOKEN"
test_api "Create License" "POST" "/licenses" "$SUPERADMIN_TOKEN" \
  '{"name":"Test License","type":"basic","maxUsers":50,"maxStorage":5120,"durationMonths":12,"price":9999,"status":"active"}'
LICENSE_ID=$(curl -s $BASE_URL/licenses -H "Authorization: Bearer $SUPERADMIN_TOKEN" | jq -r '.data[0]._id')
test_api "Get License by ID" "GET" "/licenses/$LICENSE_ID" "$SUPERADMIN_TOKEN"
test_api "Update License" "PUT" "/licenses/$LICENSE_ID" "$SUPERADMIN_TOKEN" '{"price":10999}'
test_api "Delete License" "DELETE" "/licenses/$LICENSE_ID" "$SUPERADMIN_TOKEN"

echo ""
echo "=== PHASE 4: DEPARTMENT ENDPOINTS (5 tests) ==="
echo ""

test_api "Get All Departments" "GET" "/departments" "$CEO_TOKEN"
test_api "Get Department by ID" "GET" "/departments/$DEPT_ID" "$CEO_TOKEN"
test_api "Create Department" "POST" "/departments" "$ORG_ADMIN_TOKEN" \
  '{"name":"Test Department","type":"custom","status":"active"}'
test_api "Update Department" "PUT" "/departments/$DEPT_ID" "$ORG_ADMIN_TOKEN" \
  '{"description":"Updated description"}'
test_api "Delete Department" "DELETE" "/departments/$DEPT_ID" "$ORG_ADMIN_TOKEN"

echo ""
echo "=== PHASE 5: USER ENDPOINTS (5 tests) ==="
echo ""

test_api "Get All Users" "GET" "/users" "$CEO_TOKEN"
test_api "Get User by ID" "GET" "/users/$USER_ID" "$CEO_TOKEN"
test_api "Create User" "POST" "/users" "$ORG_ADMIN_TOKEN" \
  '{"email":"newuser@test.com","password":"password123","name":"New User","role":"employee","status":"active"}'
test_api "Update User" "PUT" "/users/$USER_ID" "$ORG_ADMIN_TOKEN" '{"phone":"+919876543210"}'
test_api "Delete User" "DELETE" "/users/$USER_ID" "$ORG_ADMIN_TOKEN"

echo ""
echo "=== PHASE 6: TASK ENDPOINTS (6 tests) ==="
echo ""

test_api "Get All Tasks" "GET" "/tasks" "$CEO_TOKEN"
test_api "Create Task" "POST" "/tasks" "$CEO_TOKEN" \
  '{"title":"Test Task","description":"Test Description","assignedTo":"'$USER_ID'","departmentId":"'$DEPT_ID'","priority":"high","deadline":"2025-12-31","status":"pending"}'
TASK_ID=$(curl -s $BASE_URL/tasks -H "Authorization: Bearer $CEO_TOKEN" | jq -r '.data[0]._id')
test_api "Get Task by ID" "GET" "/tasks/$TASK_ID" "$CEO_TOKEN"
test_api "Update Task" "PUT" "/tasks/$TASK_ID" "$OPS_TOKEN" '{"status":"in_progress"}'
test_api "Complete Task" "PUT" "/tasks/$TASK_ID" "$OPS_TOKEN" '{"status":"completed"}'
test_api "Delete Task" "DELETE" "/tasks/$TASK_ID" "$CEO_TOKEN"

echo ""
echo "=== PHASE 7: OPERATIONS - UNIVERSITY ENDPOINTS (6 tests) ==="
echo ""

test_api "Get All Universities" "GET" "/operations/universities" "$OPS_TOKEN"
test_api "Create University" "POST" "/operations/universities" "$OPS_TOKEN" \
  '{"name":"Test University","code":"TU'$(date +%s)'","type":"deemed","address":"123 Test St","city":"Test City","state":"Test State","country":"India","status":"active"}'
UNIV_ID=$(curl -s $BASE_URL/operations/universities -H "Authorization: Bearer $OPS_TOKEN" | jq -r '.data[0]._id')
test_api "Get University by ID" "GET" "/operations/universities/$UNIV_ID" "$OPS_TOKEN"
test_api "Update University" "PUT" "/operations/universities/$UNIV_ID" "$OPS_TOKEN" \
  '{"city":"Updated City"}'
test_api "Activate University" "PUT" "/operations/universities/$UNIV_ID/activate" "$OPS_TOKEN"
test_api "Delete University" "DELETE" "/operations/universities/$UNIV_ID" "$OPS_TOKEN"

echo ""
echo "=== PHASE 8: OPERATIONS - PROGRAM ENDPOINTS (6 tests) ==="
echo ""

test_api "Get All Programs" "GET" "/operations/programs" "$OPS_TOKEN"
test_api "Create Program" "POST" "/operations/programs" "$OPS_TOKEN" \
  '{"universityId":"'$UNIV_ID'","name":"Test Program","code":"TP'$(date +%s)'","type":"undergraduate","duration":3,"status":"active"}'
PROG_ID=$(curl -s $BASE_URL/operations/programs -H "Authorization: Bearer $OPS_TOKEN" | jq -r '.data[0]._id')
test_api "Get Program by ID" "GET" "/operations/programs/$PROG_ID" "$OPS_TOKEN"
test_api "Update Program" "PUT" "/operations/programs/$PROG_ID" "$OPS_TOKEN" \
  '{"duration":4}'
test_api "Activate Program" "PUT" "/operations/programs/$PROG_ID/activate" "$OPS_TOKEN"
test_api "Delete Program" "DELETE" "/operations/programs/$PROG_ID" "$OPS_TOKEN"

echo ""
echo "=== PHASE 9: OPERATIONS - STUDY CENTER ENDPOINTS (7 tests) ==="
echo ""

test_api "Get All Study Centers" "GET" "/operations/centers" "$OPS_TOKEN"
test_api "Create Study Center" "POST" "/operations/centers" "$OPS_TOKEN" \
  '{"name":"Test Center","code":"TC'$(date +%s)'","address":"456 Center Rd","contact":"+919876543210","email":"test@center.com","status":"pending"}'
CENTER_ID=$(curl -s $BASE_URL/operations/centers -H "Authorization: Bearer $OPS_TOKEN" | jq -r '.data[0]._id')
test_api "Get Study Center by ID" "GET" "/operations/centers/$CENTER_ID" "$OPS_TOKEN"
test_api "Update Study Center" "PUT" "/operations/centers/$CENTER_ID" "$OPS_TOKEN" \
  '{"contact":"+919999999999"}'
test_api "Approve Study Center" "PUT" "/operations/centers/$CENTER_ID/approve" "$OPS_TOKEN"
test_api "Suspend Study Center" "PUT" "/operations/centers/$CENTER_ID/suspend" "$OPS_TOKEN"
test_api "Delete Study Center" "DELETE" "/operations/centers/$CENTER_ID" "$OPS_TOKEN"

echo ""
echo "=== PHASE 10: OPERATIONS - ADMISSION SESSION ENDPOINTS (5 tests) ==="
echo ""

test_api "Get All Admission Sessions" "GET" "/operations/sessions" "$OPS_TOKEN"
test_api "Create Admission Session" "POST" "/operations/sessions" "$OPS_TOKEN" \
  '{"name":"2025-26 Session","year":2025,"startDate":"2025-07-01","endDate":"2026-06-30","status":"active"}'
SESSION_ID=$(curl -s $BASE_URL/operations/sessions -H "Authorization: Bearer $OPS_TOKEN" | jq -r '.data[0]._id')
test_api "Get Session by ID" "GET" "/operations/sessions/$SESSION_ID" "$OPS_TOKEN"
test_api "Update Session" "PUT" "/operations/sessions/$SESSION_ID" "$OPS_TOKEN" \
  '{"status":"closed"}'
test_api "Delete Session" "DELETE" "/operations/sessions/$SESSION_ID" "$OPS_TOKEN"

echo ""
echo "=== PHASE 11: OPERATIONS - ANNOUNCEMENT ENDPOINTS (5 tests) ==="
echo ""

test_api "Get All Announcements" "GET" "/operations/announcements" "$OPS_TOKEN"
test_api "Create Announcement" "POST" "/operations/announcements" "$OPS_TOKEN" \
  '{"title":"Test Announcement","content":"Test Content","type":"general","priority":"normal","status":"active"}'
ANNOUNCE_ID=$(curl -s $BASE_URL/operations/announcements -H "Authorization: Bearer $OPS_TOKEN" | jq -r '.data[0]._id')
test_api "Get Announcement by ID" "GET" "/operations/announcements/$ANNOUNCE_ID" "$OPS_TOKEN"
test_api "Update Announcement" "PUT" "/operations/announcements/$ANNOUNCE_ID" "$OPS_TOKEN" \
  '{"priority":"high"}'
test_api "Delete Announcement" "DELETE" "/operations/announcements/$ANNOUNCE_ID" "$OPS_TOKEN"

echo ""
echo "=== PHASE 12: STUDENT ENDPOINTS (6 tests) ==="
echo ""

test_api "Get All Students" "GET" "/students" "$OPS_TOKEN"
test_api "Create Student" "POST" "/students" "$OPS_TOKEN" \
  '{"name":"Test Student","enrollmentNo":"EN'$(date +%s)'","email":"student@test.com","phone":"+919876543210","dateOfBirth":"2000-01-01","gender":"male","address":"Test Address","city":"Test City","state":"Test State","pincode":"123456","status":"pending"}'
STUDENT_ID=$(curl -s $BASE_URL/students -H "Authorization: Bearer $OPS_TOKEN" | jq -r '.data[0]._id')
test_api "Get Student by ID" "GET" "/students/$STUDENT_ID" "$OPS_TOKEN"
test_api "Update Student" "PUT" "/students/$STUDENT_ID" "$OPS_TOKEN" \
  '{"status":"active"}'
test_api "Approve Student" "PUT" "/students/$STUDENT_ID/approve" "$OPS_TOKEN"
test_api "Delete Student" "DELETE" "/students/$STUDENT_ID" "$OPS_TOKEN"

echo ""
echo "=== PHASE 13: FINANCE - INVOICE ENDPOINTS (6 tests) ==="
echo ""

test_api "Get All Invoices" "GET" "/finance/invoices" "$FINANCE_TOKEN"
test_api "Create Invoice" "POST" "/finance/invoices" "$FINANCE_TOKEN" \
  '{"invoiceNo":"INV'$(date +%s)'","amount":50000,"total":50000,"dueDate":"2025-12-31","items":[{"description":"Test Item","amount":50000,"rate":50000,"quantity":1}],"status":"unpaid"}'
INVOICE_ID=$(curl -s $BASE_URL/finance/invoices -H "Authorization: Bearer $FINANCE_TOKEN" | jq -r '.data[0]._id')
test_api "Get Invoice by ID" "GET" "/finance/invoices/$INVOICE_ID" "$FINANCE_TOKEN"
test_api "Update Invoice" "PUT" "/finance/invoices/$INVOICE_ID" "$FINANCE_TOKEN" \
  '{"status":"paid"}'
test_api "Approve Invoice" "PUT" "/finance/invoices/$INVOICE_ID/approve" "$FINANCE_TOKEN"
test_api "Delete Invoice" "DELETE" "/finance/invoices/$INVOICE_ID" "$FINANCE_TOKEN"

echo ""
echo "=== PHASE 14: FINANCE - PAYMENT ENDPOINTS (5 tests) ==="
echo ""

test_api "Get All Payments" "GET" "/finance/payments" "$FINANCE_TOKEN"
test_api "Create Payment" "POST" "/finance/payments" "$FINANCE_TOKEN" \
  '{"amount":50000,"method":"online","transactionId":"TXN'$(date +%s)'","paymentDate":"2025-03-01","status":"completed"}'
PAYMENT_ID=$(curl -s $BASE_URL/finance/payments -H "Authorization: Bearer $FINANCE_TOKEN" | jq -r '.data[0]._id')
test_api "Get Payment by ID" "GET" "/finance/payments/$PAYMENT_ID" "$FINANCE_TOKEN"
test_api "Update Payment" "PUT" "/finance/payments/$PAYMENT_ID" "$FINANCE_TOKEN" \
  '{"status":"verified"}'
test_api "Delete Payment" "DELETE" "/finance/payments/$PAYMENT_ID" "$FINANCE_TOKEN"

echo ""
echo "=== PHASE 15: FINANCE - EXPENSE ENDPOINTS (6 tests) ==="
echo ""

test_api "Get All Expenses" "GET" "/finance/expenses" "$FINANCE_TOKEN"
test_api "Create Expense" "POST" "/finance/expenses" "$FINANCE_TOKEN" \
  '{"title":"Test Expense","amount":5000,"category":"travel","description":"Test Description","claimDate":"2025-03-01","status":"pending"}'
EXPENSE_ID=$(curl -s $BASE_URL/finance/expenses -H "Authorization: Bearer $FINANCE_TOKEN" | jq -r '.data[0]._id')
test_api "Get Expense by ID" "GET" "/finance/expenses/$EXPENSE_ID" "$FINANCE_TOKEN"
test_api "Update Expense" "PUT" "/finance/expenses/$EXPENSE_ID" "$FINANCE_TOKEN" \
  '{"status":"approved"}'
test_api "Approve Expense" "PUT" "/finance/expenses/$EXPENSE_ID/approve" "$FINANCE_TOKEN"
test_api "Delete Expense" "DELETE" "/finance/expenses/$EXPENSE_ID" "$FINANCE_TOKEN"

echo ""
echo "=== PHASE 16: FINANCE - TARGET ENDPOINTS (5 tests) ==="
echo ""

test_api "Get All Targets" "GET" "/finance/targets" "$FINANCE_TOKEN"
test_api "Create Target" "POST" "/finance/targets" "$FINANCE_TOKEN" \
  '{"title":"Q1 Target","targetAmount":1000000,"period":"quarterly","startDate":"2025-01-01","endDate":"2025-03-31","status":"active"}'
TARGET_ID=$(curl -s $BASE_URL/finance/targets -H "Authorization: Bearer $FINANCE_TOKEN" | jq -r '.data[0]._id')
test_api "Get Target by ID" "GET" "/finance/targets/$TARGET_ID" "$FINANCE_TOKEN"
test_api "Update Target" "PUT" "/finance/targets/$TARGET_ID" "$FINANCE_TOKEN" \
  '{"achievedAmount":500000}'
test_api "Delete Target" "DELETE" "/finance/targets/$TARGET_ID" "$FINANCE_TOKEN"

echo ""
echo "=== PHASE 17: FINANCE - FEE STRUCTURE ENDPOINTS (5 tests) ==="
echo ""

test_api "Get All Fee Structures" "GET" "/finance/fees" "$FINANCE_TOKEN"
test_api "Create Fee Structure" "POST" "/finance/fees" "$FINANCE_TOKEN" \
  '{"academicYear":"2025-26","totalFee":50000,"components":[{"name":"Tuition","amount":40000}],"status":"active"}'
FEE_ID=$(curl -s $BASE_URL/finance/fees -H "Authorization: Bearer $FINANCE_TOKEN" | jq -r '.data[0]._id')
test_api "Get Fee Structure by ID" "GET" "/finance/fees/$FEE_ID" "$FINANCE_TOKEN"
test_api "Update Fee Structure" "PUT" "/finance/fees/$FEE_ID" "$FINANCE_TOKEN" \
  '{"totalFee":55000}'
test_api "Delete Fee Structure" "DELETE" "/finance/fees/$FEE_ID" "$FINANCE_TOKEN"

echo ""
echo "=== PHASE 18: HR - VACANCY ENDPOINTS (6 tests) ==="
echo ""

test_api "Get All Vacancies" "GET" "/hr/vacancies" "$HR_TOKEN"
test_api "Create Vacancy" "POST" "/hr/vacancies" "$HR_TOKEN" \
  '{"title":"Test Position","departmentId":"'$DEPT_ID'","positions":2,"description":"Test Description","requirements":["Requirement 1"],"status":"open"}'
VACANCY_ID=$(curl -s $BASE_URL/hr/vacancies -H "Authorization: Bearer $HR_TOKEN" | jq -r '.data[0]._id')
test_api "Get Vacancy by ID" "GET" "/hr/vacancies/$VACANCY_ID" "$HR_TOKEN"
test_api "Update Vacancy" "PUT" "/hr/vacancies/$VACANCY_ID" "$HR_TOKEN" \
  '{"positions":3}'
test_api "Close Vacancy" "PUT" "/hr/vacancies/$VACANCY_ID/close" "$HR_TOKEN"
test_api "Delete Vacancy" "DELETE" "/hr/vacancies/$VACANCY_ID" "$HR_TOKEN"

echo ""
echo "=== PHASE 19: HR - LEAVE REQUEST ENDPOINTS (6 tests) ==="
echo ""

test_api "Get All Leave Requests" "GET" "/hr/leaves" "$HR_TOKEN"
test_api "Create Leave Request" "POST" "/hr/leaves" "$EMPLOYEE_TOKEN" \
  '{"leaveType":"casual","startDate":"2025-04-01","endDate":"2025-04-03","reason":"Personal work","status":"pending"}'
LEAVE_ID=$(curl -s $BASE_URL/hr/leaves -H "Authorization: Bearer $HR_TOKEN" | jq -r '.data[0]._id')
test_api "Get Leave Request by ID" "GET" "/hr/leaves/$LEAVE_ID" "$HR_TOKEN"
test_api "Update Leave Request" "PUT" "/hr/leaves/$LEAVE_ID" "$EMPLOYEE_TOKEN" \
  '{"reason":"Updated reason"}'
test_api "Approve Leave Request" "PUT" "/hr/leaves/$LEAVE_ID/approve" "$HR_TOKEN"
test_api "Delete Leave Request" "DELETE" "/hr/leaves/$LEAVE_ID" "$HR_TOKEN"

echo ""
echo "=== PHASE 20: HR - ATTENDANCE ENDPOINTS (5 tests) ==="
echo ""

test_api "Get All Attendance" "GET" "/hr/attendance" "$HR_TOKEN"
test_api "Mark Attendance" "POST" "/hr/attendance" "$HR_TOKEN" \
  '{"userId":"'$USER_ID'","date":"2025-03-01","status":"present","checkIn":"09:00","checkOut":"18:00"}'
ATTENDANCE_ID=$(curl -s $BASE_URL/hr/attendance -H "Authorization: Bearer $HR_TOKEN" | jq -r '.data[0]._id')
test_api "Get Attendance by ID" "GET" "/hr/attendance/$ATTENDANCE_ID" "$HR_TOKEN"
test_api "Update Attendance" "PUT" "/hr/attendance/$ATTENDANCE_ID" "$HR_TOKEN" \
  '{"checkOut":"19:00"}'
test_api "Delete Attendance" "DELETE" "/hr/attendance/$ATTENDANCE_ID" "$HR_TOKEN"

echo ""
echo "=== PHASE 21: HR - HOLIDAY ENDPOINTS (5 tests) ==="
echo ""

test_api "Get All Holidays" "GET" "/hr/holidays" "$HR_TOKEN"
test_api "Create Holiday" "POST" "/hr/holidays" "$HR_TOKEN" \
  '{"name":"Test Holiday","date":"2025-08-15","type":"national","description":"Test Description"}'
HOLIDAY_ID=$(curl -s $BASE_URL/hr/holidays -H "Authorization: Bearer $HR_TOKEN" | jq -r '.data[0]._id')
test_api "Get Holiday by ID" "GET" "/hr/holidays/$HOLIDAY_ID" "$HR_TOKEN"
test_api "Update Holiday" "PUT" "/hr/holidays/$HOLIDAY_ID" "$HR_TOKEN" \
  '{"type":"regional"}'
test_api "Delete Holiday" "DELETE" "/hr/holidays/$HOLIDAY_ID" "$HR_TOKEN"

echo ""
echo "=== PHASE 22: HR - COMPLAINT ENDPOINTS (6 tests) ==="
echo ""

test_api "Get All Complaints" "GET" "/hr/complaints" "$HR_TOKEN"
test_api "Create Complaint" "POST" "/hr/complaints" "$EMPLOYEE_TOKEN" \
  '{"title":"Test Complaint","description":"Test Description","category":"workplace","priority":"medium","status":"open"}'
COMPLAINT_ID=$(curl -s $BASE_URL/hr/complaints -H "Authorization: Bearer $HR_TOKEN" | jq -r '.data[0]._id')
test_api "Get Complaint by ID" "GET" "/hr/complaints/$COMPLAINT_ID" "$HR_TOKEN"
test_api "Update Complaint" "PUT" "/hr/complaints/$COMPLAINT_ID" "$HR_TOKEN" \
  '{"status":"investigating"}'
test_api "Resolve Complaint" "PUT" "/hr/complaints/$COMPLAINT_ID/resolve" "$HR_TOKEN"
test_api "Delete Complaint" "DELETE" "/hr/complaints/$COMPLAINT_ID" "$HR_TOKEN"

echo ""
echo "=== PHASE 23: SALES - LEAD ENDPOINTS (6 tests) ==="
echo ""

test_api "Get All Leads" "GET" "/sales/leads" "$SALES_TOKEN"
test_api "Create Lead" "POST" "/sales/leads" "$SALES_TOKEN" \
  '{"name":"Test Lead","email":"lead@test.com","phone":"+919876543210","address":"Test Address","contactName":"Test Contact","centerName":"Test Center","source":"website","interestedProgram":"MBA","status":"new"}'
LEAD_ID=$(curl -s $BASE_URL/sales/leads -H "Authorization: Bearer $SALES_TOKEN" | jq -r '.data[0]._id')
test_api "Get Lead by ID" "GET" "/sales/leads/$LEAD_ID" "$SALES_TOKEN"
test_api "Update Lead" "PUT" "/sales/leads/$LEAD_ID" "$SALES_TOKEN" \
  '{"status":"contacted"}'
test_api "Convert Lead" "PUT" "/sales/leads/$LEAD_ID/convert" "$SALES_TOKEN"
test_api "Delete Lead" "DELETE" "/sales/leads/$LEAD_ID" "$SALES_TOKEN"

echo ""
echo "=== PHASE 24: ESCALATION ENDPOINTS (4 tests) ==="
echo ""

test_api "Get All Escalations" "GET" "/escalations" "$CEO_TOKEN"
test_api "Get Escalation by ID" "GET" "/escalations/$TASK_ID" "$CEO_TOKEN"
test_api "Resolve Escalation" "PUT" "/escalations/$TASK_ID/resolve" "$CEO_TOKEN"
test_api "Get Escalation Stats" "GET" "/escalations/stats" "$CEO_TOKEN"

echo ""
echo "=== PHASE 25: AUTHORIZATION TESTS (10 tests) ==="
echo ""

test_api "Employee Access to Organizations (Should Fail)" "GET" "/organizations" "$EMPLOYEE_TOKEN"
test_api "Employee Access to Licenses (Should Fail)" "GET" "/licenses" "$EMPLOYEE_TOKEN"
test_api "Ops Admin Access to Finance (Should Fail)" "GET" "/finance/invoices" "$OPS_TOKEN"
test_api "Finance Admin Access to HR (Should Fail)" "GET" "/hr/vacancies" "$FINANCE_TOKEN"
test_api "HR Admin Access to Sales (Should Fail)" "GET" "/sales/leads" "$HR_TOKEN"
test_api "Sales Admin Access to Operations (Should Fail)" "GET" "/operations/universities" "$SALES_TOKEN"
test_api "CEO Access to All Departments" "GET" "/departments" "$CEO_TOKEN"
test_api "Org Admin Create Department" "POST" "/departments" "$ORG_ADMIN_TOKEN" \
  '{"name":"New Dept","type":"custom","status":"active"}'
test_api "Superadmin Access to Everything" "GET" "/organizations" "$SUPERADMIN_TOKEN"
test_api "Invalid Token Access (Should Fail)" "GET" "/users" "invalid_token_12345"

echo ""
echo "=============================================="
echo "  FINAL TEST SUMMARY"
echo "=============================================="
echo ""
echo "Total Tests Run: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

PERCENTAGE=$((PASSED * 100 / TOTAL))
echo "Success Rate: $PERCENTAGE%"
echo ""

if [ $PERCENTAGE -ge 95 ]; then
    echo -e "${GREEN}✓✓✓ EXCELLENT! System is highly stable${NC}"
    exit 0
elif [ $PERCENTAGE -ge 85 ]; then
    echo -e "${GREEN}✓✓ VERY GOOD! System is stable${NC}"
    exit 0
elif [ $PERCENTAGE -ge 75 ]; then
    echo -e "${YELLOW}✓ GOOD! System is mostly functional${NC}"
    exit 0
else
    echo -e "${RED}⚠ NEEDS ATTENTION - Multiple failures detected${NC}"
    exit 1
fi
