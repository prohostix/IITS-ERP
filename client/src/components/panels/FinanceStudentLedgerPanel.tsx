import { useState, useEffect } from 'react';
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
  CreditCard, CheckCircle2, Clock,
  GraduationCap, Phone, Mail, FileText, ArrowDownLeft,
  ArrowUpRight, Eye, Receipt
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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
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
    if (!ledgerData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const { student, summary, ledgerEntries } = ledgerData;
    const isSettled = summary.closingBalance === 0;
    const isAdvance = summary.closingBalance < 0;
    const balanceText = isAdvance 
      ? `₹${Math.abs(summary.closingBalance).toLocaleString('en-IN')} (Cr - Advance)`
      : isSettled 
      ? `₹0.00 (Fully Settled)`
      : `₹${summary.closingBalance.toLocaleString('en-IN')} (Dr - Due)`;

    const statusBadgeText = isAdvance 
      ? 'ADVANCE CREDIT' 
      : isSettled 
      ? 'FULLY PAID' 
      : summary.status === 'partial' 
      ? 'PARTIALLY PAID' 
      : 'PAYMENT PENDING';

    const statusBadgeColor = isAdvance || isSettled ? '#059669' : summary.status === 'partial' ? '#0284c7' : '#d97706';

    const rowsHtml = (ledgerEntries || []).map((e: any, idx: number) => {
      const typeLabel = e.type === 'debit' ? 'DEBIT (Dr)' : 'CREDIT (Cr)';
      const typeColor = e.type === 'debit' ? '#be123c' : '#047857';
      const typeBg = e.type === 'debit' ? '#ffe4e6' : '#d1fae5';
      const debitStr = e.debit > 0 ? `₹${Number(e.debit).toLocaleString('en-IN')}` : '-';
      const creditStr = e.credit > 0 ? `₹${Number(e.credit).toLocaleString('en-IN')}` : '-';
      const balStr = e.runningBalance > 0
        ? `₹${Number(e.runningBalance).toLocaleString('en-IN')} Dr`
        : e.runningBalance < 0
        ? `₹${Math.abs(Number(e.runningBalance)).toLocaleString('en-IN')} Cr`
        : '₹0.00';
      const dateStr = new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 7px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 7px 8px; white-space: nowrap; color: #334155;">${dateStr}</td>
          <td style="padding: 7px 8px; text-align: center;">
            <span style="background: ${typeBg}; color: ${typeColor}; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">${typeLabel}</span>
          </td>
          <td style="padding: 7px 8px;">
            <div style="font-weight: 600; color: #0f172a;">${e.category}</div>
            <div style="color: #64748b; font-size: 10px;">${e.description || ''}</div>
          </td>
          <td style="padding: 7px 8px; font-family: monospace; font-size: 10px; color: #334155;">
            <div>${e.referenceNo || '-'}</div>
            <div style="color: #94a3b8; font-size: 9px;">${e.paymentMode || ''}</div>
          </td>
          <td style="padding: 7px 8px; text-align: right; color: #be123c; font-weight: 600; font-family: monospace;">${debitStr}</td>
          <td style="padding: 7px 8px; text-align: right; color: #047857; font-weight: 600; font-family: monospace;">${creditStr}</td>
          <td style="padding: 7px 8px; text-align: right; font-weight: 700; font-family: monospace; color: #0f172a;">${balStr}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Statement_of_Account_${student.enrollmentNumber || 'Student'}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title-area h1 { margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          .title-area h2 { margin: 3px 0 0; font-size: 13px; color: #475569; font-weight: 600; }
          .meta-area { text-align: right; font-size: 11px; color: #475569; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px; }
          .info-item { font-size: 11px; margin-bottom: 4px; }
          .info-item strong { color: #475569; font-weight: 600; min-width: 110px; display: inline-block; }
          .kpi-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
          .kpi-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; text-align: center; }
          .kpi-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
          .kpi-value { font-size: 17px; font-weight: 800; margin-top: 3px; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f1f5f9; color: #334155; font-size: 10px; text-transform: uppercase; font-weight: 700; padding: 8px; border-bottom: 2px solid #cbd5e1; }
          .footer-section { margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; color: #475569; page-break-inside: avoid; }
          .sig-box { border-top: 1px solid #64748b; width: 200px; text-align: center; padding-top: 6px; font-size: 11px; font-weight: 600; }
          .disclaimer { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 25px; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-area">
            <h1>${student.universityName || 'University ERP'}</h1>
            <h2>OFFICIAL STUDENT STATEMENT OF ACCOUNT</h2>
          </div>
          <div class="meta-area">
            <div><strong>Date of Issue:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div><strong>Statement Ref:</strong> STMT-${student.enrollmentNumber || student.id.slice(0, 8)}</div>
            <div style="margin-top: 4px;">
              <span style="background: ${statusBadgeColor}; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700;">${statusBadgeText}</span>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div>
            <div class="info-item"><strong>Student Name:</strong> <span style="font-weight: 700; color: #0f172a;">${student.name}</span></div>
            <div class="info-item"><strong>Enrollment No:</strong> <span style="font-family: monospace; font-weight: 700;">${student.enrollmentNumber}</span></div>
            ${student.uniEnrollmentNumber && student.uniEnrollmentNumber !== 'N/A' ? `<div class="info-item"><strong>University Roll:</strong> <span style="font-family: monospace;">${student.uniEnrollmentNumber}</span></div>` : ''}
            <div class="info-item"><strong>Academic Program:</strong> ${student.programName}</div>
          </div>
          <div>
            <div class="info-item"><strong>Study Center:</strong> ${student.centerName} ${student.centerCode ? `(${student.centerCode})` : ''}</div>
            <div class="info-item"><strong>Admission Date:</strong> ${new Date(student.admissionDate).toLocaleDateString('en-IN')}</div>
            <div class="info-item"><strong>Student Contact:</strong> ${student.phone || ''} ${student.email ? `| ${student.email}` : ''}</div>
            <div class="info-item"><strong>Session:</strong> ${student.sessionName || 'Current Session'}</div>
          </div>
        </div>

        <div class="kpi-strip">
          <div class="kpi-card" style="background: #fff1f2; border-color: #fecdd3;">
            <div class="kpi-label" style="color: #be123c;">Total Debits (Assessed)</div>
            <div class="kpi-value" style="color: #be123c;">₹${summary.totalDebit.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card" style="background: #ecfdf5; border-color: #a7f3d0;">
            <div class="kpi-label" style="color: #047857;">Total Credits (Received)</div>
            <div class="kpi-value" style="color: #047857;">₹${summary.totalCredit.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card" style="background: ${isAdvance || isSettled ? '#ecfdf5' : '#fffbeb'}; border-color: ${isAdvance || isSettled ? '#a7f3d0' : '#fde68a'};">
            <div class="kpi-label" style="color: ${isAdvance || isSettled ? '#047857' : '#b45309'};">${isAdvance ? 'Advance Credit (Cr)' : isSettled ? 'Net Balance' : 'Outstanding Due (Dr)'}</div>
            <div class="kpi-value" style="color: ${isAdvance || isSettled ? '#047857' : '#b45309'};">${balanceText}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th style="width: 80px; text-align: left;">Date</th>
              <th style="width: 75px; text-align: center;">Type</th>
              <th style="text-align: left;">Particulars / Description</th>
              <th style="width: 140px; text-align: left;">Reference / Mode</th>
              <th style="width: 90px; text-align: right;">Debit (₹)</th>
              <th style="width: 90px; text-align: right;">Credit (₹)</th>
              <th style="width: 105px; text-align: right;">Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 700; border-top: 2px solid #cbd5e1; font-size: 11px;">
              <td colspan="5" style="padding: 9px; text-align: right;">Closing Financial Position:</td>
              <td style="padding: 9px; text-align: right; color: #be123c; font-family: monospace;">₹${summary.totalDebit.toLocaleString('en-IN')}</td>
              <td style="padding: 9px; text-align: right; color: #047857; font-family: monospace;">₹${summary.totalCredit.toLocaleString('en-IN')}</td>
              <td style="padding: 9px; text-align: right; color: #0f172a; font-family: monospace;">${balanceText}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer-section">
          <div>
            <div style="font-weight: 600; margin-bottom: 3px;">Accounts & Verification Note:</div>
            <div style="font-size: 10px; color: #64748b; max-width: 320px;">
              This ledger statement reflects verified tuition assessments and approved financial receipts recorded in the institution's ERP system.
            </div>
          </div>
          <div style="display: flex; gap: 40px;">
            <div class="sig-box">
              Prepared / Verified By
            </div>
            <div class="sig-box">
              Authorized Accounts Officer
            </div>
          </div>
        </div>

        <div class="disclaimer">
          Generated automatically by University ERP System on ${new Date().toLocaleString('en-IN')}. This statement is officially recorded in institutional books of accounts.
        </div>

        <script>
          window.onload = () => {
            window.print();
            window.close();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
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
            <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-slate-50/70 via-white to-indigo-50/20">
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xl shadow-sm flex-shrink-0">
                      {ledgerData.student.name?.charAt(0) || 'S'}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{ledgerData.student.name}</h3>
                        <Badge
                          variant="secondary"
                          className={
                            ledgerData.summary.status === 'advance'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold'
                              : ledgerData.summary.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold'
                              : ledgerData.summary.status === 'partial'
                              ? 'bg-blue-100 text-blue-800 border-blue-200 font-semibold'
                              : 'bg-amber-100 text-amber-800 border-amber-200 font-semibold'
                          }
                        >
                          {ledgerData.summary.status === 'advance'
                            ? 'Advance Credit'
                            : ledgerData.summary.status === 'paid'
                            ? 'Fully Paid'
                            : ledgerData.summary.status === 'partial'
                            ? 'Partially Paid'
                            : 'Payment Pending'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">Enrollment No:</span>
                          <span className="font-mono font-medium text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] whitespace-nowrap">
                            {ledgerData.student.enrollmentNumber}
                          </span>
                        </div>
                        {ledgerData.student.uniEnrollmentNumber && ledgerData.student.uniEnrollmentNumber !== 'N/A' && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">Uni Roll:</span>
                            <span className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] whitespace-nowrap">
                              {ledgerData.student.uniEnrollmentNumber}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-slate-700">Program:</span>{' '}
                          <span className="text-slate-800 font-medium">{ledgerData.student.programName}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">University:</span>{' '}
                          <span className="text-slate-800">{ledgerData.student.universityName}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">Study Center:</span>{' '}
                          <span className="text-slate-800">{ledgerData.student.centerName}</span>
                          {ledgerData.student.centerCode && (
                            <span className="text-slate-400 font-mono text-[11px] ml-1">({ledgerData.student.centerCode})</span>
                          )}
                        </div>
                        {ledgerData.student.admissionDate && (
                          <div>
                            <span className="font-semibold text-slate-700">Admission Date:</span>{' '}
                            <span className="text-slate-800">
                              {new Date(ledgerData.student.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 pt-1 border-t border-slate-100 mt-2">
                        {ledgerData.student.phone && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{ledgerData.student.phone}</span>
                          </div>
                        )}
                        {ledgerData.student.email && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{ledgerData.student.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary Financial Pill Strip */}
                  <div className="flex flex-col sm:flex-row items-stretch gap-3 lg:min-w-[420px]">
                    <div className="flex-1 bg-white border border-rose-100 rounded-xl p-3.5 shadow-sm text-center">
                      <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                        <ArrowDownLeft className="w-3.5 h-3.5" /> Total Assessed
                      </div>
                      <div className="text-xl font-extrabold text-slate-900 font-mono">
                        ₹{ledgerData.summary.totalDebit.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Debits / Tuition Fees</div>
                    </div>

                    <div className="flex-1 bg-white border border-emerald-100 rounded-xl p-3.5 shadow-sm text-center">
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5" /> Total Received
                      </div>
                      <div className="text-xl font-extrabold text-emerald-700 font-mono">
                        ₹{ledgerData.summary.totalCredit.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Credits / Payments</div>
                    </div>

                    <div className={`flex-1 rounded-xl p-3.5 shadow-sm text-center border ${
                      ledgerData.summary.closingBalance < 0
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : ledgerData.summary.closingBalance === 0
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-amber-50/50 border-amber-200'
                    }`}>
                      <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1 ${
                        ledgerData.summary.closingBalance < 0
                          ? 'text-emerald-700'
                          : ledgerData.summary.closingBalance === 0
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}>
                        {ledgerData.summary.closingBalance < 0
                          ? 'Advance Credit'
                          : ledgerData.summary.closingBalance === 0
                          ? 'Net Balance'
                          : 'Balance Due'}
                      </div>
                      <div className={`text-xl font-extrabold font-mono ${
                        ledgerData.summary.closingBalance < 0
                          ? 'text-emerald-700'
                          : ledgerData.summary.closingBalance === 0
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}>
                        {ledgerData.summary.closingBalance < 0
                          ? `₹${Math.abs(ledgerData.summary.closingBalance).toLocaleString('en-IN')} Cr`
                          : ledgerData.summary.closingBalance === 0
                          ? '₹0.00'
                          : `₹${ledgerData.summary.closingBalance.toLocaleString('en-IN')} Dr`}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {ledgerData.summary.closingBalance < 0
                          ? 'Surplus Credit'
                          : ledgerData.summary.closingBalance === 0
                          ? 'Fully Settled'
                          : 'Outstanding Liability'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statement of Account Table */}
            <Card className="border border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/40">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Chronological Ledger Statement
                  </CardTitle>
                  <CardDescription>
                    Complete transaction journal showing all fee assessments, invoice charges, payments, and running balance.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono bg-white">
                  {ledgerData.ledgerEntries?.length || 0} Transactions
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b">
                      <tr>
                        <th className="px-4 py-3 text-left whitespace-nowrap min-w-[95px]">Date</th>
                        <th className="px-4 py-3 text-center whitespace-nowrap min-w-[90px]">Type</th>
                        <th className="px-4 py-3 text-left">Transaction Details</th>
                        <th className="px-4 py-3 text-left whitespace-nowrap min-w-[190px]">Reference / Mode</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">Debit (INR)</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap min-w-[110px]">Credit (INR)</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap min-w-[130px]">Running Balance</th>
                        <th className="px-4 py-3 text-left whitespace-nowrap min-w-[100px]">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerData.ledgerEntries.map((e: any) => (
                        <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 text-xs text-slate-700 whitespace-nowrap font-medium">
                            {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={
                                e.type === 'debit'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold text-[10px] tracking-wide'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[10px] tracking-wide'
                              }
                            >
                              {e.type === 'debit' ? 'DEBIT (Dr)' : 'CREDIT (Cr)'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-900 text-xs">{e.category}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{e.description}</div>
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            <div className="font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                              {e.referenceNo || '-'}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {e.paymentMode || ''}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-semibold text-rose-700 whitespace-nowrap">
                            {e.debit > 0 ? `₹${Number(e.debit).toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                            {e.credit > 0 ? `₹${Number(e.credit).toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap">
                            <span className={
                              e.runningBalance > 0
                                ? 'text-slate-900'
                                : e.runningBalance < 0
                                ? 'text-emerald-700'
                                : 'text-emerald-600'
                            }>
                              {e.runningBalance > 0
                                ? `₹${Number(e.runningBalance).toLocaleString('en-IN')} Dr`
                                : e.runningBalance < 0
                                ? `₹${Math.abs(Number(e.runningBalance)).toLocaleString('en-IN')} Cr`
                                : `₹0.00`}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                            {e.recordedBy}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs text-slate-900">
                      <tr>
                        <td colSpan={4} className="px-4 py-3.5 text-right text-slate-700 uppercase tracking-wider text-[11px]">
                          Closing Financial Position
                        </td>
                        <td className="px-4 py-3.5 text-right text-rose-700 font-mono font-extrabold">
                          ₹{ledgerData.summary.totalDebit.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 text-right text-emerald-700 font-mono font-extrabold">
                          ₹{ledgerData.summary.totalCredit.toLocaleString('en-IN')}
                        </td>
                        <td className={`px-4 py-3.5 text-right font-mono font-extrabold ${
                          ledgerData.summary.closingBalance < 0
                            ? 'text-emerald-700'
                            : ledgerData.summary.closingBalance === 0
                            ? 'text-emerald-600'
                            : 'text-rose-700'
                        }`}>
                          {ledgerData.summary.closingBalance < 0
                            ? `₹${Math.abs(ledgerData.summary.closingBalance).toLocaleString('en-IN')} Cr`
                            : ledgerData.summary.closingBalance === 0
                            ? '₹0.00 (Settled)'
                            : `₹${ledgerData.summary.closingBalance.toLocaleString('en-IN')} Dr`}
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
                    <span className="text-slate-500">Current Position:</span>{' '}
                    <span className={`font-bold ${
                      (ledgerData?.summary?.closingBalance ?? 0) < 0
                        ? 'text-emerald-700'
                        : (ledgerData?.summary?.closingBalance ?? 0) === 0
                        ? 'text-emerald-600'
                        : 'text-amber-700'
                    }`}>
                      {(ledgerData?.summary?.closingBalance ?? 0) < 0
                        ? `₹${Math.abs(ledgerData?.summary?.closingBalance ?? 0).toLocaleString('en-IN')} Cr (Advance)`
                        : (ledgerData?.summary?.closingBalance ?? 0) === 0
                        ? `₹0.00 (Fully Settled)`
                        : `₹${(ledgerData?.summary?.closingBalance ?? 0).toLocaleString('en-IN')} Dr (Due)`}
                    </span>
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
                        <span className={s.balance < 0 ? 'text-emerald-700' : s.balance === 0 ? 'text-emerald-600' : 'text-amber-700'}>
                          {s.balance < 0
                            ? `₹${Math.abs(s.balance).toLocaleString('en-IN')} Cr`
                            : s.balance === 0
                            ? `₹0.00`
                            : `₹${s.balance.toLocaleString('en-IN')} Dr`}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant="secondary"
                          className={
                            s.status === 'advance' || s.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200 capitalize'
                              : s.status === 'partial'
                              ? 'bg-blue-100 text-blue-800 border-blue-200 capitalize'
                              : 'bg-amber-100 text-amber-800 border-amber-200 capitalize'
                          }
                        >
                          {s.status === 'advance' ? 'Advance' : s.status}
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
