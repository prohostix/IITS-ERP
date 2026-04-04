#!/bin/bash

# Test HR Admin Endpoints
# This script tests all HR admin module endpoints

BASE_URL="http://localhost:4009/api/v1"
TOKEN=""

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         HR Admin Endpoints Test Suite                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL=0
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    
    TOTAL=$((TOTAL + 1))
    echo -n "Testing: $description... "
    
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}SKIP${NC} (No token)"
        return
    fi
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
    elif [ "$http_code" = "304" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code - Not Modified)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "   Response: $(echo $body | head -c 100)"
        FAILED=$((FAILED + 1))
    fi
}

# Step 1: Login to get token
echo "Step 1: Authenticating..."
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "hr.admin@edutechglobal.com",
        "password": "hradmin123"
    }')

TOKEN=$(echo $login_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Failed to get authentication token${NC}"
    echo "Response: $login_response"
    exit 1
fi

echo -e "${GREEN}✓ Authentication successful${NC}"
echo ""

# Step 2: Test Dashboard
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Dashboard Module"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/dashboard/metrics" "Get dashboard metrics"
echo ""

# Step 3: Test Employees (Users)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👔 Employees Module"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/users" "Get all users/employees"
echo ""

# Step 4: Test Vacancies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Vacancies Module"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/hr/vacancies" "Get all vacancies"
test_endpoint "GET" "/hr/vacancies/stats" "Get vacancy statistics"
echo ""

# Step 5: Test Leave Requests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏖️  Leave Requests Module"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/hr/leaves" "Get all leave requests"
test_endpoint "GET" "/hr/leaves/stats" "Get leave statistics"
echo ""

# Step 6: Test Attendance
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📅 Attendance Module"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/attendance" "Get all attendance records"
echo ""

# Step 7: Test Holidays
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Holidays Module"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/hr/holidays" "Get all holidays"
echo ""

# Step 8: Test Complaints
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Complaints Module"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/hr/complaints" "Get all complaints"
echo ""

# Step 9: Test Payroll
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💼 Payroll Module"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/payroll" "Get all payroll records"
echo ""

# Step 10: Test Payroll Batches
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Payroll Batches Module"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/payroll/batches" "Get all payroll batches"
echo ""

# Step 11: Test Announcements
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📢 Announcements Module"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/operations/announcements" "Get all announcements"
echo ""

# Step 12: Test Tasks
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Tasks Module"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/tasks" "Get all tasks"
echo ""

# Step 13: Test Escalations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  Escalations Module"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/escalations" "Get all escalations"
echo ""

# Summary
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    Test Summary                           ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║  Total Tests:  $TOTAL                                        ║"
echo "║  Passed:       ${GREEN}$PASSED${NC}                                        ║"
echo "║  Failed:       ${RED}$FAILED${NC}                                        ║"
echo "╚═══════════════════════════════════════════════════════════╝"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All HR Admin modules are working correctly!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some tests failed. Please check the output above.${NC}"
    exit 1
fi
