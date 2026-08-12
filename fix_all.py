import os
import re

directory = 'client/src/pages'
for filename in os.listdir(directory):
    if filename.startswith('Modern') and filename.endswith('Dashboard.tsx'):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        # Update props signature to include onNavigate
        if 'onNavigate?:' not in content:
            if 'initialTab, isSubDeptManager' in content: # SalesDashboard
                content = content.replace(
                    '{ initialTab, isSubDeptManager }: { initialTab?: string; isSubDeptManager?: boolean }',
                    '{ initialTab, isSubDeptManager, onNavigate }: { initialTab?: string; isSubDeptManager?: boolean; onNavigate?: (tab: string) => void }'
                )
            elif 'initialTab' in content:
                content = content.replace(
                    '{ initialTab }: { initialTab?: string }',
                    '{ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }'
                )
            elif '()' in content: # Some might not have initialTab
                content = content.replace(
                    '() {',
                    '({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {'
                )

        # For the 4 dashboards that use in-page links, add handleTabChange
        if filename in ['ModernEmployeeDashboard.tsx', 'ModernSalesDashboard.tsx', 'ModernStudyCenterDashboard.tsx']:
            # Find the useState definition
            match = re.search(r'const \[activeTab, setActiveTab\] = useState\((.*?)\);', content)
            if match:
                fallback = match.group(1)
                handle_tab_change_code = f"""  const [activeTab, setActiveTab] = useState({fallback});

  const handleTabChange = (tab: string) => {{
    setActiveTab(tab);
    if (onNavigate) {{
      onNavigate(tab === 'overview' || tab === 'my_subdept' ? 'dashboard' : tab);
    }}
  }};"""
                content = content.replace(
                    f"  const [activeTab, setActiveTab] = useState({fallback});",
                    handle_tab_change_code
                )

                # Replace setActiveTab with handleTabChange
                content = content.replace('onClick={() => setActiveTab(', 'onClick={() => handleTabChange(')
                content = content.replace('onValueChange={setActiveTab}', 'onValueChange={handleTabChange}')
                content = content.replace('onViewAll={() => setActiveTab(', 'onViewAll={() => handleTabChange(')

        with open(filepath, 'w') as f:
            f.write(content)

