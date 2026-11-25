import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Car,
  Calendar,
  Upload,
  ExternalLink,
  Trash2,
  Edit2,
  ShieldCheck,
  Wallet,
  RefreshCw,
  Search,
  Lock,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface TADAClaimsPanelProps {
  mode?: 'employee' | 'hr' | 'finance';
}

const CLAIM_TYPES: Record<string, string> = {
  tada: 'TA + DA (Travel & Daily Allowance)',
  ta: 'Travel Allowance (TA Only)',
  da: 'Daily Allowance (DA Only)',
  general: 'General Official Expense',
};

const TRAVEL_MODES: Record<string, string> = {
  two_wheeler: 'Two Wheeler / Bike',
  four_wheeler: 'Four Wheeler / Car',
  bus: 'Bus / Public Transit',
  train: 'Train / Rail',
  flight: 'Flight / Air',
  cab_auto: 'Cab / Auto / Taxi',
  other: 'Other',
};

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  pending: {
    label: 'Pending HR Verification',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  hr_approved: {
    label: 'HR Verified • Ready for Finance',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
  },
  hr_rejected: {
    label: 'Rejected by HR',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
  },
  approved: {
    label: 'Finance Approved • Pending Payout',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
  },
  reimbursed: {
    label: 'Reimbursed / Paid',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  rejected: {
    label: 'Rejected by Finance',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
  },
};

const formatINR = (val: number) =>
  `₹${Math.round(Number(val) || 0).toLocaleString('en-IN')}`;

export function TADAClaimsPanel({ mode = 'employee' }: TADAClaimsPanelProps) {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(
    mode === 'hr' ? 'pending' : mode === 'finance' ? 'hr_approved' : 'all'
  );

  // Claim Submit / Edit Modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [formData, setFormData] = useState({
    claimType: 'tada',
    category: 'travel',
    travelDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    fromLocation: '',
    toLocation: '',
    travelMode: 'two_wheeler',
    distanceKm: '',
    taAmount: '',
    daAmount: '',
    otherAmount: '',
    amount: '',
    description: '',
    receipts: [] as string[],
  });

  // Action Dialog (HR Verify/Reject, Finance Approve/Reject, Finance Reimburse)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    claim: any | null;
    type: 'hr_approve' | 'hr_reject' | 'fin_approve' | 'fin_reject' | 'reimburse';
  }>({ open: false, claim: null, type: 'hr_approve' });
  const [actionRemarks, setActionRemarks] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer / NEFT');
  const [paymentReference, setPaymentReference] = useState('');
  const [acting, setActing] = useState(false);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const endpoint =
        mode === 'hr'
          ? '/hr/tada-claims'
          : mode === 'finance'
          ? '/finance/expenses'
          : '/finance/expenses?mine=true';
      const res = await api.get(endpoint);
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setClaims(list);
      // If finance opens to hr_approved and none are waiting, keep tab responsive
      if (mode === 'finance' && statusFilter === 'hr_approved' && list.length > 0) {
        const hasReady = list.some((c: any) => c.status === 'hr_approved');
        if (!hasReady && list.some((c: any) => c.status === 'approved')) {
          setStatusFilter('approved');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load TA/DA claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const computedFormTotal = useMemo(() => {
    if (formData.claimType === 'general') {
      return Math.max(0, parseFloat(formData.amount) || 0);
    }
    const ta = Math.max(0, parseFloat(formData.taAmount) || 0);
    const da = Math.max(0, parseFloat(formData.daAmount) || 0);
    const other = Math.max(0, parseFloat(formData.otherAmount) || 0);
    const sum = ta + da + other;
    return sum > 0 ? sum : Math.max(0, parseFloat(formData.amount) || 0);
  }, [formData]);

  const resetForm = () => {
    setEditingClaim(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      claimType: 'tada',
      category: 'travel',
      travelDate: today,
      endDate: today,
      fromLocation: '',
      toLocation: '',
      travelMode: 'two_wheeler',
      distanceKm: '',
      taAmount: '',
      daAmount: '',
      otherAmount: '',
      amount: '',
      description: '',
      receipts: [],
    });
  };

  const openCreateModal = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditModal = (claim: any) => {
    setEditingClaim(claim);
    setFormData({
      claimType: claim.claimType || 'tada',
      category: claim.category || 'travel',
      travelDate: claim.travelDate ? new Date(claim.travelDate).toISOString().split('T')[0] : '',
      endDate: claim.endDate ? new Date(claim.endDate).toISOString().split('T')[0] : '',
      fromLocation: claim.fromLocation || '',
      toLocation: claim.toLocation || '',
      travelMode: claim.travelMode || 'two_wheeler',
      distanceKm: claim.distanceKm != null ? String(claim.distanceKm) : '',
      taAmount: claim.taAmount ? String(claim.taAmount) : '',
      daAmount: claim.daAmount ? String(claim.daAmount) : '',
      otherAmount: claim.otherAmount ? String(claim.otherAmount) : '',
      amount: claim.amount ? String(claim.amount) : '',
      description: claim.description || '',
      receipts: Array.isArray(claim.receipts) ? claim.receipts : [],
    });
    setFormOpen(true);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingReceipt(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await api.post('/enrollment/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = res.data?.url || res.data?.data?.url;
        if (url) uploadedUrls.push(url);
      }
      setFormData(prev => ({ ...prev, receipts: [...prev.receipts, ...uploadedUrls] }));
      toast.success(`${uploadedUrls.length} receipt(s) attached`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload receipt');
    } finally {
      setUploadingReceipt(false);
      e.target.value = '';
    }
  };

  const handleSaveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (computedFormTotal <= 0) {
      toast.error('Please enter a valid TA, DA, or claim amount greater than ₹0');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Please enter the purpose / description of the claim');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        amount: computedFormTotal,
        taAmount: formData.claimType === 'general' ? 0 : (parseFloat(formData.taAmount) || 0),
        daAmount: formData.claimType === 'general' ? 0 : (parseFloat(formData.daAmount) || 0),
        otherAmount: formData.claimType === 'general' ? 0 : (parseFloat(formData.otherAmount) || 0),
      };
      if (editingClaim) {
        await api.put(`/finance/expenses/${editingClaim.id}`, payload);
        toast.success('TA/DA claim updated and submitted for HR verification');
      } else {
        await api.post('/finance/expenses', payload);
        toast.success('TA/DA claim submitted to HR for verification');
      }
      setFormOpen(false);
      resetForm();
      fetchClaims();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit TA/DA claim');
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async (claimId: string) => {
    if (!confirm('Are you sure you want to withdraw / delete this claim?')) return;
    try {
      await api.delete(`/finance/expenses/${claimId}`);
      toast.success('Claim removed');
      fetchClaims();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete claim');
    }
  };

  const openActionModal = (
    claim: any,
    type: 'hr_approve' | 'hr_reject' | 'fin_approve' | 'fin_reject' | 'reimburse'
  ) => {
    setActionDialog({ open: true, claim, type });
    setActionRemarks('');
    setPaymentMethod('Bank Transfer / NEFT');
    setPaymentReference('');
  };

  const executeWorkflowAction = async () => {
    const { claim, type } = actionDialog;
    if (!claim) return;

    if ((type === 'hr_reject' || type === 'fin_reject') && !actionRemarks.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setActing(true);
    try {
      if (type === 'hr_approve' || type === 'hr_reject') {
        await api.put(`/hr/tada-claims/${claim.id}/verify`, {
          action: type === 'hr_approve' ? 'approve' : 'reject',
          remarks: actionRemarks.trim() || undefined,
        });
        toast.success(
          type === 'hr_approve'
            ? 'Claim verified by HR and forwarded to Finance!'
            : 'Claim rejected by HR'
        );
      } else if (type === 'fin_approve' || type === 'fin_reject') {
        await api.put(`/finance/expenses/${claim.id}/approve`, {
          action: type === 'fin_approve' ? 'approve' : 'reject',
          remarks: actionRemarks.trim() || undefined,
        });
        toast.success(
          type === 'fin_approve'
            ? 'Claim approved by Finance!'
            : 'Claim rejected by Finance'
        );
      } else if (type === 'reimburse') {
        await api.put(`/finance/expenses/${claim.id}/reimburse`, {
          paymentMethod,
          paymentReference: paymentReference.trim() || undefined,
          remarks: actionRemarks.trim() || undefined,
        });
        toast.success('TA/DA reimbursement recorded successfully!');
      }
      setActionDialog({ open: false, claim: null, type: 'hr_approve' });
      fetchClaims();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  // Summary metrics
  const stats = useMemo(() => {
    const pendingHR = claims.filter(c => c.status === 'pending');
    const hrVerified = claims.filter(c => c.status === 'hr_approved');
    const finApproved = claims.filter(c => c.status === 'approved');
    const reimbursed = claims.filter(c => c.status === 'reimbursed');
    const rejected = claims.filter(c => c.status === 'hr_rejected' || c.status === 'rejected');

    const sumAmt = (arr: any[]) => arr.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    return {
      allCount: claims.length,
      allAmt: sumAmt(claims),
      pendingHRCount: pendingHR.length,
      pendingHRAmt: sumAmt(pendingHR),
      hrVerifiedCount: hrVerified.length,
      hrVerifiedAmt: sumAmt(hrVerified),
      finApprovedCount: finApproved.length,
      finApprovedAmt: sumAmt(finApproved),
      reimbursedCount: reimbursed.length,
      reimbursedAmt: sumAmt(reimbursed),
      rejectedCount: rejected.length,
    };
  }, [claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'rejected') {
          if (c.status !== 'hr_rejected' && c.status !== 'rejected') return false;
        } else if (statusFilter === 'processed') {
          if (!['approved', 'reimbursed'].includes(c.status)) return false;
        } else if (c.status !== statusFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const empName = (c.employee?.name || c.employeeId?.name || '').toLowerCase();
        const empCode = (c.employee?.userId || '').toLowerCase();
        const desc = (c.description || '').toLowerCase();
        const route = `${c.fromLocation || ''} ${c.toLocation || ''}`.toLowerCase();
        if (!empName.includes(q) && !empCode.includes(q) && !desc.includes(q) && !route.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [claims, statusFilter, searchQuery]);

  const resolveFileUrl = (url: string) => {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return url.startsWith('/') ? url : `/${url}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === 'hr'
              ? 'TA/DA Claims — HR Verification'
              : mode === 'finance'
              ? 'TA/DA Management — Finance & Disbursement'
              : 'My TA/DA & Official Claims'}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mode === 'hr'
              ? 'Verify employee travel & daily allowance claims before forwarding to Finance for payout.'
              : mode === 'finance'
              ? 'Process HR-verified TA/DA claims, approve payouts, and record bank/UPI reimbursements.'
              : 'Submit travel & daily allowance claims and track HR verification and Finance disbursement.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchClaims} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          {mode === 'employee' && (
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-1.5" />
              New TA/DA Claim
            </Button>
          )}
        </div>
      </div>

      {/* Workflow Banner */}
      <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Mandatory Approval Flow:</span>
        <Badge variant="outline" className="bg-background">1. Employee Submits TA/DA</Badge>
        <ArrowRight className="w-3.5 h-3.5" />
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
          2. HR Verification &amp; Approval
        </Badge>
        <ArrowRight className="w-3.5 h-3.5" />
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
          3. Finance Approval &amp; Reimbursement
        </Badge>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/70">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending HR Verification</p>
              <p className="text-xl font-bold">{stats.pendingHRCount}</p>
              <p className="text-[11px] text-muted-foreground">{formatINR(stats.pendingHRAmt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">HR Verified (With Finance)</p>
              <p className="text-xl font-bold">{stats.hrVerifiedCount}</p>
              <p className="text-[11px] text-muted-foreground">{formatINR(stats.hrVerifiedAmt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Finance Approved (Unpaid)</p>
              <p className="text-xl font-bold">{stats.finApprovedCount}</p>
              <p className="text-[11px] text-muted-foreground">{formatINR(stats.finApprovedAmt)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Reimbursed / Disbursed</p>
              <p className="text-xl font-bold">{formatINR(stats.reimbursedAmt)}</p>
              <p className="text-[11px] text-muted-foreground">{stats.reimbursedCount} settled claim(s)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="flex-wrap h-auto gap-1 bg-muted/60 p-1">
            {mode === 'finance' && (
              <TabsTrigger value="hr_approved" className="text-xs">
                Ready for Finance ({stats.hrVerifiedCount})
              </TabsTrigger>
            )}
            {mode === 'hr' && (
              <TabsTrigger value="pending" className="text-xs">
                Pending HR ({stats.pendingHRCount})
              </TabsTrigger>
            )}
            <TabsTrigger value="all" className="text-xs">
              All ({stats.allCount})
            </TabsTrigger>
            {mode !== 'hr' && (
              <TabsTrigger value="pending" className="text-xs">
                At HR Stage ({stats.pendingHRCount})
              </TabsTrigger>
            )}
            {mode !== 'finance' && (
              <TabsTrigger value="hr_approved" className="text-xs">
                HR Verified ({stats.hrVerifiedCount})
              </TabsTrigger>
            )}
            <TabsTrigger value="approved" className="text-xs">
              Finance Approved ({stats.finApprovedCount})
            </TabsTrigger>
            <TabsTrigger value="reimbursed" className="text-xs">
              Reimbursed ({stats.reimbursedCount})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">
              Rejected ({stats.rejectedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode !== 'employee' && (
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search staff, code, route, purpose..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        )}
      </div>

      {/* Claims List */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            TA/DA &amp; Expense Claims ({filteredClaims.length})
          </CardTitle>
          <CardDescription className="text-xs">
            {mode === 'finance'
              ? 'Finance actions are unlocked only after HR verification.'
              : mode === 'hr'
              ? 'Review travel details and supporting bills before forwarding to Finance.'
              : 'Click New TA/DA Claim to submit travel and daily allowance expenses with bills.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-25" />
              <p className="text-sm font-medium">No TA/DA claims in this view</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredClaims.map(claim => {
                const statusInfo = STATUS_META[claim.status] || {
                  label: claim.status,
                  badgeClass: 'bg-muted text-muted-foreground',
                };
                const emp = claim.employee || (typeof claim.employeeId === 'object' ? claim.employeeId : null);
                const hasRoute = claim.fromLocation || claim.toLocation;
                const receiptsList: string[] = Array.isArray(claim.receipts) ? claim.receipts : [];

                return (
                  <div
                    key={claim.id}
                    className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/30 transition-all space-y-3"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {mode !== 'employee' && emp && (
                            <span className="font-bold text-sm text-foreground">
                              {emp.name}
                              {emp.userId ? ` (${emp.userId})` : ''}
                            </span>
                          )}
                          {mode !== 'employee' && emp?.department?.name && (
                            <Badge variant="secondary" className="text-[10px]">
                              {emp.department.name}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {CLAIM_TYPES[claim.claimType] || (claim.claimType || 'TA/DA').toUpperCase()}
                          </Badge>
                          <Badge className={cn('text-[10px] border font-semibold', statusInfo.badgeClass)}>
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <p className="text-sm font-medium text-foreground">{claim.description}</p>

                        {/* Travel Route & Date Meta */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {hasRoute && (
                            <span className="flex items-center gap-1 text-foreground/80 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-primary" />
                              {claim.fromLocation || 'Origin'} → {claim.toLocation || 'Destination'}
                            </span>
                          )}
                          {claim.travelMode && (
                            <span className="flex items-center gap-1">
                              <Car className="w-3.5 h-3.5" />
                              {TRAVEL_MODES[claim.travelMode] || claim.travelMode}
                              {claim.distanceKm ? ` (${claim.distanceKm} km)` : ''}
                            </span>
                          )}
                          {claim.travelDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(claim.travelDate).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                              {claim.endDate &&
                              new Date(claim.endDate).toDateString() !== new Date(claim.travelDate).toDateString()
                                ? ` – ${new Date(claim.endDate).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}`
                                : ''}
                            </span>
                          )}
                          <span>
                            Submitted:{' '}
                            {claim.submittedAt
                              ? new Date(claim.submittedAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </span>
                        </div>

                        {/* Itemized Breakdown */}
                        {(Number(claim.taAmount) > 0 || Number(claim.daAmount) > 0 || Number(claim.otherAmount) > 0) && (
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                            <span className="px-2 py-0.5 rounded bg-muted font-medium">
                              TA: {formatINR(claim.taAmount || 0)}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-muted font-medium">
                              DA: {formatINR(claim.daAmount || 0)}
                            </span>
                            {Number(claim.otherAmount) > 0 && (
                              <span className="px-2 py-0.5 rounded bg-muted font-medium">
                                Other/Lodging: {formatINR(claim.otherAmount || 0)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Receipts */}
                        {receiptsList.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {receiptsList.map((url, idx) => (
                              <a
                                key={idx}
                                href={resolveFileUrl(url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                              >
                                <FileText className="w-3 h-3" />
                                Receipt #{idx + 1}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Audit Trail: HR & Finance Verification Info */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                          {claim.hrApprover && (
                            <span className="text-sky-700 dark:text-sky-400 font-medium">
                              HR ({claim.hrApprover.name}): {claim.hrRemarks || (claim.status === 'hr_rejected' ? 'Rejected' : 'Verified')}
                            </span>
                          )}
                          {claim.approver && (
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              Finance ({claim.approver.name}): {claim.remarks || (claim.status === 'rejected' ? 'Rejected' : 'Approved')}
                            </span>
                          )}
                          {claim.status === 'reimbursed' && (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              Paid via {claim.paymentMethod || 'Bank Transfer'}
                              {claim.paymentReference ? ` • Ref: ${claim.paymentReference}` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Total Amount & Role Actions */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-2 shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0">
                        <div className="text-left lg:text-right">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Total Claim
                          </p>
                          <p className="text-xl font-extrabold text-foreground">
                            {formatINR(claim.amount)}
                          </p>
                        </div>

                        {/* Employee Actions */}
                        {mode === 'employee' && ['pending', 'hr_rejected'].includes(claim.status) && (
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openEditModal(claim)}>
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              {claim.status === 'hr_rejected' ? 'Edit & Resubmit' : 'Edit'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleWithdraw(claim.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}

                        {/* HR Verification Actions */}
                        {mode === 'hr' && claim.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => openActionModal(claim, 'hr_approve')}
                            >
                              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                              Verify &amp; Send to Finance
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-rose-300 text-rose-600 hover:bg-rose-50"
                              onClick={() => openActionModal(claim, 'hr_reject')}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {/* Finance Actions (Strictly gated on HR Verification!) */}
                        {mode === 'finance' && claim.status === 'pending' && (
                          <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-700 border-amber-500/30 gap-1">
                            <Lock className="w-3 h-3" />
                            Awaiting HR Verification
                          </Badge>
                        )}

                        {mode === 'finance' && claim.status === 'hr_approved' && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                              onClick={() => openActionModal(claim, 'fin_approve')}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => openActionModal(claim, 'reimburse')}
                            >
                              <Wallet className="w-3.5 h-3.5 mr-1" />
                              Approve &amp; Pay
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-rose-300 text-rose-600 hover:bg-rose-50"
                              onClick={() => openActionModal(claim, 'fin_reject')}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}

                        {mode === 'finance' && claim.status === 'approved' && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => openActionModal(claim, 'reimburse')}
                            >
                              <Wallet className="w-3.5 h-3.5 mr-1" />
                              Mark Reimbursed
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit / Edit TA/DA Claim Modal */}
      <Dialog open={formOpen} onOpenChange={open => { setFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClaim ? 'Edit TA/DA Claim' : 'Submit TA/DA Claim'}</DialogTitle>
            <DialogDescription>
              Your claim will be sent to HR for verification first, and then forwarded to Finance for disbursement.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveClaim} className="space-y-4 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Claim Type *</Label>
                <Select
                  value={formData.claimType}
                  onValueChange={val => setFormData(prev => ({ ...prev, claimType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CLAIM_TYPES).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Expense Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={val => setFormData(prev => ({ ...prev, category: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="travel">Official Travel / Field Visit</SelectItem>
                    <SelectItem value="center_visit">Study Center / University Visit</SelectItem>
                    <SelectItem value="food">Daily Allowance / Meals</SelectItem>
                    <SelectItem value="accommodation">Lodging / Accommodation</SelectItem>
                    <SelectItem value="fuel">Fuel / Mileage</SelectItem>
                    <SelectItem value="other">Other Official Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.claimType !== 'general' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>From Location</Label>
                    <Input
                      placeholder="e.g. Calicut Head Office"
                      value={formData.fromLocation}
                      onChange={e => setFormData(prev => ({ ...prev, fromLocation: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>To Location</Label>
                    <Input
                      placeholder="e.g. Kochi Study Center"
                      value={formData.toLocation}
                      onChange={e => setFormData(prev => ({ ...prev, toLocation: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label>Travel Start Date</Label>
                    <Input
                      type="date"
                      value={formData.travelDate}
                      onChange={e => setFormData(prev => ({ ...prev, travelDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Return Date</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mode of Travel</Label>
                    <Select
                      value={formData.travelMode}
                      onValueChange={val => setFormData(prev => ({ ...prev, travelMode: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TRAVEL_MODES).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Distance (km)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="e.g. 85"
                      value={formData.distanceKm}
                      onChange={e => setFormData(prev => ({ ...prev, distanceKm: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/70">
                  <div className="space-y-1">
                    <Label className="text-xs">Travel Allowance — TA (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.taAmount}
                      onChange={e => setFormData(prev => ({ ...prev, taAmount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Daily Allowance — DA (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.daAmount}
                      onChange={e => setFormData(prev => ({ ...prev, daAmount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Lodging / Other (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.otherAmount}
                      onChange={e => setFormData(prev => ({ ...prev, otherAmount: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-center justify-between pt-2 border-t border-border/60 text-sm">
                    <span className="font-medium text-muted-foreground">Total Claim Amount:</span>
                    <span className="text-lg font-extrabold text-primary">{formatINR(computedFormTotal)}</span>
                  </div>
                </div>
              </>
            )}

            {formData.claimType === 'general' && (
              <div className="space-y-1.5">
                <Label>Claim Amount (₹) *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter amount in ₹"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Purpose / Visit Details *</Label>
              <Textarea
                rows={3}
                placeholder="Describe purpose of travel, centers/clients visited, or expense details..."
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>

            {/* Receipt Upload */}
            <div className="space-y-2">
              <Label>Supporting Bills / Tickets / Receipts</Label>
              <div className="flex items-center gap-3">
                <Label
                  htmlFor="tada-receipt-upload"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 text-primary text-xs font-medium cursor-pointer hover:bg-primary/10 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingReceipt ? 'Uploading...' : 'Attach Receipt / Ticket (PDF/Image)'}
                </Label>
                <input
                  id="tada-receipt-upload"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleReceiptUpload}
                  disabled={uploadingReceipt}
                />
              </div>
              {formData.receipts.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.receipts.map((url, i) => (
                    <Badge key={i} variant="secondary" className="gap-1.5 py-1">
                      <a href={resolveFileUrl(url)} target="_blank" rel="noreferrer" className="underline">
                        Receipt #{i + 1}
                      </a>
                      <button
                        type="button"
                        className="text-rose-500 hover:text-rose-700 ml-1"
                        onClick={() =>
                          setFormData(prev => ({
                            ...prev,
                            receipts: prev.receipts.filter((_, idx) => idx !== i),
                          }))
                        }
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || uploadingReceipt}>
                {saving ? 'Submitting...' : editingClaim ? 'Update & Resubmit' : 'Submit to HR'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* HR Verification / Finance Approval / Reimbursement Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={open => setActionDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'hr_approve' && 'Verify TA/DA Claim & Forward to Finance'}
              {actionDialog.type === 'hr_reject' && 'Reject TA/DA Claim (HR)'}
              {actionDialog.type === 'fin_approve' && 'Approve TA/DA Claim (Finance)'}
              {actionDialog.type === 'fin_reject' && 'Reject TA/DA Claim (Finance)'}
              {actionDialog.type === 'reimburse' && 'Record TA/DA Reimbursement'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.claim && (
                <>
                  Claim of <strong>{formatINR(actionDialog.claim.amount)}</strong> by{' '}
                  <strong>{actionDialog.claim.employee?.name || 'Employee'}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {actionDialog.type === 'reimburse' && (
              <>
                <div className="space-y-1.5">
                  <Label>Disbursement Mode *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer / NEFT">Bank Transfer / NEFT / IMPS</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cash">Cash Voucher</SelectItem>
                      <SelectItem value="Salary Addition">Added to Payroll</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>UTR / Transaction Reference (Optional)</Label>
                  <Input
                    placeholder="e.g. UTR982341209 / Voucher #14"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>
                Remarks{' '}
                {actionDialog.type === 'hr_reject' || actionDialog.type === 'fin_reject' ? '*' : '(Optional)'}
              </Label>
              <Textarea
                rows={3}
                placeholder={
                  actionDialog.type.includes('reject')
                    ? 'Specify reason for rejection...'
                    : 'Optional verification or payout notes...'
                }
                value={actionRemarks}
                onChange={e => setActionRemarks(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog(prev => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={executeWorkflowAction}
              disabled={acting}
              className={cn(
                actionDialog.type.includes('reject')
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              {acting ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
