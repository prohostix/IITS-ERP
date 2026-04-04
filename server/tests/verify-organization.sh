#!/bin/bash

echo "=========================================="
echo "Project Organization Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗${NC} $2"
    FAIL=$((FAIL + 1))
  fi
}

# Check root directory is clean
ROOT_FILES=$(ls -1 | grep -v -E "^(client|server|docs|LICENSE|README.md|PROJECT_ORGANIZATION.md|ORGANIZATION_COMPLETE.md|verify-organization.sh)$" | wc -l)
check $ROOT_FILES "Root directory is clean (only essential files)"

# Check docs folder exists and has files
[ -d "docs" ] && [ $(ls -1 docs/ | wc -l) -ge 5 ]
check $? "docs/ folder exists with documentation"

# Check server/docs exists and has files
[ -d "server/docs" ] && [ $(ls -1 server/docs/ | wc -l) -ge 40 ]
check $? "server/docs/ folder exists with 40+ files"

# Check server/tests exists and has files
[ -d "server/tests" ] && [ $(ls -1 server/tests/ | wc -l) -ge 15 ]
check $? "server/tests/ folder exists with 15+ test scripts"

# Check client folder structure
[ -d "client/src" ] && [ -d "client/public" ]
check $? "client/ folder structure intact"

# Check server folder structure
[ -d "server/src" ] && [ -d "server/src/controllers" ] && [ -d "server/src/models" ]
check $? "server/ folder structure intact"

# Check README files exist
[ -f "README.md" ] && [ -f "docs/README.md" ] && [ -f "server/docs/README.md" ] && [ -f "server/tests/README.md" ]
check $? "All README.md files exist"

# Check no loose test scripts in root
ls -1 *.sh 2>/dev/null | grep -v "verify-organization.sh" > /dev/null
if [ $? -eq 0 ]; then
  check 1 "No loose test scripts in root"
else
  check 0 "No loose test scripts in root"
fi

# Check no loose markdown files in root (except essential ones)
LOOSE_MD=$(ls -1 *.md 2>/dev/null | grep -v -E "^(README.md|PROJECT_ORGANIZATION.md|ORGANIZATION_COMPLETE.md)$" | wc -l)
check $LOOSE_MD "No loose markdown files in root"

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✓ Organization verified successfully!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some checks failed${NC}"
  exit 1
fi
