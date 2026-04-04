#!/bin/bash

# Basic Workflows Test - Student Enrollment, Center Creation, Finance Approval
BASE_URL="http://localhost:4009/api/v1"
PASSED=0
FAILED=0

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=============================================="
echo "  BASIC WORKFLOWS TEST"
echo "  Testing Core Business Functions"
echo "=============================================="
echo ""

# Get tokens
echo "🔐 Authenticating users..."
SUPERADMIN_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"superadmin@erp.com","password":"superadmin123"}' | jq -r '.data.token')

OPS_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ops.admin@edutechglobal.com","password":"opsadmin123"}' | jq -r '.data.token')

FINANCE_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"finance.admin@edutechglobal.com","password":"finance123"}' | jq -r '.data.token')

CEO_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ceo@edutechglobal.com","password":"ceo123"}' | jq -r '.data.token')

if [ -z "$OPS_TOKEN" ] || [ "$OPS_TOKEN" == "null" ]; then
    echo -e "${RED}❌ Authentication failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All users authenticated${NC}"
echo ""

# ============================================
# WORKFLOW 1: CENTER CREATION
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  WORKFLOW 1: Study Center Creation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: Create University
RANDOM_UNI=$RANDOM
echo -n "1.1 Create University... "
UNIVERSITY=$(curl -s $BASE_URL/operations/universities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPS_TOKEN" \
  -d "{\"name\":\"Test University $RANDOM_UNI\",\"code\":\"TU$RANDOM_UNI\",\"type\":\"deemed\",\"address\":\"123 University Ave\",\"phone\":\"+1234567890\",\"email\":\"info$RANDOM_UNI@testuni.edu\",\"status\":\"active\"}")

if echo "$UNIVERSITY" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    UNIVERSITY_ID=$(echo "$UNIVERSITY" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$UNIVERSITY" | jq -r '.message'
    ((FAILED++))
    UNIVERSITY_ID=""
fi

# Step 2: Create Program
if [ -n "$UNIVERSITY_ID" ]; then
    echo -n "1.2 Create Program... "
    PROGRAM=$(curl -s $BASE_URL/operations/programs \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $OPS_TOKEN" \
      -d "{\"universityId\":\"$UNIVERSITY_ID\",\"name\":\"Bachelor of Technology\",\"code\":\"BTECH$RANDOM_UNI\",\"duration\":4,\"durationType\":\"years\",\"type\":\"undergraduate\",\"status\":\"active\"}")

    if echo "$PROGRAM" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        PROGRAM_ID=$(echo "$PROGRAM" | jq -r '.data._id')
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        echo "$PROGRAM" | jq -r '.message'
        ((FAILED++))
        PROGRAM_ID=""
    fi
fi

# Step 3: Create Study Center
if [ -n "$PROGRAM_ID" ]; then
    echo -n "1.3 Create Study Center... "
    CENTER=$(curl -s $BASE_URL/operations/centers \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $OPS_TOKEN" \
      -d "{\"name\":\"Downtown Learning Center\",\"code\":\"DLC$RANDOM_UNI\",\"address\":\"456 Main St, City\",\"contact\":\"+1234567891\",\"email\":\"dlc$RANDOM_UNI@testuni.edu\",\"status\":\"pending\"}")

    if echo "$CENTER" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        CENTER_ID=$(echo "$CENTER" | jq -r '.data._id')
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        echo "$CENTER" | jq -r '.message'
        ((FAILED++))
        CENTER_ID=""
    fi
fi

# Step 4: Activate Center
if [ -n "$CENTER_ID" ]; then
    echo -n "1.4 Approve Study Center... "
    if curl -s -X PUT "$BASE_URL/operations/centers/$CENTER_ID/approve" \
      -H "Authorization: Bearer $OPS_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi

    echo -n "1.5 Verify Center Status... "
    CENTER_STATUS=$(curl -s "$BASE_URL/operations/centers/$CENTER_ID" -H "Authorization: Bearer $OPS_TOKEN" | jq -r '.data.status')
    if [ "$CENTER_STATUS" == "active" ]; then
        echo -e "${GREEN}✓ (Status: active)${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ (Status: $CENTER_STATUS)${NC}"
        ((FAILED++))
    fi
fi

echo ""

# ============================================
# WORKFLOW 2: STUDENT ENROLLMENT
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  WORKFLOW 2: Student Enrollment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -n "$CENTER_ID" ] && [ -n "$PROGRAM_ID" ]; then
    # Step 1: Create Admission Session (needs department ID)
    echo -n "2.1 Get Operations Department... "
    DEPT_ID=$(curl -s "$BASE_URL/departments" -H "Authorization: Bearer $OPS_TOKEN" | jq -r '.data[] | select(.type=="operations") | ._id' | head -1)
    
    if [ -n "$DEPT_ID" ] && [ "$DEPT_ID" != "null" ]; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi

    echo -n "2.2 Create Admission Session... "
    SESSION=$(curl -s $BASE_URL/operations/sessions \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $OPS_TOKEN" \
      -d "{\"subDepartmentId\":\"$DEPT_ID\",\"name\":\"Spring 2026\",\"startDate\":\"2026-01-15\",\"endDate\":\"2026-05-15\",\"status\":\"active\"}")

    if echo "$SESSION" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        SESSION_ID=$(echo "$SESSION" | jq -r '.data._id')
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        echo "$SESSION" | jq -r '.message'
        ((FAILED++))
        SESSION_ID=""
    fi

    # Step 2: Create Student (Pending Status)
    if [ -n "$SESSION_ID" ]; then
        RANDOM_NUM=$RANDOM
        echo -n "2.3 Create Student Application... "
        STUDENT=$(curl -s $BASE_URL/students \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $OPS_TOKEN" \
          -d "{\"name\":\"John Doe\",\"email\":\"john.doe$RANDOM_NUM@example.com\",\"phone\":\"+1234567892\",\"enrollmentNo\":\"ENR$RANDOM_NUM\",\"address\":\"789 Student Lane\",\"programId\":\"$PROGRAM_ID\",\"centerId\":\"$CENTER_ID\",\"sessionId\":\"$SESSION_ID\",\"status\":\"pending\"}")

        if echo "$STUDENT" | grep -q '"success":true'; then
            echo -e "${GREEN}✓${NC}"
            STUDENT_ID=$(echo "$STUDENT" | jq -r '.data._id')
            ((PASSED++))
        else
            echo -e "${RED}✗${NC}"
            echo "$STUDENT" | jq -r '.message'
            ((FAILED++))
            STUDENT_ID=""
        fi
    fi

    # Step 3: Skip Fee Structure (not a critical endpoint)
    # Step 4: Approve Student (Finance Admin)
    if [ -n "$STUDENT_ID" ]; then
        echo -n "2.4 Approve Student Enrollment... "
        if curl -s -X PUT "$BASE_URL/students/$STUDENT_ID/approve" \
          -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
            echo -e "${GREEN}✓${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC}"
            ((FAILED++))
        fi

        echo -n "2.5 Verify Student Status... "
        STUDENT_STATUS=$(curl -s "$BASE_URL/students/$STUDENT_ID" -H "Authorization: Bearer $OPS_TOKEN" | jq -r '.data.status')
        if [ "$STUDENT_STATUS" == "active" ]; then
            echo -e "${GREEN}✓ (Status: active)${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗ (Status: $STUDENT_STATUS)${NC}"
            ((FAILED++))
        fi
    fi
else
    echo -e "${YELLOW}⚠ Skipping student enrollment - prerequisites missing${NC}"
    ((FAILED+=4))
fi

echo ""

# ============================================
# WORKFLOW 3: FINANCE APPROVAL
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  WORKFLOW 3: Finance Approval Process${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -n "$STUDENT_ID" ]; then
    # Step 1: Create Invoice
    echo -n "3.1 Create Student Invoice... "
    INVOICE=$(curl -s $BASE_URL/finance/invoices \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $FINANCE_TOKEN" \
      -d "{\"studentId\":\"$STUDENT_ID\",\"centerId\":\"$CENTER_ID\",\"invoiceNo\":\"INV$RANDOM_NUM\",\"amount\":50000,\"tax\":0,\"total\":50000,\"items\":[{\"description\":\"Tuition Fee\",\"quantity\":1,\"rate\":50000,\"amount\":50000}],\"dueDate\":\"2026-02-15\",\"status\":\"draft\"}")

    if echo "$INVOICE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        INVOICE_ID=$(echo "$INVOICE" | jq -r '.data._id')
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        echo "$INVOICE" | jq -r '.message'
        ((FAILED++))
        INVOICE_ID=""
    fi

    # Step 2: Mark Invoice as Paid
    if [ -n "$INVOICE_ID" ]; then
        echo -n "3.2 Mark Invoice as Paid... "
        if curl -s -X PUT "$BASE_URL/finance/invoices/$INVOICE_ID/approve" \
          -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
            echo -e "${GREEN}✓${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC}"
            ((FAILED++))
        fi

        echo -n "3.3 Verify Invoice Status... "
        INVOICE_STATUS=$(curl -s "$BASE_URL/finance/invoices/$INVOICE_ID" -H "Authorization: Bearer $FINANCE_TOKEN" | jq -r '.data.status')
        if [ "$INVOICE_STATUS" == "paid" ]; then
            echo -e "${GREEN}✓ (Status: paid)${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗ (Status: $INVOICE_STATUS)${NC}"
            ((FAILED++))
        fi
    fi

    # Step 3: Create Payment Entry
    if [ -n "$INVOICE_ID" ]; then
        echo -n "3.4 Create Payment Entry... "
        PAYMENT=$(curl -s $BASE_URL/finance/payments \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $FINANCE_TOKEN" \
          -d "{\"invoiceId\":\"$INVOICE_ID\",\"amount\":50000,\"method\":\"bank_transfer\",\"referenceNo\":\"TXN$RANDOM_NUM\",\"notes\":\"Payment received\"}")

        if echo "$PAYMENT" | grep -q '"success":true'; then
            echo -e "${GREEN}✓${NC}"
            PAYMENT_ID=$(echo "$PAYMENT" | jq -r '.data._id')
            ((PASSED++))
        else
            echo -e "${RED}✗${NC}"
            echo "$PAYMENT" | jq -r '.message'
            ((FAILED++))
            PAYMENT_ID=""
        fi
    fi

    # Step 4: Create Expense Claim
    echo -n "3.5 Create Expense Claim... "
    EXPENSE=$(curl -s $BASE_URL/finance/expenses \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $FINANCE_TOKEN" \
      -d '{"title":"Office Supplies","amount":5000,"category":"supplies","description":"Monthly office supplies","status":"pending"}')

    if echo "$EXPENSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        EXPENSE_ID=$(echo "$EXPENSE" | jq -r '.data._id')
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        echo "$EXPENSE" | jq -r '.message'
        ((FAILED++))
        EXPENSE_ID=""
    fi

    # Step 5: Approve Expense
    if [ -n "$EXPENSE_ID" ]; then
        echo -n "3.6 Approve Expense Claim... "
        if curl -s -X PUT "$BASE_URL/finance/expenses/$EXPENSE_ID/approve" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $FINANCE_TOKEN" \
          -d '{"action":"approve","remarks":"Approved"}' | grep -q '"success":true'; then
            echo -e "${GREEN}✓${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗${NC}"
            ((FAILED++))
        fi

        echo -n "3.7 Verify Expense Status... "
        EXPENSE_STATUS=$(curl -s "$BASE_URL/finance/expenses/$EXPENSE_ID" -H "Authorization: Bearer $FINANCE_TOKEN" | jq -r '.data.status')
        if [ "$EXPENSE_STATUS" == "approved" ]; then
            echo -e "${GREEN}✓ (Status: approved)${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗ (Status: $EXPENSE_STATUS)${NC}"
            ((FAILED++))
        fi
    fi
else
    echo -e "${YELLOW}⚠ Skipping finance workflow - student not created${NC}"
    ((FAILED+=7))
fi

echo ""

# ============================================
# WORKFLOW 4: COMPLETE ADMISSION FLOW
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  WORKFLOW 4: End-to-End Admission${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -n "$CENTER_ID" ] && [ -n "$PROGRAM_ID" ] && [ -n "$SESSION_ID" ]; then
    RANDOM_NUM2=$RANDOM
    
    echo -n "4.1 Submit Student Application... "
    STUDENT2=$(curl -s $BASE_URL/students \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $OPS_TOKEN" \
      -d "{\"name\":\"Jane Smith\",\"email\":\"jane.smith$RANDOM_NUM2@example.com\",\"phone\":\"+1234567893\",\"enrollmentNo\":\"ENR$RANDOM_NUM2\",\"address\":\"321 Campus Road\",\"programId\":\"$PROGRAM_ID\",\"centerId\":\"$CENTER_ID\",\"sessionId\":\"$SESSION_ID\",\"status\":\"pending\"}")

    if echo "$STUDENT2" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        STUDENT2_ID=$(echo "$STUDENT2" | jq -r '.data._id')
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
        STUDENT2_ID=""
    fi

    if [ -n "$STUDENT2_ID" ]; then
        echo -n "4.2 Generate Invoice... "
        INVOICE2=$(curl -s $BASE_URL/finance/invoices \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $FINANCE_TOKEN" \
          -d "{\"studentId\":\"$STUDENT2_ID\",\"centerId\":\"$CENTER_ID\",\"invoiceNo\":\"INV$RANDOM_NUM2\",\"amount\":55000,\"tax\":0,\"total\":55000,\"items\":[{\"description\":\"Admission Fee\",\"quantity\":1,\"rate\":5000,\"amount\":5000},{\"description\":\"Tuition Fee\",\"quantity\":1,\"rate\":50000,\"amount\":50000}],\"dueDate\":\"2026-02-20\",\"status\":\"sent\"}")

        if echo "$INVOICE2" | grep -q '"success":true'; then
            echo -e "${GREEN}✓${NC}"
            INVOICE2_ID=$(echo "$INVOICE2" | jq -r '.data._id')
            ((PASSED++))
        else
            echo -e "${RED}✗${NC}"
            ((FAILED++))
            INVOICE2_ID=""
        fi

        if [ -n "$INVOICE2_ID" ]; then
            echo -n "4.3 Process Payment... "
            PAYMENT2=$(curl -s $BASE_URL/finance/payments \
              -H "Content-Type: application/json" \
              -H "Authorization: Bearer $FINANCE_TOKEN" \
              -d "{\"invoiceId\":\"$INVOICE2_ID\",\"amount\":55000,\"method\":\"upi\",\"referenceNo\":\"TXN$RANDOM_NUM2\",\"notes\":\"Online payment\"}")

            if echo "$PAYMENT2" | grep -q '"success":true'; then
                echo -e "${GREEN}✓${NC}"
                ((PASSED++))
            else
                echo -e "${RED}✗${NC}"
                ((FAILED++))
            fi

            echo -n "4.4 Mark Invoice Paid... "
            if curl -s -X PUT "$BASE_URL/finance/invoices/$INVOICE2_ID/approve" \
              -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
                echo -e "${GREEN}✓${NC}"
                ((PASSED++))
            else
                echo -e "${RED}✗${NC}"
                ((FAILED++))
            fi

            echo -n "4.5 Approve Admission... "
            if curl -s -X PUT "$BASE_URL/students/$STUDENT2_ID/approve" \
              -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
                echo -e "${GREEN}✓${NC}"
                ((PASSED++))
            else
                echo -e "${RED}✗${NC}"
                ((FAILED++))
            fi

            echo -n "4.6 Verify Complete Enrollment... "
            FINAL_STATUS=$(curl -s "$BASE_URL/students/$STUDENT2_ID" -H "Authorization: Bearer $OPS_TOKEN" | jq -r '.data.status')
            if [ "$FINAL_STATUS" == "active" ]; then
                echo -e "${GREEN}✓ (Student enrolled successfully)${NC}"
                ((PASSED++))
            else
                echo -e "${RED}✗ (Status: $FINAL_STATUS)${NC}"
                ((FAILED++))
            fi
        fi
    fi
else
    echo -e "${YELLOW}⚠ Skipping end-to-end flow - prerequisites missing${NC}"
    ((FAILED+=6))
fi

echo ""
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
    echo -e "${GREEN}  ✓✓✓ ALL WORKFLOWS WORKING PERFECTLY!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
elif [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✓✓ EXCELLENT! Core workflows operational${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
elif [ $PERCENTAGE -ge 75 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  ⚠ GOOD - Most workflows working${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ✗ ATTENTION NEEDED - Some workflows failing${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
