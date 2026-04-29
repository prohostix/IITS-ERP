import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export function InvoicesPanel() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    centerId: '',
    invoiceNo: '',
    itemDescription: '',
    itemQty: '1',
    itemRate: '',
    tax: '0',
    dueDate: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchInvoices();
    fetchCenters();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/invoices');
      setInvoices(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCenters = async () => {
    try {
      const res = await api.get('/operations/centers');
      setCenters(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch centers:', err);
    }
  };

  const calcTotal = () => {
    const qty = Number(formData.itemQty) || 0;
    const rate = Number(formData.itemRate) || 0;
    const tax = Number(formData.tax) || 0;
    const amount = qty * rate;
    return { amount, total: amount + tax };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { amount, total } = calcTotal();
    const payload: any = {
      centerId: formData.centerId,
      invoiceNo: formData.invoiceNo,
      items: [{
        description: formData.itemDescription,
        quantity: Number(formData.itemQty),
        rate: Number(formData.itemRate),
        amount
      }],
      amount,
      tax: Number(formData.tax),
      total,
      status: formData.status
    };
    if (formData.dueDate) payload.dueDate = formData.dueDate;

    try {
      if (editingId) {
        await api.put(`/finance/invoices/${editingId}`, payload);
      } else {
        await api.post('/finance/invoices', payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save invoice');
    }
  };

  const handleEdit = (inv: any) => {
    const centerId = typeof inv.centerId === 'object'
      ? (inv.centerId?.id || inv.centerId?.id)
      : inv.centerId;
    const firstItem = inv.items?.[0] || {};
    setEditingId(inv.id || inv.id);
    setFormData({
      centerId: centerId?.toString() || '',
      invoiceNo: inv.invoiceNo || '',
      itemDescription: firstItem.description || '',
      itemQty: firstItem.quantity?.toString() || '1',
      itemRate: firstItem.rate?.toString() || '',
      tax: inv.tax?.toString() || '0',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
      status: inv.status || 'draft'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return;
    const remarks = prompt('Enter deletion remarks (required for audit):');
    if (!remarks) return;
    try {
      await api.delete(`/finance/invoices/${id}`, { data: { remarks } });
      fetchInvoices();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ centerId: '', invoiceNo: '', itemDescription: '', itemQty: '1', itemRate: '', tax: '0', dueDate: '', status: 'draft' });
  };

  const { total } = calcTotal();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoice Management</h2>
          <p className="text-muted-foreground">Manage invoices and billing</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Invoice' : 'Add New Invoice'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Study Center</Label>
                <Select value={formData.centerId} onValueChange={(v) => setFormData({ ...formData, centerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger>
                  <SelectContent>
                    {centers.filter(c => c && (c.id || c.id)).map((c) => (
                      <SelectItem key={c.id || c.id} value={(c.id || c.id).toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Invoice No</Label>
                <Input value={formData.invoiceNo} onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })} required placeholder="e.g. INV-001" />
              </div>
              <div>
                <Label>Item Description</Label>
                <Input value={formData.itemDescription} onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={formData.itemQty} onChange={(e) => setFormData({ ...formData, itemQty: e.target.value })} required />
                </div>
                <div>
                  <Label>Rate</Label>
                  <Input type="number" min="0" value={formData.itemRate} onChange={(e) => setFormData({ ...formData, itemRate: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tax</Label>
                  <Input type="number" min="0" value={formData.tax} onChange={(e) => setFormData({ ...formData, tax: e.target.value })} />
                </div>
                <div>
                  <Label>Total (auto)</Label>
                  <Input value={total.toFixed(2)} readOnly className="bg-muted" />
                </div>
              </div>
              <div>
                <Label>Due Date (optional)</Label>
                <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Save</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No invoices found</div>
          ) : (
            <div className="space-y-2">
              {invoices.filter(inv => inv && (inv.id || inv.id)).map((inv) => {
                const invId = inv.id || inv.id;
                const centerName = typeof inv.centerId === 'object' ? inv.centerId?.name : '';
                return (
                  <div key={invId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{inv.invoiceNo}</div>
                        <div className="text-sm text-muted-foreground">
                          {centerName && `${centerName} • `}Total: ${inv.total}
                          {inv.dueDate && ` • Due: ${new Date(inv.dueDate).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{inv.status}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(inv)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(invId)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
