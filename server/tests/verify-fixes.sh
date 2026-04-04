#!/bin/bash

# Verify all fixes are working
BASE_URL="http://localhost:4009/api/v1"
PASSED=0
FAILED=0

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  VERIFYING FIXES"
echo "=========================================="
echo ""

# Get tokens
OPS_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ops.admin@edutechglobal.com","password":"opsadmin123"}' | jq -r '.data.token')

CEO_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ceo@edutechglobal.com","password":"ceo123"}' | jq -r '.data.token')

echo "=== Testing New Endpoints ==="
echo ""

# Test 1: Create University
echo -n "1. Create University... "
UNIV_RESPONSE=$(curl -s $BASE_URL/operations/universities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -d '{
    "name": "Fix Test University",
    "code": "FTU'$(date +%s)'",
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

# Test 2: Get University by ID
if [ -n "$UNIV_ID" ]; then
    echo -n "2. Get University by ID... "
    GET_UNIV=$(curl -s "$BASE_URL/operations/universities/$UNIV_ID" \
      -H "Authorization: Bearer $OPS_TOKEN")
    
    if echo "$GET_UNIV" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
    fi
    
    # Test 3: Activate University
    echo -n "3. Activate University... "
    ACTIVATE_UNIV=$(curl -s -X PUT "$BASE_URL/operations/universities/$UNIV_ID/activate" \
      -H "Authorization: Bearer $OPS_TOKEN")
    
    if echo "$ACTIVATE_UNIV" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
    fi
    
    # Test 4: Delete University
    echo -n "4. Delete University... "
    DELETE_UNIV=$(curl -s -X DELETE "$BASE_URL/operations/universities/$UNIV_ID" \
      -H "Authorization: Bearer $OPS_TOKEN")
    
    if echo "$DELETE_UNIV" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
    fi
fi

# Test 5: Dashboard Metrics
echo -n "5. Get Dashboard Metrics... "
DASHBOARD=$(curl -s "$BASE_URL/dashboard/metrics" \
  -H "Authorization: Bearer $CEO_TOKEN")

if echo "$DASHBOARD" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

# Test 6: Create Program
echo -n "6. Create Program... "
PROG_RESPONSE=$(curl -s $BASE_URL/operations/programs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -d '{
    "name": "Fix Test Program",
    "code": "FTP'$(date +%s)'",
    "type": "undergraduate",
    "duration": 3,
    "status": "active"
  }')

if echo "$PROG_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    PROG_ID=$(echo "$PROG_RESPONSE" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
    PROG_ID=""
fi

# Test 7: Get Program by ID
if [ -n "$PROG_ID" ]; then
    echo -n "7. Get Program by ID... "
    GET_PROG=$(curl -s "$BASE_URL/operations/programs/$PROG_ID" \
      -H "Authorization: Bearer $OPS_TOKEN")
    
    if echo "$GET_PROG" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
    fi
fi

# Test 8: Create Study Center
echo -n "8. Create Study Center... "
CENTER_RESPONSE=$(curl -s $BASE_URL/operations/centers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -d '{
    "name": "Fix Test Center",
    "code": "FTC'$(date +%s)'",
    "address": "456 Center Rd",
    "contact": "+919876543210",
    "email": "fixtest@center.com",
    "status": "pending"
  }')

if echo "$CENTER_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    CENTER_ID=$(echo "$CENTER_RESPONSE" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
    CENTER_ID=""
fi

# Test 9: Get Study Center by ID
if [ -n "$CENTER_ID" ]; then
    echo -n "9. Get Study Center by ID... "
    GET_CENTER=$(curl -s "$BASE_URL/operations/centers/$CENTER_ID" \
      -H "Authorization: Bearer $OPS_TOKEN")
    
    if echo "$GET_CENTER" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
    fi
    
    # Test 10: Suspend Study Center
    echo -n "10. Suspend Study Center... "
    SUSPEND_CENTER=$(curl -s -X PUT "$BASE_URL/operations/centers/$CENTER_ID/suspend" \
      -H "Authorization: Bearer $OPS_TOKEN")
    
    if echo "$SUSPEND_CENTER" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
    fi
fi

echo ""
echo "=========================================="
echo "  RESULTS"
echo "=========================================="
echo ""
echo "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL FIXES VERIFIED!${NC}"
    exit 0
else
    echo -e "${RED}⚠ SOME TESTS FAILED${NC}"
    exit 1
fi
