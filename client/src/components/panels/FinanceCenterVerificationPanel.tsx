import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, DollarSign, FileText, ExternalLink, Key, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SERVER_BASE = '';

interface AuthFeeEntry { universityId: string; universityName: string; amount: number | null; }
interface PaymentProof { url: string; uploadedAt: string; remarks?: string; }
interface Center {
  id: string;
  name: string;
  code: string;
  email: string;
  contact: string;
  address: string;
  verifiedBy?: { name: string };
  verifiedAt?: string;
  authFees: AuthFeeEntry[];
  paymentProof?: PaymentProof;
  createdAt: string;
}
interface Credentials { email: string; password: string; }

export function FinanceCenterVerificationPanel() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<{ center: Center; action: 'approve' | 'reject' } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const loadCenters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/centers/pending-payment');
      setCenters(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load centers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCenters(); }, []);

  const handleAction = async () => {
    if (!dialog) return;
    if (dialog.action === 'reject' && !remarks.trim()) {
      toast.error('Remarks are required when rejecting');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.put(`/finance/centers/${dialog.center.id}/finance-verify`, {
        action: dialog.action,
        remarks,
      });
      setDialog(null);
      setRemarks('');
      loadCenters();
      if (dialog.action === 'approve' && res.data._credentials) {
        setCredentials(res.data._credentials);
      } else {
        toast.success(dialog.action === 'approve' ? 'Center activated' : 'Center rejected');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const totalFee = (fees: AuthFeeEntry[]) =>
    fees.reduce((sum, f) => sum + (f.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pending Payment Verification</h2>
          <p className="text-muted-foreground text-sm mt-1">Verify authorisation fee payment for study centers.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadCenters} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : centers.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No centers pending payment verification.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {centers.map(c => (
            <Card key={c.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{c.name}</h4>
                      <Badge variant="outline" className="text-[10px]">{c.code}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.email} · {c.contact}</p>
                    {c.verifiedBy && (
                      <p className="text-xs text-muted-foreground mt-0.5">Docs verified by: {c.verifiedBy.name}</p>
                    )}
                    <div className="mt-3 space-y-1">
                      {c.authFees.map(f => (
                        <div key={f.universityId} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{f.universityName}</span>
                          {f.amount !== null ? (
                            <span className="font-semibold">&#8377;{f.amount.toLocaleString()}</span>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">Fee not configured</Badge>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-border mt-1">
                        <span>Total</span>
                        <span>&#8377;{totalFee(c.authFees).toLocaleString()}</span>
                      </div>
                    </div>
                    {c.paymentProof ? (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Payment Proof
                        </p>
                        <a
                          href={`${SERVER_BASE}${c.paymentProof.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          View Receipt <ExternalLink className="w-3 h-3" />
                        </a>
                        {c.paymentProof.remarks && (
                          <p className="text-xs text-muted-foreground mt-1">{c.paymentProof.remarks}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Uploaded: {new Date(c.paymentProof.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-2 italic">No payment proof uploaded yet.</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => { setDialog({ center: c, action: 'reject' }); setRemarks(''); }}>
                      <XCircle className="w-4 h-4 mr-1" />Reject
                    </Button>
                    <Button size="sm" onClick={() => { setDialog({ center: c, action: 'approve' }); setRemarks(''); }}>
                      <CheckCircle className="w-4 h-4 mr-1" />Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve / Reject dialog */}
      <Dialog open={!!dialog} onOpenChange={() => { setDialog(null); setRemarks(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.action === 'approve' ? 'Approve & Activate' : 'Reject'} — {dialog?.center.name}
            </DialogTitle>
          </DialogHeader>
          {dialog?.action === 'approve' && (
            <p className="text-sm text-muted-foreground">
              Approving will activate the study center and generate login credentials.
            </p>
          )}
          <div className="space-y-3 py-2">
            <Label>Remarks {dialog?.action === 'reject' && <span className="text-destructive">*</span>}</Label>
            <Textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder={dialog?.action === 'reject' ? 'Reason for rejection (required)' : 'Optional remarks'}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(null); setRemarks(''); }}>Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={submitting}
              variant={dialog?.action === 'reject' ? 'destructive' : 'default'}
            >
              {submitting ? 'Processing...' : dialog?.action === 'approve' ? 'Approve & Activate' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials modal — shown once after approval */}
      <Dialog open={!!credentials} onOpenChange={() => setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> Study Center Login Credentials
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Save these credentials — the password will not be shown again.
          </p>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Email / Username</Label>
              <div className="flex gap-2">
                <Input readOnly value={credentials?.email || ''} />
                <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(credentials?.email || ''); toast.success('Email copied'); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <div className="flex gap-2">
                <Input readOnly value={credentials?.password || ''} />
                <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(credentials?.password || ''); toast.success('Password copied'); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
