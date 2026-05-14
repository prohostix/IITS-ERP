import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { ModernCEODashboard } from './ModernCEODashboard';
import { ModernFinanceDashboard } from './ModernFinanceDashboard';
import { ModernOpsDashboard } from './ModernOpsDashboard';
import { ModernHRDashboard } from './ModernHRDashboard';
import { ModernSalesDashboard } from './ModernSalesDashboard';
import { ModernSuperadminDashboard } from './ModernSuperadminDashboard';
import { ModernOrgAdminDashboard } from './ModernOrgAdminDashboard';
import { ModernStudyCenterDashboard } from './ModernStudyCenterDashboard';
import { ModernEmployeeDashboard } from './ModernEmployeeDashboard';
import { ModernStaffPortal } from './ModernStaffPortal';
import { ModernBranchManagerDashboard } from './ModernBranchManagerDashboard';
import { CenterOnboardingGate } from '@/components/CenterOnboardingGate';

interface DashboardProps {
  onNavigateToTable?: (table: string) => void;
  useDepartmentDashboard?: boolean;
  initialTab?: string;
}

export function Dashboard({ useDepartmentDashboard, initialTab }: DashboardProps) {
  const { user } = useAuth();
  const [departmentType, setDepartmentType] = useState<string | null>(null);
  const isBranchManager = Boolean((user as any)?.branchId);
  // If this is an employee with a dept, start loading=true to prevent wrong-panel flash
  const [deptLoading, setDeptLoading] = useState(Boolean(useDepartmentDashboard) && !isBranchManager);

  const subDeptId = (user as any)?.subDepartmentId;
  const hasSubDept = Boolean(subDeptId);

  // Branch managers always get the branch dashboard — skip all other routing
  if (isBranchManager) {
    return <ModernBranchManagerDashboard initialTab={initialTab} />;
  }

  useEffect(() => {
    if (useDepartmentDashboard && (user?.departmentId || hasSubDept)) {
      setDeptLoading(true);
      fetchDepartmentType().finally(() => setDeptLoading(false));
    } else if (useDepartmentDashboard) {
      setDeptLoading(false);
    }
  }, [useDepartmentDashboard, user?.departmentId, hasSubDept]);

  const fetchDepartmentType = async () => {
    try {
      // Try direct department object or departmentId first
      const dept = (user as any).department || user?.departmentId;
      if (dept) {
        if (typeof dept === 'object' && dept !== null) {
          const populated = dept as any;
          if (populated.type) { setDepartmentType(populated.type); return; }
          const deptId = populated.id?.toString();
          if (deptId) {
            const res = await api.get(`/departments/${deptId}`);
            setDepartmentType(res.data.data?.type || null);
            return;
          }
        } else {
          const deptId = dept.toString();
          if (deptId) {
            const res = await api.get(`/departments/${deptId}`);
            setDepartmentType(res.data.data?.type || null);
            return;
          }
        }
      }
      // Fall back to sub-department's parentDeptId
      if (hasSubDept) {
        const subDept = typeof subDeptId === 'object' ? subDeptId : null;
        const parentDeptId = subDept?.parentDeptId;
        if (parentDeptId) {
          if (typeof parentDeptId === 'object' && parentDeptId.type) {
            setDepartmentType(parentDeptId.type);
            return;
          }
          const pid = typeof parentDeptId === 'object' ? parentDeptId.id?.toString() : parentDeptId?.toString();
          if (pid) {
            const res = await api.get(`/departments/${pid}`);
            setDepartmentType(res.data.data?.type || null);
            return;
          }
        }
        // If sub-dept has no parentDeptId info, fetch from /sub-departments/my
        try {
          const res = await api.get('/sub-departments/my');
          const parentType = res.data.data?.subDepartment?.parentDeptId?.type;
          if (parentType) { setDepartmentType(parentType); return; }
        } catch (_) {}
      }
    } catch (error) {
      console.error('Failed to fetch department type:', error);
      setDepartmentType(null);
    }
  };

  // While fetching department type, don't render anything yet to avoid flash
  if (useDepartmentDashboard && deptLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Route employees to department-specific dashboards
  if (useDepartmentDashboard) {
    const isSubDeptManager = hasSubDept;

    // If we have a department type, route accordingly
    if (departmentType) {
      // Regular employees (not sub-dept managers) always get the employee dashboard
      // Exception: Sales employees get the Sales dashboard (which has an employee portal)
      if (!isSubDeptManager && departmentType !== 'sales') {
        return <ModernEmployeeDashboard initialTab={initialTab} />;
      }
      // Sub-dept managers get the department admin dashboard
      switch (departmentType) {
        case 'hr':
          return <ModernHRDashboard initialTab={initialTab} />;
        case 'finance':
          return <ModernFinanceDashboard initialTab={initialTab} />;
        case 'operations':
          return <ModernOpsDashboard initialTab={initialTab} />;
        case 'sales':
          return <ModernSalesDashboard initialTab={initialTab} isSubDeptManager={isSubDeptManager} />;
        default:
          return <ModernEmployeeDashboard initialTab={initialTab} />;
      }
    }

    // No department type found — sub-dept manager with unknown parent dept type
    // Show employee dashboard (it has a My Sub-Dept tab for sub-dept managers)
    return <ModernEmployeeDashboard initialTab={initialTab} />;
  }

  if (user?.role === 'superadmin') {
    return <ModernSuperadminDashboard initialTab={initialTab} />;
  }

  if (user?.role === 'ceo') {
    return <ModernCEODashboard initialTab={initialTab} />;
  }

  if (user?.role === 'org_admin') {
    return <ModernOrgAdminDashboard initialTab={initialTab} />;
  }

  if (user?.role === 'finance_admin') {
    return <ModernFinanceDashboard initialTab={initialTab} />;
  }

  if (['ops_admin', 'ops_sub_admin'].includes(user?.role || '')) {
    return <ModernOpsDashboard initialTab={initialTab} />;
  }

  if (user?.role === 'hr_admin') {
    return <ModernHRDashboard initialTab={initialTab} />;
  }

  if (user?.role === 'sales_admin') {
    return <ModernSalesDashboard initialTab={initialTab} />;
  }

  if (user?.role === 'center_admin') {
    return (
      <CenterOnboardingGate>
        <ModernStudyCenterDashboard />
      </CenterOnboardingGate>
    );
  }

  if (user?.role === 'employee') {
    return <ModernEmployeeDashboard initialTab={initialTab} />;
  }

  // Fallback for other staff/admin roles
  return <ModernStaffPortal />;
}
