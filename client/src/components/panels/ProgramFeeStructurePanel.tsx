import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';

interface ProgramFee {
  id: string;
  programId: { id: string; name: string; code: string } | string;
  baseFee: number;
  additionalFees: { label: string; amount: number }[];
  currency: string;
  effectiveFrom: string;
}

interface Program {
  id: string;
  name: string;
  code: string;
}

export function ProgramFeeStructurePanel() {
  const [fees, setFees] = useState<ProgramFee[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramFee | null>(null);
  const [form, setForm] = useState({ programId: '', baseFee: '', billingCycle: 'per_year', currency: 'INR', effectiveFrom: '', additionalFees: '' });

  const fetch = async () => {
    setLoading(true);
    try {
      const [feesRes, progsRes] = await Promise.all([
        api.get('/finance/program-fees'),
        api.get('/operations/programs'),
      ]);
      setFees(feesRes.data.data || []);
      setPrograms(progsRes.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ programId: '', baseFee: '', billingCycle: 'per_year', currency: 'INR', effectiveFrom: '', additionalFees: '' });
    setOpen(true);
  };

  const openEdit = (fee: ProgramFee) => {
    setEditing(fee);
    const progId = typeof fee.programId === 'object' ? fee.programId.id : fee.programId;
    setForm({
      programId: progId,
      baseFee: String(fee.baseFee),
      billingCycle: (fee as any).billingCycle || 'per_year',
      currency: fee.currency,
      effectiveFrom: fee.effectiveFrom ? fee.effectiveFrom.slice(0, 10) : '',
      additionalFees: fee.additionalFees.map(f => `${f.label}:${f.amount}`).join(', '),
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const additionalFees = form.additionalFees
        ? form.additionalFees.split(',').map(s => {
            const [label, amount] = s.trim().split(':');
            return { label: label?.trim(), amount: Number(amount) };
          }).filter(f => f.label && !isNaN(f.amount))
        : [];

      const payload = {
        programId: form.programId,
        baseFee: Number(form.baseFee),
        billingCycle: form.billingCycle,
        currency: form.currency,
        effectiveFrom: form.effectiveFrom || undefined,
        additionalFees,
      };

      if (editing) {
        await api.put(`/finance/program-fees/${editing.id}`, payload);
        toast.success('Fee structure updated');
      } else {
        await api.post('/finance/program-fees', payload);
        toast.success('Fee structure created');
      }
      setOpen(false);
      fetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fee structure?')) return;
    try {
      await api.delete(`/finance/program-fees/${id}`);
      toast.success('Deleted');
      fetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete');
    }
  };

  const getProgramName = (fee: ProgramFee) =>
    typeof fee.programId === 'object' ? `${fee.programId.name} (${fee.programId.code})` : fee.programId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Program Fee Structures</h2>
          <p className="text-muted-foreground text-sm mt-1">Define enrollment fees per program for study centers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />Add Fee Structure
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : fees.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No fee structures defined yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {fees.map(fee => (
            <Card key={fee.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold">{getProgramName(fee)}</h4>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <Badge variant="outline">{fee.currency} {fee.baseFee.toLocaleString()} base</Badge>
                    {fee.additionalFees.map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{f.label}: {f.amount}</Badge>
                    ))}
                    {fee.effectiveFrom && (
                      <span className="text-xs text-muted-foreground">From: {new Date(fee.effectiveFrom).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(fee)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(fee.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Fee Structure' : 'New Fee Structure'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Program</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.programId}
                onChange={e => setForm(f => ({ ...f, programId: e.target.value }))}
              >
                <option value="">Select program...</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Billing Cycle</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={form.billingCycle}
                onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}
              >
                <option value="per_semester">Per Semester</option>
                <option value="per_year">Per Year</option>
                <option value="total">Total (one-time)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Base Fee</Label>
                <Input type="number" value={form.baseFee} onChange={e => setForm(f => ({ ...f, baseFee: e.target.value }))} placeholder="e.g. 5000" />
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} placeholder="INR" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Effective From</Label>
              <Input type="date" value={form.effectiveFrom} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Additional Fees <span className="text-muted-foreground text-xs">(label:amount, comma-separated)</span></Label>
              <Input value={form.additionalFees} onChange={e => setForm(f => ({ ...f, additionalFees: e.target.value }))} placeholder="Registration:500, Exam:200" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
