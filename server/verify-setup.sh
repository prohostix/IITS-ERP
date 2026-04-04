#!/bin/bash

# ERP System Setup Verification Script

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ERP System - Setup Verification                        ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Found $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found"
    echo "Please install Node.js >= 18.x from https://nodejs.org/"
    exit 1
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} Found v$NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

# Check MongoDB
echo -n "Checking MongoDB... "
if command -v mongod &> /dev/null; then
    MONGO_VERSION=$(mongod --version | head -n 1)
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${YELLOW}⚠${NC} MongoDB not found in PATH"
    echo "Please ensure MongoDB is installed and running"
fi

# Check if MongoDB is running
echo -n "Checking MongoDB connection... "
if mongosh --eval "db.version()" &> /dev/null; then
    echo -e "${GREEN}✓${NC} Connected"
else
    echo -e "${YELLOW}⚠${NC} Cannot connect to MongoDB"
    echo "Please start MongoDB: mongod"
fi

# Check backend dependencies
echo -n "Checking backend dependencies... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Installed"
else
    echo -e "${YELLOW}⚠${NC} Not installed"
    echo "Run: npm install"
fi

# Check frontend dependencies
echo -n "Checking frontend dependencies... "
if [ -d "../node_modules" ]; then
    echo -e "${GREEN}✓${NC} Installed"
else
    echo -e "${YELLOW}⚠${NC} Not installed"
    echo "Run: cd .. && npm install"
fi

# Check .env file
echo -n "Checking backend .env file... "
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${YELLOW}⚠${NC} Not found"
    echo "Run: cp .env.example .env"
fi

# Check frontend .env file
echo -n "Checking frontend .env file... "
if [ -f "../.env" ]; then
    echo -e "${GREEN}✓${NC} Found"
else
    echo -e "${YELLOW}⚠${NC} Not found"
    echo "Run: cd .. && cp .env.example .env"
fi

# Check if backend is running
echo -n "Checking backend server... "
if curl -s http://localhost:5000/health &> /dev/null; then
    echo -e "${GREEN}✓${NC} Running on port 5000"
else
    echo -e "${YELLOW}⚠${NC} Not running"
    echo "Start with: npm run dev"
fi

# Check if frontend is running
echo -n "Checking frontend server... "
if curl -s http://localhost:5173 &> /dev/null; then
    echo -e "${GREEN}✓${NC} Running on port 5173"
else
    echo -e "${YELLOW}⚠${NC} Not running"
    echo "Start with: cd .. && npm run dev"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Verification Complete                                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. If MongoDB is not running: mongod"
echo "2. If dependencies not installed: npm install"
echo "3. If .env files missing: cp .env.example .env"
echo "4. Seed database: npm run seed"
echo "5. Start backend: npm run dev"
echo "6. Start frontend: cd .. && npm run dev"
echo ""
echo "Access the application at: http://localhost:5173"
echo ""
