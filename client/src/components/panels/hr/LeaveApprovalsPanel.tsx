import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function LeaveApprovalsPanel() {
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

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/hr/leaves/${id}/approve`, { status: 'approved' });
      toast.success('Leave approved successfully');
      fetchLeaves();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to approve leave');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.put(`/hr/leaves/${id}/approve`, { status: 'rejected' });
      toast.success('Leave rejected successfully');
      fetchLeaves();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reject leave');
    }
  };

  const columns = [
    {
      accessorKey: 'employeeId.name',
      header: 'Employee',
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.employeeId?.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.employeeId?.designation}</p>
        </div>
      )
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }: any) => (
        <Badge variant="outline" className="capitalize">
          {row.original.type.replace('_', ' ')}
        </Badge>
      )
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }: any) => (
        <div>
          <p className="text-sm">
            {format(new Date(row.original.startDate), 'MMM dd')} - {format(new Date(row.original.endDate), 'MMM dd, yyyy')}
          </p>
          {row.original.isHalfDay && <Badge variant="secondary" className="mt-1">Half Day</Badge>}
        </div>
      )
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
    },
    {
      accessorKey: 'attachmentUrl',
      header: 'Attachment',
      cell: ({ row }: any) => (
        row.original.attachmentUrl ? (
          <a href={row.original.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 flex items-center hover:underline">
            <ExternalLink className="w-4 h-4 mr-1" /> View
          </a>
        ) : (
          <span className="text-muted-foreground text-sm">None</span>
        )
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.original.status;
        let variant = 'default';
        if (status === 'approved') variant = 'success';
        if (status === 'rejected') variant = 'destructive';
        if (status === 'pending') variant = 'secondary';
        
        return <Badge variant={variant as any} className="capitalize">{status.replace(/_/g, ' ')}</Badge>;
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => {
        const status = row.original.status;
        if (status !== 'pending') return null;
        
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(row.original.id)}>Approve</Button>
            <Button size="sm" variant="destructive" onClick={() => handleReject(row.original.id)}>Reject</Button>
          </div>
        );
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
        <DataTable columns={columns} data={leaves} searchKey="employeeId.name" />
      </CardContent>
    </Card>
  );
}
