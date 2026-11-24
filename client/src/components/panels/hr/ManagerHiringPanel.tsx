import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTable } from '@/components/dashboard/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function ManagerHiringPanel() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [positionMode, setPositionMode] = useState<'existing' | 'new'>('existing');
  const [formData, setFormData] = useState({
    designationId: '',
    parentDesignationId: '',
    title: '',
    departmentId: '',
    count: 1,
    description: ''
  });

  const fetchData = async () => {
    try {
      const [reqRes, deptRes, desigRes] = await Promise.all([
        api.get('/hiring/manager-requests'),
        api.get('/departments').catch(() => ({ data: { data: [] } })),
        api.get('/org/designations').catch(() => ({ data: { data: [] } }))
      ]);
      setRequests(reqRes.data.data || []);
      setDepartments(deptRes.data.data || []);
      setDesignations(desigRes.data.data || []);
    } catch {
      toast.error('Failed to fetch hiring requests');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Resolve the current user's own designation in the org chart
  const myDesignation = useMemo(() => {
    if (!user?.id) return null;
    return designations.find((d: any) =>
      Array.isArray(d.filledBy) && d.filledBy.some((u: any) => u.id === user.id)
    ) || null;
  }, [designations, user?.id]);

  // Scope available designations to the manager's branch/department if applicable
  const scopedDesignations = useMemo(() => {
    const uBranchId = user?.branchId || (myDesignation?.branchId && (typeof myDesignation.branchId === 'object' ? myDesignation.branchId.id : myDesignation.branchId));
    if (!uBranchId) return designations;
    const filtered = designations.filter((d: any) => {
      const dBranchId = typeof d.branchId === 'object' ? d.branchId?.id : d.branchId;
      return !dBranchId || dBranchId === uBranchId;
    });
    return filtered.length > 0 ? filtered : designations;
  }, [designations, user?.branchId, myDesignation]);

  const handleOpenDialog = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const defaultDeptId =
        user?.departmentId ||
        (myDesignation?.departmentId && (typeof myDesignation.departmentId === 'object' ? myDesignation.departmentId.id : myDesignation.departmentId)) ||
        departments[0]?.id ||
        '';
      setFormData({
        designationId: '',
        parentDesignationId: myDesignation?.id || '',
        title: '',
        departmentId: defaultDeptId,
        count: 1,
        description: ''
      });
      setPositionMode(scopedDesignations.length > 0 ? 'existing' : 'new');
    }
  };

  const handleSelectDesignation = (desigId: string) => {
    if (desigId === '__new__') {
      setPositionMode('new');
      setFormData(prev => ({ ...prev, designationId: '', title: '' }));
      return;
    }
    const found = designations.find((d: any) => d.id === desigId);
    const deptId = found?.departmentId
      ? (typeof found.departmentId === 'object' ? found.departmentId.id : found.departmentId)
      : formData.departmentId;
    const parentId = found?.parentDesignationId
      ? (typeof found.parentDesignationId === 'object' ? found.parentDesignationId.id : found.parentDesignationId)
      : formData.parentDesignationId;
    setFormData(prev => ({
      ...prev,
      designationId: desigId,
      title: found?.title || prev.title,
      departmentId: deptId || prev.departmentId,
      parentDesignationId: parentId || prev.parentDesignationId
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() && !formData.designationId) {
      toast.error('Please select or enter a position title');
      return;
    }
    try {
      const uBranchId = user?.branchId || (myDesignation?.branchId && (typeof myDesignation.branchId === 'object' ? myDesignation.branchId.id : myDesignation.branchId)) || null;
      await api.post('/hiring/request', {
        ...formData,
        designationId: positionMode === 'existing' ? formData.designationId : null,
        parentDesignationId: formData.parentDesignationId || myDesignation?.id || null,
        branchId: uBranchId
      });
      toast.success('Hiring request submitted for HR approval. Once approved, the open position will appear on the Org Chart.');
      setIsOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create hiring request');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Approved • Open on Org Chart</Badge>;
      case 'completed':
      case 'induction_completed':
      case 'joined':
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Fulfilled / Hired</Badge>;
      case 'rejected':
        return <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30">Rejected</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Pending HR Approval</Badge>;
    }
  };

  const columns = [
    { key: 'title', header: 'Position Title' },
    { key: 'department', header: 'Department', render: (r: any) => r.department?.name || 'N/A' },
    { key: 'count', header: 'Openings Requested' },
    {
      key: 'candidates',
      header: 'Hired / Candidates',
      render: (r: any) => {
        const total = Array.isArray(r.candidates) ? r.candidates.length : 0;
        const joined = Array.isArray(r.candidates)
          ? r.candidates.filter((c: any) => ['joined', 'appointment_sent', 'induction_pending', 'induction_completed', 'completed'].includes(c.status)).length
          : 0;
        return <span className="text-xs font-medium">{joined} joined ({total} total)</span>;
      }
    },
    { key: 'status', header: 'Status', render: (r: any) => statusBadge(r.status) },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Hiring Requests</CardTitle>
            <CardDescription className="text-xs mt-1">
              Approved requests automatically open a position slot in the Org Chart hierarchy
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button>Raise Hiring Request</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Raise Hiring Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={positionMode === 'existing' ? 'default' : 'outline'}
                    onClick={() => setPositionMode('existing')}
                    className="flex-1"
                  >
                    Existing Org Chart Position
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={positionMode === 'new' ? 'default' : 'outline'}
                    onClick={() => { setPositionMode('new'); setFormData(prev => ({ ...prev, designationId: '' })); }}
                    className="flex-1"
                  >
                    + New Position in Hierarchy
                  </Button>
                </div>

                {positionMode === 'existing' ? (
                  <div>
                    <Label>Select Position in Hierarchy</Label>
                    <Select value={formData.designationId} onValueChange={handleSelectDesignation}>
                      <SelectTrigger><SelectValue placeholder="Choose existing position..." /></SelectTrigger>
                      <SelectContent>
                        {scopedDesignations.map((d: any) => {
                          const bName = typeof d.branchId === 'object' ? d.branchId?.name : '';
                          const deptName = typeof d.departmentId === 'object' ? d.departmentId?.name : '';
                          const filled = Array.isArray(d.filledBy) ? d.filledBy.length : 0;
                          return (
                            <SelectItem key={d.id} value={d.id}>
                              {d.title} {bName ? `• ${bName}` : (deptName ? `• ${deptName}` : '')} ({filled}/{d.maxHeadcount} filled)
                            </SelectItem>
                          );
                        })}
                        <SelectItem value="__new__">+ Create a new position title...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>New Position Title</Label>
                      <Input
                        required
                        placeholder="e.g., BDE, Team Leader, Operations Executive"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Reports To (Parent Position in Org Chart)</Label>
                      <Select
                        value={formData.parentDesignationId || 'none'}
                        onValueChange={v => setFormData({ ...formData, parentDesignationId: v === 'none' ? '' : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select reporting position" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Top Level / Department Head</SelectItem>
                          {scopedDesignations.map((d: any) => {
                            const holder = Array.isArray(d.filledBy) && d.filledBy[0] ? ` (${d.filledBy[0].name})` : '';
                            return (
                              <SelectItem key={d.id} value={d.id}>
                                {d.title}{holder}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div>
                  <Label>Department</Label>
                  <Select value={formData.departmentId} onValueChange={v => setFormData({ ...formData, departmentId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Number of Positions (Headcount to Add)</Label>
                  <Input
                    type="number"
                    required
                    min="1"
                    value={formData.count}
                    onChange={e => setFormData({ ...formData, count: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  />
                </div>

                <div>
                  <Label>Description / Justification</Label>
                  <Input
                    placeholder="Brief reason or requirements for this hiring request"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full">Submit Hiring Request</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={requests} />
        </CardContent>
      </Card>
    </div>
  );
}
