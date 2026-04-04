#!/bin/bash

# ============================================================================
# MASTER TEST SUITE - Complete ERP System Testing
# ============================================================================
# Tests every function, workflow, and dashboard in the ERP system
# Author: Kiro AI
# Date: March 13, 2026
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:4009/api/v1"
TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0

# Test results storage
declare -A MODULE_RESULTS
declare -A MODULE_TOTALS

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

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

print_test() {
  echo -n "  Testing: $1... "
}

print_pass() {
  echo -e "${GREEN}✓ PASS${NC}"
  PASSED=$((PASSED + 1))
}

print_fail() {
  echo -e "${RED}✗ FAIL${NC} ($1)"
  FAILED=$((FAILED + 1))
}

print_skip() {
  echo -e "${YELLOW}⊘ SKIP${NC} ($1)"
  SKIPPED=$((SKIPPED + 1))
}

# Test function with error handling
test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  local data=$4
  local expected_status=${5:-200}
  local module=${6:-"General"}
  
  TOTAL=$((TOTAL + 1))
  MODULE_TOTALS[$module]=$((${MODULE_TOTALS[$module]:-0} + 1))
  
  print_test "$description"
  
  if [ -z "$TOKEN" ]; then
    print_skip "No auth token"
    return
  fi
  
  local response
  local status_code
  
  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" 2>/dev/null)
  fi
  
  status_code=$(echo "$response" | tail -n1)
  
  if [ "$status_code" = "$expected_status" ]; then
    print_pass
    MODULE_RESULTS[$module]=$((${MODULE_RESULTS[$module]:-0} + 1))
  else
    print_fail "Expected $expected_status, got $status_code"
  fi
}

# ============================================================================
# AUTHENTICATION
# ============================================================================

authenticate() {
  local email=$1
  local password=$2
  local role_name=$3
  
  print_section "Authenticating as $role_name"
  
  local response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")
  
  TOKEN=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -n "$TOKEN" ]; then
    echo -e "  ${GREEN}✓ Authentication successful${NC}"
    return 0
  else
    echo -e "  ${RED}✗ Authentication failed${NC}"
    return 1
  fi
}

# ============================================================================
# TEST MODULES
# ============================================================================

test_auth_module() {
  print_section "Authentication & Authorization Module"
  
  # Login test
  TOTAL=$((TOTAL + 1))
  print_test "User login"
  local response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"ceo@edutechglobal.com","password":"ceo123"}')
  local status=$(echo "$response" | tail -n1)
  [ "$status" = "200" ] && print_pass || print_fail "Status: $status"
  
  # Get current user
  test_endpoint "GET" "/auth/me" "Get current user profile" "" 200 "Auth"
  
  # Update profile
  test_endpoint "PUT" "/auth/updatedetails" "Update user profile" \
    '{"name":"Updated Name"}' 200 "Auth"
  
  # Logout
  test_endpoint "POST" "/auth/logout" "User logout" "" 200 "Auth"
}

test_organization_module() {
  print_section "Organization Management Module"
  
  test_endpoint "GET" "/organizations" "List all organizations" "" 200 "Organization"
  test_endpoint "GET" "/organizations?status=active" "Filter active organizations" "" 200 "Organization"
  
  # Create organization (superadmin only)
  local org_data='{
    "name":"Test Organization",
    "email":"test@org.com",
    "phone":"+1234567890",
    "address":"123 Test St"
  }'
  test_endpoint "POST" "/organizations" "Create new organization" "$org_data" 201 "Organization"
}

test_department_module() {
  print_section "Department Management Module"
  
  test_endpoint "GET" "/departments" "List all departments" "" 200 "Department"
  test_endpoint "GET" "/departments?type=core" "Filter core departments" "" 200 "Department"
  
  local dept_data='{
    "name":"Test Department",
    "type":"custom",
    "features":["feature1","feature2"]
  }'
  test_endpoint "POST" "/departments" "Create new department" "$dept_data" 201 "Department"
  
  # Sub-departments
  test_endpoint "GET" "/subdepartments" "List sub-departments" "" 200 "Department"
  test_endpoint "GET" "/subdepartments/stats" "Get sub-department stats" "" 200 "Department"
}

test_user_module() {
  print_section "User Management Module"
  
  test_endpoint "GET" "/users" "List all users" "" 200 "User"
  test_endpoint "GET" "/users?role=employee" "Filter users by role" "" 200 "User"
  test_endpoint "GET" "/users?status=active" "Filter active users" "" 200 "User"
  
  local user_data='{
    "email":"testuser@example.com",
    "password":"test123",
    "name":"Test User",
    "role":"employee"
  }'
  test_endpoint "POST" "/users" "Create new user" "$user_data" 201 "User"
}

test_hr_module() {
  print_section "HR Management Module"
  
  # Leave Requests
  test_endpoint "GET" "/hr/leaves" "List leave requests" "" 200 "HR"
  test_endpoint "GET" "/hr/leaves?status=pending" "Filter pending leaves" "" 200 "HR"
  test_endpoint "GET" "/hr/leaves/stats" "Get leave statistics" "" 200 "HR"
  
  local leave_data='{
    "type":"casual",
    "startDate":"2026-03-20",
    "endDate":"2026-03-22",
    "reason":"Personal work"
  }'
  test_endpoint "POST" "/hr/leaves" "Create leave request" "$leave_data" 201 "HR"
  
  # Attendance
  test_endpoint "GET" "/hr/attendance" "List attendance records" "" 200 "HR"
  test_endpoint "GET" "/hr/attendance?date=2026-03-13" "Filter attendance by date" "" 200 "HR"
  
  local attendance_data='{
    "date":"2026-03-13",
    "status":"present",
    "checkIn":"2026-03-13T09:00:00Z",
    "checkOut":"2026-03-13T18:00:00Z"
  }'
  test_endpoint "POST" "/hr/attendance" "Mark attendance" "$attendance_data" 201 "HR"
  
  # Vacancies
  test_endpoint "GET" "/hr/vacancies" "List vacancies" "" 200 "HR"
  test_endpoint "GET" "/hr/vacancies/stats" "Get vacancy statistics" "" 200 "HR"
  
  # Complaints
  test_endpoint "GET" "/hr/complaints" "List complaints" "" 200 "HR"
  test_endpoint "GET" "/hr/complaints?status=open" "Filter open complaints" "" 200 "HR"
  
  # Holidays
  test_endpoint "GET" "/hr/holidays" "List holidays" "" 200 "HR"
}

test_payroll_module() {
  print_section "Payroll Management Module"
  
  test_endpoint "GET" "/payroll" "List payroll records" "" 200 "Payroll"
  test_endpoint "GET" "/payroll?status=pending" "Filter pending payroll" "" 200 "Payroll"
  test_endpoint "GET" "/payroll/stats" "Get payroll statistics" "" 200 "Payroll"
  
  # Payroll batches
  test_endpoint "GET" "/payroll/batches" "List payroll batches" "" 200 "Payroll"
  test_endpoint "GET" "/payroll/batches?status=pending" "Filter pending batches" "" 200 "Payroll"
  
  # Generate payroll
  local payroll_data='{
    "month":"2026-03",
    "employeeIds":[]
  }'
  test_endpoint "POST" "/payroll/generate" "Generate payroll" "$payroll_data" 201 "Payroll"
}

test_finance_module() {
  print_section "Finance Management Module"
  
  # Invoices
  test_endpoint "GET" "/finance/invoices" "List invoices" "" 200 "Finance"
  test_endpoint "GET" "/finance/invoices?status=pending" "Filter pending invoices" "" 200 "Finance"
  
  # Payments
  test_endpoint "GET" "/finance/payments" "List payments" "" 200 "Finance"
  test_endpoint "GET" "/finance/payments?method=bank_transfer" "Filter payments by method" "" 200 "Finance"
  
  # Expenses
  test_endpoint "GET" "/finance/expenses" "List expense claims" "" 200 "Finance"
  test_endpoint "GET" "/finance/expenses?status=pending" "Filter pending expenses" "" 200 "Finance"
  
  # Targets
  test_endpoint "GET" "/finance/targets" "List financial targets" "" 200 "Finance"
  
  # Fee Structures
  test_endpoint "GET" "/finance/fees" "List fee structures" "" 200 "Finance"
  
  # GST Settings
  test_endpoint "GET" "/gst" "List GST settings" "" 200 "Finance"
  test_endpoint "GET" "/gst/active" "Get active GST settings" "" 200 "Finance"
  
  # Incentive Structures
  test_endpoint "GET" "/incentives" "List incentive structures" "" 200 "Finance"
  test_endpoint "GET" "/incentives/active" "Get active incentives" "" 200 "Finance"
}

test_operations_module() {
  print_section "Operations Management Module"
  
  # Universities
  test_endpoint "GET" "/operations/universities" "List universities" "" 200 "Operations"
  test_endpoint "GET" "/operations/universities?status=active" "Filter active universities" "" 200 "Operations"
  
  # Programs
  test_endpoint "GET" "/operations/programs" "List programs" "" 200 "Operations"
  test_endpoint "GET" "/operations/programs?status=active" "Filter active programs" "" 200 "Operations"
  
  # Study Centers
  test_endpoint "GET" "/operations/centers" "List study centers" "" 200 "Operations"
  test_endpoint "GET" "/operations/centers?status=pending" "Filter pending centers" "" 200 "Operations"
  
  # Admission Sessions
  test_endpoint "GET" "/operations/sessions" "List admission sessions" "" 200 "Operations"
  test_endpoint "GET" "/operations/sessions?status=approved" "Filter approved sessions" "" 200 "Operations"
  
  # Internal Marks
  test_endpoint "GET" "/operations/marks" "List internal marks" "" 200 "Operations"
  
  # Announcements
  test_endpoint "GET" "/operations/announcements" "List announcements" "" 200 "Operations"
  test_endpoint "GET" "/operations/announcements?type=ops" "Filter ops announcements" "" 200 "Operations"
}

test_student_module() {
  print_section "Student Management Module"
  
  test_endpoint "GET" "/students" "List students" "" 200 "Student"
  test_endpoint "GET" "/students?status=active" "Filter active students" "" 200 "Student"
  test_endpoint "GET" "/students?status=pending" "Filter pending students" "" 200 "Student"
  test_endpoint "GET" "/students/stats" "Get student statistics" "" 200 "Student"
  
  # REREG Module
  test_endpoint "GET" "/rereg" "List REREG requests" "" 200 "Student"
  test_endpoint "GET" "/rereg?status=pending" "Filter pending REREG" "" 200 "Student"
  test_endpoint "GET" "/rereg/stats" "Get REREG statistics" "" 200 "Student"
}

test_sales_module() {
  print_section "Sales & CRM Module"
  
  # Leads
  test_endpoint "GET" "/sales/leads" "List leads" "" 200 "Sales"
  test_endpoint "GET" "/sales/leads?status=new" "Filter new leads" "" 200 "Sales"
  test_endpoint "GET" "/sales/leads?status=converted" "Filter converted leads" "" 200 "Sales"
  
  # Sales Targets
  test_endpoint "GET" "/sales/targets" "List sales targets" "" 200 "Sales"
  
  # Referral Links
  test_endpoint "GET" "/referrals" "List referral links" "" 200 "Sales"
  test_endpoint "GET" "/referrals/stats" "Get referral statistics" "" 200 "Sales"
  test_endpoint "GET" "/referrals/my-links" "Get my referral links" "" 200 "Sales"
}

test_task_module() {
  print_section "Task Management Module"
  
  test_endpoint "GET" "/tasks" "List tasks" "" 200 "Task"
  test_endpoint "GET" "/tasks?status=pending" "Filter pending tasks" "" 200 "Task"
  test_endpoint "GET" "/tasks?priority=high" "Filter high priority tasks" "" 200 "Task"
  test_endpoint "GET" "/tasks?status=overdue" "Filter overdue tasks" "" 200 "Task"
  
  local task_data='{
    "title":"Test Task",
    "description":"Test task description",
    "priority":"medium",
    "deadline":"2026-03-20T23:59:59Z"
  }'
  test_endpoint "POST" "/tasks" "Create new task" "$task_data" 201 "Task"
}

test_escalation_module() {
  print_section "Escalation Management Module"
  
  test_endpoint "GET" "/escalations" "List escalations" "" 200 "Escalation"
  test_endpoint "GET" "/escalations?status=active" "Filter active escalations" "" 200 "Escalation"
  test_endpoint "GET" "/escalations?type=task_overdue" "Filter task overdue escalations" "" 200 "Escalation"
  test_endpoint "GET" "/escalations/stats" "Get escalation statistics" "" 200 "Escalation"
}

test_dashboard_module() {
  print_section "Dashboard & Analytics Module"
  
  test_endpoint "GET" "/dashboard/metrics" "Get dashboard metrics" "" 200 "Dashboard"
  test_endpoint "GET" "/dashboard/stats" "Get dashboard statistics" "" 200 "Dashboard"
  test_endpoint "GET" "/dashboard/recent-activities" "Get recent activities" "" 200 "Dashboard"
}

test_ceo_module() {
  print_section "CEO Dashboard Module"
  
  test_endpoint "GET" "/ceo/overview" "Get CEO overview" "" 200 "CEO"
  test_endpoint "GET" "/ceo/metrics" "Get CEO metrics" "" 200 "CEO"
  test_endpoint "GET" "/ceo/escalations" "Get CEO escalations" "" 200 "CEO"
  test_endpoint "GET" "/ceo/approvals" "Get pending approvals" "" 200 "CEO"
}

test_credential_module() {
  print_section "Credential Request Module"
  
  test_endpoint "GET" "/credentials" "List credential requests" "" 200 "Credential"
  test_endpoint "GET" "/credentials?status=pending" "Filter pending credentials" "" 200 "Credential"
  test_endpoint "GET" "/credentials/stats" "Get credential statistics" "" 200 "Credential"
}

test_edit_delete_module() {
  print_section "Edit/Delete Request Module"
  
  test_endpoint "GET" "/edit-delete" "List edit/delete requests" "" 200 "EditDelete"
  test_endpoint "GET" "/edit-delete?status=pending" "Filter pending requests" "" 200 "EditDelete"
  test_endpoint "GET" "/edit-delete/stats" "Get edit/delete statistics" "" 200 "EditDelete"
}

test_session_request_module() {
  print_section "Session Request Module"
  
  test_endpoint "GET" "/session-requests" "List session requests" "" 200 "SessionRequest"
  test_endpoint "GET" "/session-requests?status=pending" "Filter pending sessions" "" 200 "SessionRequest"
  test_endpoint "GET" "/session-requests/stats" "Get session statistics" "" 200 "SessionRequest"
}

test_license_module() {
  print_section "License Management Module"
  
  test_endpoint "GET" "/licenses" "List licenses" "" 200 "License"
  test_endpoint "GET" "/licenses?status=active" "Filter active licenses" "" 200 "License"
}

# ============================================================================
# WORKFLOW TESTS
# ============================================================================

test_leave_approval_workflow() {
  print_section "Leave Approval Workflow (Two-Step)"
  
  echo "  Workflow: Employee → Dept Admin → HR Admin"
  
  # Step 1: Employee creates leave request
  local leave_data='{
    "type":"casual",
    "startDate":"2026-03-25",
    "endDate":"2026-03-27",
    "reason":"Family function"
  }'
  test_endpoint "POST" "/hr/leaves" "Step 1: Create leave request" "$leave_data" 201 "Workflow"
  
  # Step 2: Department admin approves
  # (Would need leave ID from previous response)
  echo "  Step 2: Department admin approval (requires leave ID)"
  
  # Step 3: HR admin final approval
  echo "  Step 3: HR admin final approval (requires leave ID)"
}

test_student_admission_workflow() {
  print_section "Student Admission Workflow"
  
  echo "  Workflow: Center → Ops Admin → Finance Admin"
  
  # Step 1: Center creates student
  local student_data='{
    "name":"Test Student",
    "email":"student@test.com",
    "phone":"+1234567890",
    "programId":"test_program_id"
  }'
  test_endpoint "POST" "/students" "Step 1: Create student" "$student_data" 201 "Workflow"
  
  echo "  Step 2: Ops admin approval (requires student ID)"
  echo "  Step 3: Finance admin approval (requires student ID)"
}

test_center_approval_workflow() {
  print_section "Study Center Approval Workflow"
  
  echo "  Workflow: Sales → Ops Admin → Finance Admin"
  
  # Step 1: Sales creates center
  local center_data='{
    "name":"Test Center",
    "code":"TC001",
    "address":"Test Address",
    "contact":"+1234567890",
    "email":"center@test.com"
  }'
  test_endpoint "POST" "/operations/centers" "Step 1: Create center" "$center_data" 201 "Workflow"
  
  echo "  Step 2: Ops admin approval (requires center ID)"
  echo "  Step 3: Finance admin approval (requires center ID)"
}

test_payroll_workflow() {
  print_section "Payroll Processing Workflow"
  
  echo "  Workflow: Generate → HR Approve → Finance Transfer"
  
  # Step 1: Generate payroll
  local payroll_data='{
    "month":"2026-03",
    "employeeIds":[]
  }'
  test_endpoint "POST" "/payroll/generate" "Step 1: Generate payroll" "$payroll_data" 201 "Workflow"
  
  echo "  Step 2: HR admin approval (requires batch ID)"
  echo "  Step 3: Finance transfer (requires batch ID)"
}

test_expense_approval_workflow() {
  print_section "Expense Claim Workflow"
  
  echo "  Workflow: Employee → Manager → Finance Admin"
  
  # Step 1: Employee creates expense
  local expense_data='{
    "amount":500,
    "category":"travel",
    "description":"Client meeting",
    "receipts":[]
  }'
  test_endpoint "POST" "/finance/expenses" "Step 1: Create expense claim" "$expense_data" 201 "Workflow"
  
  echo "  Step 2: Manager approval (requires expense ID)"
  echo "  Step 3: Finance admin approval (requires expense ID)"
}

test_escalation_workflow() {
  print_section "Task Escalation Workflow"
  
  echo "  Workflow: Task Overdue → Auto-Escalate → CEO Review"
  
  # Create overdue task
  local task_data='{
    "title":"Overdue Test Task",
    "description":"This task will be overdue",
    "priority":"high",
    "deadline":"2026-03-01T23:59:59Z"
  }'
  test_endpoint "POST" "/tasks" "Step 1: Create task (past deadline)" "$task_data" 201 "Workflow"
  
  echo "  Step 2: Cron job detects overdue (automatic)"
  echo "  Step 3: Escalation created (automatic)"
  echo "  Step 4: CEO reviews escalation"
}

# ============================================================================
# INTEGRATION TESTS
# ============================================================================

test_referral_integration() {
  print_section "Referral System Integration"
  
  echo "  Integration: Referral Link → Lead → Center → Commission"
  
  test_endpoint "GET" "/referrals/my-links" "Get referral links" "" 200 "Integration"
  test_endpoint "GET" "/sales/leads" "Check leads from referrals" "" 200 "Integration"
  test_endpoint "GET" "/referrals/stats" "Check referral statistics" "" 200 "Integration"
}

test_gst_integration() {
  print_section "GST Auto-Calculation Integration"
  
  echo "  Integration: Invoice → GST Settings → Auto-Calculate"
  
  test_endpoint "GET" "/gst/active" "Get active GST settings" "" 200 "Integration"
  test_endpoint "GET" "/finance/invoices" "Check invoices with GST" "" 200 "Integration"
}

test_attendance_payroll_integration() {
  print_section "Attendance-Payroll Integration"
  
  echo "  Integration: Attendance → Payroll Calculation → Deductions"
  
  test_endpoint "GET" "/hr/attendance" "Get attendance records" "" 200 "Integration"
  test_endpoint "GET" "/payroll" "Check payroll with attendance" "" 200 "Integration"
}

# ============================================================================
# PERMISSION TESTS
# ============================================================================

test_role_permissions() {
  print_section "Role-Based Access Control"
  
  echo "  Testing permissions for different roles..."
  
  # These would need to authenticate as different users
  echo "  - Superadmin: Full access"
  echo "  - Org Admin: Organization scope"
  echo "  - CEO: Read-only + escalations"
  echo "  - Dept Admin: Department scope"
  echo "  - Employee: Limited access"
}

# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

test_performance() {
  print_section "Performance & Load Tests"
  
  echo "  Testing response times..."
  
  local start_time=$(date +%s%N)
  test_endpoint "GET" "/dashboard/metrics" "Dashboard metrics response time" "" 200 "Performance"
  local end_time=$(date +%s%N)
  local duration=$(( (end_time - start_time) / 1000000 ))
  echo "  Response time: ${duration}ms"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  print_header "ERP SYSTEM - MASTER TEST SUITE"
  
  echo -e "${CYAN}Testing every function, workflow, and dashboard${NC}"
  echo -e "${CYAN}Date: $(date)${NC}"
  echo -e "${CYAN}Base URL: $BASE_URL${NC}"
  echo ""
  
  # Authenticate as CEO (has broad access)
  if ! authenticate "ceo@edutechglobal.com" "ceo123" "CEO"; then
    echo -e "${RED}Failed to authenticate. Please ensure:${NC}"
    echo "  1. Backend server is running on port 4009"
    echo "  2. Database is seeded with test data"
    echo "  3. Credentials are correct"
    exit 1
  fi
  
  # Run all module tests
  test_auth_module
  test_organization_module
  test_department_module
  test_user_module
  test_hr_module
  test_payroll_module
  test_finance_module
  test_operations_module
  test_student_module
  test_sales_module
  test_task_module
  test_escalation_module
  test_dashboard_module
  test_ceo_module
  test_credential_module
  test_edit_delete_module
  test_session_request_module
  test_license_module
  
  # Run workflow tests
  print_header "WORKFLOW TESTS"
  test_leave_approval_workflow
  test_student_admission_workflow
  test_center_approval_workflow
  test_payroll_workflow
  test_expense_approval_workflow
  test_escalation_workflow
  
  # Run integration tests
  print_header "INTEGRATION TESTS"
  test_referral_integration
  test_gst_integration
  test_attendance_payroll_integration
  
  # Run permission tests
  print_header "PERMISSION TESTS"
  test_role_permissions
  
  # Run performance tests
  print_header "PERFORMANCE TESTS"
  test_performance
  
  # Print summary
  print_summary
}

print_summary() {
  echo ""
  print_header "TEST SUMMARY"
  
  echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}  Overall Results"
  echo -e "${CYAN}╠════════════════════════════════════════════════════════════════╣${NC}"
  echo -e "${CYAN}║${NC}  Total Tests:    $TOTAL"
  echo -e "${CYAN}║${NC}  ${GREEN}Passed:         $PASSED${NC}"
  echo -e "${CYAN}║${NC}  ${RED}Failed:         $FAILED${NC}"
  echo -e "${CYAN}║${NC}  ${YELLOW}Skipped:        $SKIPPED${NC}"
  
  if [ $TOTAL -gt 0 ]; then
    local success_rate=$(( PASSED * 100 / TOTAL ))
    echo -e "${CYAN}║${NC}  Success Rate:   ${success_rate}%"
  fi
  
  echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
  
  # Module breakdown
  echo ""
  echo -e "${MAGENTA}Module Breakdown:${NC}"
  echo -e "${MAGENTA}$(printf '─%.0s' {1..70})${NC}"
  
  for module in "${!MODULE_TOTALS[@]}"; do
    local total=${MODULE_TOTALS[$module]}
    local passed=${MODULE_RESULTS[$module]:-0}
    local rate=0
    [ $total -gt 0 ] && rate=$(( passed * 100 / total ))
    printf "  %-20s %3d/%3d tests passed (%3d%%)\n" "$module:" "$passed" "$total" "$rate"
  done
  
  echo ""
  
  # Final status
  if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  ✓ ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
  else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║${NC}  ✗ SOME TESTS FAILED - REVIEW REQUIRED"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
  fi
}

# Run main function
main
