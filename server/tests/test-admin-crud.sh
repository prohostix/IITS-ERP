#!/bin/bash

# ============================================================================
# Admin CRUD Operations Test Suite
# ============================================================================
# Tests all CRUD operations for Superadmin and Org Admin
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
  echo -e "${CYAN}▶ $1${NC}"
  echo -e "${CYAN}$(printf '─%.0s' {1..70})${NC}"
}

test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  local token=$4
  local data=$5
  local expected=${6:-200}
  
  TOTAL=$((TOTAL + 1))
  echo -n "  Testing: $description... "
  
  local response
  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "$data" 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" 2>/dev/null)
  fi
  
  local status=$(echo "$response" | tail -n1)
  
  if [ "$status" = "$expected" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL (Expected $expected, got $status)${NC}"
    FAILED=$((FAILED + 1))
  fi
}

# ============================================================================
# MAIN TESTS
# ============================================================================

main() {
  print_header "ADMIN CRUD OPERATIONS TEST SUITE"
  
  echo -e "${CYAN}Testing all CRUD operations for Superadmin and Org Admin${NC}"
  echo -e "${CYAN}Date: $(date)${NC}"
  echo ""
  
  # Authenticate as Superadmin
  print_section "Authenticating as Superadmin"
  local sa_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"superadmin@erp.com","password":"superadmin123"}')
  
  SUPERADMIN_TOKEN=$(echo "$sa_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -n "$SUPERADMIN_TOKEN" ]; then
    echo -e "  ${GREEN}✓ Superadmin authenticated${NC}"
  else
    echo -e "  ${RED}✗ Superadmin authentication failed${NC}"
    exit 1
  fi
  
  # Authenticate as Org Admin
  print_section "Authenticating as Org Admin"
  local oa_response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@edutechglobal.com","password":"orgadmin123"}')
  
  ORG_ADMIN_TOKEN=$(echo "$oa_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -n "$ORG_ADMIN_TOKEN" ]; then
    echo -e "  ${GREEN}✓ Org Admin authenticated${NC}"
  else
    echo -e "  ${RED}✗ Org Admin authentication failed${NC}"
    exit 1
  fi
  
  # ============================================================================
  # SUPERADMIN TESTS
  # ============================================================================
  
  print_header "SUPERADMIN CRUD TESTS"
  
  # Organizations CRUD
  print_section "Organizations Management"
  test_endpoint "GET" "/organizations" "List all organizations" "$SUPERADMIN_TOKEN"
  test_endpoint "POST" "/organizations" "Create organization" "$SUPERADMIN_TOKEN" \
    '{"name":"Test Org","email":"test@org.com","phone":"+1234567890","address":"Test Address"}' 201
  
  # Licenses CRUD
  print_section "Licenses Management"
  test_endpoint "GET" "/licenses" "List all licenses" "$SUPERADMIN_TOKEN"
  test_endpoint "POST" "/licenses" "Create license" "$SUPERADMIN_TOKEN" \
    '{"name":"Test License","type":"basic","maxUsers":100,"price":999}' 201
  
  # Users CRUD (All Organizations)
  print_section "Users Management (All Organizations)"
  test_endpoint "GET" "/users" "List all users" "$SUPERADMIN_TOKEN"
  test_endpoint "GET" "/users?role=employee" "Filter users by role" "$SUPERADMIN_TOKEN"
  
  # Departments CRUD (All Organizations)
  print_section "Departments Management (All Organizations)"
  test_endpoint "GET" "/departments" "List all departments" "$SUPERADMIN_TOKEN"
  test_endpoint "GET" "/departments?type=core" "Filter departments by type" "$SUPERADMIN_TOKEN"
  
  # ============================================================================
  # ORG ADMIN TESTS
  # ============================================================================
  
  print_header "ORG ADMIN CRUD TESTS"
  
  # Users CRUD (Own Organization)
  print_section "Users Management (Own Organization)"
  test_endpoint "GET" "/users" "List users in own org" "$ORG_ADMIN_TOKEN"
  test_endpoint "GET" "/users?role=employee" "Filter users by role" "$ORG_ADMIN_TOKEN"
  test_endpoint "POST" "/users" "Create user in own org" "$ORG_ADMIN_TOKEN" \
    '{"email":"testuser@test.com","password":"test123","name":"Test User","role":"employee"}' 201
  
  # Departments CRUD (Own Organization)
  print_section "Departments Management (Own Organization)"
  test_endpoint "GET" "/departments" "List departments in own org" "$ORG_ADMIN_TOKEN"
  test_endpoint "POST" "/departments" "Create department" "$ORG_ADMIN_TOKEN" \
    '{"name":"Test Department","type":"custom","features":["test"]}' 201
  test_endpoint "GET" "/departments/my-departments" "Get my managed departments" "$ORG_ADMIN_TOKEN"
  
  # Organization (Own Only)
  print_section "Organization Management (Own Only)"
  test_endpoint "GET" "/organizations" "List organizations (should fail)" "$ORG_ADMIN_TOKEN" "" 403
  
  # Licenses (Should Fail)
  print_section "Licenses Management (Should Fail)"
  test_endpoint "GET" "/licenses" "List licenses (should fail)" "$ORG_ADMIN_TOKEN" "" 403
  
  # ============================================================================
  # SUMMARY
  # ============================================================================
  
  print_header "TEST SUMMARY"
  
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
    echo -e "${GREEN}✓ ALL ADMIN CRUD OPERATIONS WORKING${NC}"
    exit 0
  else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
  fi
}

main
