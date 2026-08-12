import re

with open('client/src/pages/ModernStudyCenterDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace('<TabsList className="flex-wrap h-auto gap-1">', '<TabsList className="hidden flex-wrap h-auto gap-1">')

with open('client/src/pages/ModernStudyCenterDashboard.tsx', 'w') as f:
    f.write(content)
