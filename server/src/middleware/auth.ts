// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { applyBranchManagerRole } from '../utils/branchScope.js';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          organization: true,
          department: true,
          branch: true,
          designationRef: true,
          studyCenter: true,
          subDepartment: { include: { parentDept: true } },
          managedDepartments: true,
          managedSubDepartments: { select: { id: true, name: true } },
          managedBranch: { select: { id: true, name: true, code: true } },
          subordinates: { select: { id: true } },
        }
      });

      if (!user) {
        res.status(401).json({ success: false, message: 'User not found' });
        return;
      }

      if (user.status === 'suspended') {
        res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact HR.' });
        return;
      }

      if (user.status === 'resigned') {
        res.status(403).json({ success: false, message: 'Your account has been deactivated due to resignation.' });
        return;
      }

      user.isDepartmentManager = Boolean(user.department?.managerId === user.id) || Boolean((user as any).managedDepartments?.length > 0);
      applyBranchManagerRole(user);
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ success: false, message: 'Invalid token' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Auth error' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const isProjectManager = req.user.role === 'general_manager' || req.user.role === 'project_manager';

    if (roles.includes(req.user.role)) {
      return next();
    }

    // Project Manager (general_manager / project_manager) has full access to all Operations Department & global routes
    if (isProjectManager && roles.some(r => ['general_manager', 'project_manager', 'ops_admin', 'ops_sub_admin', 'ceo'].includes(r))) {
      return next();
    }
    
    // Check dynamic permissions for sub-admins
    const isSubAdmin = ['hr_sub_admin', 'finance_sub_admin', 'sales_sub_admin', 'ops_sub_admin'].includes(req.user.role);
    if (isSubAdmin) {
      const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
      // A simple heuristic: if the URL path (either baseUrl or path) contains the permission string, grant access.
      // E.g. permission 'leaves' allows access to /api/hr/leaves
      const hasPermission = perms.some((p: string) => req.path.includes(`/${p}`) || req.baseUrl.includes(`/${p}`));
      if (hasPermission) {
        return next();
      }
    }

    const deptType = req.user.department?.type || req.user.subDepartment?.parentDept?.type;
    const isHrEmployee = req.user.role === 'employee' && deptType === 'hr';
    const isFinanceEmployee = req.user.role === 'employee' && deptType === 'finance';
    
    // Allow HR employees access if hr_admin is in the allowed roles
    if (isHrEmployee && roles.includes('hr_admin')) {
      return next();
    }
    
    // Allow Finance employees access if finance_admin is in the allowed roles
    if (isFinanceEmployee && roles.includes('finance_admin')) {
      return next();
    }

    // Custom check: If the request is a write operation on programs, and the user has canAddPrograms permission, allow it.
    const isProgramWrite = (req.baseUrl.endsWith('/operations') || req.baseUrl.includes('/operations/')) &&
      (req.path.startsWith('/programs') || req.path.includes('/programs/')) &&
      ['POST', 'PUT', 'DELETE'].includes(req.method);

    // Allow department managers, sub-department managers, branch managers, or direct reporting managers to perform department leave approvals
    const isLeaveDeptApproval = req.baseUrl.includes('/hr') && (req.path.includes('/dept-approve') || req.path.endsWith('/approve'));
    const isAssignedDeptManager =
      Boolean(req.user.department?.managerId === req.user.id) ||
      Boolean((req.user as any).managedDepartments?.length > 0) ||
      Boolean((req.user as any).managedSubDepartments?.length > 0) ||
      Boolean((req.user as any).subordinates?.length > 0) ||
      Boolean(req.user.isDepartmentManager);
    if (isLeaveDeptApproval && (isAssignedDeptManager || Boolean(req.user.subDepartmentId) || Boolean(req.user.branchId))) {
      return next();
    }

    if (isProgramWrite && (req.user.canAddPrograms || ['ops_admin', 'general_manager', 'project_manager'].includes(req.user.role) || (req.user.role === 'ops_sub_admin' && Array.isArray(req.user.permissions) && req.user.permissions.includes('programs')))) {
      return next();
    }

    res.status(403).json({ success: false, message: 'Access denied' });
  };
};

// Exclusive Finance Payroll Approvers: strictly Shaju Sir & Pramod Sir
export const isPayrollFinanceApprover = (user: any): boolean => {
  if (!user) return false;
  const email = String(user.email || '').trim().toLowerCase();
  const name = String(user.name || '').trim().toLowerCase();

  const allowedEnv = (process.env.PAYROLL_ALLOWED_USERS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowedEnv.length > 0 && (allowedEnv.includes(email) || allowedEnv.includes(name))) {
    return true;
  }

  const allowedEmails = [
    'accountsmanager@iitseducation.org', // Shaju A
    'groupaccounts@iitseducation.org',   // Pramod P P
  ];
  if (allowedEmails.includes(email)) return true;

  return /\bshaju\b/i.test(name) || /\bpramod\b/i.test(name);
};

// HR Payroll Team: HR Admins, HR Sub-Admins, and HR Department Employees
export const isHRPayrollUser = (user: any): boolean => {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'hr_admin' || role === 'hr_sub_admin') return true;

  if (role === 'employee') {
    const deptType = String(user.department?.type || user.subDepartment?.parentDept?.type || '').toLowerCase();
    const deptName = String(user.department?.name || user.subDepartment?.parentDept?.name || '').toLowerCase();
    const desig = String(user.designation || user.designationRef?.title || '').toLowerCase();
    if (deptType === 'hr') return true;
    if (/\bhr\b|human\s*resource/i.test(deptName)) return true;
    if (/\bhr\b|human\s*resource/i.test(desig)) return true;
  }
  return false;
};

// Payroll Module Authorization: HR (Admins & HR Employees) + Shaju Sir & Pramod Sir
export const isPayrollAuthorizedUser = (user: any): boolean => {
  return isPayrollFinanceApprover(user) || isHRPayrollUser(user);
};

export const requirePayrollAccess = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !isPayrollAuthorizedUser(req.user)) {
    res.status(403).json({
      success: false,
      message: 'Payroll module access is restricted to HR team, Shaju Sir, and Pramod Sir.'
    });
    return;
  }
  next();
};

export const requirePayrollFinanceApprover = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !isPayrollFinanceApprover(req.user)) {
    res.status(403).json({
      success: false,
      message: 'Finance payroll approval & disbursement is restricted exclusively to Shaju Sir and Pramod Sir.'
    });
    return;
  }
  next();
};
