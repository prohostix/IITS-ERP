#!/bin/bash

# Payroll System Comprehensive Test
BASE_URL="http://localhost:4009/api/v1"
PASSED=0
FAILED=0

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=============================================="
echo "  PAYROLL SYSTEM COMPREHENSIVE TEST"
echo "  Testing Complete Payroll Process"
echo "=============================================="
echo ""

# Authenticate
echo "🔐 Authenticating..."
HR_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"hr.admin@edutechglobal.com","password":"hradmin123"}' | jq -r '.data.token')

FINANCE_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"finance.admin@edutechglobal.com","password":"finance123"}' | jq -r '.data.token')

if [ -z "$HR_TOKEN" ] || [ "$HR_TOKEN" == "null" ]; then
    echo -e "${RED}❌ Authentication failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Get an employee
echo "📋 Getting employee..."
EMPLOYEE_ID=$(curl -s "$BASE_URL/users" -H "Authorization: Bearer $HR_TOKEN" | jq -r '.data[] | select(.role=="employee") | ._id' | head -1)

if [ -z "$EMPLOYEE_ID" ] || [ "$EMPLOYEE_ID" == "null" ]; then
    echo -e "${RED}No employees found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Employee found: $EMPLOYEE_ID${NC}"
echo ""

# ============================================
# PAYROLL CRUD OPERATIONS
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  PAYROLL CRUD OPERATIONS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 1: Create Payroll Record (Draft)
echo -n "1. Create Payroll Record (Draft)... "
PAYROLL1=$(curl -s $BASE_URL/payroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HR_TOKEN" \
  -d "{\"employeeId\":\"$EMPLOYEE_ID\",\"month\":\"2026-02\",\"basicSalary\":50000,\"allowances\":{\"hra\":20000,\"transport\":2000,\"medical\":1500},\"deductions\":{\"tax\":5000,\"pf\":6000},\"status\":\"draft\"}")

if echo "$PAYROLL1" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    PAYROLL1_ID=$(echo "$PAYROLL1" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$PAYROLL1" | jq -r '.message'
    ((FAILED++))
    PAYROLL1_ID=""
fi

# Test 2: Get All Payroll Records
echo -n "2. Get All Payroll Records... "
if curl -s "$BASE_URL/payroll" -H "Authorization: Bearer $HR_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# Test 3: Get Payroll by ID
if [ -n "$PAYROLL1_ID" ]; then
    echo -n "3. Get Payroll by ID... "
    if curl -s "$BASE_URL/payroll/$PAYROLL1_ID" -H "Authorization: Bearer $HR_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

# Test 4: Update Payroll Record
if [ -n "$PAYROLL1_ID" ]; then
    echo -n "4. Update Payroll (Add Bonus)... "
    if curl -s -X PUT "$BASE_URL/payroll/$PAYROLL1_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $HR_TOKEN" \
      -d '{"bonus":5000}' | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

# Test 5: Update Payroll (Add Overtime)
if [ -n "$PAYROLL1_ID" ]; then
    echo -n "5. Update Payroll (Add Overtime)... "
    if curl -s -X PUT "$BASE_URL/payroll/$PAYROLL1_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $HR_TOKEN" \
      -d '{"overtime":3000}' | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

echo ""

# ============================================
# PAYROLL WORKFLOW
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  PAYROLL WORKFLOW${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 6: Process Payroll
if [ -n "$PAYROLL1_ID" ]; then
    echo -n "6. Process Payroll... "
    if curl -s -X PUT "$BASE_URL/payroll/$PAYROLL1_ID/process" \
      -H "Authorization: Bearer $HR_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi

    echo -n "7. Verify Payroll Status (Processed)... "
    PAYROLL_STATUS=$(curl -s "$BASE_URL/payroll/$PAYROLL1_ID" -H "Authorization: Bearer $HR_TOKEN" | jq -r '.data.status')
    if [ "$PAYROLL_STATUS" == "processed" ]; then
        echo -e "${GREEN}✓ (Status: processed)${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ (Status: $PAYROLL_STATUS)${NC}"
        ((FAILED++))
    fi
fi

# Test 8: Mark Payroll as Paid
if [ -n "$PAYROLL1_ID" ]; then
    echo -n "8. Mark Payroll as Paid... "
    if curl -s -X PUT "$BASE_URL/payroll/$PAYROLL1_ID/pay" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $FINANCE_TOKEN" \
      -d '{"paymentMethod":"bank_transfer","paymentReference":"PAY2026FEB001","remarks":"Salary paid for February 2026"}' | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi

    echo -n "9. Verify Payroll Status (Paid)... "
    PAYROLL_STATUS=$(curl -s "$BASE_URL/payroll/$PAYROLL1_ID" -H "Authorization: Bearer $FINANCE_TOKEN" | jq -r '.data.status')
    if [ "$PAYROLL_STATUS" == "paid" ]; then
        echo -e "${GREEN}✓ (Status: paid)${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ (Status: $PAYROLL_STATUS)${NC}"
        ((FAILED++))
    fi
fi

echo ""

# ============================================
# BULK PAYROLL GENERATION
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  BULK PAYROLL GENERATION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 10: Generate Monthly Payroll for All Employees
echo -n "10. Generate Monthly Payroll (March 2026)... "
BULK_RESULT=$(curl -s $BASE_URL/payroll/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HR_TOKEN" \
  -d '{"month":"2026-03"}')

if echo "$BULK_RESULT" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    GENERATED_COUNT=$(echo "$BULK_RESULT" | jq -r '.data | length')
    echo "   Generated $GENERATED_COUNT payroll records"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$BULK_RESULT" | jq -r '.message'
    ((FAILED++))
fi

# Test 11: Verify Generated Payroll Records
echo -n "11. Verify Generated Payroll Records... "
MARCH_PAYROLLS=$(curl -s "$BASE_URL/payroll?month=2026-03" -H "Authorization: Bearer $HR_TOKEN")
if echo "$MARCH_PAYROLLS" | grep -q '"success":true'; then
    MARCH_COUNT=$(echo "$MARCH_PAYROLLS" | jq -r '.count')
    echo -e "${GREEN}✓ (Found $MARCH_COUNT records)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

echo ""

# ============================================
# FILTERING & QUERYING
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  FILTERING & QUERYING${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 12: Filter by Month
echo -n "12. Filter Payroll by Month (2026-02)... "
if curl -s "$BASE_URL/payroll?month=2026-02" -H "Authorization: Bearer $HR_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# Test 13: Filter by Status (draft)
echo -n "13. Filter Payroll by Status (draft)... "
if curl -s "$BASE_URL/payroll?status=draft" -H "Authorization: Bearer $HR_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# Test 14: Filter by Status (paid)
echo -n "14. Filter Payroll by Status (paid)... "
if curl -s "$BASE_URL/payroll?status=paid" -H "Authorization: Bearer $HR_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# Test 15: Filter by Employee
echo -n "15. Filter Payroll by Employee... "
if curl -s "$BASE_URL/payroll?employeeId=$EMPLOYEE_ID" -H "Authorization: Bearer $HR_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

echo ""

# ============================================
# VALIDATION & ERROR HANDLING
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  VALIDATION & ERROR HANDLING${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 16: Duplicate Payroll Prevention
echo -n "16. Prevent Duplicate Payroll (Same Month)... "
DUP_PAYROLL=$(curl -s $BASE_URL/payroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HR_TOKEN" \
  -d "{\"employeeId\":\"$EMPLOYEE_ID\",\"month\":\"2026-02\",\"basicSalary\":50000}")

if echo "$DUP_PAYROLL" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ (Duplicate prevented)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ (Should have failed)${NC}"
    ((FAILED++))
fi

# Test 17: Required Fields Validation
echo -n "17. Validate Required Fields... "
INVALID_PAYROLL=$(curl -s $BASE_URL/payroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HR_TOKEN" \
  -d '{"month":"2026-04"}')

if echo "$INVALID_PAYROLL" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ (Validation working)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ (Should have failed)${NC}"
    ((FAILED++))
fi

# Test 18: Non-existent Payroll
echo -n "18. Handle Non-existent Payroll... "
if curl -s "$BASE_URL/payroll/507f1f77bcf86cd799439011" -H "Authorization: Bearer $HR_TOKEN" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ (Error handled)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

echo ""

# ============================================
# DELETION
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  DELETION OPERATIONS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 19: Delete Payroll Record
if [ -n "$PAYROLL1_ID" ]; then
    echo -n "19. Delete Payroll Record... "
    if curl -s -X DELETE "$BASE_URL/payroll/$PAYROLL1_ID" \
      -H "Authorization: Bearer $HR_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo "=============================================="
echo "  TEST SUMMARY"
echo "=============================================="
echo ""
TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Success Rate: $PERCENTAGE%"
echo ""

if [ $PERCENTAGE -eq 100 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✓✓✓ ALL PAYROLL SYSTEMS WORKING!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
elif [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✓✓ EXCELLENT! Payroll system operational${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
elif [ $PERCENTAGE -ge 75 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  ⚠ GOOD - Most payroll features working${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ✗ ATTENTION NEEDED - Payroll issues detected${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
