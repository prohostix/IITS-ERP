import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Plus, Receipt, IndianRupee } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

export function FinanceNoWalletReportPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Dialog states
  const [receiptDialog, setReceiptDialog] = useState<{ open: boolean, enrId: string | null }>({ open: false, enrId: null });
  const [extraFeeDialog, setExtraFeeDialog] = useState<{ open: boolean, enrId: string | null }>({ open: false, enrId: null });
  
  // Forms
  const [receiptForm, setReceiptForm] = useState({ amount: '', paymentMode: 'Direct to University', referenceNo: '', remarks: '', receiptDate: new Date().toISOString().split('T')[0] });
  const [extraFeeForm, setExtraFeeForm] = useState({ amount: '', reason: '' });

  // Filters
  const [universityId, setUniversityId] = useState('all');
  const [programId, setProgramId] = useState('all');
  const [branchId, setBranchId] = useState('all');

  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);

  useEffect(() => { 
    fetchLogs(); 
  }, [search, universityId, programId, branchId]);

  useEffect(() => {
    api.get('/operations/universities').then(r => setUniversities(r.data.data || [])).catch(() => {});
    api.get('/operations/programs').then(r => setPrograms(r.data.data || [])).catch(() => {});
    api.get('/operations/centers').then(r => setCenters(r.data.data || [])).catch(() => {});
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/student-payments', { 
        params: { search, universityId, programId, branchId, isNoWallet: 'true' } 
      });
      setLogs(res.data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordReceipt = async () => {
    if (!receiptDialog.enrId) return;
    try {
      await api.post(`/finance/student-payments/${receiptDialog.enrId}/receipt`, receiptForm);
      toast.success('Receipt recorded successfully');
      setReceiptDialog({ open: false, enrId: null });
      setReceiptForm({ amount: '', paymentMode: 'Direct to University', referenceNo: '', remarks: '', receiptDate: new Date().toISOString().split('T')[0] });
      fetchLogs();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to record receipt');
    }
  };

  const handleAddExtraFee = async () => {
    if (!extraFeeDialog.enrId) return;
    try {
      await api.post(`/finance/student-payments/${extraFeeDialog.enrId}/extra-fee`, extraFeeForm);
      toast.success('Extra fee added successfully');
      setExtraFeeDialog({ open: false, enrId: null });
      setExtraFeeForm({ amount: '', reason: '' });
      fetchLogs();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to add extra fee');
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">No Wallet Report</h2>
          <p className="text-sm text-slate-500 mt-1">Details of payments made directly to the university by centers</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, enrollment..." 
              className="pl-8 w-[250px] bg-white"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchLogs()}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm">
        <Select value={universityId} onValueChange={setUniversityId}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Universities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Universities</SelectItem>
            {universities.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Programs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Branches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {centers.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="rounded-md border bg-white">
            <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-xs text-muted-foreground uppercase tracking-wider bg-slate-50/50">
              <div className="col-span-4 pl-8">Student Details</div>
              <div className="col-span-3">Program</div>
              <div className="col-span-1 text-right">Total Fee</div>
              <div className="col-span-2 text-right">Amount Received</div>
              <div className="col-span-1 text-right">Balance</div>
              <div className="col-span-1 text-center">Status</div>
            </div>
            
            <div className="divide-y">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading payments...</div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No records found.</div>
              ) : (
                logs.map(enr => (
                  <div key={enr.id} className="flex flex-col">
                    <div 
                      className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => toggleRow(enr.id)}
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200">
                          {expandedRows[enr.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <div>
                          <div className="font-medium text-sm text-slate-900">{enr.studentName}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{enr.enrollmentNumber || 'No Enrollment No.'}</div>
                          {enr.paymentType && <Badge variant="outline" className="text-[10px] mt-1 bg-amber-50 text-amber-700">{enr.paymentType.replace(/_/g, ' ')}</Badge>}
                        </div>
                      </div>
                      <div className="col-span-3 text-sm">
                        <div className="font-medium">{enr.program?.name}</div>
                        <div className="text-xs text-slate-500">{enr.program?.universityId ? universities.find(u => u.id === enr.program.universityId)?.name : ''}</div>
                      </div>
                      <div className="col-span-1 text-right text-sm font-medium">₹{enr.totalFee}</div>
                      <div className="col-span-2 text-right text-sm font-medium text-green-600">₹{enr.received}</div>
                      <div className="col-span-1 text-right text-sm font-medium text-amber-600">₹{enr.balance}</div>
                      <div className="col-span-1 text-center">
                        <Badge variant="outline" className={
                          enr.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' :
                          enr.status === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }>
                          {enr.status}
                        </Badge>
                      </div>
                    </div>

                    {expandedRows[enr.id] && (
                      <div className="bg-slate-50 p-4 border-t shadow-inner border-b">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Receipts</h4>
                              <Button size="sm" variant="outline" className="h-7 text-xs bg-white" onClick={() => setReceiptDialog({ open: true, enrId: enr.id })}>
                                <Plus className="w-3 h-3 mr-1" /> Add Receipt
                              </Button>
                            </div>
                            {enr.receipts && enr.receipts.length > 0 ? (
                              <div className="space-y-2">
                                {enr.receipts.map((rcpt: any) => (
                                  <div key={rcpt.id} className="flex items-center justify-between p-2.5 bg-white rounded-md border border-slate-200 text-sm">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-green-100 p-1.5 rounded-full"><Receipt className="w-3.5 h-3.5 text-green-700" /></div>
                                      <div>
                                        <div className="font-medium">₹{rcpt.amount}</div>
                                        <div className="text-xs text-slate-500">{new Date(rcpt.receiptDate).toLocaleDateString()} &middot; {rcpt.paymentMode}</div>
                                      </div>
                                    </div>
                                    {rcpt.referenceNo && <div className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">Ref: {rcpt.referenceNo}</div>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-slate-500 italic p-3 text-center border border-dashed rounded-md bg-white/50">No receipts recorded yet</div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fee Breakdown</h4>
                              <Button size="sm" variant="outline" className="h-7 text-xs bg-white" onClick={() => setExtraFeeDialog({ open: true, enrId: enr.id })}>
                                <Plus className="w-3 h-3 mr-1" /> Add Extra Fee
                              </Button>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm p-2 bg-white rounded border">
                                <span className="text-slate-600">Base Fee</span>
                                <span className="font-medium">₹{enr.baseFee}</span>
                              </div>
                              {enr.extraFees?.map((ef: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-sm p-2 bg-amber-50/50 border-amber-100 rounded border">
                                  <span className="text-slate-600">{ef.reason}</span>
                                  <span className="font-medium text-amber-700">+₹{ef.amount}</span>
                                </div>
                              ))}
                              <div className="flex justify-between text-sm p-2 bg-slate-100 font-semibold rounded border border-slate-200">
                                <span>Total Fee</span>
                                <span>₹{enr.totalFee}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Record Receipt Dialog */}
      <Dialog open={receiptDialog.open} onOpenChange={(open) => setReceiptDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment Receipt</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input type="number" className="pl-9" value={receiptForm.amount} onChange={e => setReceiptForm(prev => ({ ...prev, amount: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={receiptForm.paymentMode} onValueChange={v => setReceiptForm(prev => ({ ...prev, paymentMode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Direct to University">Direct to University</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={receiptForm.receiptDate} onChange={e => setReceiptForm(prev => ({ ...prev, receiptDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input placeholder="Txn ID, Cheque No, etc." value={receiptForm.referenceNo} onChange={e => setReceiptForm(prev => ({ ...prev, referenceNo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input value={receiptForm.remarks} onChange={e => setReceiptForm(prev => ({ ...prev, remarks: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptDialog({ open: false, enrId: null })}>Cancel</Button>
            <Button onClick={handleRecordReceipt}>Save Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Extra Fee Dialog */}
      <Dialog open={extraFeeDialog.open} onOpenChange={(open) => setExtraFeeDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Extra Fee</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input type="number" className="pl-9" value={extraFeeForm.amount} onChange={e => setExtraFeeForm(prev => ({ ...prev, amount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason / Description</Label>
              <Input placeholder="e.g. Late fee, Book fee" value={extraFeeForm.reason} onChange={e => setExtraFeeForm(prev => ({ ...prev, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtraFeeDialog({ open: false, enrId: null })}>Cancel</Button>
            <Button onClick={handleAddExtraFee}>Add Fee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
