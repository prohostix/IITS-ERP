import re

with open('client/src/App.tsx', 'r') as f:
    content = f.read()

original = """    if (user.role === 'center_admin') {
      return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'center_wallet', label: 'Wallet' },
        { id: 'enroll_student', label: 'Enroll Student' },
        { id: 'center_enrollments', label: 'My Enrollments' },
        { id: 'center_programs', label: 'Programs & Materials' },
        { id: 'tasks', label: 'Tasks' },
      ];
    }"""

new_code = """    if (user.role === 'center_admin') {
      return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'center_wallet', label: 'Wallet' },
        { id: 'enroll_student', label: 'Enroll Student' },
        { id: 'center_enrollments', label: 'My Enrollments' },
        { id: 'students', label: 'Students' },
        { id: 'center_programs', label: 'Programs & Materials' },
        { id: 'tasks', label: 'Tasks' },
      ];
    }"""

content = content.replace(original, new_code)

with open('client/src/App.tsx', 'w') as f:
    f.write(content)
