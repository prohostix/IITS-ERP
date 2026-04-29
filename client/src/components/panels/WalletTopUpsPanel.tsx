import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface TopUp {
  id: string;
  studyCenterId: { name?: string } | string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  status: string;
  createdAt: string;
  remarks?: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

export function WalletTopUpsPanel() {
  const [topUps, setTopUps] = useState<TopUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [remarks, setRemarks] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/wallet-topups');
      setTopUps(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/finance/wallet-topups/${id}/approve`);
      toast.success('Top-up approved');
      fetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    try {
      await api.put(`/finance/wallet-topups/${rejectDialog.id}/reject`, { remarks });
      toast.success('Top-up rejected');
      setRejectDialog({ open: false, id: '' });
      setRemarks('');
      fetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to reject');
    }
  };

  const getCenterName = (t: TopUp) =>
    typeof t.studyCenterId === 'object' ? t.studyCenterId.name || 'Unknown' : t.studyCenterId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Wallet Top-Up Requests</h2>
          <p className="text-muted-foreground text-sm mt-1">Approve or reject study center wallet top-up requests.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : topUps.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No top-up requests found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {topUps.map(t => (
            <Card key={t.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn('text-[10px] uppercase font-bold', STATUS_COLOR[t.status] || 'bg-muted text-muted-foreground')}>
                      {t.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{t.paymentMethod}</Badge>
                  </div>
                  <h4 className="font-semibold">{getCenterName(t)}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>Amount: <strong className="text-foreground">₹{t.amount.toLocaleString()}</strong></span>
                    {t.referenceNumber && <span>Ref: {t.referenceNumber}</span>}
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {t.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success/10" onClick={() => handleApprove(t.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setRejectDialog({ open: true, id: t.id }); setRemarks(''); }}>
                      <XCircle className="w-4 h-4 mr-1" />Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={rejectDialog.open} onOpenChange={o => setRejectDialog(d => ({ ...d, open: o }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Top-Up</DialogTitle></DialogHeader>
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
    </div>
  );
}
