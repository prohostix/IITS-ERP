import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
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
  referredBy?: { name: string; email: string };
  createdAt: string;
}

export function OpsCenterVerificationPanel() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<{ center: Center; action: 'approve' | 'reject' } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations/centers/pending-verification');
      setCenters(res.data.data || []);
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
      await api.put(`/operations/centers/${dialog.center.id}/verify`, {
        action: dialog.action,
        remarks,
      });
      toast.success(dialog.action === 'approve' ? 'Center approved — moved to pending payment' : 'Center rejected');
      setDialog(null);
      setRemarks('');
      fetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pending Verification</h2>
          <p className="text-muted-foreground text-sm mt-1">Review and verify study center documents.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : centers.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No centers pending verification.</p>
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
                    <p className="text-xs text-muted-foreground mt-0.5">{c.address}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.associatedUniversityIds.map(u => (
                        <Badge key={u.id} variant="secondary" className="text-[10px]">{u.name}</Badge>
                      ))}
                    </div>
                    {c.pendingDocuments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {c.pendingDocuments.map((doc, i) => (
                          <a
                            key={i}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <FileText className="w-3 h-3" />{doc.name}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                    {c.referredBy && (
                      <p className="text-xs text-muted-foreground mt-1">Referred by: {c.referredBy.name}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="text-error border-error/30 hover:bg-error/10"
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

      <Dialog open={!!dialog} onOpenChange={() => { setDialog(null); setRemarks(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.action === 'approve' ? 'Approve' : 'Reject'} — {dialog?.center.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Remarks {dialog?.action === 'reject' && <span className="text-error">*</span>}</Label>
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
              {submitting ? 'Processing...' : dialog?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
