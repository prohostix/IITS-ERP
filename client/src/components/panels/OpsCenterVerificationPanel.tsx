import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface University { id: string; name: string; code: string; }
interface Center {
  id: string;
  name: string;
  code: string;
  email: string;
  contact: string;
  address: string;
  status: string;
  associatedUniversityIds: University[];
  pendingDocuments: { name: string; url: string }[];
  referredBy?: string | { name: string; email: string };
  referrer?: { id: string; name: string; email: string; role?: string };
  referredByUser?: { id: string; name: string; email: string; role?: string };
  verifier?: { id: string; name: string; email: string };
  verifiedByUser?: { id: string; name: string; email: string };
  verifiedAt?: string;
  opsRemarks?: string;
  paymentProof?: { url: string; filename?: string; remarks?: string; uploadedAt?: string } | null;
  resolvedBranchId?: string | null;
  resolvedBranchName?: string;
  branchName?: string;
  createdAt: string;
}

export function OpsCenterVerificationPanel() {
  const { user } = useAuth();
  const isUserInBranch = Boolean(user?.branchId || (user as any)?.designationRef?.branchId || user?.role === 'branch_manager' || user?.role === 'center_admin');
  const [centers, setCenters] = useState<Center[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; centerIds?: string[] }[]>([]);
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusTab, setStatusTab] = useState<'all' | 'pending_ops' | 'pending_payment'>('all');
  const [branchSort, setBranchSort] = useState<'latest' | 'branch_asc' | 'branch_desc'>('latest');
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<{ center: Center; action: 'approve' | 'activate' | 'reject' } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const [res, bRes] = await Promise.all([
        api.get('/operations/centers/pending-verification'),
        api.get('/org/branches').catch(() => ({ data: { data: [] } })),
      ]);
      setCenters(res.data.data || []);
      setBranches(bRes.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load centers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleAction = async () => {
    if (!dialog) return;
    if (dialog.action === 'reject' && !remarks.trim()) {
      toast.error('Remarks are required when rejecting');
      return;
    }
    setSubmitting(true);
    try {
      if (dialog.action === 'activate') {
        await api.put(`/operations/centers/${dialog.center.id}/approve`, { remarks });
        toast.success(`Study Center "${dialog.center.name}" approved and activated!`);
      } else {
        await api.put(`/operations/centers/${dialog.center.id}/verify`, {
          action: dialog.action,
          remarks,
        });
        toast.success(
          dialog.action === 'approve'
            ? 'Documents verified — center moved to Pending Payment'
            : 'Study Center rejected'
        );
      }
      setDialog(null);
      setRemarks('');
      fetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getBranchName = (c: Center) => {
    if (c.resolvedBranchName) return c.resolvedBranchName;
    if (c.branchName) return c.branchName;
    const b = branches.find(br => (br.centerIds || []).includes(c.id));
    return b?.name || 'Unassigned';
  };

  const getBranchId = (c: Center) => {
    if (c.resolvedBranchId) return c.resolvedBranchId;
    const b = branches.find(br => (br.centerIds || []).includes(c.id));
    return b?.id || 'unassigned';
  };

  const pendingOpsCount = centers.filter(c => ['pending_verification', 'pending'].includes(c.status)).length;
  const pendingPaymentCount = centers.filter(c => ['pending_payment', 'ops_verified'].includes(c.status)).length;

  const filteredCenters = centers
    .filter(c => {
      if (statusTab === 'pending_ops' && !['pending_verification', 'pending'].includes(c.status)) return false;
      if (statusTab === 'pending_payment' && !['pending_payment', 'ops_verified'].includes(c.status)) return false;
      if (branchFilter === 'all') return true;
      const bId = getBranchId(c);
      const bName = getBranchName(c);
      if (branchFilter === 'unassigned') return bId === 'unassigned' || bName === 'Unassigned';
      return bId === branchFilter || bName === branchFilter;
    })
    .sort((a, b) => {
      if (branchSort === 'branch_asc') return getBranchName(a).localeCompare(getBranchName(b));
      if (branchSort === 'branch_desc') return getBranchName(b).localeCompare(getBranchName(a));
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">New Study Center Approvals &amp; Verification</h2>
          <p className="text-muted-foreground text-sm mt-1">Review, verify documents, and approve new study centers across branches.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isUserInBranch && (
            <>
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
            </>
          )}
          <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
          </Button>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-2 flex-wrap items-center">
        {[
          { key: 'all', label: 'All Pending Centers', count: centers.length, dot: 'bg-primary' },
          { key: 'pending_ops', label: 'Pending Ops Verification', count: pendingOpsCount, dot: 'bg-amber-500' },
          { key: 'pending_payment', label: 'Ops Verified / Pending Activation', count: pendingPaymentCount, dot: 'bg-blue-500' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusTab(tab.key as any)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
              statusTab === tab.key
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-background/80 hover:bg-muted text-muted-foreground border-border/70'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', tab.dot, statusTab === tab.key && 'ring-2 ring-white/50')} />
            <span>{tab.label}</span>
            <span className={cn(
              'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
              statusTab === tab.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filteredCenters.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No centers pending verification or approval.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filteredCenters.map(c => {
            const referrerObj = c.referrer || c.referredByUser || (typeof c.referredBy === 'object' ? c.referredBy : null);
            const verifierObj = c.verifier || c.verifiedByUser;
            const isOpsVerified = c.status === 'pending_payment' || c.status === 'ops_verified';
            return (
              <Card key={c.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold">{c.name}</h4>
                        <Badge variant="outline" className="text-[10px] font-mono">{c.code}</Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] capitalize font-semibold',
                            isOpsVerified
                              ? 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          )}
                        >
                          {c.status === 'pending_payment' ? 'Ops Verified · Pending Activation' : c.status?.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                          🏢 {getBranchName(c)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.email} · {c.contact}</p>
                      {c.address && <p className="text-xs text-muted-foreground mt-0.5">{c.address}</p>}
                      {(c.associatedUniversityIds?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(c.associatedUniversityIds || []).map(u => (
                            <Badge key={u.id} variant="secondary" className="text-[10px]">{u.name} ({u.code})</Badge>
                          ))}
                        </div>
                      )}
                      {(c.pendingDocuments?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(c.pendingDocuments || []).map((doc, i) => (
                            <a
                              key={i}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded border border-primary/20"
                            >
                              <FileText className="w-3 h-3" />{doc.name}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      )}
                      {c.paymentProof?.url && (
                        <div className="mt-2">
                          <a
                            href={c.paymentProof.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20"
                          >
                            <FileText className="w-3 h-3" /> Payment Proof ({c.paymentProof.filename || 'Receipt'})
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {referrerObj?.name && (
                          <span>Referred by: <strong className="text-foreground">{referrerObj.name}</strong></span>
                        )}
                        {verifierObj?.name && (
                          <span>Verified by: <strong className="text-foreground">{verifierObj.name}</strong></span>
                        )}
                        <span>Created: {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-error border-error/30 hover:bg-error/10"
                        onClick={() => { setDialog({ center: c, action: 'reject' }); setRemarks(''); }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />Reject
                      </Button>
                      {!isOpsVerified && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                          onClick={() => { setDialog({ center: c, action: 'approve' }); setRemarks(''); }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />Verify Docs (To Payment)
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => { setDialog({ center: c, action: 'activate' }); setRemarks(''); }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />Approve &amp; Activate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={() => { setDialog(null); setRemarks(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.action === 'activate'
                ? 'Approve & Activate Study Center'
                : dialog?.action === 'approve'
                ? 'Verify Documents (Move to Pending Payment)'
                : 'Reject Study Center'} — {dialog?.center.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {dialog?.action === 'activate' && (
              <p className="text-xs text-muted-foreground">
                This will immediately approve and activate <strong>{dialog.center.name}</strong> and provision its center wallet so it can begin enrolling students.
              </p>
            )}
            {dialog?.action === 'approve' && (
              <p className="text-xs text-muted-foreground">
                This marks the center's documents as verified by Operations and moves it to <strong>Pending Payment</strong> for authorization fee verification.
              </p>
            )}
            <Label>Remarks {dialog?.action === 'reject' && <span className="text-error">*</span>}</Label>
            <Textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder={dialog?.action === 'reject' ? 'Reason for rejection (required)' : 'Optional approval remarks'}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(null); setRemarks(''); }}>Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={submitting}
              variant={dialog?.action === 'reject' ? 'destructive' : 'default'}
              className={dialog?.action === 'activate' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
            >
              {submitting
                ? 'Processing...'
                : dialog?.action === 'activate'
                ? 'Approve & Activate'
                : dialog?.action === 'approve'
                ? 'Verify Documents'
                : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
