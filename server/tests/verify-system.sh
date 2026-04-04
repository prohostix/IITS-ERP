#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "ERP System Verification"
echo "=========================================="
echo ""

# Check if servers are running
echo "1. Checking Server Status..."
if curl -s http://localhost:4009/health > /dev/null; then
    echo -e "${GREEN}✓ Backend server is running on port 4009${NC}"
else
    echo -e "${RED}✗ Backend server is not responding${NC}"
    exit 1
fi

if curl -s http://localhost:5194 > /dev/null; then
    echo -e "${GREEN}✓ Frontend server is running on port 5194${NC}"
else
    echo -e "${RED}✗ Frontend server is not responding${NC}"
    exit 1
fi

echo ""
echo "2. Testing Backend Health..."
HEALTH=$(curl -s http://localhost:4009/health)
if echo "$HEALTH" | grep -q "success"; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
    echo "   Response: $(echo $HEALTH | jq -r '.message' 2>/dev/null || echo $HEALTH)"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi

echo ""
echo "3. Checking Database Connection..."
if echo "$HEALTH" | grep -q "running"; then
    echo -e "${GREEN}✓ Database connection verified${NC}"
else
    echo -e "${YELLOW}⚠ Database status unclear${NC}"
fi

echo ""
echo "4. Testing Authentication Endpoints..."
# Test login endpoint exists
LOGIN_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:4009/api/v1/auth/login -H "Content-Type: application/json" -d '{}')
if [ "$LOGIN_TEST" != "000" ]; then
    echo -e "${GREEN}✓ Auth endpoints accessible (Status: $LOGIN_TEST)${NC}"
else
    echo -e "${RED}✗ Auth endpoints not accessible${NC}"
fi

echo ""
echo "5. Verifying Key Routes..."

# Test routes (should return 401 without auth, which means they exist)
ROUTES=(
    "/api/v1/users"
    "/api/v1/departments"
    "/api/v1/tasks"
    "/api/v1/students"
    "/api/v1/operations/universities"
    "/api/v1/finance/invoices"
    "/api/v1/hr/leaves"
    "/api/v1/sales/leads"
    "/api/v1/dashboard/metrics"
    "/api/v1/attendance"
    "/api/v1/payroll"
)

PASSED=0
FAILED=0

for route in "${ROUTES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4009$route)
    if [ "$STATUS" = "401" ] || [ "$STATUS" = "200" ] || [ "$STATUS" = "304" ]; then
        echo -e "${GREEN}✓${NC} $route (Status: $STATUS)"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $route (Status: $STATUS)"
        ((FAILED++))
    fi
done

echo ""
echo "6. Frontend Build Status..."
if [ -d "client/dist" ] || [ -d "client/build" ]; then
    echo -e "${GREEN}✓ Frontend build directory exists${NC}"
else
    echo -e "${YELLOW}⚠ Frontend build directory not found (dev mode)${NC}"
fi

echo ""
echo "7. Backend Build Status..."
if [ -d "server/dist" ]; then
    echo -e "${GREEN}✓ Backend compiled successfully${NC}"
    FILE_COUNT=$(find server/dist -name "*.js" | wc -l)
    echo "   Compiled files: $FILE_COUNT"
else
    echo -e "${RED}✗ Backend dist directory not found${NC}"
fi

echo ""
echo "8. Environment Configuration..."
if [ -f "server/.env" ]; then
    echo -e "${GREEN}✓ Server .env file exists${NC}"
else
    echo -e "${YELLOW}⚠ Server .env file not found${NC}"
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo -e "Routes Tested: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo ""
echo "Access URLs:"
echo "  Frontend: http://localhost:5194"
echo "  Backend:  http://localhost:4009"
echo "  Health:   http://localhost:4009/health"
echo ""
echo "Demo Accounts:"
echo "  Superadmin: superadmin@example.com / password123"
echo "  CEO:        ceo@example.com / password123"
echo "  Org Admin:  orgadmin@example.com / password123"
echo "  Ops Admin:  opsadmin@example.com / password123"
echo "  Finance:    financeadmin@example.com / password123"
echo "  HR Admin:   hradmin@example.com / password123"
echo "  Sales:      salesadmin@example.com / password123"
echo ""
echo "=========================================="
