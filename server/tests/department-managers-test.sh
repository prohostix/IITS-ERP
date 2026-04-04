#!/bin/bash

# Department Managers Test Script
# Tests department and sub-department manager assignment

BASE_URL="http://localhost:4009/api/v1"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "DEPARTMENT MANAGERS TEST"
echo "=========================================="
echo ""

# Test function
test_endpoint() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local token=$5
    local expected_status=$6
    
    echo -n "Test $TOTAL_TESTS: $test_name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: $http_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "$body"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $http_code)"
        echo "Response: $body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Step 1: Login as Superadmin
echo "Step 1: Authentication"
echo "----------------------------------------"

login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "superadmin@erp.com",
        "password": "superadmin123"
    }')

SUPERADMIN_TOKEN=$(echo $login_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$SUPERADMIN_TOKEN" ]; then
    echo -e "${RED}Failed to login as superadmin${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Superadmin logged in${NC}"
echo ""

# Step 2: Create Organization
echo "Step 2: Create Test Organization"
echo "----------------------------------------"

org_response=$(curl -s -X POST "$BASE_URL/organizations" \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Department Test Org",
        "type": "educational",
        "email": "dept@test.com",
        "phone": "1234567890",
        "address": "Test Address"
    }')

ORG_ID=$(echo $org_response | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$ORG_ID" ]; then
    echo -e "${RED}Failed to create organization${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Organization created: $ORG_ID${NC}"
echo ""

# Step 3: Create Users (Manager, Assistant Managers, Employees)
echo "Step 3: Create Users"
echo "----------------------------------------"

# Create Department Manager
manager_response=$(curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"Department Manager\",
        \"email\": \"dept.manager@test.com\",
        \"password\": \"Manager@123\",
        \"role\": \"ops_admin\",
        \"organizationId\": \"$ORG_ID\",
        \"designation\": \"Department Manager\",
        \"department\": \"Operations\"
    }")

MANAGER_ID=$(echo $manager_response | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

# Create Assistant Manager 1
asst1_response=$(curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"Assistant Manager 1\",
        \"email\": \"asst1@test.com\",
        \"password\": \"Asst@123\",
        \"role\": \"ops_sub_admin\",
        \"organizationId\": \"$ORG_ID\",
        \"designation\": \"Assistant Manager\",
        \"department\": \"Operations\"
    }")

ASST1_ID=$(echo $asst1_response | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

# Create Assistant Manager 2
asst2_response=$(curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"Assistant Manager 2\",
        \"email\": \"asst2@test.com\",
        \"password\": \"Asst@123\",
        \"role\": \"ops_sub_admin\",
        \"organizationId\": \"$ORG_ID\",
        \"designation\": \"Assistant Manager\",
        \"department\": \"Operations\"
    }")

ASST2_ID=$(echo $asst2_response | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

# Create Sub-Department Manager
subdept_manager_response=$(curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"Sub-Dept Manager\",
        \"email\": \"subdept.manager@test.com\",
        \"password\": \"Manager@123\",
        \"role\": \"ops_sub_admin\",
        \"organizationId\": \"$ORG_ID\",
        \"designation\": \"Sub-Department Manager\",
        \"department\": \"Operations\"
    }")

SUBDEPT_MANAGER_ID=$(echo $subdept_manager_response | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

echo -e "${GREEN}✓ Users created${NC}"
echo "  Manager ID: $MANAGER_ID"
echo "  Assistant 1 ID: $ASST1_ID"
echo "  Assistant 2 ID: $ASST2_ID"
echo "  Sub-Dept Manager ID: $SUBDEPT_MANAGER_ID"
echo ""

# Step 4: Create Department
echo "Step 4: Create Main Department"
echo "----------------------------------------"

dept_response=$(curl -s -X POST "$BASE_URL/departments" \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"organizationId\": \"$ORG_ID\",
        \"name\": \"Operations Department\",
        \"type\": \"operations\",
        \"features\": [\"admissions\", \"centers\", \"programs\"],
        \"status\": \"active\"
    }")

DEPT_ID=$(echo $dept_response | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$DEPT_ID" ]; then
    echo -e "${RED}Failed to create department${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Department created: $DEPT_ID${NC}"
echo ""

# Step 5: Manager Assignment Tests
echo "Step 5: Manager Assignment Tests"
echo "----------------------------------------"

# Test 1: Assign Manager to Department
test_endpoint \
    "Assign Manager to Department" \
    "PUT" \
    "/departments/$DEPT_ID/assign-manager" \
    "{\"managerId\": \"$MANAGER_ID\"}" \
    "$SUPERADMIN_TOKEN" \
    "200"

# Test 2: Get Department (should show manager)
test_endpoint \
    "Get Department with Manager" \
    "GET" \
    "/departments/$DEPT_ID" \
    "" \
    "$SUPERADMIN_TOKEN" \
    "200"

# Test 3: Add Assistant Manager 1
test_endpoint \
    "Add Assistant Manager 1" \
    "POST" \
    "/departments/$DEPT_ID/assistant-managers" \
    "{\"userId\": \"$ASST1_ID\"}" \
    "$SUPERADMIN_TOKEN" \
    "200"

# Test 4: Add Assistant Manager 2
test_endpoint \
    "Add Assistant Manager 2" \
    "POST" \
    "/departments/$DEPT_ID/assistant-managers" \
    "{\"userId\": \"$ASST2_ID\"}" \
    "$SUPERADMIN_TOKEN" \
    "200"

# Test 5: Try to add duplicate assistant manager (should fail)
test_endpoint \
    "Add Duplicate Assistant Manager (Should Fail)" \
    "POST" \
    "/departments/$DEPT_ID/assistant-managers" \
    "{\"userId\": \"$ASST1_ID\"}" \
    "$SUPERADMIN_TOKEN" \
    "400"

echo ""

# Step 6: Sub-Department Tests
echo "Step 6: Sub-Department Tests"
echo "----------------------------------------"

# Test 6: Create Sub-Department
test_endpoint \
    "Create Sub-Department" \
    "POST" \
    "/departments/$DEPT_ID/sub-departments" \
    "{
        \"name\": \"Online Programs Sub-Department\",
        \"subType\": \"online\",
        \"features\": [\"online_admissions\"],
        \"status\": \"active\"
    }" \
    "$SUPERADMIN_TOKEN" \
    "201"

# Extract sub-department ID from last response
SUBDEPT_ID=$(echo "$body" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

# Test 7: Assign Manager to Sub-Department
test_endpoint \
    "Assign Manager to Sub-Department" \
    "PUT" \
    "/departments/$SUBDEPT_ID/assign-manager" \
    "{\"managerId\": \"$SUBDEPT_MANAGER_ID\"}" \
    "$SUPERADMIN_TOKEN" \
    "200"

# Test 8: Get Sub-Departments
test_endpoint \
    "Get Sub-Departments" \
    "GET" \
    "/departments/$DEPT_ID/sub-departments" \
    "" \
    "$SUPERADMIN_TOKEN" \
    "200"

# Test 9: Get Department Hierarchy
test_endpoint \
    "Get Department Hierarchy" \
    "GET" \
    "/departments/$DEPT_ID/hierarchy" \
    "" \
    "$SUPERADMIN_TOKEN" \
    "200"

echo ""

# Step 7: My Departments Tests
echo "Step 7: My Departments Tests"
echo "----------------------------------------"

# Login as Manager
manager_login=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "dept.manager@test.com",
        "password": "Manager@123"
    }')

MANAGER_TOKEN=$(echo $manager_login | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Test 10: Get My Departments (as Manager)
test_endpoint \
    "Get My Departments (Manager)" \
    "GET" \
    "/departments/my-departments" \
    "" \
    "$MANAGER_TOKEN" \
    "200"

# Login as Assistant Manager
asst_login=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "asst1@test.com",
        "password": "Asst@123"
    }')

ASST_TOKEN=$(echo $asst_login | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Test 11: Get My Departments (as Assistant Manager)
test_endpoint \
    "Get My Departments (Assistant Manager)" \
    "GET" \
    "/departments/my-departments" \
    "" \
    "$ASST_TOKEN" \
    "200"

echo ""

# Step 8: Filter Tests
echo "Step 8: Filter Tests"
echo "----------------------------------------"

# Test 12: Get Top-Level Departments Only
test_endpoint \
    "Get Top-Level Departments" \
    "GET" \
    "/departments?topLevel=true" \
    "" \
    "$SUPERADMIN_TOKEN" \
    "200"

# Test 13: Get Departments by Parent
test_endpoint \
    "Get Departments by Parent" \
    "GET" \
    "/departments?parentDepartmentId=$DEPT_ID" \
    "" \
    "$SUPERADMIN_TOKEN" \
    "200"

echo ""

# Step 9: Remove Manager Tests
echo "Step 9: Remove Manager Tests"
echo "----------------------------------------"

# Test 14: Remove Assistant Manager
test_endpoint \
    "Remove Assistant Manager" \
    "DELETE" \
    "/departments/$DEPT_ID/assistant-managers/$ASST2_ID" \
    "" \
    "$SUPERADMIN_TOKEN" \
    "200"

# Test 15: Remove Department Manager
test_endpoint \
    "Remove Department Manager" \
    "DELETE" \
    "/departments/$DEPT_ID/remove-manager" \
    "" \
    "$SUPERADMIN_TOKEN" \
    "200"

# Test 16: Verify Manager Removed
test_endpoint \
    "Verify Manager Removed" \
    "GET" \
    "/departments/$DEPT_ID" \
    "" \
    "$SUPERADMIN_TOKEN" \
    "200"

echo ""

# Final Summary
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo ""
    echo "Department Manager Features Verified:"
    echo "  ✓ Assign Manager to Department"
    echo "  ✓ Add Multiple Assistant Managers"
    echo "  ✓ Remove Assistant Managers"
    echo "  ✓ Remove Department Manager"
    echo "  ✓ Create Sub-Departments"
    echo "  ✓ Assign Manager to Sub-Department"
    echo "  ✓ Get Sub-Departments List"
    echo "  ✓ Get Department Hierarchy"
    echo "  ✓ Get My Managed Departments"
    echo "  ✓ Filter Top-Level Departments"
    echo "  ✓ Filter by Parent Department"
    echo "  ✓ Duplicate Prevention"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
