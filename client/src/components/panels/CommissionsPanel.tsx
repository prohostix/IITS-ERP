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
import { FinanceCommissionUniversityReportPanel } from './FinanceCommissionUniversityReportPanel';

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
    tdsPercentage: '10',
    tdsAmount: '',
    paymentDetails: '',
    centerPayoutAmount: ''
  });

  // Mark paid dialog
  const [payItem, setPayItem] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    tdsPercentage: '0',
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
    const diff = item.expectedAmount - item.receivedAmount;
    const gross = diff > 0 ? diff : item.expectedAmount;
    const defaultPct = 10;
    const defaultTds = Math.round((gross * defaultPct) / 100);
    setReceiveForm({
      receivedAmount: String(gross),
      tdsPercentage: String(defaultPct),
      tdsAmount: String(defaultTds),
      paymentDetails: '',
      centerPayoutAmount: '0'
    });
  };

  const handleReceive = async () => {
    const gross = Number(receiveForm.receivedAmount);
    if (!receiveForm.receivedAmount || isNaN(gross) || gross <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    const tdsPct = Number(receiveForm.tdsPercentage || 0);
    const tdsAmt = receiveForm.tdsAmount !== '' ? Number(receiveForm.tdsAmount) : Math.round((gross * tdsPct) / 100);
    const net = gross - tdsAmt;

    try {
      await api.post(`/commissions/in/${receiveItem.id}/receive`, {
        receivedAmount: gross,
        grossAmount: gross,
        tdsPercentage: tdsPct,
        tdsAmount: tdsAmt,
        netAmount: net,
        paymentDetails: receiveForm.paymentDetails,
        centerPayoutAmount: receiveForm.centerPayoutAmount
      });
      toast.success('Commission marked as received from university');
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
      tdsPercentage: '0',
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
  const totalInTds = commIn.reduce((s, x) => s + (x.tdsAmount || 0), 0);
  const totalInNet = commIn.reduce((s, x) => s + (x.netAmount ?? (x.receivedAmount - (x.tdsAmount || 0))), 0);
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
            {totalInTds > 0 && (
              <p className="text-[11px] text-amber-700 font-medium mt-1">
                TDS: -₹{totalInTds.toLocaleString('en-IN')} | Net: ₹{totalInNet.toLocaleString('en-IN')}
              </p>
            )}
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
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 max-w-xl">
          <TabsTrigger value="comm-in" className="flex items-center gap-1.5">
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" /> Commission In (Earnings)
          </TabsTrigger>
          <TabsTrigger value="comm-out" className="flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4 text-rose-500" /> Commission Out (Payouts)
          </TabsTrigger>
          <TabsTrigger value="comm-univ-report" className="flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-indigo-500" /> Against University Report
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
<div className="overflow-x-auto w-full">
<table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Student Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Program</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">University</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Study Center</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Expected Commission</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Received (Gross)</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">TDS Deducted</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Net in Bank</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Received Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {commIn.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium whitespace-nowrap">
                            {item.enrollment?.studentName || '-'}
                            {item.title && <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.title}</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{item.enrollment?.program?.name || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{item.enrollment?.program?.university?.name || '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{item.enrollment?.studyCenter?.name || '-'}</td>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap">₹{item.expectedAmount.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap">
                            {item.receivedAmount > 0 ? `₹${item.receivedAmount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-amber-700 text-xs">
                            {item.tdsAmount > 0 ? (
                              <span>₹{item.tdsAmount.toLocaleString('en-IN')} <span className="text-[10px] text-muted-foreground">({item.tdsPercentage || 0}%)</span></span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap text-emerald-700 text-xs">
                            {item.receivedAmount > 0 ? `₹${(item.netAmount ?? (item.receivedAmount - (item.tdsAmount || 0))).toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant="secondary" className={item.status === 'received' ? 'bg-green-100 text-green-800 capitalize' : (item.receivedAmount > 0 ? 'bg-blue-100 text-blue-800 capitalize' : 'bg-amber-100 text-amber-800 capitalize')}>
                              {item.receivedAmount > 0 && item.status === 'pending' ? 'Partial' : item.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(item.receivedAt)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.expectedAmount > item.receivedAmount && (
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
<div className="overflow-x-auto w-full">
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
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">Gross: ₹{item.amount.toLocaleString('en-IN')}</div>
                            {item.status === 'paid' && (
                              <div className="text-xs text-slate-500 mt-1">
                                TDS: ₹{item.tdsAmount || 0} ({item.netAmount ? ((item.tdsAmount/item.amount)*100).toFixed(0) : 0}%)<br/>
                                Net: <span className="font-medium text-slate-700">₹{item.netAmount?.toLocaleString('en-IN') || item.amount.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                          </td>
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comm-univ-report" className="pt-4">
          <FinanceCommissionUniversityReportPanel />
        </TabsContent>
      </Tabs>

      {/* Mark Received Dialog */}
      <Dialog open={!!receiveItem} onOpenChange={() => setReceiveItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Commission Received from University</DialogTitle>
            {receiveItem && (
              <DialogDescription className="text-xs">
                {receiveItem.enrollment?.studentName} • {receiveItem.enrollment?.program?.university?.name || 'University'}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Gross Commission Amount (₹)</Label>
              <Input
                type="number"
                value={receiveForm.receivedAmount}
                onChange={e => {
                  const val = e.target.value;
                  const gross = Number(val) || 0;
                  const pct = Number(receiveForm.tdsPercentage || 0);
                  const newTds = Math.round((gross * pct) / 100);
                  setReceiveForm(f => ({ ...f, receivedAmount: val, tdsAmount: String(newTds) }));
                }}
                placeholder="e.g. 15000"
              />
              <span className="text-[11px] text-muted-foreground">Expected: ₹{receiveItem?.expectedAmount?.toLocaleString('en-IN')} (Remaining: ₹{((receiveItem?.expectedAmount || 0) - (receiveItem?.receivedAmount || 0)).toLocaleString('en-IN')})</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>TDS Deducted by University (%)</Label>
                <div className="flex gap-1">
                  {[0, 5, 10].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        const gross = Number(receiveForm.receivedAmount) || 0;
                        const newTds = Math.round((gross * p) / 100);
                        setReceiveForm(f => ({ ...f, tdsPercentage: String(p), tdsAmount: String(newTds) }));
                      }}
                      className={cn(
                        "px-2 py-0.5 text-xs rounded border transition-colors",
                        receiveForm.tdsPercentage === String(p)
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="number"
                    value={receiveForm.tdsPercentage}
                    onChange={e => {
                      const pct = e.target.value;
                      const gross = Number(receiveForm.receivedAmount) || 0;
                      const newTds = Math.round((gross * (Number(pct) || 0)) / 100);
                      setReceiveForm(f => ({ ...f, tdsPercentage: pct, tdsAmount: String(newTds) }));
                    }}
                    placeholder="TDS % (e.g. 10)"
                  />
                  <span className="text-[10px] text-muted-foreground">TDS Rate %</span>
                </div>
                <div>
                  <Input
                    type="number"
                    value={receiveForm.tdsAmount}
                    onChange={e => {
                      const tdsVal = e.target.value;
                      const gross = Number(receiveForm.receivedAmount) || 0;
                      const calcPct = gross > 0 ? ((Number(tdsVal) / gross) * 100).toFixed(1) : '0';
                      setReceiveForm(f => ({ ...f, tdsAmount: tdsVal, tdsPercentage: calcPct }));
                    }}
                    placeholder="TDS Amount (₹)"
                  />
                  <span className="text-[10px] text-muted-foreground">TDS Amount (₹)</span>
                </div>
              </div>
            </div>

            {receiveForm.receivedAmount && !isNaN(Number(receiveForm.receivedAmount)) && (
              <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-700 space-y-1.5 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-600">Gross Commission Settled:</span>
                  <span className="font-semibold text-slate-900">₹{Number(receiveForm.receivedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>TDS Deducted ({receiveForm.tdsPercentage}%):</span>
                  <span className="font-medium">-₹{(Number(receiveForm.tdsAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-200 pt-1 mt-1 text-emerald-700">
                  <span>Net Received in Bank:</span>
                  <span>₹{(Math.max(0, Number(receiveForm.receivedAmount) - (Number(receiveForm.tdsAmount) || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

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
              <Label>Payment Details / UTR Reference</Label>
              <Input
                value={receiveForm.paymentDetails}
                onChange={e => setReceiveForm(f => ({ ...f, paymentDetails: e.target.value }))}
                placeholder="e.g. NEFT/UTR-123456, Bank Ref"
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
              <Label>Gross Payout Amount (INR)</Label>
              <Input
                type="number"
                value={payForm.amount}
                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 5000"
              />
            </div>
            <div className="space-y-1">
              <Label>TDS Percentage (%)</Label>
              <Input
                type="number"
                value={payForm.tdsPercentage}
                onChange={e => setPayForm(f => ({ ...f, tdsPercentage: e.target.value }))}
                placeholder="e.g. 10"
              />
            </div>
            {payForm.amount && !isNaN(Number(payForm.amount)) && (
              <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-700 space-y-1 border border-slate-100">
                <div className="flex justify-between">
                  <span>Gross Amount:</span>
                  <span className="font-medium">₹{Number(payForm.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>TDS Deduction:</span>
                  <span>-₹{((Number(payForm.amount) * Number(payForm.tdsPercentage || 0)) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-200 pt-1 mt-1">
                  <span>Net Amount Payable:</span>
                  <span>₹{(Number(payForm.amount) - ((Number(payForm.amount) * Number(payForm.tdsPercentage || 0)) / 100)).toFixed(2)}</span>
                </div>
              </div>
            )}
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
