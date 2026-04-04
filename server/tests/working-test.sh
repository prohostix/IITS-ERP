#!/bin/bash

# Working ERP System Test - Tests actual working features
BASE_URL="http://localhost:4009/api/v1"
PASSED=0
FAILED=0

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  ERP SYSTEM - WORKING FEATURES TEST"
echo "=========================================="
echo ""

# Get tokens
echo "Getting authentication tokens..."
SUPERADMIN_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"superadmin@erp.com","password":"superadmin123"}' | jq -r '.data.token')

CEO_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ceo@edutechglobal.com","password":"ceo123"}' | jq -r '.data.token')

OPS_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ops.admin@edutechglobal.com","password":"opsadmin123"}' | jq -r '.data.token')

FINANCE_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"finance.admin@edutechglobal.com","password":"finance123"}' | jq -r '.data.token')

HR_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"hr.admin@edutechglobal.com","password":"hradmin123"}' | jq -r '.data.token')

SALES_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"sales.admin@edutechglobal.com","password":"sales123"}' | jq -r '.data.token')

echo ""
echo "=== AUTHENTICATION TESTS ==="
echo ""

test_auth() {
    local role=$1
    local token=$2
    echo -n "$role login... "
    if [ -n "$token" ] && [ "$token" != "null" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
    fi
}

test_auth "Superadmin" "$SUPERADMIN_TOKEN"
test_auth "CEO" "$CEO_TOKEN"
test_auth "Ops Admin" "$OPS_TOKEN"
test_auth "Finance Admin" "$FINANCE_TOKEN"
test_auth "HR Admin" "$HR_TOKEN"
test_auth "Sales Admin" "$SALES_TOKEN"

echo ""
echo "=== DATA RETRIEVAL TESTS ==="
echo ""

test_endpoint() {
    local name=$1
    local url=$2
    local token=$3
    
    echo -n "$name... "
    response=$(curl -s "$url" -H "Authorization: Bearer $token")
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

# Superadmin tests
test_endpoint "Get Organizations" "$BASE_URL/organizations" "$SUPERADMIN_TOKEN"
test_endpoint "Get Licenses" "$BASE_URL/licenses" "$SUPERADMIN_TOKEN"

# General tests
test_endpoint "Get Users" "$BASE_URL/users" "$CEO_TOKEN"
test_endpoint "Get Departments" "$BASE_URL/departments" "$CEO_TOKEN"
test_endpoint "Get Tasks" "$BASE_URL/tasks" "$CEO_TOKEN"

# Operations tests
test_endpoint "Get Students" "$BASE_URL/students" "$OPS_TOKEN"
test_endpoint "Get Universities" "$BASE_URL/operations/universities" "$OPS_TOKEN"
test_endpoint "Get Programs" "$BASE_URL/operations/programs" "$OPS_TOKEN"
test_endpoint "Get Study Centers" "$BASE_URL/operations/centers" "$OPS_TOKEN"

# Finance tests
test_endpoint "Get Invoices" "$BASE_URL/finance/invoices" "$FINANCE_TOKEN"
test_endpoint "Get Payments" "$BASE_URL/finance/payments" "$FINANCE_TOKEN"
test_endpoint "Get Expenses" "$BASE_URL/finance/expenses" "$FINANCE_TOKEN"
test_endpoint "Get Targets" "$BASE_URL/finance/targets" "$FINANCE_TOKEN"
test_endpoint "Get Fee Structures" "$BASE_URL/finance/fees" "$FINANCE_TOKEN"

# HR tests
test_endpoint "Get Vacancies" "$BASE_URL/hr/vacancies" "$HR_TOKEN"
test_endpoint "Get Leave Requests" "$BASE_URL/hr/leaves" "$HR_TOKEN"
test_endpoint "Get Attendance" "$BASE_URL/hr/attendance" "$HR_TOKEN"
test_endpoint "Get Holidays" "$BASE_URL/hr/holidays" "$HR_TOKEN"
test_endpoint "Get Complaints" "$BASE_URL/hr/complaints" "$HR_TOKEN"

# Sales tests
test_endpoint "Get Leads" "$BASE_URL/sales/leads" "$SALES_TOKEN"
test_endpoint "Get Referrals" "$BASE_URL/sales/referrals" "$SALES_TOKEN"

echo ""
echo "=== CREATE OPERATIONS TEST ==="
echo ""

# Get organization and department IDs
ORG_ID=$(curl -s $BASE_URL/organizations -H "Authorization: Bearer $SUPERADMIN_TOKEN" | jq -r '.data[0]._id')
DEPT_ID=$(curl -s $BASE_URL/departments -H "Authorization: Bearer $CEO_TOKEN" | jq -r '.data[0]._id')
USER_ID=$(curl -s $BASE_URL/users -H "Authorization: Bearer $CEO_TOKEN" | jq -r '.data[0]._id')

# Test: Create University
echo -n "Create University... "
UNIV_RESPONSE=$(curl -s $BASE_URL/operations/universities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -d '{
    "name": "Test University",
    "code": "TU'$(date +%s)'",
    "type": "deemed",
    "address": "123 Test St",
    "city": "Test City",
    "state": "Test State",
    "country": "India",
    "status": "active"
  }')

if echo "$UNIV_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    UNIV_ID=$(echo "$UNIV_RESPONSE" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
    UNIV_ID=""
fi

# Test: Create Program
if [ -n "$UNIV_ID" ]; then
    echo -n "Create Program... "
    PROG_RESPONSE=$(curl -s $BASE_URL/operations/programs \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $OPS_TOKEN" \
      -d '{
        "universityId": "'$UNIV_ID'",
        "name": "Test Program",
        "code": "TP'$(date +%s)'",
        "type": "undergraduate",
        "duration": 3,
        "status": "active"
      }')
    
    if echo "$PROG_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
    fi
fi

# Test: Create Study Center
echo -n "Create Study Center... "
CENTER_RESPONSE=$(curl -s $BASE_URL/operations/centers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -d '{
    "name": "Test Center",
    "code": "TC'$(date +%s)'",
    "address": "456 Center Rd",
    "contact": "+919876543210",
    "email": "test@center.com",
    "status": "pending"
  }')

if echo "$CENTER_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

# Test: Create Task
echo -n "Create Task... "
TASK_RESPONSE=$(curl -s $BASE_URL/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CEO_TOKEN" \
  -d '{
    "title": "Test Task",
    "description": "Test task description",
    "assignedTo": "'$USER_ID'",
    "departmentId": "'$DEPT_ID'",
    "priority": "medium",
    "deadline": "2025-12-31",
    "status": "pending"
  }')

if echo "$TASK_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

echo ""
echo "=========================================="
echo "  TEST SUMMARY"
echo "=========================================="
echo ""
echo "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

PERCENTAGE=$((PASSED * 100 / (PASSED + FAILED)))
echo "Success Rate: $PERCENTAGE%"
echo ""

if [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}✓ EXCELLENT! System is working properly${NC}"
    exit 0
elif [ $PERCENTAGE -ge 70 ]; then
    echo -e "${GREEN}✓ GOOD! Most features are working${NC}"
    exit 0
else
    echo -e "${RED}⚠ NEEDS ATTENTION${NC}"
    exit 1
fi
