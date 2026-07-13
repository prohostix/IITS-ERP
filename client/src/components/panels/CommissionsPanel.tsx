import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDownLeft, ArrowUpRight, Landmark, Receipt } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export function CommissionsPanel() {
  const [commIn, setCommIn] = useState<any[]>([]);
  const [commOut, setCommOut] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [universityFilter, setUniversityFilter] = useState('');
  const [centerFilter, setCenterFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Mark received dialog
  const [receiveItem, setReceiveItem] = useState<any | null>(null);
  const [receiveForm, setReceiveForm] = useState({
    receivedAmount: '',
    paymentDetails: '',
    centerPayoutAmount: ''
  });

  // Mark paid dialog
  const [payItem, setPayItem] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentDetails: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (universityFilter && universityFilter !== 'all') q.append('universityId', universityFilter);
      if (centerFilter && centerFilter !== 'all') q.append('centerId', centerFilter);

      const [inRes, outRes] = await Promise.all([
        api.get(`/commissions/in?${q.toString()}`),
        api.get(`/commissions/out?${q.toString()}`)
      ]);
      setCommIn(inRes.data.data || []);
      setCommOut(outRes.data.data || []);
    } catch (_ignored) {
      toast.error('Failed to load commissions data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUniversities();
    fetchCenters();
  }, [universityFilter, centerFilter]);

  const fetchUniversities = async () => {
    try {
      const res = await api.get('/operations/universities');
      setUniversities(res.data.data || []);
    } catch (err) {}
  };

  const fetchCenters = async () => {
    try {
      const res = await api.get('/operations/centers');
      setCenters(res.data.data || []);
    } catch (err) {}
  };

  const openReceive = (item: any) => {
    setReceiveItem(item);
    setReceiveForm({
      receivedAmount: String(item.expectedAmount),
      paymentDetails: '',
      centerPayoutAmount: '0'
    });
  };

  const handleReceive = async () => {
    if (!receiveForm.receivedAmount || isNaN(Number(receiveForm.receivedAmount))) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      await api.post(`/commissions/in/${receiveItem.id}/receive`, receiveForm);
      toast.success('Commission in marked as received');
      setReceiveItem(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit');
    }
  };

  const openPay = (item: any) => {
    setPayItem(item);
    setPayForm({
      amount: String(item.amount),
      paymentDetails: ''
    });
  };

  const handlePay = async () => {
    if (!payForm.amount || isNaN(Number(payForm.amount))) {
      toast.error('Please enter a valid amount');
      return;
    }
    try {
      await api.post(`/commissions/out/${payItem.id}/pay`, payForm);
      toast.success('Commission payout marked as paid');
      setPayItem(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit');
    }
  };

  const totalInExpected = commIn.reduce((s, x) => s + x.expectedAmount, 0);
  const totalInReceived = commIn.reduce((s, x) => s + x.receivedAmount, 0);
  const totalOutExpected = commOut.reduce((s, x) => s + x.amount, 0);
  const totalOutPaid = commOut.filter(x => x.status === 'paid').reduce((s, x) => s + x.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Commissions</h2>
          <p className="text-muted-foreground text-sm">Track university referral earnings and study center payouts</p>
        </div>
        <div className="flex gap-2">
          <Select value={universityFilter} onValueChange={setUniversityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Universities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Universities</SelectItem>
              {universities.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={centerFilter} onValueChange={setCenterFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Centers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Centers</SelectItem>
              {centers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Expected Commission In</CardTitle>
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">₹{totalInExpected.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Received Commission In</CardTitle>
            <Landmark className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-700">₹{totalInReceived.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Expected Commission Out</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-rose-600">₹{totalOutExpected.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Paid Commission Out</CardTitle>
            <Receipt className="w-4 h-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-rose-700">₹{totalOutPaid.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="comm-in" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="comm-in" className="flex items-center gap-1.5">
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" /> Commission In (Earnings)
          </TabsTrigger>
          <TabsTrigger value="comm-out" className="flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4 text-rose-500" /> Commission Out (Payouts)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comm-in" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Commission In</CardTitle>
              <CardDescription>Commissions we earn from university student enrollments</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading Commission In...</div>
              ) : commIn.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No commission entries found. Enrollments with commission configured will populate here.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Student Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Program</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Study Center</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Expected Commission</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Received Commission</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Received Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {commIn.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{item.enrollment?.studentName || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{item.enrollment?.program?.name || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{item.enrollment?.studyCenter?.name || '-'}</td>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap">₹{item.expectedAmount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap">
                            {item.status === 'received' ? `₹${item.receivedAmount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant="secondary" className={item.status === 'received' ? 'bg-green-100 text-green-800 capitalize' : 'bg-amber-100 text-amber-800 capitalize'}>
                              {item.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(item.receivedAt)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.status === 'pending' && (
                              <Button size="sm" variant="default" onClick={() => openReceive(item)} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1">
                                Mark Received
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comm-out" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Commission Out</CardTitle>
              <CardDescription>Payouts to study centers against received commissions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading Commission Out...</div>
              ) : commOut.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No payout records found. Once you receive commissions, payouts can be processed.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Study Center</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Student Reference</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Program</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Payout Amount</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Paid Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {commOut.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{item.studyCenter?.name || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {item.commissionIn?.enrollment?.studentName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.commissionIn?.enrollment?.program?.name || '-'}
                          </td>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap">₹{item.amount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant="secondary" className={item.status === 'paid' ? 'bg-green-100 text-green-800 capitalize' : 'bg-amber-100 text-amber-800 capitalize'}>
                              {item.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(item.paidAt)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.status === 'pending' && (
                              <Button size="sm" variant="destructive" onClick={() => openPay(item)} className="flex items-center gap-1">
                                Pay Center
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mark Received Dialog */}
      <Dialog open={!!receiveItem} onOpenChange={() => setReceiveItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Commission Received</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Received Amount (INR)</Label>
              <Input
                type="number"
                value={receiveForm.receivedAmount}
                onChange={e => setReceiveForm(f => ({ ...f, receivedAmount: e.target.value }))}
                placeholder="e.g. 15000"
              />
            </div>
            <div className="space-y-1">
              <Label>Center Payout Amount (INR) <span className="text-muted-foreground text-xs">(optional center share)</span></Label>
              <Input
                type="number"
                value={receiveForm.centerPayoutAmount}
                onChange={e => setReceiveForm(f => ({ ...f, centerPayoutAmount: e.target.value }))}
                placeholder="e.g. 5000"
              />
            </div>
            <div className="space-y-1">
              <Label>Payment Details / Remarks</Label>
              <Input
                value={receiveForm.paymentDetails}
                onChange={e => setReceiveForm(f => ({ ...f, paymentDetails: e.target.value }))}
                placeholder="Transaction ID, bank details..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveItem(null)}>Cancel</Button>
            <Button onClick={handleReceive} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={!!payItem} onOpenChange={() => setPayItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Center Payout Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Payout Amount (INR)</Label>
              <Input
                type="number"
                value={payForm.amount}
                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 5000"
              />
            </div>
            <div className="space-y-1">
              <Label>Payment details / Remarks</Label>
              <Input
                value={payForm.paymentDetails}
                onChange={e => setPayForm(f => ({ ...f, paymentDetails: e.target.value }))}
                placeholder="Transaction ID, IMPS/NEFT reference..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayItem(null)}>Cancel</Button>
            <Button onClick={handlePay} className="bg-rose-600 hover:bg-rose-700 text-white">Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
