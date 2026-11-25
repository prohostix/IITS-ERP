import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Play, CheckCircle, Send, RefreshCw, Edit, Save, X, Download, TrendingUp, CheckSquare, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { canAccessPayroll } from '@/lib/payrollAccess';
import html2pdf from 'html2pdf.js';
import { PayslipDocument } from './hr/PayslipDocument';

interface Payroll {
  id: string;
  employeeId: any;
  user?: any;
  month: string;
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  status: string;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  bonus: number;
  overtime: number;
  arrears?: number;
  professionalTax?: number;
  labourWelfareFund?: number;
  tds?: number;
  remarks?: string;
  createdAt?: string;
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  processed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  transferred_to_finance: 'bg-purple-100 text-purple-700',
  paid: 'bg-emerald-100 text-emerald-700',
};

interface PayrollPanelProps {
  isEmployeeView?: boolean;
}

export function PayrollPanel({ isEmployeeView: isEmployeeViewProp = false }: PayrollPanelProps) {
  const { user } = useAuth();
  const canManagePayroll = canAccessPayroll(user);
  const isEmployeeView = isEmployeeViewProp || !canManagePayroll;

  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generateMode, setGenerateMode] = useState<'smart' | 'basic'>('smart');

  // Arrears Processing Dialog
  const [arrearsOpen, setArrearsOpen] = useState(false);
  const [arrearsSaving, setArrearsSaving] = useState(false);
  const [arrearsForm, setArrearsForm] = useState({
    employeeId: '',
    month: new Date().toISOString().slice(0, 7),
    mode: 'add' as 'add' | 'replace',
    oldMonthlySalary: '',
    newMonthlySalary: '',
    monthsCount: '1',
    amount: '',
    fromPeriod: '',
    toPeriod: '',
    reason: '',
  });

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editPayroll, setEditPayroll] = useState<Payroll | null>(null);
  const [editForm, setEditForm] = useState<any>({
    basicSalary: 0,
    allowances: { hra: 0, transport: 0, medical: 0, other: 0 },
    deductions: { pf: 0, tax: 0, insurance: 0, other: 0 },
    bonus: 0,
    overtime: 0,
    arrears: 0,
    professionalTax: 0,
    labourWelfareFund: 0,
    tds: 0,
    remarks: '',
  });
  const [editSaving, setEditSaving] = useState(false);

  // Batch Creation / Transfer to Finance
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchMonthFilter, setBatchMonthFilter] = useState<string>('all');
  const [transferRemarks, setTransferRemarks] = useState('');

  useEffect(() => {
    fetchPayrolls();
    if (!isEmployeeView) {
      fetchEmployees();
    }
  }, [isEmployeeView]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/users');
      const raw = res.data?.data || [];
      setEmployees(
        raw.filter((u: any) => !['ceo', 'org_admin', 'superadmin', 'center_admin', 'student'].includes(u.role))
      );
    } catch {
      // ignore
    }
  };

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const url = isEmployeeView && user?.id ? `/payroll?employeeId=${user.id}` : '/payroll';
      const res = await api.get(url);
      const rawPayrolls = res.data?.data || [];
      if (isEmployeeView && user?.id) {
        setPayrolls(
          rawPayrolls.filter((p: any) => {
            const pEmpId = p.employeeId?.id || p.user?.id || p.employeeId;
            return pEmpId === user.id;
          })
        );
      } else {
        setPayrolls(rawPayrolls);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch payrolls');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      const endpoint = generateMode === 'smart' ? '/payroll/generate-smart' : '/payroll/generate';
      const res = await api.post(endpoint, { month: generateMonth });
      const count = res.data.data?.length || 0;
      toast.success(`Generated ${count} payroll record(s) (including eligible resignation-month staff)`);
      if (res.data.errors?.length) {
        toast.warning(`${res.data.errors.length} employee(s) skipped (missing salary config)`);
      }
      setGenerateOpen(false);
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate');
    }
  };

  const handleProcessArrears = async () => {
    if (!arrearsForm.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    const amt = Number(arrearsForm.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Please enter a valid arrear amount greater than 0');
      return;
    }
    setArrearsSaving(true);
    try {
      const res = await api.post('/payroll/arrears', {
        employeeId: arrearsForm.employeeId,
        month: arrearsForm.month,
        amount: amt,
        mode: arrearsForm.mode,
        fromPeriod: arrearsForm.fromPeriod,
        toPeriod: arrearsForm.toPeriod,
        reason: arrearsForm.reason,
      });
      toast.success(res.data?.message || 'Salary arrears processed successfully');
      setArrearsOpen(false);
      setArrearsForm({
        employeeId: '',
        month: new Date().toISOString().slice(0, 7),
        mode: 'add',
        oldMonthlySalary: '',
        newMonthlySalary: '',
        monthsCount: '1',
        amount: '',
        fromPeriod: '',
        toPeriod: '',
        reason: '',
      });
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process salary arrears');
    } finally {
      setArrearsSaving(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await api.put(`/payroll/${id}/confirm`);
      toast.success('Payroll confirmed');
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to confirm');
    }
  };

  const handleConfirmAllDrafts = async () => {
    const drafts = filtered.filter(p => p.status === 'draft' || p.status === 'processed');
    if (drafts.length === 0) return;
    if (!confirm(`Confirm all ${drafts.length} draft payroll record(s)?`)) return;
    try {
      await Promise.all(drafts.map(d => api.put(`/payroll/${d.id}/confirm`)));
      toast.success(`Confirmed ${drafts.length} payroll record(s)`);
      fetchPayrolls();
    } catch {
      toast.error('Some payrolls failed to confirm');
      fetchPayrolls();
    }
  };

  const openEdit = (p: Payroll) => {
    setEditPayroll(p);
    setEditForm({
      basicSalary: p.basicSalary || 0,
      allowances: { hra: 0, transport: 0, medical: 0, other: 0, ...(p.allowances || {}) },
      deductions: { pf: 0, tax: 0, insurance: 0, other: 0, ...(p.deductions || {}) },
      bonus: p.bonus || 0,
      overtime: p.overtime || 0,
      arrears: p.arrears || 0,
      professionalTax: p.professionalTax || 0,
      labourWelfareFund: p.labourWelfareFund || 0,
      tds: p.tds || 0,
      remarks: p.remarks || '',
    });
    setEditOpen(true);
  };

  const calcGross = (f: any) =>
    Number(f.basicSalary || 0) +
    Object.values((f.allowances || {}) as Record<string, number>).reduce((s, v) => s + (Number(v) || 0), 0) +
    Number(f.bonus || 0) +
    Number(f.overtime || 0) +
    Number(f.arrears || 0);

  const calcTotalDeductions = (f: any) => {
    const dedObj = (f.deductions || {}) as Record<string, number>;
    let sum = Number(f.professionalTax || 0) + Number(f.labourWelfareFund || 0) + Number(f.tds || 0);
    Object.entries(dedObj).forEach(([k, v]) => {
      if (k === 'tax' && Number(f.tds || 0) > 0) return;
      sum += Number(v) || 0;
    });
    return sum;
  };

  const calcNet = (f: any) => Math.max(0, calcGross(f) - calcTotalDeductions(f));

  const [pdfPayroll, setPdfPayroll] = useState<Payroll | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const downloadPayslip = (p: Payroll) => {
    setPdfPayroll(p);
    setDownloadingPdf(true);
    setTimeout(() => {
      const element = document.getElementById(`payslip-${p.id}`);
      if (element) {
        html2pdf()
          .set({
            margin: [8, 8, 8, 8],
            filename: `Payslip_${p.month}_${p.employeeId?.name || p.user?.name || 'Employee'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              width: 710,
              windowWidth: 710,
              scrollX: 0,
              scrollY: 0,
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          })
          .from(element)
          .save()
          .then(() => setDownloadingPdf(false))
          .catch(() => {
            toast.error('Failed to generate PDF');
            setDownloadingPdf(false);
          });
      } else {
        setDownloadingPdf(false);
      }
    }, 150);
  };

  const handleEditSave = async () => {
    if (!editPayroll) return;
    setEditSaving(true);
    try {
      await api.put(`/payroll/${editPayroll.id}`, editForm);
      toast.success('Payroll updated');
      setEditOpen(false);
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setEditSaving(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedIds.length) {
      toast.error('Select at least one confirmed payroll');
      return;
    }
    try {
      const month =
        batchMonthFilter !== 'all'
          ? batchMonthFilter
          : payrolls.find(p => selectedIds.includes(p.id))?.month;
      await api.post('/payroll/transfer-to-finance', {
        payrollIds: selectedIds,
        month,
        remarks: transferRemarks,
      });
      toast.success(`Created payroll batch with ${selectedIds.length} payroll(s)`);
      setTransferOpen(false);
      setSelectedIds([]);
      setTransferRemarks('');
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Batch creation failed');
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));

  const availableMonths = useMemo(
    () => Array.from(new Set(payrolls.map(p => p.month).filter(Boolean))).sort().reverse(),
    [payrolls]
  );

  const filtered = useMemo(() => {
    return payrolls.filter(p => {
      if (activeTab !== 'all' && p.status !== activeTab) return false;
      if (monthFilter !== 'all' && p.month !== monthFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const name = (p.employeeId?.name || p.user?.name || '').toLowerCase();
        const email = (p.employeeId?.email || p.user?.email || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [payrolls, activeTab, monthFilter, searchQuery]);

  const confirmedPayrolls = useMemo(() => payrolls.filter(p => p.status === 'confirmed'), [payrolls]);
  const visibleConfirmed = useMemo(() => filtered.filter(p => p.status === 'confirmed'), [filtered]);
  const allVisibleConfirmedSelected =
    visibleConfirmed.length > 0 && visibleConfirmed.every(p => selectedIds.includes(p.id));

  const toggleSelectAllVisibleConfirmed = () => {
    if (allVisibleConfirmedSelected) {
      const visibleSet = new Set(visibleConfirmed.map(p => p.id));
      setSelectedIds(prev => prev.filter(id => !visibleSet.has(id)));
    } else {
      const next = new Set(selectedIds);
      visibleConfirmed.forEach(p => next.add(p.id));
      setSelectedIds(Array.from(next));
    }
  };

  // Confirmed payrolls inside the Create Batch modal
  const modalConfirmedPayrolls = useMemo(
    () =>
      confirmedPayrolls.filter(p => batchMonthFilter === 'all' || p.month === batchMonthFilter),
    [confirmedPayrolls, batchMonthFilter]
  );
  const allModalConfirmedSelected =
    modalConfirmedPayrolls.length > 0 && modalConfirmedPayrolls.every(p => selectedIds.includes(p.id));

  const toggleSelectAllInModal = () => {
    if (allModalConfirmedSelected) {
      const mSet = new Set(modalConfirmedPayrolls.map(p => p.id));
      setSelectedIds(prev => prev.filter(id => !mSet.has(id)));
    } else {
      const next = new Set(selectedIds);
      modalConfirmedPayrolls.forEach(p => next.add(p.id));
      setSelectedIds(Array.from(next));
    }
  };

  const selectedBatchTotal = useMemo(
    () =>
      confirmedPayrolls
        .filter(p => selectedIds.includes(p.id))
        .reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0),
    [confirmedPayrolls, selectedIds]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">{isEmployeeView ? 'My Pay Slips' : 'Payroll Management'}</h2>
          <p className="text-muted-foreground text-sm">
            {isEmployeeView
              ? 'View and download your monthly salary statements'
              : 'Generate payroll (active & resignation-month staff), process salary arrears, confirm, and create payroll batches'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchPayrolls}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          {!isEmployeeView && (
            <Button variant="outline" size="sm" onClick={() => setArrearsOpen(true)}>
              <TrendingUp className="w-4 h-4 mr-1.5 text-emerald-600" /> Process Arrears
            </Button>
          )}
          {!isEmployeeView && confirmedPayrolls.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-primary/40 text-primary"
              onClick={() => setTransferOpen(true)}
            >
              <Send className="w-4 h-4 mr-1.5" /> Create Batch / Submit ({selectedIds.length || confirmedPayrolls.length})
            </Button>
          )}
          {!isEmployeeView && (
            <Button size="sm" onClick={() => setGenerateOpen(true)}>
              <Play className="w-4 h-4 mr-1" /> Generate Payroll
            </Button>
          )}
        </div>
      </div>

      {!isEmployeeView && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employee..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtered.some(p => p.status === 'draft' || p.status === 'processed') && (
            <Button size="sm" variant="outline" className="h-9 text-green-600 border-green-300" onClick={handleConfirmAllDrafts}>
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Confirm All Drafts
            </Button>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All ({payrolls.length})</TabsTrigger>
          {!isEmployeeView && <TabsTrigger value="draft">Draft ({payrolls.filter(p => p.status === 'draft').length})</TabsTrigger>}
          {!isEmployeeView && <TabsTrigger value="confirmed">Confirmed ({confirmedPayrolls.length})</TabsTrigger>}
          <TabsTrigger value="transferred_to_finance">{isEmployeeView ? 'In Review' : 'Batched'}</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle>{isEmployeeView ? 'Payslip History' : 'Payroll Records'}</CardTitle>
              {!isEmployeeView && visibleConfirmed.length > 0 && (
                <div className="flex items-center gap-3 bg-muted/40 px-3 py-1.5 rounded-lg border">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allVisibleConfirmedSelected}
                      onChange={toggleSelectAllVisibleConfirmed}
                      className="w-4 h-4 accent-primary rounded"
                    />
                    Select All Confirmed ({visibleConfirmed.length})
                  </label>
                  {selectedIds.length > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground">
                        • {selectedIds.length} selected (₹{selectedBatchTotal.toLocaleString('en-IN')})
                      </span>
                      <Button size="sm" className="h-7 text-xs px-2.5" onClick={() => setTransferOpen(true)}>
                        <Send className="w-3 h-3 mr-1" /> Create Batch
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>{isEmployeeView ? 'No payslips available yet' : 'No payroll records'}</p>
                  <p className="text-sm">
                    {isEmployeeView ? 'Once your payroll is generated and processed, payslips will appear here' : 'Generate payroll to get started'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(p => {
                    const empName = p.employeeId?.name || p.user?.name || 'Employee';
                    const empStatus = p.employeeId?.status || p.user?.status || 'active';
                    const isSelected = selectedIds.includes(p.id);
                    const allowObj = (p.allowances || {}) as Record<string, number>;
                    const dedObj = (p.deductions || {}) as Record<string, number>;
                    const totalAllowances = Object.values(allowObj).reduce((s, v) => s + (Number(v) || 0), 0);
                    const totalDeductions = calcTotalDeductions(p);

                    if (isEmployeeView) {
                      return (
                        <div key={p.id} className="p-4 border rounded-xl bg-card/50 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5">{p.month}</Badge>
                              <Badge className={`text-xs capitalize ${STATUS_COLOR[p.status] || 'bg-gray-100'}`}>
                                {p.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-[10px] uppercase text-muted-foreground block">Net Salary</span>
                                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                  ₹{(p.netSalary || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => downloadPayslip(p)} disabled={downloadingPdf}>
                                <Download className="w-3.5 h-3.5 mr-1" /> PDF
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t text-xs">
                            <div className="p-2.5 rounded-lg bg-muted/30 space-y-1">
                              <p className="font-semibold text-foreground uppercase text-[10px] tracking-wider">Earnings</p>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Basic Salary</span>
                                <span className="font-medium">₹{(p.basicSalary || 0).toLocaleString('en-IN')}</span>
                              </div>
                              {Object.entries(allowObj).map(([k, v]) => Number(v) > 0 && (
                                <div key={k} className="flex justify-between">
                                  <span className="text-muted-foreground uppercase">{k}</span>
                                  <span className="font-medium">+₹{Number(v).toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                              {Number(p.arrears || 0) > 0 && (
                                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                                  <span>Salary Arrears</span>
                                  <span>+₹{Number(p.arrears).toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              {(p.bonus || 0) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Bonus</span>
                                  <span className="font-medium">+₹{Number(p.bonus).toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              {(p.overtime || 0) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Overtime</span>
                                  <span className="font-medium">+₹{Number(p.overtime).toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              <div className="flex justify-between pt-1 border-t font-semibold text-foreground">
                                <span>Gross Salary</span>
                                <span>₹{(p.grossSalary || ((p.basicSalary || 0) + totalAllowances + (p.bonus || 0) + (p.overtime || 0) + (p.arrears || 0))).toLocaleString('en-IN')}</span>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-lg bg-muted/30 space-y-1">
                              <p className="font-semibold text-foreground uppercase text-[10px] tracking-wider">Deductions</p>
                              {Object.entries(dedObj).map(([k, v]) => Number(v) > 0 && (
                                <div key={k} className="flex justify-between">
                                  <span className="text-muted-foreground uppercase">{k.replace(/_/g, ' ')}</span>
                                  <span className="font-medium text-rose-600">-₹{Number(v).toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                              {Number(p.professionalTax || 0) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Professional Tax</span>
                                  <span className="font-medium text-rose-600">-₹{Number(p.professionalTax).toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              {Number(p.labourWelfareFund || 0) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">LWF</span>
                                  <span className="font-medium text-rose-600">-₹{Number(p.labourWelfareFund).toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              {Number(p.tds || 0) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">TDS</span>
                                  <span className="font-medium text-rose-600">-₹{Number(p.tds).toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              <div className="flex justify-between pt-1 border-t font-semibold text-rose-600">
                                <span>Total Deductions</span>
                                <span>-₹{totalDeductions.toLocaleString('en-IN')}</span>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-lg bg-muted/30 space-y-1 flex flex-col justify-between">
                              <div>
                                <p className="font-semibold text-foreground uppercase text-[10px] tracking-wider">Summary</p>
                                <p className="text-orange-600 dark:text-orange-400 font-medium mt-1">
                                  {p.remarks || 'Standard monthly calculation'}
                                </p>
                              </div>
                              <div className="flex justify-between pt-1 border-t font-bold text-emerald-600 dark:text-emerald-400">
                                <span>Net Payable</span>
                                <span>₹{(p.netSalary || 0).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={p.id} className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                        {p.status === 'confirmed' && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(p.id)}
                            className="w-4 h-4 shrink-0 accent-primary rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold">{empName}</span>
                            {empStatus === 'resigned' && (
                              <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30">
                                Resigned Staff
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs font-semibold">{p.month}</Badge>
                            <Badge className={`text-xs capitalize ${STATUS_COLOR[p.status] || 'bg-gray-100'}`}>
                              {p.status.replace(/_/g, ' ')}
                            </Badge>
                            {Number(p.arrears || 0) > 0 && (
                              <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                                Arrears: +₹{Number(p.arrears).toLocaleString('en-IN')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                            <span>Basic: ₹{(p.basicSalary || 0).toLocaleString('en-IN')}</span>
                            <span>Gross: ₹{(p.grossSalary || 0).toLocaleString('en-IN')}</span>
                            <span className="font-semibold text-foreground">Net: ₹{(p.netSalary || 0).toLocaleString('en-IN')}</span>
                            {p.remarks && <span className="text-orange-600">{p.remarks}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {(p.status === 'draft' || p.status === 'processed') && (
                            <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {(p.status === 'draft' || p.status === 'processed') && (
                            <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleConfirm(p.id)}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirm
                            </Button>
                          )}
                          {(p.status === 'confirmed' || p.status === 'paid' || p.status === 'transferred_to_finance') && (
                            <Button size="sm" variant="outline" onClick={() => downloadPayslip(p)} disabled={downloadingPdf} title="Download PDF Payslip">
                              <Download className="w-3.5 h-3.5 mr-1" /> PDF
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Offscreen PDF Container */}
      <div style={{ position: 'fixed', left: '-10000px', top: 0, width: '710px', pointerEvents: 'none', zIndex: -1 }}>
        {pdfPayroll && (
          <PayslipDocument
            payroll={{
              ...pdfPayroll,
              createdAt: pdfPayroll.createdAt || new Date().toISOString(),
              user:
                (typeof pdfPayroll.user === 'object' && pdfPayroll.user) ||
                (typeof pdfPayroll.employeeId === 'object' && pdfPayroll.employeeId) ||
                undefined,
            }}
          />
        )}
      </div>

      {/* Generate Payroll Dialog */}
      {!isEmployeeView && (
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Generate Monthly Payroll</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Payroll Month (YYYY-MM)</Label>
                <Input type="month" value={generateMonth} onChange={e => setGenerateMonth(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically includes active employees AND employees who resigned during {generateMonth} (prorated through their resignation date).
                </p>
              </div>
              <div className="space-y-2">
                <Label>Generation Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenerateMode('smart')}
                    className={`p-3 rounded-lg border text-left text-sm transition-all ${
                      generateMode === 'smart' ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground'
                    }`}
                  >
                    <div className="font-semibold">Smart Mode</div>
                    <div className="text-xs opacity-80">Attendance LOP + shift grace period late deductions</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenerateMode('basic')}
                    className={`p-3 rounded-lg border text-left text-sm transition-all ${
                      generateMode === 'basic' ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground'
                    }`}
                  >
                    <div className="font-semibold">Standard Mode</div>
                    <div className="text-xs opacity-80">Attendance LOP without late arrival penalties</div>
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
              <Button onClick={handleGenerate}><Play className="w-4 h-4 mr-1" /> Generate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Process Salary Arrears Dialog */}
      {!isEmployeeView && (
        <Dialog open={arrearsOpen} onOpenChange={setArrearsOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Process Salary Arrears</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Employee</Label>
                  <Select value={arrearsForm.employeeId} onValueChange={v => setArrearsForm(f => ({ ...f, employeeId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} {emp.status === 'resigned' ? '(Resigned)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Payroll Month</Label>
                  <Input
                    type="month"
                    value={arrearsForm.month}
                    onChange={e => setArrearsForm(f => ({ ...f, month: e.target.value }))}
                  />
                </div>
              </div>

              {/* Optional Revision Calculator */}
              <div className="p-3 rounded-xl border bg-muted/30 space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground">Optional Revision Arrear Calculator</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px]">Old Salary (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 20000"
                      value={arrearsForm.oldMonthlySalary}
                      onChange={e => {
                        const oldS = e.target.value;
                        const diff = Math.max(0, (Number(arrearsForm.newMonthlySalary) || 0) - (Number(oldS) || 0));
                        const calc = diff > 0 ? String(diff * (Number(arrearsForm.monthsCount) || 1)) : arrearsForm.amount;
                        setArrearsForm(f => ({ ...f, oldMonthlySalary: oldS, amount: calc }));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Revised Salary (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 25000"
                      value={arrearsForm.newMonthlySalary}
                      onChange={e => {
                        const newS = e.target.value;
                        const diff = Math.max(0, (Number(newS) || 0) - (Number(arrearsForm.oldMonthlySalary) || 0));
                        const calc = diff > 0 ? String(diff * (Number(arrearsForm.monthsCount) || 1)) : arrearsForm.amount;
                        setArrearsForm(f => ({ ...f, newMonthlySalary: newS, amount: calc }));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Months</Label>
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={arrearsForm.monthsCount}
                      onChange={e => {
                        const mc = e.target.value;
                        const diff = Math.max(0, (Number(arrearsForm.newMonthlySalary) || 0) - (Number(arrearsForm.oldMonthlySalary) || 0));
                        const calc = diff > 0 ? String(diff * (Number(mc) || 1)) : arrearsForm.amount;
                        setArrearsForm(f => ({ ...f, monthsCount: mc, amount: calc }));
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Arrear Amount (₹) *</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Enter arrear amount"
                    value={arrearsForm.amount}
                    onChange={e => setArrearsForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Application Mode</Label>
                  <Select value={arrearsForm.mode} onValueChange={(v: 'add' | 'replace') => setArrearsForm(f => ({ ...f, mode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add to existing arrears</SelectItem>
                      <SelectItem value="replace">Replace arrears amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Arrear Period From</Label>
                  <Input
                    type="month"
                    value={arrearsForm.fromPeriod}
                    onChange={e => setArrearsForm(f => ({ ...f, fromPeriod: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Arrear Period To</Label>
                  <Input
                    type="month"
                    value={arrearsForm.toPeriod}
                    onChange={e => setArrearsForm(f => ({ ...f, toPeriod: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Reason / Remarks</Label>
                <Input
                  placeholder="e.g. Retroactive increment / missed attendance adjustment"
                  value={arrearsForm.reason}
                  onChange={e => setArrearsForm(f => ({ ...f, reason: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setArrearsOpen(false)}>Cancel</Button>
              <Button onClick={handleProcessArrears} disabled={arrearsSaving}>
                {arrearsSaving ? 'Processing...' : 'Process Arrears'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Payroll Dialog */}
      {!isEmployeeView && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Payroll — {editPayroll?.employeeId?.name || 'Employee'} ({editPayroll?.month})</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Basic Salary (₹)</Label>
                <Input type="number" min="0" value={editForm.basicSalary}
                  onChange={e => setEditForm((f: any) => ({ ...f, basicSalary: Number(e.target.value) }))} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Allowances</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['hra', 'transport', 'medical', 'other'] as const).map(key => (
                    <div key={key} className="space-y-1">
                      <Label className="capitalize">{key} (₹)</Label>
                      <Input type="number" min="0" value={editForm.allowances?.[key] || 0}
                        onChange={e => setEditForm((f: any) => ({ ...f, allowances: { ...f.allowances, [key]: Number(e.target.value) } }))} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Additional Earnings & Arrears</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Salary Arrears (₹)</Label>
                    <Input type="number" min="0" value={editForm.arrears || 0}
                      onChange={e => setEditForm((f: any) => ({ ...f, arrears: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Bonus (₹)</Label>
                    <Input type="number" min="0" value={editForm.bonus || 0}
                      onChange={e => setEditForm((f: any) => ({ ...f, bonus: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Overtime (₹)</Label>
                    <Input type="number" min="0" value={editForm.overtime || 0}
                      onChange={e => setEditForm((f: any) => ({ ...f, overtime: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Deductions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from(new Set(['loss_of_pay', 'late_early_deduction', 'late_arrival', 'early_leaving', 'pf', 'insurance', 'other', ...Object.keys(editForm.deductions || {}).filter(k => k !== 'tax')])).map(key => {
                    const label = key === 'loss_of_pay'
                      ? 'Loss of Pay (LOP) (₹)'
                      : key === 'late_early_deduction'
                      ? 'Late / Early Deduction (₹)'
                      : key === 'late_arrival' || key === 'late_deduction'
                      ? 'Late Arrival (₹)'
                      : key === 'early_leaving'
                      ? 'Early Leaving (₹)'
                      : key === 'pf'
                      ? 'Provident Fund (PF) (₹)'
                      : `${key.replace(/_/g, ' ')} (₹)`;
                    return (
                      <div key={key} className="space-y-1">
                        <Label className="capitalize text-xs">{label}</Label>
                        <Input type="number" min="0" value={editForm.deductions?.[key] || 0}
                          onChange={e => setEditForm((f: any) => ({ ...f, deductions: { ...f.deductions, [key]: Number(e.target.value) } }))} />
                      </div>
                    );
                  })}
                  <div className="space-y-1">
                    <Label className="text-xs">Professional Tax (PT) (₹)</Label>
                    <Input type="number" min="0" value={editForm.professionalTax || 0}
                      onChange={e => setEditForm((f: any) => ({ ...f, professionalTax: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">TDS (₹)</Label>
                    <Input type="number" min="0" value={editForm.tds || 0}
                      onChange={e => setEditForm((f: any) => ({ ...f, tds: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Remarks</Label>
                <Textarea value={editForm.remarks || ''} rows={2}
                  onChange={e => setEditForm((f: any) => ({ ...f, remarks: e.target.value }))} />
              </div>
              <div className="p-3 rounded-xl bg-muted/50 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Gross</p>
                  <p className="font-bold text-blue-600">₹{calcGross(editForm).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deductions</p>
                  <p className="font-bold text-red-500">₹{calcTotalDeductions(editForm).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net</p>
                  <p className="font-bold text-green-600">₹{calcNet(editForm).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}><X className="w-4 h-4 mr-1" />Cancel</Button>
              <Button onClick={handleEditSave} disabled={editSaving}>
                <Save className="w-4 h-4 mr-1" />{editSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Payroll Batch / Submit to Finance Dialog with Select All */}
      {!isEmployeeView && (
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Payroll Batch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Filter Confirmed Payrolls by Month</Label>
                  <Select value={batchMonthFilter} onValueChange={setBatchMonthFilter}>
                    <SelectTrigger className="h-9 mt-1">
                      <SelectValue placeholder="All Months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Confirmed Months</SelectItem>
                      {Array.from(new Set(confirmedPayrolls.map(p => p.month))).sort().reverse().map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border overflow-hidden">
                <div className="bg-muted/60 px-3.5 py-2.5 border-b flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allModalConfirmedSelected}
                      onChange={toggleSelectAllInModal}
                      className="w-4 h-4 accent-primary rounded"
                    />
                    <CheckSquare className="w-4 h-4 text-primary" />
                    Select All ({modalConfirmedPayrolls.length})
                  </label>
                  <span className="text-xs font-medium text-muted-foreground">
                    Selected: {selectedIds.length}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y">
                  {modalConfirmedPayrolls.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No confirmed payrolls found for this month.
                    </p>
                  ) : (
                    modalConfirmedPayrolls.map(p => {
                      const empName = p.employeeId?.name || p.user?.name || 'Employee';
                      const checked = selectedIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer text-sm transition-colors ${
                            checked ? 'bg-primary/5' : 'hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelect(p.id)}
                              className="w-4 h-4 accent-primary rounded shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-medium truncate block">{empName}</span>
                              <span className="text-xs text-muted-foreground">{p.month}</span>
                            </div>
                          </div>
                          <span className="font-semibold text-emerald-600 shrink-0">
                            ₹{(p.netSalary || 0).toLocaleString('en-IN')}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between text-sm">
                <span className="font-medium">{selectedIds.length} employee(s) selected</span>
                <span className="font-bold text-primary">Total: ₹{selectedBatchTotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="space-y-1">
                <Label>Batch Remarks (Optional)</Label>
                <Input
                  value={transferRemarks}
                  onChange={e => setTransferRemarks(e.target.value)}
                  placeholder="e.g., November 2026 salary disbursement batch"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
              <Button onClick={handleTransfer} disabled={!selectedIds.length}>
                <Send className="w-4 h-4 mr-1.5" /> Create Batch ({selectedIds.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
