#!/bin/bash

# ERP System - Automated Installation Script

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   Multi-Tenant ERP System                                ║"
echo "║   Automated Installation                                 ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "Please install Node.js >= 18.x from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found:${NC} $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found:${NC} v$(npm -v)"

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    echo -e "${YELLOW}⚠ MongoDB not found in PATH${NC}"
    echo "Please ensure MongoDB is installed"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ MongoDB found${NC}"
fi

echo ""
echo -e "${BLUE}Installing dependencies...${NC}"
echo ""

# Install frontend dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..
echo -e "${GREEN}✓ Client dependencies installed${NC}"
echo ""

# Install backend dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..
echo -e "${GREEN}✓ Server dependencies installed${NC}"
echo ""

# Setup environment files
echo -e "${BLUE}Setting up environment files...${NC}"
echo ""

# Frontend .env
if [ ! -f "client/.env" ]; then
    echo "Creating client .env file..."
    cd client
    cp .env.example .env
    cd ..
    echo -e "${GREEN}✓ Client .env created${NC}"
else
    echo -e "${YELLOW}⚠ Client .env already exists${NC}"
fi

# Backend .env
if [ ! -f "server/.env" ]; then
    echo "Creating backend .env file..."
    cd server
    cp .env.example .env
    cd ..
    echo -e "${GREEN}✓ Backend .env created${NC}"
else
    echo -e "${YELLOW}⚠ Backend .env already exists${NC}"
fi

echo ""
echo -e "${BLUE}Checking MongoDB connection...${NC}"
echo ""

# Check if MongoDB is running
if mongosh --eval "db.version()" &> /dev/null; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
    
    # Ask to seed database
    echo ""
    read -p "Would you like to seed the database with sample data? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🌱 Seeding database..."
        cd server
        npm run seed
        cd ..
        echo -e "${GREEN}✓ Database seeded successfully${NC}"
    fi
else
    echo -e "${YELLOW}⚠ MongoDB is not running${NC}"
    echo "Please start MongoDB with: mongod"
    echo "Then run: cd server && npm run seed"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   Installation Complete! 🎉                              ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo ""
echo "1. Start MongoDB (if not running):"
echo "   ${BLUE}mongod${NC}"
echo ""
echo "2. Start the backend server (Terminal 1):"
echo "   ${BLUE}cd server && npm run dev${NC}"
echo ""
echo "3. Start the frontend (Terminal 2):"
echo "   ${BLUE}cd client && npm run dev${NC}"
echo ""
echo "4. Open your browser:"
echo "   ${BLUE}http://localhost:5173${NC}"
echo ""
echo -e "${GREEN}Default login credentials:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "CEO:           ceo@edutechglobal.com / ceo123"
echo "Ops Admin:     ops.admin@edutechglobal.com / opsadmin123"
echo "Finance Admin: finance.admin@edutechglobal.com / finance123"
echo "HR Admin:      hr.admin@edutechglobal.com / hradmin123"
echo "Superadmin:    superadmin@erp.com / superadmin123"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  • Quick Start: QUICKSTART.md"
echo "  • Setup Guide: SETUP.md"
echo "  • API Docs: server/API.md"
echo "  • Project Summary: PROJECT_SUMMARY.md"
echo ""
echo "Happy coding! 🚀"
echo ""
