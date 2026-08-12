import re

with open('client/src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# Replace <ModernCEODashboard initialTab={initialTab} />
# with <ModernCEODashboard initialTab={initialTab} onNavigate={onNavigateToTable} />
# Same for Employee, Sales, StudyCenter
# Let's just do it for all instances of initialTab={initialTab}
content = content.replace('initialTab={initialTab}', 'initialTab={initialTab} onNavigate={onNavigateToTable}')

# Wait, some components might not accept onNavigate yet.
# It's fine to pass it as a prop even if they don't declare it in TypeScript, wait no, TS will complain if we pass a prop they don't accept!
