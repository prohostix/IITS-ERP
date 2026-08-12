import re

with open('client/src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# Replace all occurrences of initialTab={initialTab} with initialTab={initialTab} onNavigate={onNavigateToTable}
content = content.replace('initialTab={initialTab}', 'initialTab={initialTab} onNavigate={onNavigateToTable}')

with open('client/src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)

