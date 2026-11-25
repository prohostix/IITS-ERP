export function isPayrollFinanceApprover(user: any): boolean {
  if (!user) return false;
  const email = String(user.email || '').trim().toLowerCase();
  const name = String(user.name || '').trim().toLowerCase();

  const allowedEmails = [
    'accountsmanager@iitseducation.org', // Shaju A
    'groupaccounts@iitseducation.org',   // Pramod P P
  ];
  if (allowedEmails.includes(email)) return true;

  return /\bshaju\b/i.test(name) || /\bpramod\b/i.test(name);
}

export function isHRPayrollUser(user: any): boolean {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'hr_admin' || role === 'hr_sub_admin') return true;

  // Include HR department employees (role === 'employee' in HR department)
  if (role === 'employee') {
    const deptObj = user.department || (typeof user.departmentId === 'object' ? user.departmentId : null);
    const subDeptParent = user.subDepartment?.parentDept || user.subDepartment?.parentDeptId;
    const deptType = String(deptObj?.type || subDeptParent?.type || '').toLowerCase();
    const deptName = String(deptObj?.name || subDeptParent?.name || '').toLowerCase();
    const desig = String(user.designation || user.designationRef?.title || '').toLowerCase();

    if (deptType === 'hr') return true;
    if (/\bhr\b|human\s*resource/i.test(deptName)) return true;
    if (/\bhr\b|human\s*resource/i.test(desig)) return true;
  }

  return false;
}

export function canAccessPayroll(user: any): boolean {
  return isPayrollFinanceApprover(user) || isHRPayrollUser(user);
}
