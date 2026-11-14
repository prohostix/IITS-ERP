import { useState, useEffect } from 'react';
import { RefreshCw, User, Building } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { toast } from 'sonner';

interface StatusRequestsPanelProps {
  type: 'operations' | 'finance';
}

export function StatusRequestsPanel({ type }: StatusRequestsPanelProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; centerIds?: string[] }[]>([]);
  const [branchFilter, setBranchFilter] = useState('all');
  const [branchSort, setBranchSort] = useState<'latest' | 'branch_asc' | 'branch_desc'>('latest');
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'verify' | 'confirm' | 'reject'>('verify');
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [response, bRes] = await Promise.all([
        api.get('/students/status-requests'),
        api.get('/org/branches').catch(() => ({ data: { data: [] } })),
      ]);
      setRequests(response.data.data || []);
      setBranches(bRes.data.data || []);
    } catch (e: any) {
      toast.error('Failed to load status change requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const openActionDialog = (req: any, action: 'verify' | 'confirm' | 'reject') => {
    setSelectedRequest(req);
    setActionType(action);
    setRemarks('');
    setDialogOpen(true);
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      if (type === 'operations') {
        const action = actionType === 'reject' ? 'reject' : 'verify';
        await api.put(`/students/status-requests/${selectedRequest.id}/verify`, {
          action,
          remarks
        });
        toast.success(`Request ${action === 'verify' ? 'verified' : 'rejected'} successfully`);
      } else {
        const action = actionType === 'reject' ? 'reject' : 'confirm';
        await api.put(`/students/status-requests/${selectedRequest.id}/confirm`, {
          action,
          remarks
        });
        toast.success(`Request ${action === 'confirm' ? 'confirmed and student status updated' : 'rejected'} successfully`);
      }
      setDialogOpen(false);
      fetchRequests();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to process request');
    } finally {
      setProcessing(false);
    }
  };

  const getBranchName = (req: any) => {
    if (req.branchName) return req.branchName;
    if (req.student?.branchName) return req.student.branchName;
    if (req.student?.center?.branchName) return req.student.center.branchName;
    const cid = req.student?.center?.id || req.student?.centerId;
    const b = branches.find(br => (br.centerIds || []).includes(cid));
    return b?.name || 'Unassigned';
  };

  const getBranchId = (req: any) => {
    if (req.branchId) return req.branchId;
    if (req.student?.branchId) return req.student.branchId;
    if (req.student?.center?.branchId) return req.student.center.branchId;
    const cid = req.student?.center?.id || req.student?.centerId;
    const b = branches.find(br => (br.centerIds || []).includes(cid));
    return b?.id || 'unassigned';
  };

  // Filter requests based on panel type, branch, and sort
  // Operations review target: pending_operations
  // Finance confirmation target: pending_finance
  const targetStatus = type === 'operations' ? 'pending_operations' : 'pending_finance';

  const branchFilteredRequests = requests
    .filter(r => {
      if (branchFilter === 'all') return true;
      const bId = getBranchId(r);
      const bName = getBranchName(r);
      if (branchFilter === 'unassigned') return bId === 'unassigned' || bName === 'Unassigned';
      return bId === branchFilter || bName === branchFilter;
    })
    .sort((a, b) => {
      if (branchSort === 'branch_asc') return getBranchName(a).localeCompare(getBranchName(b));
      if (branchSort === 'branch_desc') return getBranchName(b).localeCompare(getBranchName(a));
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const holdRequests = branchFilteredRequests.filter(r => r.requestedStatus === 'hold' && r.status === targetStatus);
  const dropoutRequests = branchFilteredRequests.filter(r => r.requestedStatus === 'dropout' && r.status === targetStatus);
  const historyRequests = branchFilteredRequests.filter(r => r.status !== targetStatus);

  const renderRequestTable = (list: any[], showActions: boolean) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg bg-background/50 border-dashed">
          No pending requests found.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {list.map((req) => (
          <Card key={req.id} className="hover:border-primary/20 transition-all bg-background shadow-xs">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-base text-foreground">{req.student?.name}</span>
                  <Badge variant="outline" className="text-xs font-mono">{req.student?.enrollmentNo}</Badge>
                  <Badge className={req.requestedStatus === 'hold' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                    Requested: {req.requestedStatus.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Current: {req.student?.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    🏢 {getBranchName(req)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Program: {req.student?.program?.name}</span>
                  <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> Center: {req.student?.center?.name}</span>
                  <span>Date: {new Date(req.createdAt).toLocaleDateString()}</span>
                </div>

                {req.reason && (
                  <div className="text-xs bg-muted/30 p-2 rounded border mt-2 text-muted-foreground">
                    <span className="font-semibold text-foreground block mb-0.5">Center Reason:</span>
                    {req.reason}
                  </div>
                )}

                {req.operationsRemarks && (
                  <div className="text-xs bg-indigo-50/30 p-2 rounded border mt-1 text-muted-foreground">
                    <span className="font-semibold text-indigo-700 block mb-0.5">Operations Remarks:</span>
                    {req.operationsRemarks}
                  </div>
                )}

                {req.financeRemarks && (
                  <div className="text-xs bg-emerald-50/30 p-2 rounded border mt-1 text-muted-foreground">
                    <span className="font-semibold text-emerald-700 block mb-0.5">Finance Remarks:</span>
                    {req.financeRemarks}
                  </div>
                )}
              </div>

              {showActions && (
                <div className="flex gap-2 self-end md:self-center">
                  <Button
                    size="sm"
                    className={type === 'operations' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                    onClick={() => openActionDialog(req, type === 'operations' ? 'verify' : 'confirm')}
                  >
                    {type === 'operations' ? 'Verify' : 'Confirm'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/20 hover:bg-destructive/10"
                    onClick={() => openActionDialog(req, 'reject')}
                  >
                    Reject
                  </Button>
                </div>
              )}

              {!showActions && (
                <div className="self-end md:self-center">
                  <Badge className={
                    req.status === 'approved' ? 'bg-green-100 text-green-800' :
                    req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {req.status.replace('_', ' ')}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Student Status Requests</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {type === 'operations' 
              ? 'Verify and route student hold and dropout status requests to Finance.' 
              : 'Confirm and execute pending student status change requests.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
          >
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            <option value="unassigned">Unassigned Branch</option>
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={branchSort}
            onChange={e => setBranchSort(e.target.value as any)}
          >
            <option value="latest">Sort: Latest First</option>
            <option value="branch_asc">Sort: Branch (A → Z)</option>
            <option value="branch_desc">Sort: Branch (Z → A)</option>
          </select>
          <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hold" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="hold">Hold Requests ({holdRequests.length})</TabsTrigger>
          <TabsTrigger value="dropout">Dropout Requests ({dropoutRequests.length})</TabsTrigger>
          <TabsTrigger value="history">History Log ({historyRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="hold">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading hold requests...</div>
          ) : (
            renderRequestTable(holdRequests, true)
          )}
        </TabsContent>

        <TabsContent value="dropout">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading dropout requests...</div>
          ) : (
            renderRequestTable(dropoutRequests, true)
          )}
        </TabsContent>

        <TabsContent value="history">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading history requests...</div>
          ) : (
            renderRequestTable(historyRequests, false)
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'reject' ? 'Reject Request' : type === 'operations' ? 'Verify Request' : 'Confirm Request'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to {actionType === 'reject' ? 'reject' : type === 'operations' ? 'verify' : 'confirm'} this status change request for <strong>{selectedRequest?.student?.name}</strong>?
            </p>
            <div className="space-y-1">
              <Label>Remarks / Explanation</Label>
              <textarea
                className="w-full min-h-[100px] border rounded-md p-2 text-sm bg-background"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Enter remarks for the audit trail..."
                required
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              className={actionType === 'reject' ? 'bg-destructive hover:bg-destructive/90 text-white' : type === 'operations' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
              onClick={handleProcessRequest}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
