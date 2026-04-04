export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  ORG_ADMIN: 'org_admin',
  CEO: 'ceo',
  OPS_ADMIN: 'ops_admin',
  OPS_SUB_ADMIN: 'ops_sub_admin',
  FINANCE_ADMIN: 'finance_admin',
  HR_ADMIN: 'hr_admin',
  SALES_ADMIN: 'sales_admin',
  CENTER_ADMIN: 'center_admin',
  EMPLOYEE: 'employee',
} as const;

export const DEPARTMENT_TYPES = {
  OPERATIONS: 'operations',
  FINANCE: 'finance',
  HR: 'hr',
  SALES: 'sales',
  CUSTOM: 'custom',
} as const;

export const SUB_DEPARTMENT_TYPES = {
  OPENSCHOOL: 'openschool',
  ONLINE: 'online',
  SKILL: 'skill',
  BVOC: 'bvoc',
} as const;

export const LICENSE_TYPES = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
} as const;

export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
} as const;

export const ESCALATION_TYPES = {
  TASK_OVERDUE: 'task_overdue',
  APPROVAL_DELAY: 'approval_delay',
  COMPLIANCE: 'compliance',
  CREDENTIAL_REVEAL: 'credential_reveal',
} as const;

export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const ENTITY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
} as const;
