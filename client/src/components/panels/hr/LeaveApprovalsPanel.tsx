import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

export function LeaveApprovalsPanel() {
  const { user } = useAuth();
  const role = user?.role || '';
  const canApproveLeaves = [
    'hr_admin', 'hr_sub_admin',
    'ops_admin', 'ops_sub_admin',
    'finance_admin', 'finance_sub_admin', 'finance',
    'sales_admin', 'sales_sub_admin',
    'center_admin', 'branch_manager',
    'org_admin', 'superadmin', 'ceo', 'general_manager'
  ].includes(role) || Boolean((user as any)?.subDepartmentId);

  const [leaves, setLeaves] = useState<any[]>([]);

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/hr/leaves');
      setLeaves(res.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch leave requests');
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApprove = async (id: string, type: 'dept' | 'hr' = 'dept') => {
    try {
      const endpoint = type === 'hr' ? `/hr/leaves/${id}/hr-approve` : `/hr/leaves/${id}/dept-approve`;
      await api.patch(endpoint, { action: 'approve', remarks: '' });
      toast.success('Leave approved successfully');
      fetchLeaves();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to approve leave');
    }
  };

  const handleReject = async (id: string, type: 'dept' | 'hr' = 'dept') => {
    const remarks = window.prompt('Enter rejection remarks (optional):') || 'Rejected';
    try {
      const endpoint = type === 'hr' ? `/hr/leaves/${id}/hr-approve` : `/hr/leaves/${id}/dept-approve`;
      await api.patch(endpoint, { action: 'reject', remarks });
      toast.success('Leave rejected');
      fetchLeaves();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reject leave');
    }
  };

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row: any) => (
        <div>
          <p className="font-medium text-foreground">{row.employeeId?.name || row.user?.name || 'N/A'}</p>
          <p className="text-xs text-muted-foreground">{row.employeeId?.designation || row.user?.email || ''}</p>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: any) => (
        <Badge variant="outline" className="capitalize">
          {(row.type || 'leave').replace(/_/g, ' ')}
        </Badge>
      )
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row: any) => {
        const start = row.startDate ? new Date(row.startDate) : null;
        const end = row.endDate ? new Date(row.endDate) : null;
        return (
          <div>
            <p className="text-sm">
              {start && end ? `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}` : '-'}
            </p>
            {row.isHalfDay && <Badge variant="secondary" className="mt-1 text-[10px]">Half Day</Badge>}
          </div>
        );
      }
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row: any) => (
        <p className="text-sm max-w-xs truncate" title={row.reason}>{row.reason || '-'}</p>
      )
    },
    {
      key: 'attachmentUrl',
      header: 'Attachment',
      render: (row: any) => (
        row.attachmentUrl ? (
          <a href={row.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 inline-flex items-center hover:underline text-xs">
            <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">None</span>
        )
      )
    },
    {
      key: 'approvers',
      header: 'Approvers',
      render: (row: any) => (
        <div className="text-xs space-y-1">
          {row.deptApprovedBy && (
            <div className="text-muted-foreground">Dept: <span className="font-medium text-foreground">{row.deptApprovedBy.name}</span></div>
          )}
          {row.hrApprovedBy && (
            <div className="text-muted-foreground">HR: <span className="font-medium text-foreground">{row.hrApprovedBy.name}</span></div>
          )}
          {!row.deptApprovedBy && !row.hrApprovedBy && (
            <span className="text-muted-foreground italic">None yet</span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => {
        const status = row.status;
        if (status === 'approved') {
          return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 capitalize">Approved</Badge>;
        }
        if (status === 'rejected') {
          return <Badge variant="destructive" className="capitalize">Rejected</Badge>;
        }
        if (status === 'dept_approved') {
          return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 capitalize">Dept Approved</Badge>;
        }
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 capitalize">Pending Dept</Badge>;
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => {
        if (!canApproveLeaves) return null;
        const isSelf = (row.userId && row.userId === user?.id) || (row.employeeId?.id && row.employeeId?.id === user?.id);
        if (isSelf && !['org_admin', 'superadmin', 'ceo'].includes(role)) {
          return <span className="text-xs text-muted-foreground italic">(Your Request - Pending Review)</span>;
        }

        const status = row.status;
        const id = row.id;
        if (status === 'pending') {
          return (
            <div className="flex gap-2">
              <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs" onClick={() => handleApprove(id, 'dept')}>Dept Approve</Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleReject(id, 'dept')}>Reject</Button>
            </div>
          );
        }
        if (status === 'dept_approved') {
          const isHRApprover = ['hr_admin', 'hr_sub_admin', 'org_admin', 'superadmin', 'ceo', 'general_manager'].includes(role);
          if (isHRApprover) {
            return (
              <div className="flex gap-2">
                <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs" onClick={() => handleApprove(id, 'hr')}>HR Approve</Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleReject(id, 'hr')}>Reject</Button>
              </div>
            );
          }
          return <span className="text-xs text-muted-foreground italic">Awaiting HR Approval</span>;
        }
        return null;
      }
    }
  ];

  return (
    <Card className="shadow-lg border-0 bg-white/50 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Leave Approvals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={leaves}
          searchFields={['employeeId.name', 'type', 'reason', 'status']}
          emptyMessage="No leave requests pending approval"
        />
      </CardContent>
    </Card>
  );
}
