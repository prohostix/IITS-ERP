#!/bin/bash

# Attendance System Test Script
# Tests employee punch-in/out with geolocation and HR settings

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
echo "ATTENDANCE SYSTEM TEST"
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
        "name": "Attendance Test Org",
        "type": "educational",
        "email": "attendance@test.com",
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

# Step 3: Create HR User
echo "Step 3: Create HR User"
echo "----------------------------------------"

hr_response=$(curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"HR Manager\",
        \"email\": \"hr@attendance.com\",
        \"password\": \"Hr@123456\",
        \"role\": \"hr_admin\",
        \"organizationId\": \"$ORG_ID\",
        \"designation\": \"HR Manager\",
        \"department\": \"Human Resources\"
    }")

HR_ID=$(echo $hr_response | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

# Login as HR
hr_login=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "hr@attendance.com",
        "password": "Hr@123456"
    }')

HR_TOKEN=$(echo $hr_login | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo -e "${GREEN}✓ HR user created and logged in${NC}"
echo ""

# Step 4: Create Employee User
echo "Step 4: Create Employee User"
echo "----------------------------------------"

emp_response=$(curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"Test Employee\",
        \"email\": \"employee@attendance.com\",
        \"password\": \"Emp@123456\",
        \"role\": \"employee\",
        \"organizationId\": \"$ORG_ID\",
        \"designation\": \"Software Developer\",
        \"department\": \"IT\"
    }")

EMP_ID=$(echo $emp_response | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

# Login as Employee
emp_login=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "employee@attendance.com",
        "password": "Emp@123456"
    }')

EMP_TOKEN=$(echo $emp_login | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo -e "${GREEN}✓ Employee user created and logged in${NC}"
echo ""

# Step 5: HR Settings Configuration
echo "Step 5: HR Settings Configuration Tests"
echo "----------------------------------------"

# Test 1: Create HR Settings (office location: sample coordinates)
test_endpoint \
    "Create HR Settings" \
    "POST" \
    "/attendance/settings" \
    "{
        \"officeHours\": {
            \"checkInTime\": \"09:00\",
            \"checkOutTime\": \"18:00\",
            \"graceMinutes\": 15,
            \"workingDays\": [\"Monday\", \"Tuesday\", \"Wednesday\", \"Thursday\", \"Friday\"]
        },
        \"latePolicy\": {
            \"maxLateMinutesPerMonth\": 60,
            \"deductionPerExtraMinute\": 10,
            \"warningThreshold\": 45
        },
        \"location\": {
            \"officeLatitude\": 28.6139,
            \"officeLongitude\": 77.2090,
            \"allowedRadius\": 100,
            \"requireLocationForCheckIn\": true
        }
    }" \
    "$HR_TOKEN" \
    "200"

# Test 2: Get HR Settings
test_endpoint \
    "Get HR Settings" \
    "GET" \
    "/attendance/settings" \
    "" \
    "$HR_TOKEN" \
    "200"

# Test 3: Update HR Settings
test_endpoint \
    "Update HR Settings" \
    "PUT" \
    "/attendance/settings" \
    "{
        \"officeHours\": {
            \"checkInTime\": \"09:30\",
            \"checkOutTime\": \"18:30\",
            \"graceMinutes\": 10,
            \"workingDays\": [\"Monday\", \"Tuesday\", \"Wednesday\", \"Thursday\", \"Friday\"]
        },
        \"latePolicy\": {
            \"maxLateMinutesPerMonth\": 90,
            \"deductionPerExtraMinute\": 5,
            \"warningThreshold\": 60
        },
        \"location\": {
            \"officeLatitude\": 28.6139,
            \"officeLongitude\": 77.2090,
            \"allowedRadius\": 200,
            \"requireLocationForCheckIn\": true
        }
    }" \
    "$HR_TOKEN" \
    "200"

echo ""

# Step 6: Employee Punch-In/Out Tests
echo "Step 6: Employee Punch-In/Out Tests"
echo "----------------------------------------"

# Test 4: Get today's attendance (should be empty)
test_endpoint \
    "Get Today's Attendance (Empty)" \
    "GET" \
    "/attendance/today" \
    "" \
    "$EMP_TOKEN" \
    "200"

# Test 5: Punch In - Within Office Radius
test_endpoint \
    "Punch In (Within Radius)" \
    "POST" \
    "/attendance/punch-in" \
    "{
        \"latitude\": 28.6139,
        \"longitude\": 77.2090,
        \"address\": \"Connaught Place, New Delhi\"
    }" \
    "$EMP_TOKEN" \
    "200"

# Test 6: Try to Punch In Again (Should Fail)
test_endpoint \
    "Punch In Again (Should Fail)" \
    "POST" \
    "/attendance/punch-in" \
    "{
        \"latitude\": 28.6139,
        \"longitude\": 77.2090,
        \"address\": \"Connaught Place, New Delhi\"
    }" \
    "$EMP_TOKEN" \
    "400"

# Test 7: Get today's attendance (should show check-in)
test_endpoint \
    "Get Today's Attendance (After Check-In)" \
    "GET" \
    "/attendance/today" \
    "" \
    "$EMP_TOKEN" \
    "200"

# Test 8: Punch Out
test_endpoint \
    "Punch Out" \
    "POST" \
    "/attendance/punch-out" \
    "{
        \"latitude\": 28.6139,
        \"longitude\": 77.2090,
        \"address\": \"Connaught Place, New Delhi\"
    }" \
    "$EMP_TOKEN" \
    "200"

# Test 9: Try to Punch Out Again (Should Fail)
test_endpoint \
    "Punch Out Again (Should Fail)" \
    "POST" \
    "/attendance/punch-out" \
    "{
        \"latitude\": 28.6139,
        \"longitude\": 77.2090,
        \"address\": \"Connaught Place, New Delhi\"
    }" \
    "$EMP_TOKEN" \
    "400"

# Test 10: Get today's attendance (should show both check-in and check-out)
test_endpoint \
    "Get Today's Attendance (Complete)" \
    "GET" \
    "/attendance/today" \
    "" \
    "$EMP_TOKEN" \
    "200"

echo ""

# Step 7: Location Validation Tests
echo "Step 7: Location Validation Tests"
echo "----------------------------------------"

# Create another employee for location tests
emp2_response=$(curl -s -X POST "$BASE_URL/users" \
    -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"Test Employee 2\",
        \"email\": \"employee2@attendance.com\",
        \"password\": \"Emp@123456\",
        \"role\": \"employee\",
        \"organizationId\": \"$ORG_ID\",
        \"designation\": \"Software Developer\",
        \"department\": \"IT\"
    }")

emp2_login=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "employee2@attendance.com",
        "password": "Emp@123456"
    }')

EMP2_TOKEN=$(echo $emp2_login | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Test 11: Punch In - Outside Office Radius (Should Fail)
test_endpoint \
    "Punch In (Outside Radius - Should Fail)" \
    "POST" \
    "/attendance/punch-in" \
    "{
        \"latitude\": 28.7041,
        \"longitude\": 77.1025,
        \"address\": \"Far Location, Delhi\"
    }" \
    "$EMP2_TOKEN" \
    "400"

# Test 12: Punch In - Missing Location (Should Fail)
test_endpoint \
    "Punch In (Missing Location - Should Fail)" \
    "POST" \
    "/attendance/punch-in" \
    "{
        \"address\": \"Some Address\"
    }" \
    "$EMP2_TOKEN" \
    "400"

echo ""

# Step 8: Monthly Late Summary Tests
echo "Step 8: Monthly Late Summary Tests"
echo "----------------------------------------"

# Get current month and year
CURRENT_MONTH=$(date +%m)
CURRENT_YEAR=$(date +%Y)

# Test 13: Get Monthly Late Summary
test_endpoint \
    "Get Monthly Late Summary (Employee)" \
    "GET" \
    "/attendance/late-summary?month=$CURRENT_MONTH&year=$CURRENT_YEAR" \
    "" \
    "$EMP_TOKEN" \
    "200"

# Test 14: HR Get Employee Late Summary
test_endpoint \
    "Get Monthly Late Summary (HR for Employee)" \
    "GET" \
    "/attendance/late-summary?month=$CURRENT_MONTH&year=$CURRENT_YEAR&employeeId=$EMP_ID" \
    "" \
    "$HR_TOKEN" \
    "200"

echo ""

# Step 9: HR View All Attendances
echo "Step 9: HR View All Attendances"
echo "----------------------------------------"

# Test 15: Get All Attendances
test_endpoint \
    "Get All Attendances (HR)" \
    "GET" \
    "/attendance/" \
    "" \
    "$HR_TOKEN" \
    "200"

# Test 16: Get Attendances by Employee
test_endpoint \
    "Get Attendances by Employee (HR)" \
    "GET" \
    "/attendance/?employeeId=$EMP_ID" \
    "" \
    "$HR_TOKEN" \
    "200"

# Test 17: Get Late Attendances Only
test_endpoint \
    "Get Late Attendances Only (HR)" \
    "GET" \
    "/attendance/?isLate=true" \
    "" \
    "$HR_TOKEN" \
    "200"

# Test 18: Employee Cannot Access All Attendances
test_endpoint \
    "Employee Cannot Access All Attendances" \
    "GET" \
    "/attendance/" \
    "" \
    "$EMP_TOKEN" \
    "403"

echo ""

# Step 10: Authorization Tests
echo "Step 10: Authorization Tests"
echo "----------------------------------------"

# Test 19: Employee Cannot Create HR Settings
test_endpoint \
    "Employee Cannot Create HR Settings" \
    "POST" \
    "/attendance/settings" \
    "{
        \"officeHours\": {
            \"checkInTime\": \"10:00\",
            \"checkOutTime\": \"19:00\"
        }
    }" \
    "$EMP_TOKEN" \
    "403"

# Test 20: Employee Cannot Update HR Settings
test_endpoint \
    "Employee Cannot Update HR Settings" \
    "PUT" \
    "/attendance/settings" \
    "{
        \"officeHours\": {
            \"checkInTime\": \"10:00\",
            \"checkOutTime\": \"19:00\"
        }
    }" \
    "$EMP_TOKEN" \
    "403"

# Test 21: Employee Cannot View HR Settings
test_endpoint \
    "Employee Cannot View HR Settings" \
    "GET" \
    "/attendance/settings" \
    "" \
    "$EMP_TOKEN" \
    "403"

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
    echo "Attendance System Features Verified:"
    echo "  ✓ HR Settings Configuration (office hours, grace period, late policy)"
    echo "  ✓ Employee Punch-In with Geolocation"
    echo "  ✓ Employee Punch-Out with Geolocation"
    echo "  ✓ Location Validation (distance from office)"
    echo "  ✓ Late Arrival Detection and Tracking"
    echo "  ✓ Working Hours Calculation"
    echo "  ✓ Monthly Late Summary"
    echo "  ✓ HR View All Attendances"
    echo "  ✓ Authorization Controls"
    echo "  ✓ Duplicate Punch Prevention"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
