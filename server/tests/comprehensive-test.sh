#!/bin/bash

# Comprehensive ERP System Test Suite
# Tests all major workflows including student admission

BASE_URL="http://localhost:4009/api/v1"
PASSED=0
FAILED=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "======================================"
echo "  COMPREHENSIVE ERP SYSTEM TEST"
echo "======================================"
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local token=$5
    
    echo -n "Testing: $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
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
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
        echo "$body"
    else
        echo -e "${RED}✗ FAIL (HTTP $http_code)${NC}"
        ((FAILED++))
        echo "$body"
    fi
}

echo "=== PHASE 1: AUTHENTICATION TESTS ==="
echo ""

# Test 1: Superadmin Login
echo -n "1. Superadmin Login... "
SUPERADMIN_RESPONSE=$(curl -s http://localhost:4009/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"superadmin@erp.com","password":"superadmin123"}')

if echo "$SUPERADMIN_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    SUPERADMIN_TOKEN=$(echo "$SUPERADMIN_RESPONSE" | jq -r '.data.token')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

# Test 2: CEO Login
echo -n "2. CEO Login... "
CEO_RESPONSE=$(curl -s http://localhost:4009/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"ceo@edutechglobal.com","password":"ceo123"}')

if echo "$CEO_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    CEO_TOKEN=$(echo "$CEO_RESPONSE" | jq -r '.data.token')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

# Test 3: Ops Admin Login
echo -n "3. Ops Admin Login... "
OPS_RESPONSE=$(curl -s http://localhost:4009/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"ops.admin@edutechglobal.com","password":"opsadmin123"}')

if echo "$OPS_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    OPS_TOKEN=$(echo "$OPS_RESPONSE" | jq -r '.data.token')
    OPS_USER_ID=$(echo "$OPS_RESPONSE" | jq -r '.data.user._id')
    ORG_ID=$(echo "$OPS_RESPONSE" | jq -r '.data.user.organizationId._id')
    DEPT_ID=$(echo "$OPS_RESPONSE" | jq -r '.data.user.departmentId._id')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

# Test 4: Finance Admin Login
echo -n "4. Finance Admin Login... "
FINANCE_RESPONSE=$(curl -s http://localhost:4009/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"finance.admin@edutechglobal.com","password":"finance123"}')

if echo "$FINANCE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    FINANCE_TOKEN=$(echo "$FINANCE_RESPONSE" | jq -r '.data.token')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

echo ""
echo "=== PHASE 2: SUPERADMIN OPERATIONS ==="
echo ""

# Test 5: Get Organizations
echo -n "5. Get Organizations... "
ORG_RESPONSE=$(curl -s http://localhost:4009/api/v1/organizations \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN")

if echo "$ORG_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

# Test 6: Get Licenses
echo -n "6. Get Licenses... "
LICENSE_RESPONSE=$(curl -s http://localhost:4009/api/v1/licenses \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN")

if echo "$LICENSE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

echo ""
echo "=== PHASE 3: STUDENT ADMISSION WORKFLOW ==="
echo ""

# Step 1: Create University (Ops Admin)
echo -n "7. Create University... "
UNIVERSITY_DATA='{
  "name": "Test University",
  "code": "TU001",
  "type": "deemed",
  "address": "123 Test Street",
  "city": "Test City",
  "state": "Test State",
  "country": "India",
  "status": "active"
}'

UNIVERSITY_RESPONSE=$(curl -s http://localhost:4009/api/v1/operations/universities \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPS_TOKEN" \
    -d "$UNIVERSITY_DATA")

if echo "$UNIVERSITY_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    UNIVERSITY_ID=$(echo "$UNIVERSITY_RESPONSE" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$UNIVERSITY_RESPONSE"
    ((FAILED++))
fi

# Step 2: Create Program (Ops Admin)
echo -n "8. Create Program... "
PROGRAM_DATA='{
  "universityId": "'$UNIVERSITY_ID'",
  "name": "Bachelor of Computer Applications",
  "code": "BCA",
  "type": "undergraduate",
  "duration": 3,
  "status": "active"
}'

PROGRAM_RESPONSE=$(curl -s http://localhost:4009/api/v1/operations/programs \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPS_TOKEN" \
    -d "$PROGRAM_DATA")

if echo "$PROGRAM_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    PROGRAM_ID=$(echo "$PROGRAM_RESPONSE" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$PROGRAM_RESPONSE"
    ((FAILED++))
fi

# Step 3: Create Study Center (Ops Admin)
echo -n "9. Create Study Center... "
CENTER_DATA='{
  "name": "Test Study Center",
  "code": "TSC001",
  "type": "franchise",
  "address": "456 Center Road",
  "city": "Test City",
  "state": "Test State",
  "contactPerson": "John Doe",
  "contactEmail": "john@testcenter.com",
  "contactPhone": "+919876543210",
  "status": "pending"
}'

CENTER_RESPONSE=$(curl -s http://localhost:4009/api/v1/operations/centers \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPS_TOKEN" \
    -d "$CENTER_DATA")

if echo "$CENTER_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    CENTER_ID=$(echo "$CENTER_RESPONSE" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$CENTER_RESPONSE"
    ((FAILED++))
fi

# Step 4: Approve Study Center (Ops Admin)
echo -n "10. Approve Study Center... "
APPROVE_RESPONSE=$(curl -s -X PUT \
    "http://localhost:4009/api/v1/operations/centers/$CENTER_ID/approve" \
    -H "Authorization: Bearer $OPS_TOKEN")

if echo "$APPROVE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$APPROVE_RESPONSE"
    ((FAILED++))
fi

# Step 5: Create Fee Structure (Finance Admin)
echo -n "11. Create Fee Structure... "
FEE_DATA='{
  "universityId": "'$UNIVERSITY_ID'",
  "programId": "'$PROGRAM_ID'",
  "academicYear": "2025-26",
  "totalFee": 50000,
  "components": [
    {"name": "Tuition Fee", "amount": 40000},
    {"name": "Exam Fee", "amount": 5000},
    {"name": "Library Fee", "amount": 5000}
  ],
  "status": "active"
}'

FEE_RESPONSE=$(curl -s http://localhost:4009/api/v1/finance/fees \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $FINANCE_TOKEN" \
    -d "$FEE_DATA")

if echo "$FEE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    FEE_ID=$(echo "$FEE_RESPONSE" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$FEE_RESPONSE"
    ((FAILED++))
fi

# Step 6: Create Student (Ops Admin)
echo -n "12. Create Student... "
STUDENT_DATA='{
  "firstName": "Rahul",
  "lastName": "Kumar",
  "email": "rahul.kumar@example.com",
  "phone": "+919876543211",
  "dateOfBirth": "2000-05-15",
  "gender": "male",
  "address": "789 Student Lane",
  "city": "Test City",
  "state": "Test State",
  "pincode": "123456",
  "universityId": "'$UNIVERSITY_ID'",
  "programId": "'$PROGRAM_ID'",
  "centerId": "'$CENTER_ID'",
  "admissionYear": 2025,
  "status": "pending"
}'

STUDENT_RESPONSE=$(curl -s http://localhost:4009/api/v1/students \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPS_TOKEN" \
    -d "$STUDENT_DATA")

if echo "$STUDENT_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    STUDENT_ID=$(echo "$STUDENT_RESPONSE" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$STUDENT_RESPONSE"
    ((FAILED++))
fi

# Step 7: Create Invoice for Student (Finance Admin)
echo -n "13. Create Invoice... "
INVOICE_DATA='{
  "studentId": "'$STUDENT_ID'",
  "invoiceNo": "INV-2025-001",
  "amount": 50000,
  "dueDate": "2025-04-30",
  "items": [
    {"description": "Tuition Fee", "amount": 40000},
    {"description": "Exam Fee", "amount": 5000},
    {"description": "Library Fee", "amount": 5000}
  ],
  "status": "pending"
}'

INVOICE_RESPONSE=$(curl -s http://localhost:4009/api/v1/finance/invoices \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $FINANCE_TOKEN" \
    -d "$INVOICE_DATA")

if echo "$INVOICE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    INVOICE_ID=$(echo "$INVOICE_RESPONSE" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$INVOICE_RESPONSE"
    ((FAILED++))
fi

# Step 8: Record Payment (Finance Admin)
echo -n "14. Record Payment... "
PAYMENT_DATA='{
  "invoiceId": "'$INVOICE_ID'",
  "studentId": "'$STUDENT_ID'",
  "amount": 50000,
  "paymentMethod": "online",
  "transactionId": "TXN123456789",
  "paymentDate": "2025-03-01",
  "status": "completed"
}'

PAYMENT_RESPONSE=$(curl -s http://localhost:4009/api/v1/finance/payments \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $FINANCE_TOKEN" \
    -d "$PAYMENT_DATA")

if echo "$PAYMENT_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$PAYMENT_RESPONSE"
    ((FAILED++))
fi

# Step 9: Approve Student Admission (Ops Admin)
echo -n "15. Approve Student Admission... "
APPROVE_STUDENT=$(curl -s -X PUT \
    "http://localhost:4009/api/v1/students/$STUDENT_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPS_TOKEN" \
    -d '{"status": "active"}')

if echo "$APPROVE_STUDENT" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$APPROVE_STUDENT"
    ((FAILED++))
fi

# Step 10: Verify Student is Active
echo -n "16. Verify Student Status... "
VERIFY_STUDENT=$(curl -s "http://localhost:4009/api/v1/students/$STUDENT_ID" \
    -H "Authorization: Bearer $OPS_TOKEN")

if echo "$VERIFY_STUDENT" | grep -q '"status":"active"'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$VERIFY_STUDENT"
    ((FAILED++))
fi

echo ""
echo "=== PHASE 4: TASK MANAGEMENT WORKFLOW ==="
echo ""

# Test 17: Create Task
echo -n "17. Create Task... "
TASK_DATA='{
  "title": "Review Student Documents",
  "description": "Review and verify all submitted documents",
  "assignedTo": "'$OPS_USER_ID'",
  "departmentId": "'$DEPT_ID'",
  "priority": "high",
  "dueDate": "2025-03-15",
  "status": "pending"
}'

TASK_RESPONSE=$(curl -s http://localhost:4009/api/v1/tasks \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CEO_TOKEN" \
    -d "$TASK_DATA")

if echo "$TASK_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$TASK_RESPONSE"
    ((FAILED++))
fi

# Test 18: Update Task Status
echo -n "18. Update Task to In Progress... "
UPDATE_TASK=$(curl -s -X PUT \
    "http://localhost:4009/api/v1/tasks/$TASK_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPS_TOKEN" \
    -d '{"status": "in_progress"}')

if echo "$UPDATE_TASK" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$UPDATE_TASK"
    ((FAILED++))
fi

# Test 19: Complete Task
echo -n "19. Complete Task... "
COMPLETE_TASK=$(curl -s -X PUT \
    "http://localhost:4009/api/v1/tasks/$TASK_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPS_TOKEN" \
    -d '{"status": "completed"}')

if echo "$COMPLETE_TASK" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$COMPLETE_TASK"
    ((FAILED++))
fi

echo ""
echo "=== PHASE 5: HR WORKFLOW ==="
echo ""

# Test 20: Create Vacancy
echo -n "20. Create Vacancy... "
VACANCY_DATA='{
  "title": "Assistant Professor",
  "departmentId": "'$DEPT_ID'",
  "positions": 2,
  "description": "Teaching position for Computer Science",
  "requirements": ["PhD in CS", "5 years experience"],
  "status": "open"
}'

VACANCY_RESPONSE=$(curl -s http://localhost:4009/api/v1/hr/vacancies \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CEO_TOKEN" \
    -d "$VACANCY_DATA")

if echo "$VACANCY_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$VACANCY_RESPONSE"
    ((FAILED++))
fi

echo ""
echo "=== PHASE 6: SALES & CRM WORKFLOW ==="
echo ""

# Test 21: Create Lead
echo -n "21. Create Lead... "
LEAD_DATA='{
  "name": "Priya Sharma",
  "email": "priya.sharma@example.com",
  "phone": "+919876543212",
  "source": "website",
  "interestedProgram": "MBA",
  "status": "new"
}'

LEAD_RESPONSE=$(curl -s http://localhost:4009/api/v1/sales/leads \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CEO_TOKEN" \
    -d "$LEAD_DATA")

if echo "$LEAD_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    LEAD_ID=$(echo "$LEAD_RESPONSE" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$LEAD_RESPONSE"
    ((FAILED++))
fi

# Test 22: Update Lead Status
echo -n "22. Update Lead to Contacted... "
UPDATE_LEAD=$(curl -s -X PUT \
    "http://localhost:4009/api/v1/sales/leads/$LEAD_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CEO_TOKEN" \
    -d '{"status": "contacted"}')

if echo "$UPDATE_LEAD" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$UPDATE_LEAD"
    ((FAILED++))
fi

echo ""
echo "=== PHASE 7: DASHBOARD & REPORTING ==="
echo ""

# Test 23: Get CEO Dashboard
echo -n "23. Get CEO Dashboard... "
DASHBOARD_RESPONSE=$(curl -s http://localhost:4009/api/v1/dashboard \
    -H "Authorization: Bearer $CEO_TOKEN")

if echo "$DASHBOARD_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "$DASHBOARD_RESPONSE"
    ((FAILED++))
fi

echo ""
echo "=== PHASE 8: DATA RETRIEVAL TESTS ==="
echo ""

# Test 24: Get All Students
echo -n "24. Get All Students... "
STUDENTS_LIST=$(curl -s http://localhost:4009/api/v1/students \
    -H "Authorization: Bearer $OPS_TOKEN")

if echo "$STUDENTS_LIST" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

# Test 25: Get All Universities
echo -n "25. Get All Universities... "
UNIVERSITIES_LIST=$(curl -s http://localhost:4009/api/v1/operations/universities \
    -H "Authorization: Bearer $OPS_TOKEN")

if echo "$UNIVERSITIES_LIST" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

# Test 26: Get All Programs
echo -n "26. Get All Programs... "
PROGRAMS_LIST=$(curl -s http://localhost:4009/api/v1/operations/programs \
    -H "Authorization: Bearer $OPS_TOKEN")

if echo "$PROGRAMS_LIST" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

# Test 27: Get All Study Centers
echo -n "27. Get All Study Centers... "
CENTERS_LIST=$(curl -s http://localhost:4009/api/v1/operations/centers \
    -H "Authorization: Bearer $OPS_TOKEN")

if echo "$CENTERS_LIST" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

# Test 28: Get All Invoices
echo -n "28. Get All Invoices... "
INVOICES_LIST=$(curl -s http://localhost:4009/api/v1/finance/invoices \
    -H "Authorization: Bearer $FINANCE_TOKEN")

if echo "$INVOICES_LIST" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

# Test 29: Get All Tasks
echo -n "29. Get All Tasks... "
TASKS_LIST=$(curl -s http://localhost:4009/api/v1/tasks \
    -H "Authorization: Bearer $CEO_TOKEN")

if echo "$TASKS_LIST" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

# Test 30: Get All Users
echo -n "30. Get All Users... "
USERS_LIST=$(curl -s http://localhost:4009/api/v1/users \
    -H "Authorization: Bearer $CEO_TOKEN")

if echo "$USERS_LIST" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

echo ""
echo "======================================"
echo "  TEST SUMMARY"
echo "======================================"
echo ""
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

PERCENTAGE=$((PASSED * 100 / (PASSED + FAILED)))
echo "Success Rate: $PERCENTAGE%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo "The ERP system is fully functional."
    exit 0
else
    echo -e "${YELLOW}⚠ SOME TESTS FAILED${NC}"
    echo "Please review the failed tests above."
    exit 1
fi
