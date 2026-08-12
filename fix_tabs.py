import os
import re

directory = 'client/src/pages'
for filename in os.listdir(directory):
    if filename.startswith('Modern') and filename.endswith('Dashboard.tsx'):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Find the default fallback used in useState
        match = re.search(r'const \[activeTab, setActiveTab\] = useState\((.*?)\);', content)
        if match:
            fallback = match.group(1)
            # Replace the buggy useEffect
            # old: useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
            # old variation: useEffect(() => {
            #    if (initialTab) setActiveTab(initialTab);
            # }, [initialTab]);
            
            # Use regex to find and replace
            content = re.sub(
                r'useEffect\(\(\) => \{[\s]*if \(initialTab\) setActiveTab\(initialTab\);[\s]*\}, \[initialTab\]\);',
                f'useEffect(() => {{\n    setActiveTab({fallback});\n  }}, [initialTab]);',
                content
            )
            
            # Special case for mappedInitialTab in EmployeeDashboard
            if 'mappedInitialTab' in content and 'useEffect(() => {\n    if (mappedInitialTab) setActiveTab(mappedInitialTab);\n  }, [mappedInitialTab]);' in content:
                 content = content.replace(
                     'useEffect(() => {\n    if (mappedInitialTab) setActiveTab(mappedInitialTab);\n  }, [mappedInitialTab]);',
                     f'useEffect(() => {{\n    setActiveTab({fallback});\n  }}, [mappedInitialTab]);'
                 )

            # Special case for SalesDashboard line 416
            content = re.sub(
                r'useEffect\(\(\) => \{\n\s*if \(initialTab\) setActiveTab\(initialTab\);\n\s*\}, \[initialTab\]\);',
                f'useEffect(() => {{\n    setActiveTab({fallback});\n  }}, [initialTab]);',
                content
            )
            
            with open(filepath, 'w') as f:
                f.write(content)
            print(f'Fixed {filename}')
