#!/bin/bash
# Global replacements for common Prisma field mismatches
find src -name "*.ts" -type f | xargs sed -i '' 's/\borgId\b/organizationId/g'
find src -name "*.ts" -type f | xargs sed -i '' 's/\bcreatorId\b/createdBy/g'
find src -name "*.ts" -type f | xargs sed -i '' 's/\bassigneeId\b/assignedTo/g'
find src -name "*.ts" -type f | xargs sed -i '' 's/\bdueDate\b/deadline/g'
find src -name "*.ts" -type f | xargs sed -i '' 's/\braisedBy\b/employee/g'
find src -name "*.ts" -type f | xargs sed -i '' 's/\bresolvedById\b/resolvedById/g' # wait, check schema

# Specific relationship fixes
find src/controllers -name "*.ts" -type f | xargs sed -i '' 's/include: { center:/include: { studyCenter:/g'
find src/controllers -name "*.ts" -type f | xargs sed -i '' 's/include: { raisedBy:/include: { employee:/g'
find src/controllers -name "*.ts" -type f | xargs sed -i '' 's/include: { creator:/include: { assigner:/g'

# SubDepartment fixes
find src/controllers -name "subDepartmentController.ts" -type f | xargs sed -i '' 's/manager:/managerUser:/g'
find src/controllers -name "subDepartmentController.ts" -type f | xargs sed -i '' 's/studyCenters:/assignedCenters:/g'
find src/controllers -name "subDepartmentController.ts" -type f | xargs sed -i '' 's/universities:/assignedUniversities:/g'
find src/controllers -name "subDepartmentController.ts" -type f | xargs sed -i '' 's/programs:/assignedPrograms:/g'
