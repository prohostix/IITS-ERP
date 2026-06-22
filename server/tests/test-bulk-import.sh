#!/bin/bash
# test-bulk-import.sh
# Tests the /users/bulk-import endpoint

BASE_URL="http://localhost:4009/api/v1"

echo "Authenticating as Org Admin..."
oa_response=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@edutechglobal.com","password":"orgadmin123"}')

ORG_ADMIN_TOKEN=$(echo "$oa_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$ORG_ADMIN_TOKEN" ]; then
  echo "✓ Org Admin authenticated"
else
  echo "✗ Org Admin authentication failed"
  exit 1
fi

echo "Sending bulk import payload..."
import_response=$(curl -s -X POST "$BASE_URL/users/bulk-import" \
  -H "Authorization: Bearer $ORG_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      {
        "name": "Bulk User One",
        "email": "bulk1@edutechglobal.com",
        "role": "employee",
        "department": "Operations",
        "canAddPrograms": "no"
      },
      {
        "name": "Bulk User Two",
        "email": "bulk2@edutechglobal.com",
        "role": "hr_admin",
        "department": "Human Resources",
        "canAddPrograms": "yes"
      },
      {
        "name": "Invalid Role User",
        "email": "bulk3@edutechglobal.com",
        "role": "invalid_role",
        "department": "Operations",
        "canAddPrograms": "no"
      }
    ]
  }')

echo "Response from server:"
echo "$import_response"
