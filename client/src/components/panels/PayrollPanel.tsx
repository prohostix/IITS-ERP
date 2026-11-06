import { useState, useEffect } from 'react';
import { DollarSign, Play, CheckCircle, Send, RefreshCw, Edit, Save, X, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';
import html2pdf from 'html2pdf.js';
import { PayslipDocument } from './hr/PayslipDocument';

interface Payroll {
  id: string;
  employeeId: any;
  month: string;
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  status: string;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  bonus: number;
  overtime: number;
  remarks?: string;
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

export function PayrollPanel({ isEmployeeView = false }: PayrollPanelProps) {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Generate
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generateMode, setGenerateMode] = useState<'smart' | 'basic'>('smart');

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editPayroll, setEditPayroll] = useState<Payroll | null>(null);
  const [editForm, setEditForm] = useState<any>({
    basicSalary: 0,
    allowances: { hra: 0, transport: 0, medical: 0, other: 0 },
    deductions: { pf: 0, tax: 0, insurance: 0, other: 0 },
    bonus: 0,
    overtime: 0,
    remarks: '',
  });
  const [editSaving, setEditSaving] = useState(false);

  // Transfer
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [transferRemarks, setTransferRemarks] = useState('');

  useEffect(() => { fetchPayrolls(); }, []);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll');
      setPayrolls(res.data.data || []);
    } catch { toast.error('Failed to fetch payrolls'); }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    try {
      const endpoint = generateMode === 'smart' ? '/payroll/generate-smart' : '/payroll/generate';
      const res = await api.post(endpoint, { month: generateMonth });
      const count = res.data.data?.length || 0;
      toast.success(`Generated ${count} payroll records`);
      if (res.data.errors?.length) toast.error(`${res.data.errors.length} errors — check console`);
      setGenerateOpen(false);
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate');
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await api.put(`/payroll/${id}/confirm`);
      toast.success('Payroll confirmed');
      fetchPayrolls();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openEdit = (p: Payroll) => {
    setEditPayroll(p);
    setEditForm({
      basicSalary: p.basicSalary,
      allowances: { hra: 0, transport: 0, medical: 0, other: 0, ...p.allowances },
      deductions: { pf: 0, tax: 0, insurance: 0, other: 0, ...p.deductions },
      bonus: p.bonus || 0,
      overtime: p.overtime || 0,
      remarks: p.remarks || '',
    });
    setEditOpen(true);
  };

  const calcGross = (f: any) =>
    (f.basicSalary || 0) +
    Object.values((f.allowances || {}) as Record<string, number>).reduce((s, v) => s + (v || 0), 0) +
    (f.bonus || 0) + (f.overtime || 0);

  const calcNet = (f: any) =>
    calcGross(f) - Object.values((f.deductions || {}) as Record<string, number>).reduce((s, v) => s + (v || 0), 0);

  const [pdfPayroll, setPdfPayroll] = useState<Payroll | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const downloadPayslip = (p: Payroll) => {
    setPdfPayroll(p);
    setDownloadingPdf(true);
    // Give state time to flush to DOM
    setTimeout(() => {
      const element = document.getElementById(`payslip-${p.id}`);
      if (element) {
        html2pdf()
          .set({
            margin: 10,
            filename: `Payslip_${p.month}_${p.employeeId?.name || 'Employee'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          })
          .from(element)
          .save()
          .then(() => setDownloadingPdf(false))
          .catch(() => {
            toast.error('Failed to generate PDF');
            setDownloadingPdf(false);
          });
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
    } finally { setEditSaving(false); }
  };

  const handleTransfer = async () => {
    if (!selectedIds.length) { toast.error('Select at least one confirmed payroll'); return; }
    try {
      const month = payrolls.find(p => selectedIds.includes(p.id))?.month;
      await api.post('/payroll/transfer-to-finance', { payrollIds: selectedIds, month, remarks: transferRemarks });
      toast.success(`Transferred ${selectedIds.length} payrolls to Finance`);
      setTransferOpen(false);
      setSelectedIds([]);
      setTransferRemarks('');
      fetchPayrolls();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Transfer failed'); }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const filtered = activeTab === 'all' ? payrolls : payrolls.filter(p => p.status === activeTab);
  const confirmedPayrolls = payrolls.filter(p => p.status === 'confirmed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">{isEmployeeView ? 'My Pay Slips' : 'Payroll Management'}</h2>
          <p className="text-muted-foreground text-sm">
            {isEmployeeView
              ? 'View and download your monthly salary statements'
              : 'Generate, edit, confirm and submit payroll to Finance'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchPayrolls}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          {!isEmployeeView && confirmedPayrolls.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
              <Send className="w-4 h-4 mr-1" /> Submit to Finance ({confirmedPayrolls.length})
            </Button>
          )}
          {!isEmployeeView && (
            <Button size="sm" onClick={() => setGenerateOpen(true)}>
              <Play className="w-4 h-4 mr-1" /> Generate Payroll
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All ({payrolls.length})</TabsTrigger>
          {!isEmployeeView && <TabsTrigger value="draft">Draft</TabsTrigger>}
          {!isEmployeeView && <TabsTrigger value="confirmed">Confirmed</TabsTrigger>}
          <TabsTrigger value="transferred_to_finance">{isEmployeeView ? 'In Review' : 'Submitted'}</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{isEmployeeView ? 'Payslip History' : 'Payroll Records'}</CardTitle>
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
                    const empName = p.employeeId?.name || p.employeeId?.userId?.name || 'Employee';
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <div key={p.id} className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                        {!isEmployeeView && p.status === 'confirmed' && (
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)} className="w-4 h-4 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {!isEmployeeView && <span className="font-semibold">{empName}</span>}
                            <Badge variant="outline" className="text-xs font-semibold">{p.month}</Badge>
                            <Badge className={`text-xs ${STATUS_COLOR[p.status] || 'bg-gray-100'}`}>
                              {p.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                            <span>Basic: ₹{p.basicSalary?.toLocaleString()}</span>
                            <span>Gross: ₹{p.grossSalary?.toLocaleString()}</span>
                            <span className="font-semibold text-foreground">Net: ₹{p.netSalary?.toLocaleString()}</span>
                            {p.remarks && <span className="text-orange-600">{p.remarks}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {!isEmployeeView && (p.status === 'draft' || p.status === 'processed') && (
                            <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {!isEmployeeView && (p.status === 'draft' || p.status === 'processed') && (
                            <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleConfirm(p.id)}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirm
                            </Button>
                          )}
                          {(p.status === 'confirmed' || p.status === 'paid' || p.status === 'transferred_to_finance' || isEmployeeView) && (
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

      {/* Offscreen PDF Container for html2pdf to properly render without display: none issues */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, opacity: 0, pointerEvents: 'none' }}>
        {pdfPayroll && (
          <PayslipDocument
            payroll={{
              ...pdfPayroll,
              user: pdfPayroll.employeeId?.userId || pdfPayroll.employeeId,
            }}
          />
        )}
      </div>

      {/* Generate Dialog */}
      {!isEmployeeView && (
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Generate Monthly Payroll</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Payroll Month (YYYY-MM)</Label>
                <Input type="month" value={generateMonth} onChange={e => setGenerateMonth(e.target.value)} />
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
                    <div className="text-xs opacity-80">Full attendance (LOP for absences/half-days) + late arrival penalties</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenerateMode('basic')}
                    className={`p-3 rounded-lg border text-left text-sm transition-all ${
                      generateMode === 'basic' ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground'
                    }`}
                  >
                    <div className="font-semibold">Standard Mode</div>
                    <div className="text-xs opacity-80">Full attendance (LOP for absences/half-days) without late penalties</div>
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

      {/* Edit Dialog */}
      {!isEmployeeView && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Payroll — {editPayroll?.employeeId?.name || 'Employee'}</DialogTitle>
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
                <p className="text-sm font-semibold mb-2">Deductions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from(new Set(['loss_of_pay', 'late_arrival', 'pf', 'tax', 'insurance', 'other', ...Object.keys(editForm.deductions || {})])).map(key => {
                    const label = key === 'loss_of_pay'
                      ? 'Loss of Pay (LOP) (₹)'
                      : key === 'late_arrival' || key === 'late_deduction'
                      ? 'Late Arrival (₹)'
                      : key === 'pf'
                      ? 'Provident Fund (PF) (₹)'
                      : key === 'tax'
                      ? 'TDS / Tax (₹)'
                      : `${key.replace(/_/g, ' ')} (₹)`;
                    return (
                      <div key={key} className="space-y-1">
                        <Label className="capitalize text-xs">{label}</Label>
                        <Input type="number" min="0" value={editForm.deductions?.[key] || 0}
                          onChange={e => setEditForm((f: any) => ({ ...f, deductions: { ...f.deductions, [key]: Number(e.target.value) } }))} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="space-y-1">
                <Label>Remarks</Label>
                <Textarea value={editForm.remarks || ''} rows={2}
                  onChange={e => setEditForm((f: any) => ({ ...f, remarks: e.target.value }))} />
              </div>
              {/* Live preview */}
              <div className="p-3 rounded-xl bg-muted/50 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Gross</p>
                  <p className="font-bold text-blue-600">₹{calcGross(editForm).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deductions</p>
                  <p className="font-bold text-red-500">
                    ₹{Object.values(((editForm.deductions || {}) as Record<string, number>)).reduce((s, v) => s + (v || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net</p>
                  <p className="font-bold text-green-600">₹{calcNet(editForm).toLocaleString()}</p>
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

      {/* Transfer to Finance Dialog */}
      {!isEmployeeView && (
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Submit Payroll to Finance</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Check the boxes next to confirmed payrolls, then submit them to Finance for approval and salary disbursement.
              </p>
              <div className="space-y-1">
                <Label>Remarks (optional)</Label>
                <Input value={transferRemarks} onChange={e => setTransferRemarks(e.target.value)} placeholder="e.g., March 2026 payroll batch" />
              </div>
              <p className="text-sm font-medium">{selectedIds.length} payroll(s) selected</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
              <Button onClick={handleTransfer} disabled={!selectedIds.length}>
                <Send className="w-4 h-4 mr-1" /> Submit to Finance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
