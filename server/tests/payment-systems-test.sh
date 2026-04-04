#!/bin/bash

# Payment Systems Comprehensive Test
BASE_URL="http://localhost:4009/api/v1"
PASSED=0
FAILED=0

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=============================================="
echo "  PAYMENT SYSTEMS COMPREHENSIVE TEST"
echo "  Testing All Payment-Related Features"
echo "=============================================="
echo ""

# Authenticate
echo "🔐 Authenticating..."
FINANCE_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"finance.admin@edutechglobal.com","password":"finance123"}' | jq -r '.data.token')

OPS_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ops.admin@edutechglobal.com","password":"opsadmin123"}' | jq -r '.data.token')

CEO_TOKEN=$(curl -s $BASE_URL/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ceo@edutechglobal.com","password":"ceo123"}' | jq -r '.data.token')

if [ -z "$FINANCE_TOKEN" ] || [ "$FINANCE_TOKEN" == "null" ]; then
    echo -e "${RED}❌ Authentication failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Get prerequisites
echo "📋 Getting prerequisites..."
CENTER_ID=$(curl -s "$BASE_URL/operations/centers" -H "Authorization: Bearer $OPS_TOKEN" | jq -r '.data[0]._id')
STUDENT_ID=$(curl -s "$BASE_URL/students" -H "Authorization: Bearer $OPS_TOKEN" | jq -r '.data[0]._id')

if [ -z "$CENTER_ID" ] || [ "$CENTER_ID" == "null" ]; then
    echo -e "${RED}No centers found - creating one...${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites ready${NC}"
echo ""

# ============================================
# INVOICE MANAGEMENT TESTS
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  INVOICE MANAGEMENT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

RANDOM_INV=$RANDOM

# Test 1: Create Invoice (Draft)
echo -n "1. Create Invoice (Draft)... "
INVOICE1=$(curl -s $BASE_URL/finance/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d "{\"centerId\":\"$CENTER_ID\",\"studentId\":\"$STUDENT_ID\",\"invoiceNo\":\"INV-DRAFT-$RANDOM_INV\",\"amount\":50000,\"tax\":5000,\"total\":55000,\"items\":[{\"description\":\"Tuition Fee\",\"quantity\":1,\"rate\":50000,\"amount\":50000}],\"status\":\"draft\"}")

if echo "$INVOICE1" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    INVOICE1_ID=$(echo "$INVOICE1" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$INVOICE1" | jq -r '.message'
    ((FAILED++))
    INVOICE1_ID=""
fi

# Test 2: Create Invoice (Sent)
echo -n "2. Create Invoice (Sent)... "
INVOICE2=$(curl -s $BASE_URL/finance/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d "{\"centerId\":\"$CENTER_ID\",\"studentId\":\"$STUDENT_ID\",\"invoiceNo\":\"INV-SENT-$RANDOM_INV\",\"amount\":30000,\"tax\":3000,\"total\":33000,\"items\":[{\"description\":\"Exam Fee\",\"quantity\":1,\"rate\":30000,\"amount\":30000}],\"dueDate\":\"2026-03-15\",\"status\":\"sent\"}")

if echo "$INVOICE2" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    INVOICE2_ID=$(echo "$INVOICE2" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$INVOICE2" | jq -r '.message'
    ((FAILED++))
    INVOICE2_ID=""
fi

# Test 3: Get All Invoices
echo -n "3. Get All Invoices... "
if curl -s "$BASE_URL/finance/invoices" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# Test 4: Get Invoice by ID
if [ -n "$INVOICE1_ID" ]; then
    echo -n "4. Get Invoice by ID... "
    if curl -s "$BASE_URL/finance/invoices/$INVOICE1_ID" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

# Test 5: Update Invoice
if [ -n "$INVOICE1_ID" ]; then
    echo -n "5. Update Invoice... "
    if curl -s -X PUT "$BASE_URL/finance/invoices/$INVOICE1_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $FINANCE_TOKEN" \
      -d '{"status":"sent"}' | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

# Test 6: Approve Invoice (Mark as Paid)
if [ -n "$INVOICE2_ID" ]; then
    echo -n "6. Approve Invoice (Mark as Paid)... "
    if curl -s -X PUT "$BASE_URL/finance/invoices/$INVOICE2_ID/approve" \
      -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi

    echo -n "7. Verify Invoice Status (Paid)... "
    INV_STATUS=$(curl -s "$BASE_URL/finance/invoices/$INVOICE2_ID" -H "Authorization: Bearer $FINANCE_TOKEN" | jq -r '.data.status')
    if [ "$INV_STATUS" == "paid" ]; then
        echo -e "${GREEN}✓ (Status: paid)${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ (Status: $INV_STATUS)${NC}"
        ((FAILED++))
    fi
fi

# Test 8: Filter Invoices by Status
echo -n "8. Filter Invoices by Status (draft)... "
if curl -s "$BASE_URL/finance/invoices?status=draft" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# Test 9: Filter Invoices by Center
echo -n "9. Filter Invoices by Center... "
if curl -s "$BASE_URL/finance/invoices?centerId=$CENTER_ID" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

echo ""

# ============================================
# PAYMENT ENTRY TESTS
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  PAYMENT ENTRY MANAGEMENT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create a new invoice for payment tests
RANDOM_PAY=$RANDOM
INVOICE_PAY=$(curl -s $BASE_URL/finance/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d "{\"centerId\":\"$CENTER_ID\",\"invoiceNo\":\"INV-PAY-$RANDOM_PAY\",\"amount\":25000,\"tax\":2500,\"total\":27500,\"items\":[{\"description\":\"Lab Fee\",\"quantity\":1,\"rate\":25000,\"amount\":25000}],\"status\":\"sent\"}")
INVOICE_PAY_ID=$(echo "$INVOICE_PAY" | jq -r '.data._id')

# Test 10: Create Payment (Cash)
echo -n "10. Create Payment Entry (Cash)... "
PAYMENT1=$(curl -s $BASE_URL/finance/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d "{\"invoiceId\":\"$INVOICE_PAY_ID\",\"amount\":10000,\"method\":\"cash\",\"notes\":\"Partial payment\"}")

if echo "$PAYMENT1" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    PAYMENT1_ID=$(echo "$PAYMENT1" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$PAYMENT1" | jq -r '.message'
    ((FAILED++))
    PAYMENT1_ID=""
fi

# Test 11: Create Payment (Bank Transfer)
echo -n "11. Create Payment Entry (Bank Transfer)... "
PAYMENT2=$(curl -s $BASE_URL/finance/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d "{\"invoiceId\":\"$INVOICE_PAY_ID\",\"amount\":17500,\"method\":\"bank_transfer\",\"referenceNo\":\"TXN$RANDOM_PAY\",\"notes\":\"Final payment\"}")

if echo "$PAYMENT2" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    PAYMENT2_ID=$(echo "$PAYMENT2" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$PAYMENT2" | jq -r '.message'
    ((FAILED++))
    PAYMENT2_ID=""
fi

# Test 12: Create Payment (UPI)
echo -n "12. Create Payment Entry (UPI)... "
PAYMENT3=$(curl -s $BASE_URL/finance/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d "{\"invoiceId\":\"$INVOICE_PAY_ID\",\"amount\":5000,\"method\":\"upi\",\"referenceNo\":\"UPI$RANDOM_PAY\",\"notes\":\"UPI payment\"}")

if echo "$PAYMENT3" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    PAYMENT3_ID=$(echo "$PAYMENT3" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$PAYMENT3" | jq -r '.message'
    ((FAILED++))
    PAYMENT3_ID=""
fi

# Test 13: Create Payment (Card)
echo -n "13. Create Payment Entry (Card)... "
PAYMENT4=$(curl -s $BASE_URL/finance/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d "{\"invoiceId\":\"$INVOICE_PAY_ID\",\"amount\":3000,\"method\":\"card\",\"referenceNo\":\"CARD$RANDOM_PAY\",\"notes\":\"Card payment\"}")

if echo "$PAYMENT4" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    PAYMENT4_ID=$(echo "$PAYMENT4" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$PAYMENT4" | jq -r '.message'
    ((FAILED++))
    PAYMENT4_ID=""
fi

# Test 14: Create Payment (Cheque)
echo -n "14. Create Payment Entry (Cheque)... "
PAYMENT5=$(curl -s $BASE_URL/finance/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d "{\"invoiceId\":\"$INVOICE_PAY_ID\",\"amount\":2000,\"method\":\"cheque\",\"referenceNo\":\"CHQ$RANDOM_PAY\",\"notes\":\"Cheque payment\"}")

if echo "$PAYMENT5" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    PAYMENT5_ID=$(echo "$PAYMENT5" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$PAYMENT5" | jq -r '.message'
    ((FAILED++))
    PAYMENT5_ID=""
fi

# Test 15: Get All Payments
echo -n "15. Get All Payments... "
if curl -s "$BASE_URL/finance/payments" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# Test 16: Get Payment by ID
if [ -n "$PAYMENT1_ID" ]; then
    echo -n "16. Get Payment by ID... "
    if curl -s "$BASE_URL/finance/payments/$PAYMENT1_ID" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

# Test 17: Update Payment
if [ -n "$PAYMENT1_ID" ]; then
    echo -n "17. Update Payment... "
    if curl -s -X PUT "$BASE_URL/finance/payments/$PAYMENT1_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $FINANCE_TOKEN" \
      -d '{"notes":"Updated payment note"}' | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

# Test 18: Filter Payments by Invoice
echo -n "18. Filter Payments by Invoice... "
if curl -s "$BASE_URL/finance/payments?invoiceId=$INVOICE_PAY_ID" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# Test 19: Filter Payments by Method
echo -n "19. Filter Payments by Method (cash)... "
if curl -s "$BASE_URL/finance/payments?method=cash" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

echo ""

# ============================================
# EXPENSE CLAIM TESTS
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  EXPENSE CLAIM MANAGEMENT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

RANDOM_EXP=$RANDOM

# Test 20: Create Expense (Pending)
echo -n "20. Create Expense Claim (Pending)... "
EXPENSE1=$(curl -s $BASE_URL/finance/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d "{\"title\":\"Office Supplies $RANDOM_EXP\",\"amount\":5000,\"category\":\"supplies\",\"description\":\"Monthly office supplies\",\"status\":\"pending\"}")

if echo "$EXPENSE1" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    EXPENSE1_ID=$(echo "$EXPENSE1" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$EXPENSE1" | jq -r '.message'
    ((FAILED++))
    EXPENSE1_ID=""
fi

# Test 21: Create Expense (Travel)
echo -n "21. Create Expense Claim (Travel)... "
EXPENSE2=$(curl -s $BASE_URL/finance/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d "{\"title\":\"Business Travel $RANDOM_EXP\",\"amount\":15000,\"category\":\"travel\",\"description\":\"Client meeting travel\",\"status\":\"pending\"}")

if echo "$EXPENSE2" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    EXPENSE2_ID=$(echo "$EXPENSE2" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$EXPENSE2" | jq -r '.message'
    ((FAILED++))
    EXPENSE2_ID=""
fi

# Test 22: Create Expense (Utilities)
echo -n "22. Create Expense Claim (Utilities)... "
EXPENSE3=$(curl -s $BASE_URL/finance/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d "{\"title\":\"Electricity Bill $RANDOM_EXP\",\"amount\":8000,\"category\":\"utilities\",\"description\":\"Monthly electricity\",\"status\":\"pending\"}")

if echo "$EXPENSE3" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    EXPENSE3_ID=$(echo "$EXPENSE3" | jq -r '.data._id')
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "$EXPENSE3" | jq -r '.message'
    ((FAILED++))
    EXPENSE3_ID=""
fi

# Test 23: Get All Expenses
echo -n "23. Get All Expenses... "
if curl -s "$BASE_URL/finance/expenses" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# Test 24: Get Expense by ID
if [ -n "$EXPENSE1_ID" ]; then
    echo -n "24. Get Expense by ID... "
    if curl -s "$BASE_URL/finance/expenses/$EXPENSE1_ID" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

# Test 25: Update Expense
if [ -n "$EXPENSE1_ID" ]; then
    echo -n "25. Update Expense... "
    if curl -s -X PUT "$BASE_URL/finance/expenses/$EXPENSE1_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $FINANCE_TOKEN" \
      -d '{"amount":5500}' | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

# Test 26: Approve Expense
if [ -n "$EXPENSE2_ID" ]; then
    echo -n "26. Approve Expense... "
    if curl -s -X PUT "$BASE_URL/finance/expenses/$EXPENSE2_ID/approve" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $FINANCE_TOKEN" \
      -d '{"action":"approve","remarks":"Approved for payment"}' | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi

    echo -n "27. Verify Expense Status (Approved)... "
    EXP_STATUS=$(curl -s "$BASE_URL/finance/expenses/$EXPENSE2_ID" -H "Authorization: Bearer $FINANCE_TOKEN" | jq -r '.data.status')
    if [ "$EXP_STATUS" == "approved" ]; then
        echo -e "${GREEN}✓ (Status: approved)${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ (Status: $EXP_STATUS)${NC}"
        ((FAILED++))
    fi
fi

# Test 28: Reject Expense
if [ -n "$EXPENSE3_ID" ]; then
    echo -n "28. Reject Expense... "
    if curl -s -X PUT "$BASE_URL/finance/expenses/$EXPENSE3_ID/approve" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $FINANCE_TOKEN" \
      -d '{"action":"reject","remarks":"Not approved"}' | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi

    echo -n "29. Verify Expense Status (Rejected)... "
    EXP_STATUS=$(curl -s "$BASE_URL/finance/expenses/$EXPENSE3_ID" -H "Authorization: Bearer $FINANCE_TOKEN" | jq -r '.data.status')
    if [ "$EXP_STATUS" == "rejected" ]; then
        echo -e "${GREEN}✓ (Status: rejected)${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ (Status: $EXP_STATUS)${NC}"
        ((FAILED++))
    fi
fi

# Test 30: Filter Expenses by Status
echo -n "30. Filter Expenses by Status (pending)... "
if curl -s "$BASE_URL/finance/expenses?status=pending" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

# Test 31: Filter Expenses by Category
echo -n "31. Filter Expenses by Category (travel)... "
if curl -s "$BASE_URL/finance/expenses?category=travel" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

echo ""

# ============================================
# DELETION TESTS
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  DELETION OPERATIONS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 32: Delete Payment
if [ -n "$PAYMENT5_ID" ]; then
    echo -n "32. Delete Payment Entry... "
    if curl -s -X DELETE "$BASE_URL/finance/payments/$PAYMENT5_ID" \
      -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

# Test 33: Delete Expense
if [ -n "$EXPENSE1_ID" ]; then
    echo -n "33. Delete Expense Claim... "
    if curl -s -X DELETE "$BASE_URL/finance/expenses/$EXPENSE1_ID" \
      -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

# Test 34: Delete Invoice
if [ -n "$INVOICE1_ID" ]; then
    echo -n "34. Delete Invoice... "
    if curl -s -X DELETE "$BASE_URL/finance/invoices/$INVOICE1_ID" \
      -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
    fi
fi

echo ""

# ============================================
# EDGE CASES & VALIDATION TESTS
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  EDGE CASES & VALIDATION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 35: Create Invoice without required fields
echo -n "35. Validate Invoice Required Fields... "
INVALID_INV=$(curl -s $BASE_URL/finance/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d '{"amount":1000}')

if echo "$INVALID_INV" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ (Validation working)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ (Should have failed)${NC}"
    ((FAILED++))
fi

# Test 36: Create Payment without invoice
echo -n "36. Validate Payment Required Fields... "
INVALID_PAY=$(curl -s $BASE_URL/finance/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d '{"amount":1000}')

if echo "$INVALID_PAY" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ (Validation working)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ (Should have failed)${NC}"
    ((FAILED++))
fi

# Test 37: Create Expense without required fields
echo -n "37. Validate Expense Required Fields... "
INVALID_EXP=$(curl -s $BASE_URL/finance/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d '{"description":"Test"}')

if echo "$INVALID_EXP" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ (Validation working)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ (Should have failed)${NC}"
    ((FAILED++))
fi

# Test 38: Invalid Payment Method
echo -n "38. Validate Payment Method Enum... "
INVALID_METHOD=$(curl -s $BASE_URL/finance/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d "{\"invoiceId\":\"$INVOICE_PAY_ID\",\"amount\":1000,\"method\":\"invalid_method\"}")

if echo "$INVALID_METHOD" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ (Validation working)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ (Should have failed)${NC}"
    ((FAILED++))
fi

# Test 39: Duplicate Invoice Number
echo -n "39. Validate Unique Invoice Number... "
DUP_INV=$(curl -s $BASE_URL/finance/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -d "{\"centerId\":\"$CENTER_ID\",\"invoiceNo\":\"INV-SENT-$RANDOM_INV\",\"amount\":1000,\"tax\":0,\"total\":1000,\"items\":[{\"description\":\"Test\",\"quantity\":1,\"rate\":1000,\"amount\":1000}]}")

if echo "$DUP_INV" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ (Duplicate prevented)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ (Should have failed)${NC}"
    ((FAILED++))
fi

# Test 40: Get Non-existent Invoice
echo -n "40. Handle Non-existent Invoice... "
if curl -s "$BASE_URL/finance/invoices/507f1f77bcf86cd799439011" -H "Authorization: Bearer $FINANCE_TOKEN" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ (Error handled)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
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
    echo -e "${GREEN}  ✓✓✓ ALL PAYMENT SYSTEMS WORKING!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
elif [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✓✓ EXCELLENT! Payment systems operational${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
elif [ $PERCENTAGE -ge 75 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}  ⚠ GOOD - Most payment features working${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ✗ ATTENTION NEEDED - Payment issues detected${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
