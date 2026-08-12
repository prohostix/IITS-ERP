import re

with open('server/src/controllers/salaryController.ts', 'r') as f:
    content = f.read()

content = content.replace(
    'organizationId_userId_year: { organizationId: req.user.organizationId, userId: req.params.userId, year }',
    'userId_year: { userId: req.params.userId, year }'
)

content = content.replace(
    'organizationId_userId_year: { organizationId: req.user.organizationId, userId: u.id, year }',
    'userId_year: { userId: u.id, year }'
)

with open('server/src/controllers/salaryController.ts', 'w') as f:
    f.write(content)
