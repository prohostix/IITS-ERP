import { useState, useEffect } from 'react';
import { 
  RefreshCw, CheckCircle, XCircle, Search, GraduationCap, Clock, AlertCircle, Ban,
  Wallet, Banknote, Upload, FileText, Trash2, Eye, Receipt
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Enrollment {
  id: string;
  enrollmentNumber?: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  programId: { name: string; code: string } | string;
  studyCenterId: { name: string; code: string } | string;
  program?: { name: string; code: string } | null;
  studyCenter?: { name: string; code: string } | null;
  status: string;
  totalFee?: number | null;
  paymentMethod?: string | null;
  departmentRemarks?: string;
  financeRemarks?: string;
  payment?: { amount: number; debitedAt: string; walletId?: string } | null;
  createdAt: string;
  enrolledAt?: string;
}

interface Summary {
  payment_pending: number;
  document_review: number;
  finance_review: number;
  enrolled: number;
  rejected: number;
  department_rejected: number;
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  payment_pending:     { label: 'Fee Pending',      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: <Clock className="w-3 h-3" /> },
  document_review:     { label: 'Doc Review',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Search className="w-3 h-3" /> },
  pending_finance_review:      { label: 'Finance Review',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3 h-3" /> },
  enrolled:            { label: 'Enrolled',         color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',     icon: <CheckCircle className="w-3 h-3" /> },
  rejected:            { label: 'Rejected',         color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',             icon: <XCircle className="w-3 h-3" /> },
  department_rejected: { label: 'Dept Rejected',    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',             icon: <Ban className="w-3 h-3" /> },
};

const FILTER_TABS = [
  { key: '', label: 'All' },
  { key: 'payment_pending', label: 'Fee Pending' },
  { key: 'document_review', label: 'Doc Review' },
  { key: 'pending_finance_review', label: 'Finance Review' },
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'rejected', label: 'Rejected' },
];

export function FinanceEnrollmentsPanel() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean;
    enrollment: Enrollment | null;
    amount: string;
    method: 'wallet' | 'cash';
    status: string;
    referenceNo: string;
    remarks: string;
    receiptFile: File | null;
    receiptPreview: string;
    submitting: boolean;
  }>({
    open: false,
    enrollment: null,
    amount: '',
    method: 'wallet',
    status: 'processed',
    referenceNo: '',
    remarks: '',
    receiptFile: null,
    receiptPreview: '',
    submitting: false,
  });
  const [remarks, setRemarks] = useState('');

  const fetchData = async (status = statusFilter, q = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (q) params.set('search', q);
      const res = await api.get(`/finance/enrollments/all?${params}`);
      setEnrollments(res.data.data || []);
      setSummary(res.data.summary || null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);

  const handleTabChange = (key: string) => {
    setStatusFilter(key);
    fetchData(key, search);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(statusFilter, search);
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/finance/enrollments/${id}/approve`);
      toast.success('Student enrolled successfully');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    try {
      await api.put(`/finance/enrollments/${rejectDialog.id}/reject`, { remarks });
      toast.success('Enrollment rejected');
      setRejectDialog({ open: false, id: '' });
      setRemarks('');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reject');
    }
  };

  const openRefundModal = (e: Enrollment) => {
    const originalAmount = e.payment?.amount || e.totalFee || '';
    setRefundDialog({
      open: true,
      enrollment: e,
      amount: originalAmount ? String(originalAmount) : '',
      method: 'wallet',
      status: 'processed',
      referenceNo: '',
      remarks: '',
      receiptFile: null,
      receiptPreview: '',
      submitting: false,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be under 10MB');
        return;
      }
      setRefundDialog(prev => ({
        ...prev,
        receiptFile: file,
        receiptPreview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      }));
    }
  };

  const handleRefund = async () => {
    if (!refundDialog.enrollment) return;
    const numAmount = Number(refundDialog.amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }
    setRefundDialog(prev => ({ ...prev, submitting: true }));
    try {
      const formData = new FormData();
      formData.append('refundAmount', String(numAmount));
      formData.append('refundMethod', refundDialog.method);
      formData.append('refundStatus', refundDialog.status);
      if (refundDialog.referenceNo) formData.append('referenceNo', refundDialog.referenceNo);
      if (refundDialog.remarks) formData.append('remarks', refundDialog.remarks);
      if (refundDialog.receiptFile) {
        formData.append('receipt', refundDialog.receiptFile);
      }

      await api.post(`/finance/enrollments/${refundDialog.enrollment.id}/refund`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Refund of ₹${numAmount.toLocaleString()} processed successfully via ${refundDialog.method === 'wallet' ? 'Wallet Credit' : 'Cash'}`);
      setRefundDialog({
        open: false,
        enrollment: null,
        amount: '',
        method: 'wallet',
        status: 'processed',
        referenceNo: '',
        remarks: '',
        receiptFile: null,
        receiptPreview: '',
        submitting: false,
      });
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to process refund');
      setRefundDialog(prev => ({ ...prev, submitting: false }));
    }
  };

  const getProgramName = (e: Enrollment) =>
    e.program && typeof e.program === 'object'
      ? `${e.program.name} (${e.program.code})`
      : (typeof e.programId === 'object' ? `${(e.programId).name} (${(e.programId).code})` : e.programId);

  const getCenterName = (e: Enrollment) =>
    e.studyCenter && typeof e.studyCenter === 'object'
      ? `${e.studyCenter.name} (${e.studyCenter.code})`
      : (typeof e.studyCenterId === 'object' ? `${(e.studyCenterId).name}` : e.studyCenterId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Student Enrollments</h2>
          <p className="text-muted-foreground text-sm mt-1">All student enrollment data across every stage.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard label="Payment Pending" count={summary.payment_pending} icon={<Clock className="w-4 h-4" />} color="text-slate-500 bg-slate-50 dark:bg-slate-900/20" onClick={() => handleTabChange('payment_pending')} />
          <SummaryCard label="Doc Review" count={summary.document_review} icon={<Search className="w-4 h-4" />} color="text-blue-500 bg-blue-50 dark:bg-blue-900/20" onClick={() => handleTabChange('document_review')} />
          <SummaryCard label="Finance Review" count={summary.pending_finance_review || 0} icon={<Clock className="w-4 h-4" />} color="text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" onClick={() => handleTabChange('pending_finance_review')} />
          <SummaryCard label="Enrolled" count={summary.enrolled} icon={<CheckCircle className="w-4 h-4" />} color="text-green-500 bg-green-50 dark:bg-green-900/20" onClick={() => handleTabChange('enrolled')} />
          <SummaryCard label="Rejected" count={summary.rejected} icon={<XCircle className="w-4 h-4" />} color="text-red-500 bg-red-50 dark:bg-red-900/20" onClick={() => handleTabChange('rejected')} />
          <SummaryCard label="Dept Rejected" count={summary.department_rejected} icon={<Ban className="w-4 h-4" />} color="text-red-400 bg-red-50 dark:bg-red-900/20" onClick={() => handleTabChange('department_rejected')} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {tab.label}
              {summary && tab.key && (
                <span className="ml-1.5 opacity-70">
                  {summary[tab.key as keyof Summary] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, ID..."
              className="pl-8 h-8 text-sm w-56"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="h-8">Search</Button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>No enrollments found{statusFilter ? ` with status "${statusFilter.replace('_', ' ')}"` : ''}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
<div className="overflow-x-auto w-full">
<table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Program</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Center</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Fee Paid</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrollments.map(e => {
                const meta = STATUS_META[e.status] || { label: e.status, color: 'bg-muted text-muted-foreground', icon: null };
                return (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <p className="font-medium">{e.studentName}</p>
                      <p className="text-xs text-muted-foreground">{e.studentEmail}</p>
                      {e.enrollmentNumber && <p className="text-[10px] text-muted-foreground font-mono">{e.enrollmentNumber}</p>}
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{getProgramName(e)}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{getCenterName(e)}</td>
                    <td className="p-3 hidden sm:table-cell">
                      {e.totalFee ? (
                        <div className="space-y-0.5">
                          <span className="text-green-600 font-semibold block">₹{Number(e.totalFee).toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground block">
                            {e.paymentMethod === 'full_payment' ? 'Full Payment' : '1st Installment'}
                          </span>
                        </div>
                      ) : e.payment ? (
                        <div className="space-y-0.5">
                          <span className="text-green-600 font-semibold block">₹{e.payment.amount.toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground block">
                            Paid: {new Date(e.payment.debitedAt || e.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', meta.color)}>
                        {meta.icon}{meta.label}
                      </span>
                      {(e.financeRemarks || e.departmentRemarks) && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[160px] truncate" title={e.financeRemarks || e.departmentRemarks}>
                          {e.financeRemarks || e.departmentRemarks}
                        </p>
                      )}
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      {e.status === 'pending_finance_review' && (
                        <div className="flex gap-1.5 justify-end">
                          <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => handleApprove(e.id)}>
                            <CheckCircle className="w-3 h-3 mr-1" />Enroll
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { setRejectDialog({ open: true, id: e.id }); setRemarks(''); }}>
                            <XCircle className="w-3 h-3 mr-1" />Reject
                          </Button>
                        </div>
                      )}
                      {e.status === 'enrolled' && (
                        <div className="flex gap-1.5 justify-end">
                           <Button size="sm" variant="outline" className="h-7 text-xs text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30" onClick={() => openRefundModal(e)}>
                             <Receipt className="w-3 h-3 mr-1" />Refund
                           </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
</div>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={o => setRejectDialog(d => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Enrollment</DialogTitle></DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Remarks (required)</Label>
            <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Reason for rejection..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: '' })}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!remarks.trim()}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Refund Dialog */}
      <Dialog open={refundDialog.open} onOpenChange={open => !open && !refundDialog.submitting && setRefundDialog(d => ({ ...d, open: false }))}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Receipt className="w-5 h-5 text-orange-600" />
              Process Enrollment Refund
            </DialogTitle>
            <DialogDescription>
              Issue a refund to the study center wallet or record a direct cash/bank payout with proof.
            </DialogDescription>
          </DialogHeader>

          {refundDialog.enrollment && (
            <div className="space-y-4 py-1">
              {/* Enrollment Info Card */}
              <div className="bg-muted/40 border rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-foreground text-sm">{refundDialog.enrollment.studentName}</span>
                    <span className="text-muted-foreground ml-2">
                      ({refundDialog.enrollment.enrollmentNumber || refundDialog.enrollment.id.slice(-6)})
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300">
                    Enrolled
                  </span>
                </div>
                <div className="text-muted-foreground grid grid-cols-2 gap-1 pt-1 border-t border-border/50">
                  <div><span className="font-medium text-foreground">Center:</span> {getCenterName(refundDialog.enrollment)}</div>
                  <div><span className="font-medium text-foreground">Program:</span> {getProgramName(refundDialog.enrollment)}</div>
                  <div><span className="font-medium text-foreground">Total Fee:</span> ₹{Number(refundDialog.enrollment.totalFee || 0).toLocaleString()}</div>
                  <div><span className="font-medium text-foreground">Paid Amount:</span> ₹{Number(refundDialog.enrollment.payment?.amount || refundDialog.enrollment.totalFee || 0).toLocaleString()}</div>
                </div>
              </div>

              {/* Refund Method Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Refund Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRefundDialog(d => ({ ...d, method: 'wallet' }))}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all flex flex-col justify-between',
                      refundDialog.method === 'wallet'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-foreground'
                        : 'border-border hover:bg-muted/50 text-muted-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('p-1.5 rounded-md', refundDialog.method === 'wallet' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        <Wallet className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-xs text-foreground">Center Wallet</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Instant balance credit to study center & auto ledger entry.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRefundDialog(d => ({ ...d, method: 'cash' }))}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all flex flex-col justify-between',
                      refundDialog.method === 'cash'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 text-foreground'
                        : 'border-border hover:bg-muted/50 text-muted-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('p-1.5 rounded-md', refundDialog.method === 'cash' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        <Banknote className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-xs text-foreground">Cash / Direct</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Manual cash payout or bank transfer with attached receipt.
                    </p>
                  </button>
                </div>
              </div>

              {/* Refund Amount */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="refund-amount" className="text-xs font-semibold">Refund Amount (₹) *</Label>
                  {refundDialog.enrollment.payment?.amount && (
                    <button
                      type="button"
                      onClick={() => setRefundDialog(d => ({ ...d, amount: String(refundDialog.enrollment?.payment?.amount || '') }))}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      Use full paid (₹{Number(refundDialog.enrollment.payment?.amount).toLocaleString()})
                    </button>
                  )}
                </div>
                <Input
                  id="refund-amount"
                  type="number"
                  min="1"
                  step="any"
                  value={refundDialog.amount}
                  onChange={e => setRefundDialog(d => ({ ...d, amount: e.target.value }))}
                  placeholder="Enter amount to refund..."
                  className="font-medium"
                />
              </div>

              {/* Reference / Voucher No & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="refund-ref" className="text-xs font-semibold">
                    {refundDialog.method === 'cash' ? 'Voucher / Receipt / UTR #' : 'Reference # (Optional)'}
                  </Label>
                  <Input
                    id="refund-ref"
                    value={refundDialog.referenceNo}
                    onChange={e => setRefundDialog(d => ({ ...d, referenceNo: e.target.value }))}
                    placeholder={refundDialog.method === 'cash' ? 'e.g. CASH-1049, UTR#...' : 'e.g. REF-2026-01'}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="refund-status" className="text-xs font-semibold">Refund Status</Label>
                  <select
                    id="refund-status"
                    className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={refundDialog.status}
                    onChange={e => setRefundDialog(d => ({ ...d, status: e.target.value }))}
                  >
                    <option value="processed">Processed ({refundDialog.method === 'wallet' ? 'Credit Wallet' : 'Completed'})</option>
                    <option value="processing">Processing (In Review / Pending)</option>
                    <option value="failed">Failed / Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Receipt / Voucher Attachment */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>Attach Receipt / Payment Proof {refundDialog.method === 'cash' && <span className="text-orange-500 font-normal">(Recommended)</span>}</span>
                  {refundDialog.receiptFile && (
                    <button
                      type="button"
                      onClick={() => setRefundDialog(d => ({ ...d, receiptFile: null, receiptPreview: '' }))}
                      className="text-red-500 text-[11px] hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </Label>

                {refundDialog.receiptFile ? (
                  <div className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {refundDialog.receiptPreview ? (
                        <img
                          src={refundDialog.receiptPreview}
                          alt="Receipt Preview"
                          className="w-12 h-12 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{refundDialog.receiptFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {(refundDialog.receiptFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    {refundDialog.receiptPreview && (
                      <a
                        href={refundDialog.receiptPreview}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </a>
                    )}
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-lg p-3.5 flex flex-col items-center justify-center cursor-pointer bg-muted/10 hover:bg-muted/20">
                    <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                    <span className="text-xs font-medium text-foreground">Click to upload receipt or voucher</span>
                    <span className="text-[10px] text-muted-foreground">Supports PDF, PNG, JPG up to 10MB</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <Label htmlFor="refund-remarks" className="text-xs font-semibold">Remarks / Reason</Label>
                <Textarea
                  id="refund-remarks"
                  rows={2}
                  value={refundDialog.remarks}
                  onChange={e => setRefundDialog(d => ({ ...d, remarks: e.target.value }))}
                  placeholder="e.g. Admission rejected by university, refunding full fee to center..."
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRefundDialog(d => ({ ...d, open: false }))}
              disabled={refundDialog.submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRefund}
              disabled={refundDialog.submitting || !refundDialog.amount}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {refundDialog.submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4 mr-1.5" />
                  Confirm & Process Refund
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, count, icon, color, onClick }: { label: string; count: number; icon: React.ReactNode; color: string; onClick: () => void }) {
  return (
    <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={onClick}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', color)}>{icon}</div>
        <div>
          <p className="text-xl font-bold">{count}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
