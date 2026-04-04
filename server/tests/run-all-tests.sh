#!/bin/bash

# ============================================================================
# MASTER TEST RUNNER - Execute All ERP Tests
# ============================================================================
# Runs all test suites and generates comprehensive report
# Author: Kiro AI
# Date: March 13, 2026
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test results
declare -A TEST_RESULTS
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

print_header() {
  echo ""
  echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}  $1"
  echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

run_test_suite() {
  local script=$1
  local name=$2
  
  TOTAL_SUITES=$((TOTAL_SUITES + 1))
  
  echo ""
  echo -e "${CYAN}Running: $name${NC}"
  echo -e "${CYAN}$(printf '─%.0s' {1..70})${NC}"
  
  if [ -f "$script" ]; then
    chmod +x "$script"
    if ./"$script"; then
      TEST_RESULTS[$name]="PASS"
      PASSED_SUITES=$((PASSED_SUITES + 1))
      echo -e "${GREEN}✓ $name completed successfully${NC}"
    else
      TEST_RESULTS[$name]="FAIL"
      FAILED_SUITES=$((FAILED_SUITES + 1))
      echo -e "${RED}✗ $name failed${NC}"
    fi
  else
    TEST_RESULTS[$name]="SKIP"
    echo -e "${YELLOW}⊘ $name not found${NC}"
  fi
}

main() {
  print_header "ERP SYSTEM - COMPLETE TEST SUITE"
  
  echo -e "${CYAN}Running all tests for the ERP system${NC}"
  echo -e "${CYAN}Date: $(date)${NC}"
  echo -e "${CYAN}This will test every function, workflow, and dashboard${NC}"
  echo ""
  
  # Check if server is running
  echo "Checking if backend server is running..."
  if ! curl -s http://localhost:4009/api/v1/health > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Backend server may not be running on port 4009${NC}"
    echo "Please ensure the server is running before continuing."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  else
    echo -e "${GREEN}✓ Backend server is running${NC}"
  fi
  
  # Run all test suites
  run_test_suite "master-test-suite.sh" "Master Test Suite (All Endpoints)"
  run_test_suite "test-all-dashboards.sh" "Dashboard Testing Suite"
  run_test_suite "test-all-workflows.sh" "Workflow Testing Suite"
  run_test_suite "test-hr-admin-endpoints.sh" "HR Admin Module Tests"
  run_test_suite "attendance-test.sh" "Attendance System Tests"
  run_test_suite "payroll-test.sh" "Payroll System Tests"
  run_test_suite "payment-systems-test.sh" "Payment Systems Tests"
  run_test_suite "department-managers-test.sh" "Department Manager Tests"
  run_test_suite "payroll-finance-transfer-test.sh" "Payroll Transfer Tests"
  run_test_suite "test-new-endpoints.sh" "New Endpoints Tests"
  run_test_suite "comprehensive-test.sh" "Comprehensive System Tests"
  
  # Print final summary
  print_header "FINAL TEST REPORT"
  
  echo -e "${CYAN}Test Suite Results:${NC}"
  echo -e "${CYAN}$(printf '─%.0s' {1..70})${NC}"
  
  for suite in "${!TEST_RESULTS[@]}"; do
    local result=${TEST_RESULTS[$suite]}
    if [ "$result" = "PASS" ]; then
      echo -e "  ${GREEN}✓${NC} $suite"
    elif [ "$result" = "FAIL" ]; then
      echo -e "  ${RED}✗${NC} $suite"
    else
      echo -e "  ${YELLOW}⊘${NC} $suite"
    fi
  done
  
  echo ""
  echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}  Overall Summary"
  echo -e "${CYAN}╠════════════════════════════════════════════════════════════════╣${NC}"
  echo -e "${CYAN}║${NC}  Total Suites:   $TOTAL_SUITES"
  echo -e "${CYAN}║${NC}  ${GREEN}Passed:         $PASSED_SUITES${NC}"
  echo -e "${CYAN}║${NC}  ${RED}Failed:         $FAILED_SUITES${NC}"
  
  if [ $TOTAL_SUITES -gt 0 ]; then
    local success_rate=$(( PASSED_SUITES * 100 / TOTAL_SUITES ))
    echo -e "${CYAN}║${NC}  Success Rate:   ${success_rate}%"
  fi
  
  echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  ✓ ALL TESTS PASSED - SYSTEM FULLY VERIFIED"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
  else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║${NC}  ✗ SOME TESTS FAILED - REVIEW REQUIRED"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
  fi
}

main
