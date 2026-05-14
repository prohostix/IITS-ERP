import os
import re

replacements = {
    r'\borgId\b': 'organizationId',
    r'\bcreatorId\b': 'createdBy',
    r'\bassigneeId\b': 'assignedTo',
    r'\bdueDate\b': 'deadline',
    r'\braisedBy\b': 'employee',
    r'\bcenterId\b': 'studyCenterId',
    r'\bassistantManagerIds\b': 'assistantManagers',
    r'\bdeptReviewedBy\b': 'reviewedByDeptId',
    r'\bfinanceReviewedBy\b': 'reviewedByFinanceId',
    # Relationship names
    r'center:': 'studyCenter:',
    r'raisedBy:': 'employee:',
    r'creator:': 'assigner:',
    r'requester:': 'user:', 
    r'deptReviewedBy:': 'reviewerDept:',
    # SubDepartment specific
    r'universities: {': 'assignedUniversities: {',
    r'programs: {': 'assignedPrograms: {',
    r'studyCenters: {': 'assignedCenters: {',
    r'\.universities\b': '.assignedUniversities',
    r'\.programs\b': '.assignedPrograms',
    r'\.studyCenters\b': '.assignedCenters',
    # Casting
    r'status: "([^"]+)"': r'status: "\1" as any',
    r"status: '([^']+)'": r"status: '\1' as any",
    r'type: "([^"]+)"': r'type: "\1" as any',
    r"type: '([^']+)'": r"type: '\1' as any",
    r'role: "([^"]+)"': r'role: "\1" as any',
    r"role: '([^']+)'": r"role: '\1' as any",
}

def fix_file(filepath):
    if 'generated' in filepath:
        return False
    with open(filepath, 'r') as f:
        content = f.read()
    new_content = content
    for old, new in replacements.items():
        if old.startswith(r'\b'):
            new_content = re.sub(old, new, new_content)
        else:
            new_content = new_content.replace(old, new)
    
    if "departmentController.ts" in filepath:
        new_content = new_content.replace('managerUser:', 'manager:')
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        return True
    return False

src_dir = '/Users/retro/Documents/IITS-ERP-main/server/src'
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.ts'):
            fix_file(os.path.join(root, file))
