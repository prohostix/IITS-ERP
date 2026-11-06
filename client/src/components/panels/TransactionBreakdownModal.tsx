import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Hash,
  Printer,
  Receipt,
  Search,
  Users
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface StudentPaymentItem {
  id: string;
  studentId: string;
  studentName: string;
  enrollmentNo: string;
  uniEnrollmentNumber?: string;
  studentEmail?: string;
  studentPhone?: string;
  programName: string;
  universityName: string;
  centerName: string;
  semesterOrYear: string;
  amount: number;
  status: string;
  paidAt?: string;
  referenceNo?: string;
  screenshot?: string;
}

interface TransactionDetails {
  batchId?: string | null;
  referenceNo?: string | null;
  paidAt?: string | null;
  screenshot?: string | null;
  totalAmount: number;
  studentCount: number;
  universityName: string;
  students: StudentPaymentItem[];
}

interface TransactionBreakdownModalProps {
  identifier: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionBreakdownModal({
  identifier,
  open,
  onOpenChange
}: TransactionBreakdownModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TransactionDetails | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open || !identifier) {
      setData(null);
      setSearch('');
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/finance/university-fees/transaction/${encodeURIComponent(identifier)}`);
        if (res.data?.success && res.data?.data) {
          setData(res.data.data);
        } else {
          toast.error('Transaction details not found');
          onOpenChange(false);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to fetch transaction details');
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [open, identifier, onOpenChange]);

  const filteredStudents = (data?.students || []).filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.studentName && s.studentName.toLowerCase().includes(q)) ||
      (s.enrollmentNo && s.enrollmentNo.toLowerCase().includes(q)) ||
      (s.uniEnrollmentNumber && s.uniEnrollmentNumber.toLowerCase().includes(q)) ||
      (s.programName && s.programName.toLowerCase().includes(q)) ||
      (s.centerName && s.centerName.toLowerCase().includes(q)) ||
      (s.semesterOrYear && s.semesterOrYear.toLowerCase().includes(q))
    );
  });

  const handleExportCSV = () => {
    if (!data || !data.students.length) return;

    const headers = [
      '#',
      'Student Name',
      'ERP Enrollment No',
      'Uni Roll / Reg No',
      'University',
      'Program',
      'Study Center',
      'Semester / Year',
      'Paid Amount (INR)',
      'Transaction UTR / Ref',
      'Payment Date'
    ];

    const rows = data.students.map((s, idx) => [
      idx + 1,
      `"${s.studentName || ''}"`,
      `"${s.enrollmentNo || ''}"`,
      `"${s.uniEnrollmentNumber || ''}"`,
      `"${s.universityName || data.universityName || ''}"`,
      `"${s.programName || ''}"`,
      `"${s.centerName || ''}"`,
      `"${s.semesterOrYear || ''}"`,
      s.amount || 0,
      `"${data.referenceNo || ''}"`,
      `"${data.paidAt ? new Date(data.paidAt).toLocaleDateString('en-IN') : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `University_Payment_${data.referenceNo || data.batchId || 'Manifest'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Disbursement manifest exported to CSV');
  };

  const handlePrint = () => {
    if (!data) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const studentRowsHtml = (data.students || []).map((s, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 6px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${s.studentName}</td>
        <td style="padding: 6px 8px; font-family: monospace; color: #475569;">${s.enrollmentNo}</td>
        <td style="padding: 6px 8px; font-family: monospace; color: #475569;">${s.uniEnrollmentNumber || '-'}</td>
        <td style="padding: 6px 8px; color: #334155;">${s.programName}</td>
        <td style="padding: 6px 8px; color: #64748b;">${s.centerName}</td>
        <td style="padding: 6px 8px; text-align: center; font-weight: 600;">${s.semesterOrYear}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: 600; color: #047857;">₹${Number(s.amount).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>University Payment Manifest - ${data.referenceNo || data.batchId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; margin: 0; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: bold; color: #1e3a8a; margin: 0; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
            .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 12px; }
            .meta-item strong { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; margin-bottom: 2px; }
            .meta-item span { font-weight: 600; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background: #f1f5f9; padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 2px solid #cbd5e1; }
            .total-bar { margin-top: 16px; padding: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; color: #1e3a8a; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">University Fee Payment Manifest</h1>
            <p class="subtitle">Consolidated Transaction & Student Fee Settlement Record</p>
          </div>
          <div class="meta-grid">
            <div class="meta-item">
              <strong>UTR / Reference No</strong>
              <span>${data.referenceNo || 'N/A'}</span>
            </div>
            <div class="meta-item">
              <strong>University</strong>
              <span>${data.universityName || 'All'}</span>
            </div>
            <div class="meta-item">
              <strong>Payment Date</strong>
              <span>${data.paidAt ? new Date(data.paidAt).toLocaleDateString('en-IN') : 'N/A'}</span>
            </div>
            <div class="meta-item">
              <strong>Total Remitted</strong>
              <span style="color: #047857; font-size: 14px;">₹${Number(data.totalAmount).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th style="text-align: left;">Student Name</th>
                <th style="text-align: left;">Enrollment No</th>
                <th style="text-align: left;">Uni Roll No</th>
                <th style="text-align: left;">Program</th>
                <th style="text-align: left;">Center</th>
                <th style="text-align: center;">Sem / Year</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${studentRowsHtml}
            </tbody>
          </table>
          <div class="total-bar">
            <span>Total Students Settled: ${data.studentCount}</span>
            <span>Total Amount Paid to University: ₹${Number(data.totalAmount).toLocaleString('en-IN')}</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const proofUrl = data?.screenshot
    ? `${(import.meta.env.VITE_API_URL || '').replace('/api/v1', '')}${data.screenshot}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <span>Transaction Breakdown</span>
                    <Badge variant="outline" className="font-mono text-xs bg-muted/60">
                      {data?.referenceNo || identifier}
                    </Badge>
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Students whose university fee was settled in this single transaction.
                  </p>
                </div>
              </div>
            </div>

            {data && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleExportCSV} className="h-8 text-xs">
                  <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 text-xs">
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading transaction and student breakdown...</p>
          </div>
        ) : !data ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>No transaction information available.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Summary KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-border bg-muted/30">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-blue-500" /> Total Students
                </span>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {data.studentCount}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Total Remitted
                </span>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  ₹{data.totalAmount.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/30">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-purple-500" /> University
                </span>
                <p className="text-sm font-semibold text-foreground mt-1 truncate" title={data.universityName}>
                  {data.universityName || 'All Universities'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/30">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" /> Payment Date
                </span>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {data.paidAt ? new Date(data.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Proof of Payment Banner (if uploaded) */}
            {proofUrl && (
              <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-foreground">University Payment Proof / Bank Slip Attached</span>
                </div>
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View / Download Slip
                </a>
              </div>
            )}

            {/* Students Table with Search */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  Students Covered Under this Transaction ({data.studentCount})
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search students in this batch..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden bg-card text-card-foreground">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="w-8 text-center py-2.5 px-3 font-semibold text-muted-foreground">#</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">Student Name</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">Enrollment No</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">Uni Roll No</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground">Program & Center</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">Sem / Year</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground">Fee Paid</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-muted-foreground">
                            No students match your search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s, idx) => (
                          <tr key={s.id || idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 text-center text-muted-foreground font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-foreground">
                              <div>{s.studentName}</div>
                              {s.studentEmail && (
                                <div className="text-[10px] text-muted-foreground">{s.studentEmail}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-muted-foreground">
                              {s.enrollmentNo || 'N/A'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-muted-foreground">
                              {s.uniEnrollmentNumber || '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <p className="font-medium text-foreground truncate max-w-[180px]">{s.programName}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{s.centerName}</p>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge variant="outline" className="text-[11px] font-semibold bg-muted/40">
                                {s.semesterOrYear}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              ₹{s.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-[10px] font-medium border-0 gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Paid
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t border-border font-medium">
                      <tr>
                        <td colSpan={6} className="py-2.5 px-3 text-right text-muted-foreground">
                          Total For Listed Students ({filteredStudents.length}):
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                          ₹{filteredStudents.reduce((sum, s) => sum + (s.amount || 0), 0).toLocaleString('en-IN')}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="p-4 border-t border-border bg-card flex justify-between items-center sm:justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            <span>Identifier: <code className="font-mono">{identifier}</code></span>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
