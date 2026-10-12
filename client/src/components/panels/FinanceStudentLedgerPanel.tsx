import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Search, ArrowLeft, RefreshCw, Download, Printer, Plus,
  CreditCard, CheckCircle2, Clock, AlertCircle, User,
  Building2, GraduationCap, Phone, Mail, FileText, ArrowDownLeft,
  ArrowUpRight, IndianRupee, Eye, Receipt
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { toast } from 'sonner';

export function FinanceStudentLedgerPanel({ initialStudentId }: { initialStudentId?: string } = {}) {
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Mode: list vs details
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId || null);

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
    }
  }, [initialStudentId]);

  // Student directory
  const [students, setStudents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [search, setSearch] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('all');
  const [selectedUniversity, setSelectedUniversity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Filter options
  const [centers, setCenters] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);

  // Detailed Ledger state
  const [ledgerData, setLedgerData] = useState<any | null>(null);

  // Receipt recording dialog
  const [receiptDialog, setReceiptDialog] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    amount: '',
    paymentMode: 'Bank Transfer',
    referenceNo: '',
    remarks: '',
    receiptDate: new Date().toISOString().split('T')[0]
  });
  const [submittingReceipt, setSubmittingReceipt] = useState(false);

  // Extra fee dialog
  const [extraFeeDialog, setExtraFeeDialog] = useState(false);
  const [extraFeeForm, setExtraFeeForm] = useState({
    amount: '',
    reason: ''
  });
  const [submittingExtraFee, setSubmittingExtraFee] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
    fetchStudentList();
  }, []);

  useEffect(() => {
    fetchStudentList();
  }, [selectedCenter, selectedUniversity, selectedStatus]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchLedgerDetails(selectedStudentId);
    }
  }, [selectedStudentId]);

  const fetchFilterOptions = async () => {
    try {
      const [cRes, uRes] = await Promise.all([
        api.get('/operations/centers'),
        api.get('/operations/universities')
      ]);
      setCenters(cRes.data.data || []);
      setUniversities(uRes.data.data || []);
    } catch (_e) {}
  };

  const fetchStudentList = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedCenter && selectedCenter !== 'all') q.append('centerId', selectedCenter);
      if (selectedUniversity && selectedUniversity !== 'all') q.append('universityId', selectedUniversity);
      if (selectedStatus && selectedStatus !== 'all') q.append('status', selectedStatus);
      if (search) q.append('search', search);

      const res = await api.get(`/finance/student-ledger?${q.toString()}`);
      if (res.data.success) {
        setStudents(res.data.data.students || []);
        setSummary(res.data.data.summary || {});
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to fetch student ledger list');
    } finally {
      setLoading(false);
    }
  };

  const fetchLedgerDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const res = await api.get(`/finance/student-ledger/${id}`);
      if (res.data.success) {
        setLedgerData(res.data.data);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to fetch student ledger statement');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRecordReceipt = async () => {
    if (!ledgerData?.student?.enrollmentId) return;
    if (!receiptForm.amount || isNaN(Number(receiptForm.amount)) || Number(receiptForm.amount) <= 0) {
      toast.error('Please enter a valid receipt amount');
      return;
    }

    setSubmittingReceipt(true);
    try {
      await api.post(`/finance/student-payments/${ledgerData.student.enrollmentId}/receipt`, receiptForm);
      toast.success('Payment receipt recorded and ledger updated');
      setReceiptDialog(false);
      setReceiptForm({
        amount: '',
        paymentMode: 'Bank Transfer',
        referenceNo: '',
        remarks: '',
        receiptDate: new Date().toISOString().split('T')[0]
      });
      fetchLedgerDetails(selectedStudentId!);
      fetchStudentList();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to record receipt');
    } finally {
      setSubmittingReceipt(false);
    }
  };

  const handleAddExtraFee = async () => {
    if (!ledgerData?.student?.enrollmentId) return;
    if (!extraFeeForm.amount || isNaN(Number(extraFeeForm.amount)) || Number(extraFeeForm.amount) <= 0) {
      toast.error('Please enter a valid extra fee amount');
      return;
    }

    setSubmittingExtraFee(true);
    try {
      await api.post(`/finance/student-payments/${ledgerData.student.enrollmentId}/extra-fee`, extraFeeForm);
      toast.success('Extra fee added to student ledger');
      setExtraFeeDialog(false);
      setExtraFeeForm({ amount: '', reason: '' });
      fetchLedgerDetails(selectedStudentId!);
      fetchStudentList();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to add extra fee');
    } finally {
      setSubmittingExtraFee(false);
    }
  };

  const handleExportStatementCSV = () => {
    if (!ledgerData || !ledgerData.ledgerEntries?.length) {
      toast.error('No ledger entries to export');
      return;
    }

    const headers = [
      'Date', 'Type', 'Category', 'Description', 'Reference No', 'Payment Mode',
      'Debit (INR)', 'Credit (INR)', 'Running Balance (INR)', 'Recorded By', 'Remarks'
    ];

    const rows = ledgerData.ledgerEntries.map((e: any) => [
      `"${new Date(e.date).toLocaleDateString('en-IN')}"`,
      `"${e.type.toUpperCase()}"`,
      `"${e.category}"`,
      `"${e.description}"`,
      `"${e.referenceNo || ''}"`,
      `"${e.paymentMode || ''}"`,
      e.debit || 0,
      e.credit || 0,
      e.runningBalance || 0,
      `"${e.recordedBy || ''}"`,
      `"${e.remarks || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Student_Ledger_${ledgerData.student.enrollmentNumber || 'student'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Statement CSV exported');
  };

  const handlePrint = () => {
    window.print();
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DETAIL VIEW (Statement of Account for Selected Student)
  // ══════════════════════════════════════════════════════════════════════════
  if (selectedStudentId) {
    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedStudentId(null); setLedgerData(null); }}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Students
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Student Statement of Account
              </h2>
              <p className="text-xs text-slate-500">
                Official financial ledger statement of debits, credits, and running balance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLedgerDetails(selectedStudentId)}
              disabled={loadingDetails}
              className="gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDetails ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => setReceiptDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <Receipt className="w-4 h-4" /> Record Payment Receipt
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExtraFeeDialog(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Extra Fee
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportStatementCSV} className="gap-1.5">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" /> Print Statement
            </Button>
          </div>
        </div>

        {loadingDetails || !ledgerData ? (
          <div className="p-16 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
            Loading complete student financial ledger...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Student Profile Card */}
            <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-slate-50/50 via-white to-indigo-50/20">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg shadow-sm">
                      {ledgerData.student.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900">{ledgerData.student.name}</h3>
                        <Badge
                          variant="secondary"
                          className={
                            ledgerData.summary.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 capitalize'
                              : ledgerData.summary.status === 'partial'
                              ? 'bg-blue-100 text-blue-800 capitalize'
                              : 'bg-amber-100 text-amber-800 capitalize'
                          }
                        >
                          {ledgerData.summary.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        <div><span className="font-semibold text-slate-700">Enrollment No:</span> {ledgerData.student.enrollmentNumber}</div>
                        {ledgerData.student.uniEnrollmentNumber && ledgerData.student.uniEnrollmentNumber !== 'N/A' && (
                          <div><span className="font-semibold text-slate-700">Uni Roll:</span> {ledgerData.student.uniEnrollmentNumber}</div>
                        )}
                        <div><span className="font-semibold text-slate-700">Program:</span> {ledgerData.student.programName}</div>
                        <div><span className="font-semibold text-slate-700">University:</span> {ledgerData.student.universityName}</div>
                        <div><span className="font-semibold text-slate-700">Center:</span> {ledgerData.student.centerName}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 text-xs text-slate-400 mt-1">
                        <div><Phone className="w-3 h-3 inline mr-1" />{ledgerData.student.phone}</div>
                        <div><Mail className="w-3 h-3 inline mr-1" />{ledgerData.student.email}</div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Financial Pill Strip */}
                  <div className="grid grid-cols-3 gap-3 border rounded-xl p-3 bg-white shadow-sm min-w-[320px]">
                    <div className="text-center">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Debits</div>
                      <div className="text-lg font-bold text-slate-900">₹{ledgerData.summary.totalDebit.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="text-center border-x px-2">
                      <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Total Credits</div>
                      <div className="text-lg font-bold text-emerald-700">₹{ledgerData.summary.totalCredit.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Balance Due</div>
                      <div className={`text-lg font-bold ${ledgerData.summary.closingBalance <= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        ₹{Math.max(0, ledgerData.summary.closingBalance).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statement of Account Table */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Chronological Ledger Statement
                  </CardTitle>
                  <CardDescription>
                    Complete transaction journal showing all fee assessments, invoice charges, payments, and running balance.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {ledgerData.ledgerEntries?.length || 0} Transactions
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-center">Type</th>
                        <th className="px-4 py-3 text-left">Transaction Details</th>
                        <th className="px-4 py-3 text-left">Reference / Mode</th>
                        <th className="px-4 py-3 text-right">Debit (INR)</th>
                        <th className="px-4 py-3 text-right">Credit (INR)</th>
                        <th className="px-4 py-3 text-right">Running Balance</th>
                        <th className="px-4 py-3 text-left">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerData.ledgerEntries.map((e: any) => (
                        <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                            {new Date(e.date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant="outline"
                              className={
                                e.type === 'debit'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold text-[10px]'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[10px]'
                              }
                            >
                              {e.type.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{e.category}</div>
                            <div className="text-xs text-slate-500">{e.description}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            <div className="font-mono text-slate-700">{e.referenceNo || '-'}</div>
                            <div className="text-[10px] text-slate-400">{e.paymentMode || ''}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-rose-700 whitespace-nowrap">
                            {e.debit > 0 ? `₹${e.debit.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                            {e.credit > 0 ? `₹${e.credit.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            ₹{e.runningBalance.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {e.recordedBy}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/80 font-bold border-t text-xs text-slate-900">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right">Closing Financial Summary</td>
                        <td className="px-4 py-3 text-right text-rose-700">₹{ledgerData.summary.totalDebit.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right text-emerald-700">₹{ledgerData.summary.totalCredit.toLocaleString('en-IN')}</td>
                        <td className={`px-4 py-3 text-right ${ledgerData.summary.closingBalance <= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          ₹{ledgerData.summary.closingBalance.toLocaleString('en-IN')}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Record Receipt Modal */}
        {receiptDialog && (
          <Dialog open={receiptDialog} onOpenChange={setReceiptDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record Student Payment Receipt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1">
                  <div><span className="text-slate-500">Student:</span> <span className="font-semibold">{ledgerData?.student?.name}</span></div>
                  <div><span className="text-slate-500">Enrollment No:</span> <span className="font-semibold">{ledgerData?.student?.enrollmentNumber}</span></div>
                  <div>
                    <span className="text-slate-500">Outstanding Balance:</span>{' '}
                    <span className="font-bold text-amber-700">₹{ledgerData?.summary?.closingBalance?.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium">Receipt Amount (₹)</Label>
                  <Input
                    type="number"
                    value={receiptForm.amount}
                    onChange={e => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                    placeholder="Enter amount received"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Payment Mode</Label>
                  <Select
                    value={receiptForm.paymentMode}
                    onValueChange={v => setReceiptForm({ ...receiptForm, paymentMode: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer / NEFT</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Demand Draft">Demand Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium">Reference No / UTR / Cheque No</Label>
                  <Input
                    value={receiptForm.referenceNo}
                    onChange={e => setReceiptForm({ ...receiptForm, referenceNo: e.target.value })}
                    placeholder="e.g. UTR-982173618"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Receipt Date</Label>
                  <Input
                    type="date"
                    value={receiptForm.receiptDate}
                    onChange={e => setReceiptForm({ ...receiptForm, receiptDate: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Remarks</Label>
                  <Input
                    value={receiptForm.remarks}
                    onChange={e => setReceiptForm({ ...receiptForm, remarks: e.target.value })}
                    placeholder="e.g. Semester fee installment"
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReceiptDialog(false)}>Cancel</Button>
                <Button
                  onClick={handleRecordReceipt}
                  disabled={submittingReceipt}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submittingReceipt ? 'Recording...' : 'Record Payment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Extra Fee Modal */}
        {extraFeeDialog && (
          <Dialog open={extraFeeDialog} onOpenChange={setExtraFeeDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Extra Fee Charge</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-xs font-medium">Fee Amount (₹)</Label>
                  <Input
                    type="number"
                    value={extraFeeForm.amount}
                    onChange={e => setExtraFeeForm({ ...extraFeeForm, amount: e.target.value })}
                    placeholder="Fee amount to charge"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium">Reason / Category</Label>
                  <Input
                    value={extraFeeForm.reason}
                    onChange={e => setExtraFeeForm({ ...extraFeeForm, reason: e.target.value })}
                    placeholder="e.g., Late submission fine, Lab charges, Re-eval fee"
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setExtraFeeDialog(false)}>Cancel</Button>
                <Button
                  onClick={handleAddExtraFee}
                  disabled={submittingExtraFee}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {submittingExtraFee ? 'Adding...' : 'Add Fee Charge'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DIRECTORY VIEW (Searchable List of All Students with Ledger Summaries)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Student Ledger</h2>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Student Accounts
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Search any student to inspect their full statement of account, fee debits, receipts, and outstanding dues.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchStudentList} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Total Assessed Fees</CardTitle>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              ₹{(summary.totalAssessed || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">Total tuition and extra charges billed</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Total Collected</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              ₹{(summary.totalCollected || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {summary.collectionRate || 0}% Collection Efficiency
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Total Outstanding Balance</CardTitle>
            <Clock className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              ₹{(summary.totalOutstanding || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">Pending receivables from students</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Active Students</CardTitle>
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {summary.totalStudents || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">With registered financial accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-[200px]">
              <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
                <SelectTrigger>
                  <SelectValue placeholder="All Universities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Universities</SelectItem>
                  {universities.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[200px]">
              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Centers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Centers</SelectItem>
                  {centers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[160px]">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid in Full</SelectItem>
                  <SelectItem value="partial">Partially Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search student, enrollment, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchStudentList()}
              className="pl-8 text-xs h-9 bg-slate-50/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Student List Table */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">
            Student Accounts Directory
          </CardTitle>
          <CardDescription>
            Select any student below to open their comprehensive Statement of Account and transaction ledger.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading student ledger accounts...</div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No students match current search or filters.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Student Name</th>
                    <th className="px-4 py-3 text-left">Enrollment No</th>
                    <th className="px-4 py-3 text-left">University & Program</th>
                    <th className="px-4 py-3 text-left">Study Center</th>
                    <th className="px-4 py-3 text-right">Assessed Fee</th>
                    <th className="px-4 py-3 text-right">Total Paid</th>
                    <th className="px-4 py-3 text-right">Balance Due</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs">
                            {s.studentName?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <div>{s.studentName}</div>
                            <div className="text-[11px] text-slate-400">{s.studentPhone || s.studentEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-700">
                        <div>{s.enrollmentNumber}</div>
                        {s.uniEnrollmentNumber && s.uniEnrollmentNumber !== 'N/A' && (
                          <div className="text-[10px] text-slate-400">Uni: {s.uniEnrollmentNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800 text-xs">{s.programName}</div>
                        <div className="text-[11px] text-slate-400">{s.universityName}</div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <div>{s.studyCenterName}</div>
                        {s.studyCenterCode && (
                          <span className="text-[10px] text-slate-400 font-mono">({s.studyCenterCode})</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-900 whitespace-nowrap">
                        ₹{s.totalFee.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-emerald-700 whitespace-nowrap">
                        ₹{s.totalPaid.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold whitespace-nowrap">
                        <span className={s.balance <= 0 ? 'text-emerald-700' : 'text-amber-700'}>
                          ₹{Math.max(0, s.balance).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant="secondary"
                          className={
                            s.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 capitalize'
                              : s.status === 'partial'
                              ? 'bg-blue-100 text-blue-800 capitalize'
                              : 'bg-amber-100 text-amber-800 capitalize'
                          }
                        >
                          {s.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setSelectedStudentId(s.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs px-2.5 gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Ledger
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
