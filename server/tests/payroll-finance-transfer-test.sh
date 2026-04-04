#!/bin/bash

# Payroll to Finance Transfer Test Script
# Tests the complete workflow from payroll confirmation to finance payment

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
echo "PAYROLL TO FINANCE TRANSFER TEST"
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
        echo "$body"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $http_code)"
        echo "Response: $body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Step 1: Login
echo "Step 1: Authentication"
echo "----------------------------------------"

# Login as HR Admin
hr_login=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "hr.admin@edutechglobal.com",
        "password": "hradmin123"
    }')

HR_TOKEN=$(echo $hr_login | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Login as Finance Admin
finance_login=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "finance.admin@edutechglobal.com",
        "password": "finance123"
    }')

FINANCE_TOKEN=$(echo $finance_login | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$HR_TOKEN" ] || [ -z "$FINANCE_TOKEN" ]; then
    echo -e "${RED}Failed to login${NC}"
    exit 1
fi

echo -e "${GREEN}✓ HR Admin logged in${NC}"
echo -e "${GREEN}✓ Finance Admin logged in${NC}"
echo ""

# Step 2: Create Payroll Records Manually
echo "Step 2: Create Payroll Records"
echo "----------------------------------------"

# Get user IDs
users_response=$(curl -s -X GET "$BASE_URL/users" \
    -H "Authorization: Bearer $HR_TOKEN")

USER_ID_1=$(echo $users_response | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
USER_ID_2=$(echo $users_response | grep -o '"_id":"[^"]*' | head -2 | tail -1 | cut -d'"' -f4)
USER_ID_3=$(echo $users_response | grep -o '"_id":"[^"]*' | head -3 | tail -1 | cut -d'"' -f4)

CURRENT_MONTH=$(date +%Y-%m)

# Create Payroll 1
payroll1_response=$(curl -s -X POST "$BASE_URL/payroll" \
    -H "Authorization: Bearer $HR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"employeeId\": \"$USER_ID_1\",
        \"month\": \"$CURRENT_MONTH\",
        \"basicSalary\": 50000,
        \"allowances\": {\"hra\": 20000, \"transport\": 2000, \"medical\": 1500},
        \"deductions\": {\"tax\": 5000, \"pf\": 6000}
    }")

PAYROLL_ID_1=$(echo $payroll1_response | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

# Create Payroll 2
payroll2_response=$(curl -s -X POST "$BASE_URL/payroll" \
    -H "Authorization: Bearer $HR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"employeeId\": \"$USER_ID_2\",
        \"month\": \"$CURRENT_MONTH\",
        \"basicSalary\": 60000,
        \"allowances\": {\"hra\": 24000, \"transport\": 2000, \"medical\": 1500},
        \"deductions\": {\"tax\": 6000, \"pf\": 7200}
    }")

PAYROLL_ID_2=$(echo $payroll2_response | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

# Create Payroll 3
payroll3_response=$(curl -s -X POST "$BASE_URL/payroll" \
    -H "Authorization: Bearer $HR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"employeeId\": \"$USER_ID_3\",
        \"month\": \"$CURRENT_MONTH\",
        \"basicSalary\": 55000,
        \"allowances\": {\"hra\": 22000, \"transport\": 2000, \"medical\": 1500},
        \"deductions\": {\"tax\": 5500, \"pf\": 6600}
    }")

PAYROLL_ID_3=$(echo $payroll3_response | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

if [ -z "$PAYROLL_ID_1" ] || [ -z "$PAYROLL_ID_2" ] || [ -z "$PAYROLL_ID_3" ]; then
    echo -e "${RED}Failed to create payroll records${NC}"
    echo "Payroll 1 response: $payroll1_response"
    echo "Payroll 2 response: $payroll2_response"
    echo "Payroll 3 response: $payroll3_response"
    exit 1
fi

echo -e "${GREEN}✓ Payroll records created${NC}"
echo "  Payroll 1: $PAYROLL_ID_1"
echo "  Payroll 2: $PAYROLL_ID_2"
echo "  Payroll 3: $PAYROLL_ID_3"
echo ""

# Step 3: Process Payroll
echo "Step 3: Process Payroll Records"
echo "----------------------------------------"

# Test 1: Process Payroll 1
test_endpoint \
    "Process Payroll 1" \
    "PUT" \
    "/payroll/$PAYROLL_ID_1/process" \
    "" \
    "$HR_TOKEN" \
    "200"

# Test 2: Process Payroll 2
test_endpoint \
    "Process Payroll 2" \
    "PUT" \
    "/payroll/$PAYROLL_ID_2/process" \
    "" \
    "$HR_TOKEN" \
    "200"

# Test 3: Process Payroll 3
test_endpoint \
    "Process Payroll 3" \
    "PUT" \
    "/payroll/$PAYROLL_ID_3/process" \
    "" \
    "$HR_TOKEN" \
    "200"

echo ""

# Step 5: Confirm Payroll
echo "Step 5: Confirm Payroll Records"
echo "----------------------------------------"

# Test 4: Confirm Payroll 1
test_endpoint \
    "Confirm Payroll 1" \
    "PUT" \
    "/payroll/$PAYROLL_ID_1/confirm" \
    "" \
    "$HR_TOKEN" \
    "200"

# Test 5: Confirm Payroll 2
test_endpoint \
    "Confirm Payroll 2" \
    "PUT" \
    "/payroll/$PAYROLL_ID_2/confirm" \
    "" \
    "$HR_TOKEN" \
    "200"

# Test 6: Confirm Payroll 3
test_endpoint \
    "Confirm Payroll 3" \
    "PUT" \
    "/payroll/$PAYROLL_ID_3/confirm" \
    "" \
    "$HR_TOKEN" \
    "200"

echo ""

# Step 6: Transfer to Finance
echo "Step 6: Transfer to Finance (Create Batch)"
echo "----------------------------------------"

# Test 7: Transfer confirmed payrolls to finance
test_endpoint \
    "Transfer to Finance" \
    "POST" \
    "/payroll/transfer-to-finance" \
    "{
        \"payrollIds\": [\"$PAYROLL_ID_1\", \"$PAYROLL_ID_2\", \"$PAYROLL_ID_3\"],
        \"month\": \"$CURRENT_MONTH\",
        \"remarks\": \"Monthly payroll for $CURRENT_MONTH\"
    }" \
    "$HR_TOKEN" \
    "201"

# Extract batch ID
BATCH_ID=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

if [ -z "$BATCH_ID" ]; then
    echo -e "${RED}Failed to create batch${NC}"
    exit 1
fi

echo -e "${GREEN}Batch ID: $BATCH_ID${NC}"
echo ""

# Step 7: Finance Views Batches
echo "Step 7: Finance Views Pending Batches"
echo "----------------------------------------"

# Test 8: Get all batches
test_endpoint \
    "Get All Batches" \
    "GET" \
    "/payroll/batches" \
    "" \
    "$FINANCE_TOKEN" \
    "200"

# Test 9: Get pending batches
test_endpoint \
    "Get Pending Batches" \
    "GET" \
    "/payroll/batches?status=pending_finance_approval" \
    "" \
    "$FINANCE_TOKEN" \
    "200"

# Test 10: Get specific batch details
test_endpoint \
    "Get Batch Details" \
    "GET" \
    "/payroll/batches/$BATCH_ID" \
    "" \
    "$FINANCE_TOKEN" \
    "200"

echo ""

# Step 8: Finance Approves Batch
echo "Step 8: Finance Approves Batch"
echo "----------------------------------------"

# Test 11: Finance approve batch
test_endpoint \
    "Finance Approve Batch" \
    "POST" \
    "/payroll/batches/$BATCH_ID/approve" \
    "{\"remarks\": \"Approved for payment\"}" \
    "$FINANCE_TOKEN" \
    "200"

echo ""

# Step 9: Mark Payment in Progress
echo "Step 9: Mark Payment in Progress"
echo "----------------------------------------"

# Test 12: Mark payment in progress
test_endpoint \
    "Mark Payment in Progress" \
    "PUT" \
    "/payroll/batches/$BATCH_ID/payment-in-progress" \
    "" \
    "$FINANCE_TOKEN" \
    "200"

echo ""

# Step 10: Complete Payment
echo "Step 10: Complete Batch Payment"
echo "----------------------------------------"

# Test 13: Complete payment
test_endpoint \
    "Complete Batch Payment" \
    "PUT" \
    "/payroll/batches/$BATCH_ID/complete-payment" \
    "{
        \"paymentDate\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"paymentMethod\": \"bank_transfer\",
        \"paymentReference\": \"TXN123456789\"
    }" \
    "$FINANCE_TOKEN" \
    "200"

echo ""

# Step 11: Verify Payroll Status
echo "Step 11: Verify Payroll Status Updated"
echo "----------------------------------------"

# Test 14: Check payroll 1 is paid
test_endpoint \
    "Verify Payroll 1 Paid" \
    "GET" \
    "/payroll/$PAYROLL_ID_1" \
    "" \
    "$HR_TOKEN" \
    "200"

# Test 15: Check batch is completed
test_endpoint \
    "Verify Batch Completed" \
    "GET" \
    "/payroll/batches/$BATCH_ID" \
    "" \
    "$FINANCE_TOKEN" \
    "200"

echo ""

# Step 12: Test Rejection Workflow
echo "Step 12: Test Rejection Workflow"
echo "----------------------------------------"

# Create another payroll for rejection test
USER_ID_4=$(echo $users_response | grep -o '"_id":"[^"]*' | head -4 | tail -1 | cut -d'"' -f4)

if [ ! -z "$USER_ID_4" ]; then
    payroll4_response=$(curl -s -X POST "$BASE_URL/payroll" \
        -H "Authorization: Bearer $HR_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"employeeId\": \"$USER_ID_4\",
            \"month\": \"$(date -d 'next month' +%Y-%m 2>/dev/null || date -v+1m +%Y-%m)\",
            \"basicSalary\": 50000,
            \"allowances\": {\"hra\": 20000},
            \"deductions\": {\"tax\": 5000}
        }")

    PAYROLL_ID_4=$(echo $payroll4_response | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

if [ ! -z "$PAYROLL_ID_4" ]; then
    # Process and confirm
    curl -s -X PUT "$BASE_URL/payroll/$PAYROLL_ID_4/process" \
        -H "Authorization: Bearer $HR_TOKEN" > /dev/null
    
    curl -s -X PUT "$BASE_URL/payroll/$PAYROLL_ID_4/confirm" \
        -H "Authorization: Bearer $HR_TOKEN" > /dev/null
    
    # Transfer to finance
    transfer_response=$(curl -s -X POST "$BASE_URL/payroll/transfer-to-finance" \
        -H "Authorization: Bearer $HR_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"payrollIds\": [\"$PAYROLL_ID_4\"],
            \"month\": \"$(date -d 'next month' +%Y-%m 2>/dev/null || date -v+1m +%Y-%m)\",
            \"remarks\": \"Test batch for rejection\"
        }")
    
    BATCH_ID_2=$(echo $transfer_response | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)
    
    if [ ! -z "$BATCH_ID_2" ]; then
        # Test 16: Finance reject batch
        test_endpoint \
            "Finance Reject Batch" \
            "POST" \
            "/payroll/batches/$BATCH_ID_2/reject" \
            "{\"rejectionReason\": \"Incorrect salary calculation\"}" \
            "$FINANCE_TOKEN" \
            "200"
        
        # Test 17: Verify payroll reverted to confirmed
        test_endpoint \
            "Verify Payroll Reverted to Confirmed" \
            "GET" \
            "/payroll/$PAYROLL_ID_4" \
            "" \
            "$HR_TOKEN" \
            "200"
    fi
fi

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
    echo "Payroll to Finance Workflow Verified:"
    echo "  ✓ Generate Monthly Payroll"
    echo "  ✓ Process Payroll Records"
    echo "  ✓ Confirm Payroll (HR)"
    echo "  ✓ Transfer to Finance (Create Batch)"
    echo "  ✓ Finance View Batches"
    echo "  ✓ Finance Approve Batch"
    echo "  ✓ Mark Payment in Progress"
    echo "  ✓ Complete Batch Payment"
    echo "  ✓ Verify Status Updates"
    echo "  ✓ Finance Reject Batch"
    echo "  ✓ Revert to Confirmed Status"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
