import re

with open('client/src/pages/ModernCEODashboard.tsx', 'r') as f:
    content = f.read()

# 1. Update props signature
content = content.replace(
    'export function ModernCEODashboard({ initialTab }: { initialTab?: string }) {',
    'export function ModernCEODashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {'
)

# 2. Add handleTabChange
handle_tab_change_code = """  const [activeTab, setActiveTab] = useState(initialTab || 'overview');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab === 'overview' ? 'dashboard' : tab);
    }
  };"""

content = content.replace(
    "  const [activeTab, setActiveTab] = useState(initialTab || 'overview');",
    handle_tab_change_code
)

# 3. Replace all setActiveTab in onClick and onValueChange with handleTabChange
content = content.replace('onClick={() => setActiveTab(', 'onClick={() => handleTabChange(')
content = content.replace('onValueChange={setActiveTab}', 'onValueChange={handleTabChange}')
# also fix EscalationPreview
content = content.replace('onViewAll={() => setActiveTab(', 'onViewAll={() => handleTabChange(')

with open('client/src/pages/ModernCEODashboard.tsx', 'w') as f:
    f.write(content)

