#!/bin/bash

# Test script for new enhancement endpoints
# Run this after starting the server

BASE_URL="http://localhost:4009/api/v1"
TOKEN=""

echo "=========================================="
echo "Testing New Enhancement Endpoints"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL=0
PASSED=0
FAILED=0

test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  local data=$4
  local expected_status=$5
  
  TOTAL=$((TOTAL + 1))
  echo -n "Testing: $description... "
  
  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  status_code=$(echo "$response" | tail -n1)
  
  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
    FAILED=$((FAILED + 1))
  fi
}

# Login first to get token
echo "Logging in to get auth token..."
login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }')

TOKEN=$(echo $login_response | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to get auth token. Please check if server is running and credentials are correct.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo ""

# ==========================================
# CEO Dashboard Endpoints
# ==========================================
echo "=========================================="
echo "CEO Dashboard Endpoints"
echo "=========================================="

test_endpoint "GET" "/ceo/metrics/performance" "Get performance metrics" "" "200"
test_endpoint "GET" "/ceo/metrics/risk" "Get risk metrics" "" "200"
test_endpoint "GET" "/ceo/escalations" "Get escalations" "" "200"

echo ""

# ==========================================
# Organization Admin Endpoints
# ==========================================
echo "=========================================="
echo "Organization Admin Endpoints"
echo "=========================================="

test_endpoint "GET" "/org/ceo-panels" "Get CEO panels" "" "200"
test_endpoint "GET" "/org/departments/custom" "Get custom departments" "" "200"

echo ""

# ==========================================
# Sub-Department Endpoints
# ==========================================
echo "=========================================="
echo "Sub-Department Endpoints"
echo "=========================================="

test_endpoint "GET" "/sub-departments" "Get sub-departments" "" "200"

echo ""

# ==========================================
# Credential Request Endpoints
# ==========================================
echo "=========================================="
echo "Credential Request Endpoints"
echo "=========================================="

test_endpoint "GET" "/credentials/requests" "Get credential requests" "" "200"
test_endpoint "GET" "/credentials/stats" "Get credential stats" "" "200"

echo ""

# ==========================================
# Edit/Delete Request Endpoints
# ==========================================
echo "=========================================="
echo "Edit/Delete Request Endpoints"
echo "=========================================="

test_endpoint "GET" "/edit-delete/requests" "Get edit/delete requests" "" "200"
test_endpoint "GET" "/edit-delete/stats" "Get edit/delete stats" "" "200"

echo ""

# ==========================================
# REREG Endpoints
# ==========================================
echo "=========================================="
echo "REREG Endpoints"
echo "=========================================="

test_endpoint "GET" "/rereg/rules" "Get REREG rules" "" "404"
test_endpoint "GET" "/rereg/pending" "Get pending RERGs" "" "200"
test_endpoint "GET" "/rereg/completed" "Get completed REREGs" "" "200"
test_endpoint "GET" "/rereg/stats" "Get REREG stats" "" "200"

echo ""

# ==========================================
# Referral Link Endpoints
# ==========================================
echo "=========================================="
echo "Referral Link Endpoints"
echo "=========================================="

test_endpoint "GET" "/referrals/my-links" "Get my referral links" "" "200"
test_endpoint "GET" "/referrals/links" "Get all referral links" "" "200"
test_endpoint "GET" "/referrals/centers" "Get referred centers" "" "200"
test_endpoint "GET" "/referrals/students" "Get referred students" "" "200"

echo ""

# ==========================================
# Session Request Endpoints
# ==========================================
echo "=========================================="
echo "Session Request Endpoints"
echo "=========================================="

test_endpoint "GET" "/sessions/requests" "Get session requests" "" "200"
test_endpoint "GET" "/sessions/stats" "Get session stats" "" "200"

echo ""

# ==========================================
# GST Settings Endpoints
# ==========================================
echo "=========================================="
echo "GST Settings Endpoints"
echo "=========================================="

test_endpoint "GET" "/gst/settings" "Get GST settings" "" "200"
test_endpoint "GET" "/gst/summary" "Get GST summary" "" "200"

echo ""

# ==========================================
# Incentive Structure Endpoints
# ==========================================
echo "=========================================="
echo "Incentive Structure Endpoints"
echo "=========================================="

test_endpoint "GET" "/incentives" "Get incentive structures" "" "200"
test_endpoint "GET" "/incentives/active/current" "Get active incentives" "" "200"

echo ""

# ==========================================
# Summary
# ==========================================
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
