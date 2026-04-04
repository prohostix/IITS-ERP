#!/bin/bash

# ============================================================================
# DASHBOARD TESTING SUITE - All ERP Dashboards
# ============================================================================
# Tests every dashboard view and component in the ERP system
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

test_dashboard() {
  local role=$1
  local email=$2
  local password=$3
  local endpoints=("${@:4}")
  
  print_section "Testing $role Dashboard"
  
  # Authenticate
  local response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")
  
  local token=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$token" ]; then
    echo -e "  ${RED}✗ Authentication failed${NC}"
    return
  fi
  
  echo -e "  ${GREEN}✓ Authenticated as $role${NC}"
  
  # Test each endpoint
  for endpoint in "${endpoints[@]}"; do
    TOTAL=$((TOTAL + 1))
    echo -n "  Testing: $endpoint... "
    
    local status=$(curl -s -w "%{http_code}" -o /dev/null \
      -H "Authorization: Bearer $token" \
      "$BASE_URL$endpoint")
    
    if [ "$status" = "200" ]; then
      echo -e "${GREEN}✓ PASS${NC}"
      PASSED=$((PASSED + 1))
    else
      echo -e "${RED}✗ FAIL (Status: $status)${NC}"
      FAILED=$((FAILED + 1))
    fi
  done
}

main() {
  print_header "DASHBOARD TESTING SUITE"
  
  echo -e "${CYAN}Testing all dashboard views and components${NC}"
  echo -e "${CYAN}Date: $(date)${NC}"
  echo ""
  
  # Test Superadmin Dashboard
  test_dashboard "Superadmin" "superadmin@erp.com" "superadmin123" \
    "/organizations" \
    "/licenses" \
    "/dashboard/metrics" \
    "/users"
  
  # Test CEO Dashboard
  test_dashboard "CEO" "ceo@edutechglobal.com" "ceo123" \
    "/ceo/overview" \
    "/ceo/metrics" \
    "/ceo/escalations" \
    "/ceo/approvals" \
    "/dashboard/metrics" \
    "/tasks" \
    "/escalations"
  
  # Test Org Admin Dashboard
  test_dashboard "Org Admin" "admin@edutechglobal.com" "orgadmin123" \
    "/departments" \
    "/subdepartments" \
    "/users" \
    "/dashboard/metrics"
  
  # Test HR Admin Dashboard
  test_dashboard "HR Admin" "hr.admin@edutechglobal.com" "hradmin123" \
    "/dashboard/metrics" \
    "/users?role=employee" \
    "/hr/leaves" \
    "/hr/leaves/stats" \
    "/hr/attendance" \
    "/hr/vacancies" \
    "/hr/vacancies/stats" \
    "/hr/complaints" \
    "/hr/holidays" \
    "/payroll" \
    "/payroll/batches" \
    "/operations/announcements" \
    "/tasks" \
    "/escalations"
  
  # Test Finance Admin Dashboard
  test_dashboard "Finance Admin" "finance.admin@edutechglobal.com" "finance123" \
    "/dashboard/metrics" \
    "/finance/invoices" \
    "/finance/payments" \
    "/finance/expenses" \
    "/finance/targets" \
    "/finance/fees" \
    "/gst" \
    "/gst/active" \
    "/incentives" \
    "/payroll" \
    "/payroll/batches"
  
  # Test Operations Admin Dashboard
  test_dashboard "Operations Admin" "ops.admin@edutechglobal.com" "opsadmin123" \
    "/dashboard/metrics" \
    "/operations/universities" \
    "/operations/programs" \
    "/operations/centers" \
    "/operations/sessions" \
    "/operations/marks" \
    "/operations/announcements" \
    "/students" \
    "/students/stats" \
    "/rereg" \
    "/rereg/stats"
  
  # Test Sales Admin Dashboard
  test_dashboard "Sales Admin" "sales.admin@edutechglobal.com" "sales123" \
    "/dashboard/metrics" \
    "/sales/leads" \
    "/sales/targets" \
    "/referrals" \
    "/referrals/stats" \
    "/referrals/my-links" \
    "/operations/centers"
  
  # Test Employee Dashboard
  test_dashboard "Employee" "ops.executive@edutechglobal.com" "employee123" \
    "/dashboard/metrics" \
    "/auth/me" \
    "/tasks" \
    "/hr/leaves" \
    "/hr/attendance" \
    "/finance/expenses"
  
  # Print summary
  echo ""
  print_header "DASHBOARD TEST SUMMARY"
  
  echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}  Total Tests:    $TOTAL"
  echo -e "${CYAN}║${NC}  ${GREEN}Passed:         $PASSED${NC}"
  echo -e "${CYAN}║${NC}  ${RED}Failed:         $FAILED${NC}"
  
  if [ $TOTAL -gt 0 ]; then
    local success_rate=$(( PASSED * 100 / TOTAL ))
    echo -e "${CYAN}║${NC}  Success Rate:   ${success_rate}%"
  fi
  
  echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL DASHBOARDS WORKING CORRECTLY${NC}"
    exit 0
  else
    echo -e "${RED}✗ SOME DASHBOARDS HAVE ISSUES${NC}"
    exit 1
  fi
}

main
