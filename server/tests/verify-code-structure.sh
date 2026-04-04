#!/bin/bash

# Code Structure Verification Script
# Tests that all code files are present and properly structured

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL=0
PASSED=0
FAILED=0

check_file() {
    TOTAL=$((TOTAL + 1))
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $2 - File not found: $1"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

check_dir() {
    TOTAL=$((TOTAL + 1))
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $2 - Directory not found: $1"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

count_files() {
    COUNT=$(find "$1" -name "$2" 2>/dev/null | wc -l | tr -d ' ')
    TOTAL=$((TOTAL + 1))
    if [ "$COUNT" -ge "$3" ]; then
        echo -e "${GREEN}✓${NC} $4: Found $COUNT files (expected >= $3)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $4: Found $COUNT files (expected >= $3)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}║   🔍 ERP System Code Structure Verification              ║${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Backend Structure
echo -e "${YELLOW}[1/10] Verifying Backend Structure...${NC}"
check_dir "server" "Server directory exists"
check_dir "server/src" "Server source directory exists"
check_file "server/package.json" "Server package.json exists"
check_file "server/tsconfig.json" "Server TypeScript config exists"
check_file "server/.env" "Server environment file exists"

echo -e "\n${YELLOW}[2/10] Verifying Backend Models (26 expected)...${NC}"
check_dir "server/src/models" "Models directory exists"
count_files "server/src/models" "*.ts" 26 "Model files"
check_file "server/src/models/User.ts" "User model"
check_file "server/src/models/Organization.ts" "Organization model"
check_file "server/src/models/Department.ts" "Department model"
check_file "server/src/models/License.ts" "License model"
check_file "server/src/models/Task.ts" "Task model"
check_file "server/src/models/Student.ts" "Student model"
check_file "server/src/models/Escalation.ts" "Escalation model"

echo -e "\n${YELLOW}[3/10] Verifying Backend Controllers (13 expected)...${NC}"
check_dir "server/src/controllers" "Controllers directory exists"
count_files "server/src/controllers" "*.ts" 13 "Controller files"
check_file "server/src/controllers/authController.ts" "Auth controller"
check_file "server/src/controllers/userController.ts" "User controller"
check_file "server/src/controllers/taskController.ts" "Task controller"
check_file "server/src/controllers/hrController.ts" "HR controller"
check_file "server/src/controllers/financeController.ts" "Finance controller"
check_file "server/src/controllers/operationsController.ts" "Operations controller"
check_file "server/src/controllers/dashboardController.ts" "Dashboard controller"

echo -e "\n${YELLOW}[4/10] Verifying Backend Routes (13 expected)...${NC}"
check_dir "server/src/routes" "Routes directory exists"
count_files "server/src/routes" "*.ts" 13 "Route files"
check_file "server/src/routes/authRoutes.ts" "Auth routes"
check_file "server/src/routes/userRoutes.ts" "User routes"
check_file "server/src/routes/taskRoutes.ts" "Task routes"
check_file "server/src/routes/hrRoutes.ts" "HR routes"
check_file "server/src/routes/financeRoutes.ts" "Finance routes"

echo -e "\n${YELLOW}[5/10] Verifying Backend Middleware...${NC}"
check_dir "server/src/middleware" "Middleware directory exists"
check_file "server/src/middleware/auth.ts" "Auth middleware"
check_file "server/src/middleware/errorHandler.ts" "Error handler middleware"
check_file "server/src/middleware/upload.ts" "Upload middleware"
check_file "server/src/middleware/auditLog.ts" "Audit log middleware"

echo -e "\n${YELLOW}[6/10] Verifying Backend Services...${NC}"
check_dir "server/src/services" "Services directory exists"
check_file "server/src/services/escalationService.ts" "Escalation service"

echo -e "\n${YELLOW}[7/10] Verifying Backend Configuration...${NC}"
check_dir "server/src/config" "Config directory exists"
check_file "server/src/config/database.ts" "Database config"
check_file "server/src/config/constants.ts" "Constants config"
check_file "server/src/server.ts" "Server entry point"

# Frontend Structure
echo -e "\n${YELLOW}[8/10] Verifying Frontend Structure...${NC}"
check_dir "client" "Client directory exists"
check_dir "client/src" "Client source directory exists"
check_file "client/package.json" "Client package.json exists"
check_file "client/tsconfig.json" "Client TypeScript config exists"
check_file "client/.env" "Client environment file exists"
check_file "client/vite.config.ts" "Vite config exists"
check_file "client/tailwind.config.js" "Tailwind config exists"

echo -e "\n${YELLOW}[9/10] Verifying Frontend Components...${NC}"
check_dir "client/src/components" "Components directory exists"
check_dir "client/src/components/ui" "UI components directory exists"
check_dir "client/src/components/panels" "Panels directory exists"
count_files "client/src/components/ui" "*.tsx" 50 "UI component files"
check_file "client/src/components/panels/CEODashboard.tsx" "CEO Dashboard"
check_file "client/src/components/panels/SuperadminPanel.tsx" "Superadmin Panel"
check_file "client/src/components/panels/OperationsPanel.tsx" "Operations Panel"
check_file "client/src/components/panels/FinancePanel.tsx" "Finance Panel"
check_file "client/src/components/panels/HRPanel.tsx" "HR Panel"

echo -e "\n${YELLOW}[10/10] Verifying Frontend Core Files...${NC}"
check_file "client/src/App.tsx" "App component"
check_file "client/src/main.tsx" "Main entry point"
check_file "client/src/lib/api.ts" "API service layer"
check_file "client/src/lib/utils.ts" "Utility functions"
check_file "client/src/hooks/useAuth.tsx" "Auth hook"
check_file "client/src/types/erp.ts" "TypeScript types"

# Documentation
echo -e "\n${YELLOW}[Bonus] Verifying Documentation...${NC}"
check_file "README.md" "Main README"
check_file "QUICKSTART.md" "Quick start guide"
check_file "PROJECT_STRUCTURE.md" "Project structure doc"
check_file "FEATURE_VERIFICATION.md" "Feature verification doc"
check_file "TEST_RESULTS.md" "Test results doc"
check_file "MONGODB_SETUP.md" "MongoDB setup guide"

# Summary
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}║   📊 Code Structure Verification Results                 ║${NC}"
echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}║   Total Checks: $TOTAL                                        ║${NC}"
echo -e "${BLUE}║   ${GREEN}Passed: $PASSED${BLUE}                                           ║${NC}"
echo -e "${BLUE}║   ${RED}Failed: $FAILED${BLUE}                                            ║${NC}"
echo -e "${BLUE}║                                                           ║${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${BLUE}║   ${GREEN}✓ All code structure checks passed!${BLUE}                  ║${NC}"
    echo -e "${BLUE}║                                                           ║${NC}"
    echo -e "${BLUE}║   Next Step: Install MongoDB and run tests               ║${NC}"
    echo -e "${BLUE}║   See: MONGODB_SETUP.md                                  ║${NC}"
else
    echo -e "${BLUE}║   ${RED}✗ Some structure checks failed${BLUE}                       ║${NC}"
fi

echo -e "${BLUE}║                                                           ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
