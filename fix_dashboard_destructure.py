import re

with open('client/src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'export function Dashboard({ useDepartmentDashboard, initialTab }: DashboardProps) {',
    'export function Dashboard({ useDepartmentDashboard, initialTab, onNavigateToTable }: DashboardProps) {'
)

with open('client/src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)

