import { useState, useEffect } from 'react';
import { Wallet, RefreshCw, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface WalletData {
  balance: number;
  studyCenterId: string;
}

interface TopUp {
  id: string;
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

export function StudyCenterWalletPanel() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [topUps, setTopUps] = useState<TopUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', paymentMethod: 'offline', referenceNumber: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [walletRes, topUpsRes] = await Promise.all([
        api.get('/enrollment/wallet'),
        api.get('/enrollment/wallet/topups'),
      ]);
      setWallet(walletRes.data.data);
      setTopUps(topUpsRes.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleTopUp = async () => {
    try {
      await api.post('/enrollment/wallet/topup', {
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber || undefined,
      });
      toast.success('Top-up request submitted');
      setOpen(false);
      setForm({ amount: '', paymentMethod: 'offline', referenceNumber: '' });
      fetchAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit top-up');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Wallet</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage your study center wallet balance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />Request Top-Up
          </Button>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-primary/10 text-primary">
            <Wallet className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Available Balance</p>
            <p className="text-4xl font-bold tracking-tight mt-1">
              ₹{(wallet?.balance || 0).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top-Up History</CardTitle>
          <CardDescription>All wallet top-up requests and their status.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : topUps.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No top-up requests yet.</p>
          ) : (
            <div className="space-y-3">
              {topUps.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-[10px] uppercase font-bold', STATUS_COLOR[t.status] || 'bg-muted text-muted-foreground')}>
                        {t.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{t.paymentMethod}</span>
                    </div>
                    <p className="text-sm font-semibold mt-1">₹{t.amount.toLocaleString()}</p>
                    {t.referenceNumber && <p className="text-xs text-muted-foreground">Ref: {t.referenceNumber}</p>}
                    {t.remarks && <p className="text-xs text-destructive mt-1">{t.remarks}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Wallet Top-Up</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Amount (₹)</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 10000" />
            </div>
            <div className="space-y-1">
              <Label>Payment Method</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.paymentMethod}
                onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
              >
                <option value="offline">Offline / Bank Transfer</option>
                <option value="online">Online</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Reference Number</Label>
              <Input value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="UTR / Cheque number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleTopUp} disabled={!form.amount}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
