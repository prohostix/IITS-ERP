import os
import glob

def patch_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Add import if not present
    if "MyDocumentsPanel" not in content:
        import_stmt = "import { MyDocumentsPanel } from '@/components/panels/hr/MyDocumentsPanel';\n"
        # Find the last import
        lines = content.split('\n')
        last_import_idx = 0
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import_idx = i
        lines.insert(last_import_idx + 1, import_stmt)
        content = '\n'.join(lines)
        
        # Add to nav items
        if "{ id: 'my_documents', label: 'My Documents' }" not in content:
            content = content.replace(
                "{ id: 'my_payslips', label: 'Pay Slips' },",
                "{ id: 'my_payslips', label: 'Pay Slips' },\n    { id: 'my_documents', label: 'My Documents' },"
            )
            
        # Add to renderContent switch
        if "case 'my_documents': return <MyDocumentsPanel />;" not in content:
            content = content.replace(
                "case 'my_payslips': return <PayrollPanel />;",
                "case 'my_payslips': return <PayrollPanel />;\n      case 'my_documents': return <MyDocumentsPanel />;"
            )
            
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Patched {filepath}")

for filepath in glob.glob("client/src/pages/Modern*Dashboard.tsx"):
    if "Student" not in filepath and "CEO" not in filepath:
        patch_file(filepath)

