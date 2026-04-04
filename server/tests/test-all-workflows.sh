#!/bin/bash

# ============================================================================
# WORKFLOW TESTING SUITE - All ERP Workflows
# ============================================================================
# Tests every workflow end-to-end in the ERP system
# Author: Kiro AI
# Date: March 13, 2026
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

BASE_URL="http://localhost:4009/api/v1"
TOTAL=0
PASSED=0
FAILED=0

# Store tokens for different roles
declare -A TOKENS

print_header() {
  echo ""
  echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}  $1"
  echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_section() {
  echo ""
  echo -e "${MAGENTA}▶ $1${NC}"
  echo -e "${MAGENTA}$(printf '─%.0s' {1..70})${NC}"
}

print_step() {
  echo -e "  ${BLUE}Step $1:${NC} $2"
}

print_pass() {
  echo -e "  ${GREEN}✓ $1${NC}"
  PASSED=$((PASSED + 1))
}

print_fail() {
  echo -e "  ${RED}✗ $1${NC}"
  FAILED=$((FAILED + 1))
}

# Authenticate and store token
authenticate() {
  local role=$1
  local email=$2
  local password=$3
  
  local response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")
  
  local token=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -n "$token" ]; then
    TOKENS[$role]=$token
    return 0
  else
    return 1
  fi
}

# Make API call
api_call() {
  local method=$1
  local endpoint=$2
  local role=$3
  local data=$4
  
  local token=${TOKENS[$role]}
  
  if [ -n "$data" ]; then
    curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json"
  fi
}

# Extract ID from response
extract_id() {
  echo "$1" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4
}

# Test workflow step
test_step() {
  local description=$1
  local response=$2
  local expected_status=$3
  
  TOTAL=$((TOTAL + 1))
  local status=$(echo "$response" | tail -n1)
  
  if [ "$status" = "$expected_status" ]; then
    print_pass "$description (Status: $status)"
  else
    print_fail "$description (Expected: $expected_status, Got: $status)"
  fi
}

# ============================================================================
# WORKFLOW TESTS
# ============================================================================

test_leave_approval_workflow() {
  print_section "Leave Approval Workflow (Two-Step)"
  
  echo "  Workflow: Employee → Department Admin → HR Admin"
  echo ""
  
  # Step 1: Employee creates leave request
  print_step "1" "Employee creates leave request"
  local leave_data='{
    "type":"casual",
    "startDate":"2026-03-25",
    "endDate":"2026-03-27",
    "reason":"Family function"
  }'
  local response=$(api_call "POST" "/hr/leaves" "employee" "$leave_data")
  test_step "Leave request created" "$response" "201"
  local leave_id=$(extract_id "$response")
  
  if [ -n "$leave_id" ]; then
    # Step 2: Department admin approves
    print_step "2" "Department admin reviews and approves"
    local approve_data='{"action":"approve","remarks":"Approved by department"}'
    response=$(api_call "PATCH" "/hr/leaves/$leave_id/dept-approve" "ops_admin" "$approve_data")
    test_step "Department approval" "$response" "200"
    
    # Step 3: HR admin final approval
    print_step "3" "HR admin gives final approval"
    response=$(api_call "PATCH" "/hr/leaves/$leave_id/hr-approve" "hr_admin" "$approve_data")
    test_step "HR final approval" "$response" "200"
    
    # Verify final status
    print_step "4" "Verify leave is fully approved"
    response=$(api_call "GET" "/hr/leaves/$leave_id" "employee" "")
    test_step "Leave status verified" "$response" "200"
  fi
}

test_student_admission_workflow() {
  print_section "Student Admission Workflow"
  
  echo "  Workflow: Center → Operations Admin → Finance Admin"
  echo ""
  
  # Step 1: Center creates student
  print_step "1" "Study center creates student admission"
  local student_data='{
    "name":"Test Student Workflow",
    "email":"workflow.student@test.com",
    "phone":"+9876543210",
    "address":"Test Address",
    "enrollmentNo":"WF2026001"
  }'
  local response=$(api_call "POST" "/students" "ops_admin" "$student_data")
  test_step "Student created" "$response" "201"
  local student_id=$(extract_id "$response")
  
  if [ -n "$student_id" ]; then
    # Step 2: Operations admin approves
    print_step "2" "Operations admin reviews and approves"
    response=$(api_call "PUT" "/students/$student_id/approve" "ops_admin" "")
    test_step "Operations approval" "$response" "200"
    
    # Step 3: Finance admin approves
    print_step "3" "Finance admin verifies payment and approves"
    response=$(api_call "PUT" "/students/$student_id/approve" "finance_admin" "")
    test_step "Finance approval" "$response" "200"
    
    # Verify final status
    print_step "4" "Verify student is active"
    response=$(api_call "GET" "/students/$student_id" "ops_admin" "")
    test_step "Student status verified" "$response" "200"
  fi
}

test_center_approval_workflow() {
  print_section "Study Center Approval Workflow"
  
  echo "  Workflow: Sales Lead → Operations Admin → Finance Admin"
  echo ""
  
  # Step 1: Sales creates center from converted lead
  print_step "1" "Sales creates study center"
  local center_data='{
    "name":"Workflow Test Center",
    "code":"WTC001",
    "address":"Test Center Address",
    "contact":"+9876543210",
    "email":"workflow.center@test.com"
  }'
  local response=$(api_call "POST" "/operations/centers" "sales_admin" "$center_data")
  test_step "Center created" "$response" "201"
  local center_id=$(extract_id "$response")
  
  if [ -n "$center_id" ]; then
    # Step 2: Operations admin approves
    print_step "2" "Operations admin verifies and approves"
    response=$(api_call "PUT" "/operations/centers/$center_id/approve" "ops_admin" "")
    test_step "Operations approval" "$response" "200"
    
    # Step 3: Finance admin approves
    print_step "3" "Finance admin verifies financials and approves"
    response=$(api_call "PUT" "/operations/centers/$center_id/approve" "finance_admin" "")
    test_step "Finance approval" "$response" "200"
    
    # Verify final status
    print_step "4" "Verify center is active"
    response=$(api_call "GET" "/operations/centers/$center_id" "ops_admin" "")
    test_step "Center status verified" "$response" "200"
  fi
}

test_payroll_workflow() {
  print_section "Payroll Processing Workflow"
  
  echo "  Workflow: Generate → HR Approve → Finance Transfer"
  echo ""
  
  # Step 1: Generate payroll for current month
  print_step "1" "HR generates payroll for the month"
  local payroll_data='{
    "month":"2026-03",
    "employeeIds":[]
  }'
  local response=$(api_call "POST" "/payroll/generate" "hr_admin" "$payroll_data")
  test_step "Payroll generated" "$response" "201"
  local batch_id=$(extract_id "$response")
  
  if [ -n "$batch_id" ]; then
    # Step 2: HR admin approves batch
    print_step "2" "HR admin reviews and approves payroll batch"
    response=$(api_call "PUT" "/payroll/batches/$batch_id/approve" "hr_admin" "")
    test_step "HR approval" "$response" "200"
    
    # Step 3: Finance admin transfers to finance
    print_step "3" "Finance admin transfers batch to finance"
    response=$(api_call "PUT" "/payroll/batches/$batch_id/transfer" "finance_admin" "")
    test_step "Finance transfer" "$response" "200"
    
    # Step 4: Finance admin processes payment
    print_step "4" "Finance admin processes payment"
    response=$(api_call "PUT" "/payroll/batches/$batch_id/process" "finance_admin" "")
    test_step "Payment processed" "$response" "200"
    
    # Verify final status
    print_step "5" "Verify payroll batch is completed"
    response=$(api_call "GET" "/payroll/batches/$batch_id" "hr_admin" "")
    test_step "Batch status verified" "$response" "200"
  fi
}

test_expense_approval_workflow() {
  print_section "Expense Claim Approval Workflow"
  
  echo "  Workflow: Employee → Manager → Finance Admin"
  echo ""
  
  # Step 1: Employee creates expense claim
  print_step "1" "Employee submits expense claim"
  local expense_data='{
    "amount":750,
    "category":"travel",
    "description":"Client meeting in another city",
    "receipts":[]
  }'
  local response=$(api_call "POST" "/finance/expenses" "employee" "$expense_data")
  test_step "Expense claim created" "$response" "201"
  local expense_id=$(extract_id "$response")
  
  if [ -n "$expense_id" ]; then
    # Step 2: Manager approves
    print_step "2" "Manager reviews and approves"
    local approve_data='{"action":"approve","remarks":"Approved by manager"}'
    response=$(api_call "PUT" "/finance/expenses/$expense_id/approve" "ops_admin" "$approve_data")
    test_step "Manager approval" "$response" "200"
    
    # Step 3: Finance admin final approval
    print_step "3" "Finance admin verifies and approves"
    response=$(api_call "PUT" "/finance/expenses/$expense_id/approve" "finance_admin" "$approve_data")
    test_step "Finance approval" "$response" "200"
    
    # Verify final status
    print_step "4" "Verify expense is approved"
    response=$(api_call "GET" "/finance/expenses/$expense_id" "employee" "")
    test_step "Expense status verified" "$response" "200"
  fi
}

test_task_escalation_workflow() {
  print_section "Task Escalation Workflow"
  
  echo "  Workflow: Task Created → Overdue → Auto-Escalate → CEO Review"
  echo ""
  
  # Step 1: Create task with past deadline
  print_step "1" "Manager creates task with deadline"
  local task_data='{
    "title":"Workflow Test Task",
    "description":"This task will test escalation",
    "priority":"high",
    "deadline":"2026-03-01T23:59:59Z"
  }'
  local response=$(api_call "POST" "/tasks" "ops_admin" "$task_data")
  test_step "Task created" "$response" "201"
  local task_id=$(extract_id "$response")
  
  if [ -n "$task_id" ]; then
    # Step 2: Check if task is overdue
    print_step "2" "System detects task is overdue"
    response=$(api_call "GET" "/tasks?status=overdue" "ops_admin" "")
    test_step "Overdue tasks retrieved" "$response" "200"
    
    # Step 3: Check escalations
    print_step "3" "Check if escalation was created (by cron job)"
    response=$(api_call "GET" "/escalations?type=task_overdue" "ceo" "")
    test_step "Escalations retrieved" "$response" "200"
    
    # Step 4: CEO reviews escalation
    print_step "4" "CEO reviews escalation"
    response=$(api_call "GET" "/ceo/escalations" "ceo" "")
    test_step "CEO escalations retrieved" "$response" "200"
  fi
}

test_invoice_payment_workflow() {
  print_section "Invoice & Payment Workflow"
  
  echo "  Workflow: Create Invoice → Finance Approve → Record Payment"
  echo ""
  
  # Step 1: Create invoice
  print_step "1" "Create student fee invoice"
  local invoice_data='{
    "invoiceNo":"WF-INV-001",
    "amount":50000,
    "tax":9000,
    "total":59000,
    "items":[{
      "description":"Tuition Fee",
      "quantity":1,
      "rate":50000,
      "amount":50000
    }]
  }'
  local response=$(api_call "POST" "/finance/invoices" "ops_admin" "$invoice_data")
  test_step "Invoice created" "$response" "201"
  local invoice_id=$(extract_id "$response")
  
  if [ -n "$invoice_id" ]; then
    # Step 2: Finance admin approves invoice
    print_step "2" "Finance admin approves invoice"
    response=$(api_call "PUT" "/finance/invoices/$invoice_id/approve" "finance_admin" "")
    test_step "Invoice approved" "$response" "200"
    
    # Step 3: Record payment
    print_step "3" "Record payment against invoice"
    local payment_data="{
      \"invoiceId\":\"$invoice_id\",
      \"amount\":59000,
      \"method\":\"bank_transfer\",
      \"referenceNo\":\"WF-PAY-001\"
    }"
    response=$(api_call "POST" "/finance/payments" "finance_admin" "$payment_data")
    test_step "Payment recorded" "$response" "201"
    
    # Verify invoice is paid
    print_step "4" "Verify invoice is marked as paid"
    response=$(api_call "GET" "/finance/invoices/$invoice_id" "finance_admin" "")
    test_step "Invoice payment verified" "$response" "200"
  fi
}

test_referral_workflow() {
  print_section "Referral Link Workflow"
  
  echo "  Workflow: Generate Link → Lead Conversion → Commission"
  echo ""
  
  # Step 1: Sales person gets referral link
  print_step "1" "Sales person gets referral link"
  local response=$(api_call "GET" "/referrals/my-links" "sales_admin" "")
  test_step "Referral links retrieved" "$response" "200"
  
  # Step 2: Create lead from referral
  print_step "2" "Lead created from referral link"
  local lead_data='{
    "centerName":"Referral Test Center",
    "contactName":"Referral Contact",
    "email":"referral@test.com",
    "phone":"+9876543210",
    "address":"Referral Address",
    "source":"referral"
  }'
  response=$(api_call "POST" "/sales/leads" "sales_admin" "$lead_data")
  test_step "Lead created" "$response" "201"
  local lead_id=$(extract_id "$response")
  
  if [ -n "$lead_id" ]; then
    # Step 3: Convert lead to center
    print_step "3" "Convert lead to study center"
    response=$(api_call "PUT" "/sales/leads/$lead_id/convert" "sales_admin" "")
    test_step "Lead converted" "$response" "200"
    
    # Step 4: Check referral statistics
    print_step "4" "Check referral statistics and commission"
    response=$(api_call "GET" "/referrals/stats" "sales_admin" "")
    test_step "Referral stats retrieved" "$response" "200"
  fi
}

test_session_request_workflow() {
  print_section "Admission Session Request Workflow"
  
  echo "  Workflow: Center Request → Ops Approve → Finance Approve"
  echo ""
  
  # Step 1: Center requests admission session
  print_step "1" "Study center requests admission session"
  local session_data='{
    "name":"Workflow Test Session",
    "startDate":"2026-04-01",
    "endDate":"2026-07-31",
    "examDate":"2026-08-15"
  }'
  local response=$(api_call "POST" "/session-requests" "ops_admin" "$session_data")
  test_step "Session request created" "$response" "201"
  local session_id=$(extract_id "$response")
  
  if [ -n "$session_id" ]; then
    # Step 2: Operations admin approves
    print_step "2" "Operations admin approves session"
    response=$(api_call "PUT" "/session-requests/$session_id/approve" "ops_admin" "")
    test_step "Operations approval" "$response" "200"
    
    # Step 3: Finance admin approves
    print_step "3" "Finance admin approves session"
    response=$(api_call "PUT" "/operations/sessions/$session_id/approve" "finance_admin" "")
    test_step "Finance approval" "$response" "200"
  fi
}

test_credential_request_workflow() {
  print_section "Credential Request Workflow"
  
  echo "  Workflow: Center Request → Ops Verify → Finance Approve"
  echo ""
  
  # Step 1: Center requests credentials
  print_step "1" "Study center requests student credentials"
  local cred_data='{
    "type":"certificate",
    "quantity":10,
    "reason":"Batch completion"
  }'
  local response=$(api_call "POST" "/credentials" "ops_admin" "$cred_data")
  test_step "Credential request created" "$response" "201"
  local cred_id=$(extract_id "$response")
  
  if [ -n "$cred_id" ]; then
    # Step 2: Operations admin verifies
    print_step "2" "Operations admin verifies request"
    response=$(api_call "PUT" "/credentials/$cred_id/verify" "ops_admin" "")
    test_step "Operations verification" "$response" "200"
    
    # Step 3: Finance admin approves
    print_step "3" "Finance admin approves credential issuance"
    response=$(api_call "PUT" "/credentials/$cred_id/approve" "finance_admin" "")
    test_step "Finance approval" "$response" "200"
  fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  print_header "WORKFLOW TESTING SUITE"
  
  echo -e "${CYAN}Testing all end-to-end workflows in the ERP system${NC}"
  echo -e "${CYAN}Date: $(date)${NC}"
  echo ""
  
  # Authenticate all roles
  print_section "Authenticating Users"
  
  authenticate "superadmin" "superadmin@erp.com" "superadmin123" && echo "  ✓ Superadmin authenticated"
  authenticate "ceo" "ceo@edutechglobal.com" "ceo123" && echo "  ✓ CEO authenticated"
  authenticate "org_admin" "admin@edutechglobal.com" "orgadmin123" && echo "  ✓ Org Admin authenticated"
  authenticate "hr_admin" "hr.admin@edutechglobal.com" "hradmin123" && echo "  ✓ HR Admin authenticated"
  authenticate "finance_admin" "finance.admin@edutechglobal.com" "finance123" && echo "  ✓ Finance Admin authenticated"
  authenticate "ops_admin" "ops.admin@edutechglobal.com" "opsadmin123" && echo "  ✓ Ops Admin authenticated"
  authenticate "sales_admin" "sales.admin@edutechglobal.com" "sales123" && echo "  ✓ Sales Admin authenticated"
  authenticate "employee" "ops.executive@edutechglobal.com" "employee123" && echo "  ✓ Employee authenticated"
  
  # Run all workflow tests
  test_leave_approval_workflow
  test_student_admission_workflow
  test_center_approval_workflow
  test_payroll_workflow
  test_expense_approval_workflow
  test_task_escalation_workflow
  test_invoice_payment_workflow
  test_referral_workflow
  test_session_request_workflow
  test_credential_request_workflow
  
  # Print summary
  echo ""
  print_header "WORKFLOW TEST SUMMARY"
  
  echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}  Total Steps:    $TOTAL"
  echo -e "${CYAN}║${NC}  ${GREEN}Passed:         $PASSED${NC}"
  echo -e "${CYAN}║${NC}  ${RED}Failed:         $FAILED${NC}"
  
  if [ $TOTAL -gt 0 ]; then
    local success_rate=$(( PASSED * 100 / TOTAL ))
    echo -e "${CYAN}║${NC}  Success Rate:   ${success_rate}%"
  fi
  
  echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL WORKFLOWS COMPLETED SUCCESSFULLY${NC}"
    exit 0
  else
    echo -e "${RED}✗ SOME WORKFLOWS FAILED${NC}"
    exit 1
  fi
}

main
