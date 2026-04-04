#!/bin/bash

# Test New Endpoints - Sales Targets, Internal Marks, Escalation Actions
BASE_URL="http://localhost:4009/api/v1"
PASSED=0
FAILED=0

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  NEW ENDPOINTS TEST"
echo "  Testing Recently Added Endpoints"
echo "=============================================="
echo ""

# Get tokens
SALES_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"sales.admin@edutechglobal.com","password":"sales123"}' | jq -r '.data.token')

OPS_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ops.admin@edutechglobal.com","password":"opsadmin123"}' | jq -r '.data.token')

CEO_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ceo@edutechglobal.com","password":"ceo123"}' | jq -r '.data.token')

echo -e "${BLUE}=== SALES MODULE - TARGET ENDPOINTS ===${NC}"
echo ""

echo -n "1. Create Target... "
TARGET=$(curl -s $BASE_URL/sales/targets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SALES_TOKEN" \
  -d '{"type":"revenue","period":"2026-Q1","target":100000,"achieved":0}')

if echo "$TARGET" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    TARGET_ID=$(echo "$TARGET" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$TARGET"
    ((FAILED++))
    TARGET_ID=""
fi

if [ -n "$TARGET_ID" ]; then
    echo -n "2. Get Target by ID... "
    if curl -s "$BASE_URL/sales/targets/$TARGET_ID" -H "Authorization: Bearer $SALES_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi

    echo -n "3. Update Target... "
    if curl -s -X PUT "$BASE_URL/sales/targets/$TARGET_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SALES_TOKEN" \
      -d '{"achieved":50000}' | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi

    echo -n "4. Get All Targets... "
    if curl -s "$BASE_URL/sales/targets" -H "Authorization: Bearer $SALES_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi

    echo -n "5. Delete Target... "
    if curl -s -X DELETE "$BASE_URL/sales/targets/$TARGET_ID" -H "Authorization: Bearer $SALES_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

echo ""
echo -e "${BLUE}=== STUDENT MODULE - INTERNAL MARKS ENDPOINTS ===${NC}"
echo ""

# Create a test student first
RANDOM_NUM=$RANDOM
echo -n "6. Create Test Student... "
STUDENT=$(curl -s $BASE_URL/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -d "{\"name\":\"Test Student\",\"email\":\"test.student$RANDOM_NUM@example.com\",\"phone\":\"+1234567890\",\"enrollmentNo\":\"TEST$RANDOM_NUM\",\"address\":\"123 Test St\",\"programId\":\"507f1f77bcf86cd799439011\",\"centerId\":\"507f1f77bcf86cd799439012\",\"status\":\"active\"}")

if echo "$STUDENT" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    STUDENT_ID=$(echo "$STUDENT" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$STUDENT"
    ((FAILED++))
    STUDENT_ID=""
fi

if [ -n "$STUDENT_ID" ] && [ "$STUDENT_ID" != "null" ]; then
    echo -n "7. Create Internal Mark... "
    MARK=$(curl -s $BASE_URL/students/marks \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $OPS_TOKEN" \
      -d "{\"studentId\":\"$STUDENT_ID\",\"subjectId\":\"507f1f77bcf86cd799439011\",\"marks\":85,\"maxMarks\":100,\"examType\":\"internal\"}")

    if echo "$MARK" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        MARK_ID=$(echo "$MARK" | jq -r '.data._id')
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        echo "$MARK"
        ((FAILED++))
        MARK_ID=""
    fi

    if [ -n "$MARK_ID" ]; then
        echo -n "8. Get Internal Mark by ID... "
        if curl -s "$BASE_URL/students/marks/$MARK_ID" -H "Authorization: Bearer $OPS_TOKEN" | grep -q '"success":true'; then
            echo -e "${GREEN}✓${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC}"
            ((FAILED++))
        fi

        echo -n "9. Update Internal Mark... "
        if curl -s -X PUT "$BASE_URL/students/marks/$MARK_ID" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $OPS_TOKEN" \
          -d '{"marks":90}' | grep -q '"success":true'; then
            echo -e "${GREEN}✓${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC}"
            ((FAILED++))
        fi

        echo -n "10. Get All Internal Marks... "
        if curl -s "$BASE_URL/students/marks" -H "Authorization: Bearer $OPS_TOKEN" | grep -q '"success":true'; then
            echo -e "${GREEN}✓${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC}"
            ((FAILED++))
        fi

        echo -n "11. Delete Internal Mark... "
        if curl -s -X DELETE "$BASE_URL/students/marks/$MARK_ID" -H "Authorization: Bearer $OPS_TOKEN" | grep -q '"success":true'; then
            echo -e "${GREEN}✓${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC}"
            ((FAILED++))
        fi
    fi
else
    echo -e "${RED}Failed to create test student - skipping internal marks tests${NC}"
    ((FAILED+=5))
fi

echo ""
echo -e "${BLUE}=== ESCALATION MODULE - ADDITIONAL ENDPOINTS ===${NC}"
echo ""

echo -n "12. Create Escalation... "
ESCALATION=$(curl -s $BASE_URL/escalations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CEO_TOKEN" \
  -d '{"type":"task_overdue","entityId":"507f1f77bcf86cd799439011","entityType":"Task","description":"Test escalation for overdue task","impact":"medium"}')

if echo "$ESCALATION" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ESCALATION_ID=$(echo "$ESCALATION" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$ESCALATION"
    ((FAILED++))
    ESCALATION_ID=""
fi

if [ -n "$ESCALATION_ID" ]; then
    echo -n "13. Resolve Escalation... "
    if curl -s -X PUT "$BASE_URL/escalations/$ESCALATION_ID/resolve" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $CEO_TOKEN" \
      -d '{"remarks":"Resolved successfully"}' | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi

    echo -n "14. Delete Escalation... "
    if curl -s -X DELETE "$BASE_URL/escalations/$ESCALATION_ID" -H "Authorization: Bearer $CEO_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

echo ""
echo "=============================================="
echo "  TEST SUMMARY"
echo "=============================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
TOTAL=$((PASSED + FAILED))
echo "Total: $TOTAL"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓✓✓ All new endpoints working perfectly!${NC}"
    exit 0
else
    PERCENTAGE=$((PASSED * 100 / TOTAL))
    echo "Success Rate: $PERCENTAGE%"
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
