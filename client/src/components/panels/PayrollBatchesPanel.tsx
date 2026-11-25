import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, CreditCard, RefreshCw, Plus, Send, CheckSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { isPayrollFinanceApprover } from '@/lib/payrollAccess';

interface PayrollBatch {
  id?: string;
  month: string;
  totalAmount: number;
  employeeCount: number;
  status: string;
  transferredBy?: { name: string };
  approvedBy?: { name: string };
  rejectedBy?: { name: string };
  rejectionReason?: string;
  remarks?: string;
  createdAt: string;
}

export function PayrollBatchesPanel() {
  const { user } = useAuth();
  const isFinance = isPayrollFinanceApprover(user);
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [paymentData, setPaymentData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    paymentReference: '',
  });

  // Create Batch Modal with Select All
  const [createBatchOpen, setCreateBatchOpen] = useState(false);
  const [confirmedPayrolls, setConfirmedPayrolls] = useState<any[]>([]);
  const [batchMonthFilter, setBatchMonthFilter] = useState<string>('all');
  const [selectedPayrollIds, setSelectedPayrollIds] = useState<string[]>([]);
  const [batchRemarks, setBatchRemarks] = useState('');
  const [creatingBatch, setCreatingBatch] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await api.get('/payroll/batches');
      setBatches(response.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load payroll batches');
    } finally {
      setLoading(false);
    }
  };

  const openCreateBatchModal = async () => {
    setCreateBatchOpen(true);
    try {
      const res = await api.get('/payroll?status=confirmed');
      const list = res.data?.data || [];
      setConfirmedPayrolls(list);
      setSelectedPayrollIds(list.map((p: any) => p.id));
    } catch {
      setConfirmedPayrolls([]);
    }
  };

  const visibleConfirmed = useMemo(
    () => confirmedPayrolls.filter(p => batchMonthFilter === 'all' || p.month === batchMonthFilter),
    [confirmedPayrolls, batchMonthFilter]
  );

  const allSelected =
    visibleConfirmed.length > 0 && visibleConfirmed.every(p => selectedPayrollIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      const vSet = new Set(visibleConfirmed.map(p => p.id));
      setSelectedPayrollIds(prev => prev.filter(id => !vSet.has(id)));
    } else {
      const next = new Set(selectedPayrollIds);
      visibleConfirmed.forEach(p => next.add(p.id));
      setSelectedPayrollIds(Array.from(next));
    }
  };

  const handleCreateBatch = async () => {
    if (selectedPayrollIds.length === 0) {
      toast.error('Please select at least one confirmed payroll');
      return;
    }
    setCreatingBatch(true);
    try {
      const month =
        batchMonthFilter !== 'all'
          ? batchMonthFilter
          : confirmedPayrolls.find(p => selectedPayrollIds.includes(p.id))?.month;
      await api.post('/payroll/transfer-to-finance', {
        payrollIds: selectedPayrollIds,
        month,
        remarks: batchRemarks,
      });
      toast.success(`Payroll batch created with ${selectedPayrollIds.length} employee(s)`);
      setCreateBatchOpen(false);
      setSelectedPayrollIds([]);
      setBatchRemarks('');
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create payroll batch');
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/payroll/batches/${id}/approve`);
      toast.success('Payroll batch approved');
      fetchBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!selectedBatch || !rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    const id = selectedBatch.id;
    try {
      await api.post(`/payroll/batches/${id}/reject`, { rejectionReason });
      toast.success('Payroll batch rejected');
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedBatch(null);
      fetchBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    }
  };

  const handleStartPayment = async (id: string) => {
    try {
      await api.put(`/payroll/batches/${id}/payment-in-progress`);
      toast.success('Payment marked as in progress');
      fetchBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCompletePayment = async () => {
    if (!selectedBatch) return;
    const id = selectedBatch.id;
    try {
      await api.put(`/payroll/batches/${id}/complete-payment`, paymentData);
      toast.success('Payment completed — salaries disbursed');
      setPaymentDialogOpen(false);
      setSelectedBatch(null);
      fetchBatches();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete payment');
    }
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending_finance_approval: 'bg-yellow-100 text-yellow-800',
      approved_by_finance: 'bg-blue-100 text-blue-800',
      payment_in_progress: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredBatches = activeTab === 'all' ? batches : batches.filter(b => b.status === activeTab);

  const selectedBatchTotal = useMemo(
    () =>
      confirmedPayrolls
        .filter(p => selectedPayrollIds.includes(p.id))
        .reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0),
    [confirmedPayrolls, selectedPayrollIds]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Payroll Batches</h2>
          <p className="text-muted-foreground text-sm">Create, approve, and disburse monthly payroll batches</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchBatches}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {isFinance && (
            <Button onClick={openCreateBatchModal}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create Payroll Batch
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All ({batches.length})</TabsTrigger>
          <TabsTrigger value="pending_finance_approval">Pending Approval</TabsTrigger>
          <TabsTrigger value="approved_by_finance">Approved</TabsTrigger>
          <TabsTrigger value="payment_in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Payroll Batches</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : filteredBatches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No payroll batches found</p>
                  <p className="text-sm mt-1">Click "Create Payroll Batch" to bundle confirmed employee payrolls</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBatches.map((batch) => {
                    const bid = batch.id || '';
                    return (
                      <div
                        key={bid}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors flex-wrap gap-3"
                      >
                        <div className="flex-1 min-w-[240px]">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <span className="font-semibold">Month: {batch.month}</span>
                            <Badge className={getStatusColor(batch.status)}>
                              {batch.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground flex gap-4 flex-wrap">
                            <span>{batch.employeeCount} employees</span>
                            <span className="font-semibold text-foreground">
                              Total: ₹{(batch.totalAmount || 0).toLocaleString('en-IN')}
                            </span>
                            {batch.transferredBy && (
                              <span>Created by: {batch.transferredBy.name}</span>
                            )}
                          </div>
                          {batch.rejectionReason && (
                            <p className="text-xs text-red-600 mt-1">
                              Rejection: {batch.rejectionReason}
                            </p>
                          )}
                          {batch.remarks && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Remarks: {batch.remarks}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {isFinance && batch.status === 'pending_finance_approval' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600"
                                onClick={() => handleApprove(bid)}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedBatch(batch);
                                  setRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {isFinance && batch.status === 'approved_by_finance' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartPayment(bid)}
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1" />
                              Start Payment
                            </Button>
                          )}
                          {isFinance && batch.status === 'payment_in_progress' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedBatch(batch);
                                setPaymentDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Complete Payment
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Payroll Batch Dialog with Select All */}
      <Dialog open={createBatchOpen} onOpenChange={setCreateBatchOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Payroll Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label className="text-xs">Filter by Month</Label>
              <Select value={batchMonthFilter} onValueChange={setBatchMonthFilter}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confirmed Months</SelectItem>
                  {Array.from(new Set(confirmedPayrolls.map(p => p.month))).sort().reverse().map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <div className="bg-muted/60 px-3.5 py-2.5 border-b flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-primary rounded"
                  />
                  <CheckSquare className="w-4 h-4 text-primary" />
                  Select All ({visibleConfirmed.length})
                </label>
                <span className="text-xs text-muted-foreground">
                  {selectedPayrollIds.length} selected
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y">
                {visibleConfirmed.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No confirmed payrolls ready for batching. Confirm draft payrolls first in the Payroll tab.
                  </p>
                ) : (
                  visibleConfirmed.map(p => {
                    const empName = p.employeeId?.name || p.user?.name || 'Employee';
                    const checked = selectedPayrollIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer text-sm ${
                          checked ? 'bg-primary/5' : 'hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedPayrollIds(prev =>
                                prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id]
                              )
                            }
                            className="w-4 h-4 accent-primary rounded shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-medium block truncate">{empName}</span>
                            <span className="text-xs text-muted-foreground">{p.month}</span>
                          </div>
                        </div>
                        <span className="font-semibold text-emerald-600">
                          ₹{(p.netSalary || 0).toLocaleString('en-IN')}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between text-sm">
              <span className="font-medium">{selectedPayrollIds.length} employee(s)</span>
              <span className="font-bold text-primary">Total: ₹{selectedBatchTotal.toLocaleString('en-IN')}</span>
            </div>

            <div>
              <Label>Batch Remarks (Optional)</Label>
              <Input
                value={batchRemarks}
                onChange={e => setBatchRemarks(e.target.value)}
                placeholder="e.g. Monthly Salary Batch"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateBatchOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBatch} disabled={creatingBatch || selectedPayrollIds.length === 0}>
              <Send className="w-4 h-4 mr-1.5" />
              {creatingBatch ? 'Creating...' : `Create Batch (${selectedPayrollIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payroll Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason *</Label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this batch is being rejected"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject}>Reject Batch</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Batch Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={paymentData.paymentMethod}
                onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div>
              <Label>Payment Reference</Label>
              <Input
                value={paymentData.paymentReference}
                onChange={(e) => setPaymentData({ ...paymentData, paymentReference: e.target.value })}
                placeholder="Transaction ID / Reference number"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCompletePayment}>Mark as Paid</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
