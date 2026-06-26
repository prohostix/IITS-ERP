import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, Clock, DollarSign, Upload, Calendar, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  name: string;
  email: string;
  enrollmentNo: string;
  program: {
    name: string;
    code: string;
  };
  center: {
    name: string;
    code: string;
  };
}

interface UniversityFeePayment {
  id: string;
  semesterOrYear: string;
  amount: number;
  status: string;
  referenceNo?: string;
  paidAt?: string;
  screenshot?: string;
  createdAt: string;
  student: Student;
}

export function FinanceUniversityFeePanel() {
  const [payments, setPayments] = useState<UniversityFeePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');
  const [payDialog, setPayDialog] = useState<{ open: boolean; payment: UniversityFeePayment | null }>({ open: false, payment: null });
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    referenceNo: '',
    paidAt: new Date().toISOString().split('T')[0],
    screenshot: null as File | null
  });

  const fetchPayments = async (status = activeTab) => {
    setLoading(true);
    try {
      const res = await api.get(`/finance/university-fees?status=${status}`);
      setPayments(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load university fees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [activeTab]);

  const handlePayClick = (p: UniversityFeePayment) => {
    setPayDialog({ open: true, payment: p });
    setForm({
      referenceNo: '',
      paidAt: new Date().toISOString().split('T')[0],
      screenshot: null
    });
  };

  const handlePaySubmit = async () => {
    if (!payDialog.payment) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('referenceNo', form.referenceNo);
      formData.append('paidAt', form.paidAt);
      if (form.screenshot) {
        formData.append('screenshot', form.screenshot);
      }

      await api.post(`/finance/university-fees/${payDialog.payment.id}/pay`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('University fee marked as paid successfully');
      setPayDialog({ open: false, payment: null });
      fetchPayments();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">University Fee Payments</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage and track university-side fee disbursements for students.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchPayments()} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-500" /> Pending
          </TabsTrigger>
          <TabsTrigger value="paid" className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Paid
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-2">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : payments.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No pending university fee payments found.</p>
            </CardContent></Card>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card text-card-foreground">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Program</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Cycle</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Uni Fee</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <p className="font-medium text-sm">{p.student?.name}</p>
                        <p className="text-xs text-muted-foreground">{p.student?.enrollmentNo}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm">{p.student?.program?.name}</p>
                        <p className="text-xs text-muted-foreground">{p.student?.center?.name}</p>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{p.semesterOrYear}</Badge>
                      </td>
                      <td className="p-3 font-bold text-blue-600">
                        ₹{p.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <Button size="sm" onClick={() => handlePayClick(p)}>Record Payment</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-4 mt-2">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : payments.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No paid university fee payments recorded yet.</p>
            </CardContent></Card>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card text-card-foreground">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Program</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Paid Details</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <p className="font-medium text-sm">{p.student?.name}</p>
                        <p className="text-xs text-muted-foreground">{p.student?.enrollmentNo}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm">{p.student?.program?.name}</p>
                        <p className="text-xs text-muted-foreground">{p.semesterOrYear}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-xs font-mono">Ref: {p.referenceNo || 'N/A'}</p>
                        {p.paidAt && (
                          <p className="text-[11px] text-muted-foreground">
                            Date: {new Date(p.paidAt).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="p-3 font-bold text-green-600">
                        ₹{p.amount.toLocaleString()}
                      </td>
                      <td className="p-3">
                        {p.screenshot ? (
                          <a
                            href={`${(import.meta.env.VITE_API_URL || '').replace('/api/v1', '')}${p.screenshot}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" /> View Proof
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={payDialog.open} onOpenChange={(o) => setPayDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record University Fee Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted/40 p-3 rounded-lg text-sm space-y-1">
              <p><strong>Student:</strong> {payDialog.payment?.student?.name}</p>
              <p><strong>Program:</strong> {payDialog.payment?.student?.program?.name}</p>
              <p><strong>University Fee Amount:</strong> ₹{payDialog.payment?.amount.toLocaleString()}</p>
              <p><strong>Billing Cycle:</strong> {payDialog.payment?.semesterOrYear}</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="refNo">Reference / Transaction Number</Label>
              <Input
                id="refNo"
                value={form.referenceNo}
                onChange={(e) => setForm(f => ({ ...f, referenceNo: e.target.value }))}
                placeholder="e.g. TXN982741982"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="payDate">Payment Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="payDate"
                  type="date"
                  value={form.paidAt}
                  onChange={(e) => setForm(f => ({ ...f, paidAt: e.target.value }))}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="proof">Upload Receipt / Screenshot (Optional)</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="proof"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      setForm(f => ({ ...f, screenshot: files[0] }));
                    }
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 h-10 border-dashed"
                  onClick={() => document.getElementById('proof')?.click()}
                >
                  <Upload className="w-4 h-4" />
                  {form.screenshot ? form.screenshot.name : 'Select file'}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog({ open: false, payment: null })}>Cancel</Button>
            <Button onClick={handlePaySubmit} disabled={submitting || !form.referenceNo}>
              {submitting ? 'Submitting...' : 'Mark Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
