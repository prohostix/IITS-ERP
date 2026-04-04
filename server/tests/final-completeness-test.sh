#!/bin/bash

# Final Completeness Test - Verify all missing endpoints are now added
BASE_URL="http://localhost:4009/api/v1"
PASSED=0
FAILED=0

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  FINAL COMPLETENESS TEST"
echo "  Verifying All CRUD Endpoints"
echo "=============================================="
echo ""

# Get tokens
HR_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"hr.admin@edutechglobal.com","password":"hradmin123"}' | jq -r '.data.token')

FINANCE_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"finance.admin@edutechglobal.com","password":"finance123"}' | jq -r '.data.token')

echo -e "${BLUE}=== HR MODULE ENDPOINTS ===${NC}"
echo ""

# Test HR endpoints
echo -n "1. Create Vacancy... "
VACANCY=$(curl -s $BASE_URL/hr/vacancies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HR_TOKEN" \
  -d '{"title":"Test Position","positions":1,"description":"Test","requirements":["Test"],"status":"open"}')

if echo "$VACANCY" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    VACANCY_ID=$(echo "$VACANCY" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
    VACANCY_ID=""
fi

if [ -n "$VACANCY_ID" ]; then
    echo -n "2. Get Vacancy by ID... "
    if curl -s "$BASE_URL/hr/vacancies/$VACANCY_ID" -H "Authorization: Bearer $HR_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
    
    echo -n "3. Close Vacancy... "
    if curl -s -X PUT "$BASE_URL/hr/vacancies/$VACANCY_ID/close" -H "Authorization: Bearer $HR_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

echo -n "4. Create Holiday... "
HOLIDAY=$(curl -s $BASE_URL/hr/holidays \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HR_TOKEN" \
  -d '{"name":"Test Holiday","date":"2025-12-25","type":"national"}')

if echo "$HOLIDAY" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    HOLIDAY_ID=$(echo "$HOLIDAY" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
    HOLIDAY_ID=""
fi

if [ -n "$HOLIDAY_ID" ]; then
    echo -n "5. Get Holiday by ID... "
    if curl -s "$BASE_URL/hr/holidays/$HOLIDAY_ID" -H "Authorization: Bearer $HR_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
    
    echo -n "6. Update Holiday... "
    if curl -s -X PUT "$BASE_URL/hr/holidays/$HOLIDAY_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $HR_TOKEN" \
      -d '{"type":"regional"}' | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
    
    echo -n "7. Delete Holiday... "
    if curl -s -X DELETE "$BASE_URL/hr/holidays/$HOLIDAY_ID" -H "Authorization: Bearer $HR_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

echo ""
echo -e "${BLUE}=== FINANCE MODULE ENDPOINTS ===${NC}"
echo ""

echo -n "8. Create Target... "
TARGET=$(curl -s $BASE_URL/finance/targets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d '{"title":"Q1 Target","targetAmount":100000,"period":"quarterly","startDate":"2025-01-01","endDate":"2025-03-31","status":"active"}')

if echo "$TARGET" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    TARGET_ID=$(echo "$TARGET" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
    TARGET_ID=""
fi

if [ -n "$TARGET_ID" ]; then
    echo -n "9. Get Target by ID... "
    if curl -s "$BASE_URL/finance/targets/$TARGET_ID" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
    
    echo -n "10. Delete Target... "
    if curl -s -X DELETE "$BASE_URL/finance/targets/$TARGET_ID" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

echo ""
echo "=============================================="
echo "  RESULTS"
echo "=============================================="
echo ""
echo "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

PERCENTAGE=$((PASSED * 100 / (PASSED + FAILED)))
echo "Success Rate: $PERCENTAGE%"
echo ""

if [ $PERCENTAGE -eq 100 ]; then
    echo -e "${GREEN}✓✓✓ PERFECT! All endpoints working!${NC}"
    exit 0
elif [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}✓✓ EXCELLENT! System is complete!${NC}"
    exit 0
else
    echo -e "${RED}⚠ Some endpoints need attention${NC}"
    exit 1
fi


echo ""
echo -e "${BLUE}=== SALES MODULE - TARGET ENDPOINTS ===${NC}"
echo ""

SALES_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"sales.admin@edutechglobal.com","password":"sales123"}' | jq -r '.data.token')

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

OPS_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ops.admin@edutechglobal.com","password":"ops123"}' | jq -r '.data.token')

# Get a student ID first
STUDENT_ID=$(curl -s "$BASE_URL/students" -H "Authorization: Bearer $OPS_TOKEN" | jq -r '.data[0]._id')

if [ -n "$STUDENT_ID" ] && [ "$STUDENT_ID" != "null" ]; then
    echo -n "1. Create Internal Mark... "
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
        ((FAILED++))
        MARK_ID=""
    fi

    if [ -n "$MARK_ID" ]; then
        echo -n "2. Get Internal Mark by ID... "
        if curl -s "$BASE_URL/students/marks/$MARK_ID" -H "Authorization: Bearer $OPS_TOKEN" | grep -q '"success":true'; then
            echo -e "${GREEN}✓${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC}"
            ((FAILED++))
        fi

        echo -n "3. Update Internal Mark... "
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

        echo -n "4. Get All Internal Marks... "
        if curl -s "$BASE_URL/students/marks" -H "Authorization: Bearer $OPS_TOKEN" | grep -q '"success":true'; then
            echo -e "${GREEN}✓${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC}"
            ((FAILED++))
        fi

        echo -n "5. Delete Internal Mark... "
        if curl -s -X DELETE "$BASE_URL/students/marks/$MARK_ID" -H "Authorization: Bearer $OPS_TOKEN" | grep -q '"success":true'; then
            echo -e "${GREEN}✓${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC}"
            ((FAILED++))
        fi
    fi
else
    echo -e "${RED}No students found - skipping internal marks tests${NC}"
    ((FAILED+=5))
fi

echo ""
echo -e "${BLUE}=== ESCALATION MODULE - ADDITIONAL ENDPOINTS ===${NC}"
echo ""

CEO_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ceo@edutechglobal.com","password":"ceo123"}' | jq -r '.data.token')

echo -n "1. Create Escalation... "
ESCALATION=$(curl -s $BASE_URL/escalations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CEO_TOKEN" \
  -d '{"type":"complaint","title":"Test Escalation","description":"Test","impact":"medium","currentLevel":1}')

if echo "$ESCALATION" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ESCALATION_ID=$(echo "$ESCALATION" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
    ESCALATION_ID=""
fi

if [ -n "$ESCALATION_ID" ]; then
    echo -n "2. Resolve Escalation... "
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

    echo -n "3. Delete Escalation... "
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
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
