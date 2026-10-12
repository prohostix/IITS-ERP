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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw, Download, Printer, Search, CheckCircle2, Clock,
  Building2, Layers, AlertCircle, FileText, ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export function FinanceReregPaymentReportPanel() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>({});
  const [universities, setUniversities] = useState<any[]>([]);
  const [completedRecords, setCompletedRecords] = useState<any[]>([]);
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);

  // Filter options
  const [allUniversities, setAllUniversities] = useState<any[]>([]);
  const [allCenters, setAllCenters] = useState<any[]>([]);
  const [allPrograms, setAllPrograms] = useState<any[]>([]);

  // Active filters
  const [selectedUniversity, setSelectedUniversity] = useState('all');
  const [selectedCenter, setSelectedCenter] = useState('all');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedUniversity, selectedCenter, selectedProgram, dateFrom, dateTo]);

  const fetchFilterOptions = async () => {
    try {
      const [uRes, cRes, pRes] = await Promise.all([
        api.get('/operations/universities'),
        api.get('/operations/centers'),
        api.get('/operations/programs')
      ]);
      setAllUniversities(uRes.data.data || []);
      setAllCenters(cRes.data.data || []);
      setAllPrograms(pRes.data.data || []);
    } catch (_e) {}
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedUniversity && selectedUniversity !== 'all') q.append('universityId', selectedUniversity);
      if (selectedCenter && selectedCenter !== 'all') q.append('centerId', selectedCenter);
      if (selectedProgram && selectedProgram !== 'all') q.append('programId', selectedProgram);
      if (dateFrom) q.append('dateFrom', dateFrom);
      if (dateTo) q.append('dateTo', dateTo);
      if (search) q.append('search', search);

      const res = await api.get(`/finance/reports/rereg-payments?${q.toString()}`);
      if (res.data.success) {
        setSummary(res.data.data.summary || {});
        setUniversities(res.data.data.universities || []);
        setCompletedRecords(res.data.data.completedRecords || []);
        setPendingRecords(res.data.data.pendingRecords || []);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to fetch re-registration fee report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (completedRecords.length === 0 && pendingRecords.length === 0) {
      toast.error('No re-registration data to export');
      return;
    }

    const headers = [
      'Type', 'Student Name', 'Enrollment No', 'University', 'Program',
      'Study Center', 'Installment', 'Amount (INR)', 'Status', 'Date', 'Reference/Invoice'
    ];

    const completedRows = completedRecords.map(r => [
      'Completed',
      `"${r.studentName || ''}"`,
      `"${r.enrollmentNumber || ''}"`,
      `"${r.universityName || ''}"`,
      `"${r.programName || ''}"`,
      `"${r.centerName || ''}"`,
      `"${r.installment || ''}"`,
      r.amount || 0,
      'Paid',
      `"${r.paidDate ? new Date(r.paidDate).toLocaleDateString('en-IN') : '-'}"`,
      `"${r.referenceNo || r.invoiceNo || ''}"`
    ]);

    const pendingRows = pendingRecords.map(r => [
      'Pending',
      `"${r.studentName || ''}"`,
      `"${r.enrollmentNumber || ''}"`,
      `"${r.universityName || ''}"`,
      `"${r.programName || ''}"`,
      `"${r.centerName || ''}"`,
      `"${r.installment || ''}"`,
      r.amount || 0,
      'Pending',
      '-',
      '-'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...completedRows.map(e => e.join(',')), ...pendingRows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reregistration_Fee_Payment_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const univRowsHtml = universities.map((u: any, idx: number) => {
      const total = Number(u.totalCollected || 0) + Number(u.totalPending || 0);
      const rate = total > 0 ? Math.round((Number(u.totalCollected || 0) / total) * 100) : 0;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${u.universityName}</td>
          <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #047857; font-weight: 600;">₹${Number(u.totalCollected).toLocaleString('en-IN')}</td>
          <td style="padding: 6px 8px; text-align: center; color: #047857; font-weight: 600;">${u.completedCount}</td>
          <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #b45309;">₹${Number(u.totalPending).toLocaleString('en-IN')}</td>
          <td style="padding: 6px 8px; text-align: center; color: #b45309;">${u.pendingCount}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: ${rate >= 75 ? '#047857' : '#b45309'};">${rate}%</td>
        </tr>
      `;
    }).join('');

    const completedRowsHtml = completedRecords.map((r: any, idx: number) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
        <td style="padding: 5px 6px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 5px 6px; font-weight: 600; color: #0f172a;">${r.studentName}</td>
        <td style="padding: 5px 6px; font-family: monospace; color: #475569;">${r.enrollmentNumber}</td>
        <td style="padding: 5px 6px; color: #334155;">${r.universityName}</td>
        <td style="padding: 5px 6px; color: #475569;">${r.programName}</td>
        <td style="padding: 5px 6px; color: #475569;">${r.centerName}</td>
        <td style="padding: 5px 6px; font-weight: 600; color: #4338ca;">${r.installment}</td>
        <td style="padding: 5px 6px; text-align: right; font-family: monospace; font-weight: 600; color: #047857;">₹${Number(r.amount).toLocaleString('en-IN')}</td>
        <td style="padding: 5px 6px; white-space: nowrap; color: #64748b;">${r.paidDate ? new Date(r.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
        <td style="padding: 5px 6px; font-family: monospace; color: #475569; font-size: 9px;">${r.referenceNo || r.invoiceNo || '-'}</td>
      </tr>
    `).join('');

    const pendingRowsHtml = pendingRecords.map((r: any, idx: number) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
        <td style="padding: 5px 6px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 5px 6px; font-weight: 600; color: #0f172a;">${r.studentName}</td>
        <td style="padding: 5px 6px; font-family: monospace; color: #475569;">${r.enrollmentNumber}</td>
        <td style="padding: 5px 6px; color: #334155;">${r.universityName}</td>
        <td style="padding: 5px 6px; color: #475569;">${r.programName}</td>
        <td style="padding: 5px 6px; color: #475569;">${r.centerName}</td>
        <td style="padding: 5px 6px; font-weight: 600; color: #b45309;">${r.installment}</td>
        <td style="padding: 5px 6px; text-align: right; font-family: monospace; font-weight: 600; color: #b45309;">₹${Number(r.amount).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reregistration_Fee_Payment_Report_${new Date().toISOString().split('T')[0]}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 10mm 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title-area h1 { margin: 0; font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          .title-area h2 { margin: 2px 0 0; font-size: 11px; color: #475569; font-weight: 600; }
          .meta-area { text-align: right; font-size: 10px; color: #475569; }
          .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
          .kpi-card { border: 1px solid #cbd5e1; border-radius: 5px; padding: 8px 12px; text-align: center; background: #f8fafc; }
          .kpi-label { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; }
          .kpi-value { font-size: 16px; font-weight: 800; margin-top: 2px; font-family: monospace; }
          .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 14px 0 6px; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
          th { background: #f1f5f9; color: #334155; font-size: 9px; text-transform: uppercase; font-weight: 700; padding: 6px; border-bottom: 1.5px solid #cbd5e1; }
          .footer-section { margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; color: #475569; page-break-inside: avoid; }
          .sig-box { border-top: 1px solid #64748b; width: 180px; text-align: center; padding-top: 5px; font-weight: 600; }
          .disclaimer { font-size: 8px; color: #94a3b8; text-align: center; margin-top: 15px; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-area">
            <h1>OFFICIAL RE-REGISTRATION FEE SCHEDULE & COLLECTIONS AUDIT REPORT</h1>
            <h2>Semester & Term Fee Realization, Outstanding Receivables, and University Disbursals</h2>
          </div>
          <div class="meta-area">
            <div><strong>Date of Issue:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div><strong>Filter Scope:</strong> ${selectedUniversity === 'all' ? 'All Partner Universities' : 'Filtered University'} | ${selectedCenter === 'all' ? 'All Centers' : 'Filtered Center'}</div>
          </div>
        </div>

        <div class="kpi-strip">
          <div class="kpi-card">
            <div class="kpi-label">Re-Reg Fees Collected</div>
            <div class="kpi-value" style="color: #047857;">₹${Number(summary.totalCollected || 0).toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Pending Re-Reg Fees</div>
            <div class="kpi-value" style="color: #b45309;">₹${Number(summary.totalPendingAmount || 0).toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Completed Installments</div>
            <div class="kpi-value" style="color: #047857;">${summary.completedCount || 0} Completed</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Pending Installments</div>
            <div class="kpi-value" style="color: #b45309;">${summary.pendingCount || 0} Pending</div>
          </div>
        </div>

        <div class="section-title">1. University-Wise Re-Registration Realization Summary (${universities.length} Universities)</div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 30px;">#</th>
              <th style="text-align: left;">University</th>
              <th style="text-align: right;">Collected (₹)</th>
              <th style="text-align: center; width: 70px;">Completed</th>
              <th style="text-align: right;">Pending (₹)</th>
              <th style="text-align: center; width: 70px;">Pending Count</th>
              <th style="text-align: center; width: 70px;">Realization</th>
            </tr>
          </thead>
          <tbody>
            ${univRowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 12px; color: #94a3b8;">No university data available</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">2. Completed Re-Registration Fee Payments (${completedRecords.length} Records)</div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 30px;">#</th>
              <th style="text-align: left;">Student Name</th>
              <th style="text-align: left;">Enrollment No</th>
              <th style="text-align: left;">University</th>
              <th style="text-align: left;">Program</th>
              <th style="text-align: left;">Study Center</th>
              <th style="text-align: left;">Installment</th>
              <th style="text-align: right;">Amount (₹)</th>
              <th style="text-align: left; width: 75px;">Paid Date</th>
              <th style="text-align: left;">Receipt / Invoice Ref</th>
            </tr>
          </thead>
          <tbody>
            ${completedRowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 12px; color: #94a3b8;">No completed records found</td></tr>'}
          </tbody>
        </table>

        ${pendingRecords.length > 0 ? `
          <div class="section-title">3. Pending Re-Registration Fee Schedules (${pendingRecords.length} Records)</div>
          <table>
            <thead>
              <tr>
                <th style="text-align: center; width: 30px;">#</th>
                <th style="text-align: left;">Student Name</th>
                <th style="text-align: left;">Enrollment No</th>
                <th style="text-align: left;">University</th>
                <th style="text-align: left;">Program</th>
                <th style="text-align: left;">Study Center</th>
                <th style="text-align: left;">Installment</th>
                <th style="text-align: right;">Pending Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${pendingRowsHtml}
            </tbody>
          </table>
        ` : ''}

        <div class="footer-section">
          <div class="sig-box">Prepared By (Fee Collection Officer)</div>
          <div class="sig-box">Audited By (Senior Accountant)</div>
          <div class="sig-box">Approved By (Financial Controller)</div>
        </div>

        <div class="disclaimer">
          CONFIDENTIAL INSTITUTIONAL AUDIT DOCUMENT &bull; Generated from ERP on ${new Date().toLocaleString('en-IN')} &bull; Page 1 of 1
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Re-Registration Fee Payment Report</h2>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Semester & Term Fees
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Consolidated tracking of student re-registration semester and term fees collected and pending across all universities.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Re-Reg Fees Collected</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              ₹{(summary.totalCollected || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {summary.completedCount || 0} completed installments
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Pending Re-Reg Fees</CardTitle>
            <Clock className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              ₹{(summary.totalPendingAmount || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {summary.pendingCount || 0} pending installments
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Total Enrolled Students</CardTitle>
            <Layers className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {summary.totalStudentsCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Active re-registration candidates</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Partner Universities</CardTitle>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {universities.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">University partners offering programs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-[180px]">
              <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
                <SelectTrigger>
                  <SelectValue placeholder="All Universities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Universities</SelectItem>
                  {allUniversities.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Centers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Centers</SelectItem>
                  {allCenters.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger>
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {allPrograms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">From:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-[130px] text-xs h-9"
              />
              <span className="text-xs text-slate-500">To:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-[130px] text-xs h-9"
              />
            </div>
          </div>

          <div className="relative w-full sm:w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search student, enrollment..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchReport()}
              className="pl-8 text-xs h-9 bg-slate-50/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="university_summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="university_summary" className="gap-1.5">
            <Building2 className="w-4 h-4" /> University Summary ({universities.length})
          </TabsTrigger>
          <TabsTrigger value="completed_payments" className="gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Completed ({completedRecords.length})
          </TabsTrigger>
          <TabsTrigger value="pending_rereg" className="gap-1.5">
            <Clock className="w-4 h-4" /> Pending ({pendingRecords.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: University Summary */}
        <TabsContent value="university_summary" className="pt-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                University-Wise Re-Registration Collections
              </CardTitle>
              <CardDescription>
                Summary of re-registration fees realized and pending across partner universities.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading re-registration collection summary...</div>
              ) : universities.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No re-registration records found.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">University Name</th>
                        <th className="px-4 py-3 text-right">Collected Fees</th>
                        <th className="px-4 py-3 text-right">Pending Dues</th>
                        <th className="px-4 py-3 text-center">Completed Payments</th>
                        <th className="px-4 py-3 text-center">Pending Dues Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {universities.map(u => (
                        <tr key={u.universityId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 font-medium text-slate-900 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span>{u.universityName}</span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                            ₹{u.totalCollected.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-amber-700">
                            ₹{u.totalPending.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold text-emerald-700">
                            {u.completedCount}
                          </td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold text-amber-700">
                            {u.pendingCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/80 font-bold border-t text-xs text-slate-900">
                      <tr>
                        <td className="px-4 py-3">Total</td>
                        <td className="px-4 py-3 text-right text-emerald-700">₹{(summary.totalCollected || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right text-amber-700">₹{(summary.totalPendingAmount || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-center">{summary.completedCount || 0}</td>
                        <td className="px-4 py-3 text-center">{summary.pendingCount || 0}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Completed Payments */}
        <TabsContent value="completed_payments" className="pt-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                Completed Re-Registration Payments
              </CardTitle>
              <CardDescription>
                Detailed receipts of collected re-registration semester and term fees.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading completed payments...</div>
              ) : completedRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No completed re-registration records match filters.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">Student</th>
                        <th className="px-4 py-3 text-left">University & Program</th>
                        <th className="px-4 py-3 text-left">Study Center</th>
                        <th className="px-4 py-3 text-center">Installment</th>
                        <th className="px-4 py-3 text-right">Amount Paid</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-left">Invoice / Receipt</th>
                        <th className="px-4 py-3 text-center">Paid Date</th>
                        <th className="px-4 py-3 text-left">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {completedRecords.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            <div>{item.studentName}</div>
                            <div className="text-xs text-slate-400 font-mono">{item.enrollmentNumber}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{item.universityName}</div>
                            <div className="text-xs text-slate-500">{item.programName}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div>{item.centerName}</div>
                            {item.branchName && (
                              <div className="text-[10px] text-slate-400">{item.branchName}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className="font-semibold text-xs text-slate-700 bg-slate-50">
                              {item.installment}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 capitalize">
                              Paid
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 font-mono">
                            {item.invoiceNo || item.referenceNo || '-'}
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-slate-500">
                            {item.paidDate ? new Date(item.paidDate).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {item.paymentMethod || 'Online'}
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

        {/* Tab 3: Pending Records */}
        <TabsContent value="pending_rereg" className="pt-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                Pending Re-Registrations
              </CardTitle>
              <CardDescription>
                Students scheduled for subsequent semester or annual re-registration fees awaiting collection.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading pending re-registrations...</div>
              ) : pendingRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No pending re-registrations found.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">Student</th>
                        <th className="px-4 py-3 text-left">University & Program</th>
                        <th className="px-4 py-3 text-left">Study Center</th>
                        <th className="px-4 py-3 text-center">Scheduled Installment</th>
                        <th className="px-4 py-3 text-right">Fee Due</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingRecords.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            <div>{item.studentName}</div>
                            <div className="text-xs text-slate-400 font-mono">{item.enrollmentNumber}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{item.universityName}</div>
                            <div className="text-xs text-slate-500">{item.programName}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div>{item.centerName}</div>
                            {item.branchName && (
                              <div className="text-[10px] text-slate-400">{item.branchName}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className="font-semibold text-xs text-amber-700 bg-amber-50 border-amber-200">
                              {item.installment}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-amber-700">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 capitalize">
                              Pending
                            </Badge>
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
    </div>
  );
}
