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
  Landmark, ArrowDownLeft, ArrowUpRight, RefreshCw, Download, Printer,
  Search, CheckCircle2, Clock, AlertCircle, IndianRupee, Eye, Building2,
  Calendar, Layers, Filter
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { toast } from 'sonner';

export function FinanceCommissionUniversityReportPanel() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>({});
  const [universities, setUniversities] = useState<any[]>([]);
  const [details, setDetails] = useState<any[]>([]);
  const [allUniversitiesList, setAllUniversitiesList] = useState<any[]>([]);
  const [allCentersList, setAllCentersList] = useState<any[]>([]);

  // Filters
  const [selectedUniversity, setSelectedUniversity] = useState('all');
  const [selectedCenter, setSelectedCenter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  // Drilldown dialog
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Mark Received dialog
  const [receiveItem, setReceiveItem] = useState<any | null>(null);
  const [receiveForm, setReceiveForm] = useState({
    receivedAmount: '',
    paymentDetails: '',
    centerPayoutAmount: '0'
  });
  const [submittingReceive, setSubmittingReceive] = useState(false);

  useEffect(() => {
    fetchUniversitiesList();
    fetchCentersList();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedUniversity, selectedCenter, selectedStatus, dateFrom, dateTo]);

  const fetchUniversitiesList = async () => {
    try {
      const res = await api.get('/operations/universities');
      setAllUniversitiesList(res.data.data || []);
    } catch (_e) {}
  };

  const fetchCentersList = async () => {
    try {
      const res = await api.get('/operations/centers');
      setAllCentersList(res.data.data || []);
    } catch (_e) {}
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedUniversity && selectedUniversity !== 'all') q.append('universityId', selectedUniversity);
      if (selectedCenter && selectedCenter !== 'all') q.append('centerId', selectedCenter);
      if (selectedStatus && selectedStatus !== 'all') q.append('status', selectedStatus);
      if (dateFrom) q.append('dateFrom', dateFrom);
      if (dateTo) q.append('dateTo', dateTo);
      if (search) q.append('search', search);

      const res = await api.get(`/finance/reports/commission-against-university?${q.toString()}`);
      if (res.data.success) {
        setSummary(res.data.data.summary || {});
        setUniversities(res.data.data.universities || []);
        setDetails(res.data.data.details || []);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to fetch university commission report');
    } finally {
      setLoading(false);
    }
  };

  const openReceive = (item: any) => {
    setReceiveItem(item);
    const diff = item.expectedAmount - item.receivedAmount;
    setReceiveForm({
      receivedAmount: String(diff > 0 ? diff : item.expectedAmount),
      paymentDetails: '',
      centerPayoutAmount: '0'
    });
  };

  const handleReceiveSubmit = async () => {
    if (!receiveForm.receivedAmount || isNaN(Number(receiveForm.receivedAmount))) {
      toast.error('Please enter a valid amount');
      return;
    }
    setSubmittingReceive(true);
    try {
      await api.post(`/commissions/in/${receiveItem.id}/receive`, receiveForm);
      toast.success('University commission marked as received');
      setReceiveItem(null);
      fetchReport();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit receipt');
    } finally {
      setSubmittingReceive(false);
    }
  };

  const handleExportCSV = () => {
    if (details.length === 0) {
      toast.error('No commission data to export');
      return;
    }

    const headers = [
      'Student Name', 'Enrollment No', 'University', 'Program', 'Study Center',
      'Expected Commission (INR)', 'Received Commission (INR)', 'Pending Commission (INR)',
      'Status', 'Received Date', 'Payment Details'
    ];

    const rows = details.map(d => [
      `"${d.studentName || ''}"`,
      `"${d.enrollmentNumber || ''}"`,
      `"${d.universityName || ''}"`,
      `"${d.programName || ''}"`,
      `"${d.studyCenterName || ''}"`,
      d.expectedAmount || 0,
      d.receivedAmount || 0,
      d.pendingAmount || 0,
      `"${d.status || ''}"`,
      `"${d.receivedAt ? new Date(d.receivedAt).toLocaleDateString('en-IN') : '-'}"`,
      `"${d.paymentDetails || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Commission_Report_Against_University_${new Date().toISOString().split('T')[0]}.csv`);
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

    const univRowsHtml = universities.map((u: any, idx: number) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 6px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${u.universityName}</td>
        <td style="padding: 6px 8px; text-align: center;">${u.studentsCount}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace;">₹${Number(u.expectedCommission).toLocaleString('en-IN')}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #047857; font-weight: 600;">₹${Number(u.receivedCommission).toLocaleString('en-IN')}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; color: #b45309;">₹${Number(u.pendingCommission).toLocaleString('en-IN')}</td>
        <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: ${u.collectionRate >= 75 ? '#047857' : '#b45309'};">${u.collectionRate}%</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace;">₹${Number(u.centerPayoutsPaid).toLocaleString('en-IN')}</td>
        <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: 700; color: #1d4ed8;">₹${Number(u.netRetained).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const detailRowsHtml = details.map((d: any, idx: number) => {
      const isReceived = d.status === 'received';
      const statusBg = isReceived ? '#d1fae5' : '#fef3c7';
      const statusColor = isReceived ? '#047857' : '#b45309';
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
          <td style="padding: 5px 6px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 5px 6px; font-weight: 600; color: #0f172a;">${d.studentName}</td>
          <td style="padding: 5px 6px; font-family: monospace; color: #475569;">${d.enrollmentNumber}</td>
          <td style="padding: 5px 6px; color: #334155;">${d.universityName}</td>
          <td style="padding: 5px 6px; color: #475569;">${d.programName}</td>
          <td style="padding: 5px 6px; color: #475569;">${d.studyCenterName}</td>
          <td style="padding: 5px 6px; text-align: right; font-family: monospace;">₹${Number(d.expectedAmount).toLocaleString('en-IN')}</td>
          <td style="padding: 5px 6px; text-align: right; font-family: monospace; color: #047857; font-weight: 600;">₹${Number(d.receivedAmount).toLocaleString('en-IN')}</td>
          <td style="padding: 5px 6px; text-align: right; font-family: monospace; color: #b45309;">₹${Number(d.pendingAmount).toLocaleString('en-IN')}</td>
          <td style="padding: 5px 6px; text-align: center;">
            <span style="background: ${statusBg}; color: ${statusColor}; padding: 1px 5px; border-radius: 3px; font-weight: 600; font-size: 9px; text-transform: uppercase;">${d.status}</span>
          </td>
          <td style="padding: 5px 6px; white-space: nowrap; color: #64748b;">${d.receivedAt ? new Date(d.receivedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>University_Commission_Report_${new Date().toISOString().split('T')[0]}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 10mm 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title-area h1 { margin: 0; font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          .title-area h2 { margin: 2px 0 0; font-size: 11px; color: #475569; font-weight: 600; }
          .meta-area { text-align: right; font-size: 10px; color: #475569; }
          .kpi-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 14px; }
          .kpi-card { border: 1px solid #cbd5e1; border-radius: 5px; padding: 8px 10px; text-align: center; background: #f8fafc; }
          .kpi-label { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; }
          .kpi-value { font-size: 15px; font-weight: 800; margin-top: 2px; font-family: monospace; }
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
            <h1>OFFICIAL UNIVERSITY COMMISSION AUDIT & REALIZATION REPORT</h1>
            <h2>University-wise Referral Commissions, Settlement & Center Payout Liabilities</h2>
          </div>
          <div class="meta-area">
            <div><strong>Date of Issue:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div><strong>Filter Scope:</strong> ${selectedUniversity === 'all' ? 'All Partner Universities' : 'Filtered University'} | Status: ${selectedStatus.toUpperCase()}</div>
          </div>
        </div>

        <div class="kpi-strip">
          <div class="kpi-card">
            <div class="kpi-label">Expected Commission</div>
            <div class="kpi-value" style="color: #4338ca;">₹${Number(summary.totalExpectedCommission || 0).toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Received Commission</div>
            <div class="kpi-value" style="color: #047857;">₹${Number(summary.totalReceivedCommission || 0).toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Pending Receivable</div>
            <div class="kpi-value" style="color: #b45309;">₹${Number(summary.totalPendingCommission || 0).toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Center Payouts Paid</div>
            <div class="kpi-value" style="color: #be123c;">₹${Number(summary.totalPayoutPaid || 0).toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Retained Margin</div>
            <div class="kpi-value" style="color: #1d4ed8;">₹${Number(summary.netOrganizationMargin || 0).toLocaleString('en-IN')} (${summary.realizationRate || 0}%)</div>
          </div>
        </div>

        <div class="section-title">1. University-Wise Realization Summary (${universities.length} Universities)</div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 30px;">#</th>
              <th style="text-align: left;">University</th>
              <th style="text-align: center; width: 60px;">Students</th>
              <th style="text-align: right;">Expected (₹)</th>
              <th style="text-align: right;">Received (₹)</th>
              <th style="text-align: right;">Pending (₹)</th>
              <th style="text-align: center; width: 60px;">Realized</th>
              <th style="text-align: right;">Center Paid (₹)</th>
              <th style="text-align: right;">Retained (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${univRowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 12px; color: #94a3b8;">No university data available</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">2. Detailed Student Referral Commission Ledger (${details.length} Records)</div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 30px;">#</th>
              <th style="text-align: left;">Student Name</th>
              <th style="text-align: left;">Enrollment No</th>
              <th style="text-align: left;">University</th>
              <th style="text-align: left;">Program</th>
              <th style="text-align: left;">Study Center</th>
              <th style="text-align: right;">Expected (₹)</th>
              <th style="text-align: right;">Received (₹)</th>
              <th style="text-align: right;">Pending (₹)</th>
              <th style="text-align: center; width: 70px;">Status</th>
              <th style="text-align: left; width: 80px;">Received Date</th>
            </tr>
          </thead>
          <tbody>
            ${detailRowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 12px; color: #94a3b8;">No records found</td></tr>'}
          </tbody>
        </table>

        <div class="footer-section">
          <div class="sig-box">Prepared By (Accounts Officer)</div>
          <div class="sig-box">Audited By (Internal Audit)</div>
          <div class="sig-box">Approved By (Chief Financial Officer)</div>
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
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Commission Report Against University</h2>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Live Realization
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Aggregated university-wise referral commissions expected, received, and center payout obligations.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Expected Commission</CardTitle>
            <ArrowDownLeft className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-900">
              ₹{(summary.totalExpectedCommission || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">Across all universities</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Received Commission</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-700">
              ₹{(summary.totalReceivedCommission || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {summary.realizationRate || 0}% Realized
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Pending From University</CardTitle>
            <Clock className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-700">
              ₹{(summary.totalPendingCommission || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">Awaiting bank settlement</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-rose-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Paid to Study Centers</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-rose-700">
              ₹{(summary.totalPayoutPaid || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ₹{(summary.totalPayoutPending || 0).toLocaleString('en-IN')} pending
            </p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Net Retained Margin</CardTitle>
            <Landmark className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-700">
              ₹{(summary.netOrganizationMargin || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">Org retained revenue</p>
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
                  {allUniversitiesList.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Study Centers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Study Centers</SelectItem>
                  {allCentersList.map(c => (
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">From:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-[140px] text-xs h-9"
              />
              <span className="text-xs text-slate-500">To:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-[140px] text-xs h-9"
              />
            </div>
          </div>

          <div className="relative w-full sm:w-[260px]">
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

      {/* Tabs View */}
      <Tabs defaultValue="university_summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="university_summary" className="gap-1.5">
            <Building2 className="w-4 h-4" /> University Summary ({universities.length})
          </TabsTrigger>
          <TabsTrigger value="detailed_records" className="gap-1.5">
            <Layers className="w-4 h-4" /> Student Records ({details.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: University Summary */}
        <TabsContent value="university_summary" className="pt-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                University-Wise Commission Breakdown
              </CardTitle>
              <CardDescription>
                Summary of earnings, receipts, center payouts, and retained margins for each partner university.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading university commission breakdown...</div>
              ) : universities.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No university commission records found for selected filters.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">University Name</th>
                        <th className="px-4 py-3 text-center">Enrollments</th>
                        <th className="px-4 py-3 text-right">Expected Commission</th>
                        <th className="px-4 py-3 text-right">Received Commission</th>
                        <th className="px-4 py-3 text-right">Pending Due</th>
                        <th className="px-4 py-3 text-right">Center Payouts</th>
                        <th className="px-4 py-3 text-right">Net Retained</th>
                        <th className="px-4 py-3 text-center">Collection %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {universities.map(u => (
                        <tr key={u.universityId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              <span>{u.universityName}</span>
                              {u.universityCode && u.universityCode !== 'N/A' && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-slate-500">
                                  {u.universityCode}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center font-semibold text-slate-700">
                            {u.studentsCount}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                            ₹{u.expectedCommission.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">
                            ₹{u.receivedCommission.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-amber-700">
                            ₹{u.pendingCommission.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 text-right text-rose-700 font-medium">
                            ₹{u.centerPayoutsPaid.toLocaleString('en-IN')}
                            <span className="text-[10px] text-slate-400 block">
                              of ₹{u.centerPayoutsExpected.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-blue-700">
                            ₹{u.netRetained.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full"
                                  style={{ width: `${Math.min(100, u.collectionRate)}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-slate-700">
                                {u.collectionRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/80 font-bold border-t text-xs text-slate-900">
                      <tr>
                        <td className="px-4 py-3">Grand Total</td>
                        <td className="px-4 py-3 text-center">{summary.totalRecords || 0}</td>
                        <td className="px-4 py-3 text-right">₹{(summary.totalExpectedCommission || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right text-emerald-700">₹{(summary.totalReceivedCommission || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right text-amber-700">₹{(summary.totalPendingCommission || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right text-rose-700">₹{(summary.totalPayoutPaid || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right text-blue-700">₹{(summary.netOrganizationMargin || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-center">{summary.realizationRate || 0}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Detailed Records */}
        <TabsContent value="detailed_records" className="pt-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                Student Commission Ledger Records
              </CardTitle>
              <CardDescription>
                Detailed list of commission records generated for student enrollments across all universities.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading student commission records...</div>
              ) : details.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No records found matching current filters.</div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b">
                      <tr>
                        <th className="px-4 py-3 text-left">Student / Enrollment</th>
                        <th className="px-4 py-3 text-left">University & Program</th>
                        <th className="px-4 py-3 text-left">Study Center</th>
                        <th className="px-4 py-3 text-right">Expected</th>
                        <th className="px-4 py-3 text-right">Received</th>
                        <th className="px-4 py-3 text-right">Pending</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Received Date</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {details.map(item => (
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
                            <div>{item.studyCenterName}</div>
                            {item.studyCenterCode && (
                              <span className="text-[10px] text-slate-400 font-mono">({item.studyCenterCode})</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            ₹{item.expectedAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                            {item.receivedAmount > 0 ? `₹${item.receivedAmount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-amber-700">
                            {item.pendingAmount > 0 ? `₹${item.pendingAmount.toLocaleString('en-IN')}` : '₹0'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant="secondary"
                              className={
                                item.status === 'received'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.receivedAmount > 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }
                            >
                              {item.receivedAmount > 0 && item.status === 'pending' ? 'Partial' : item.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-slate-500">
                            {item.receivedAt ? new Date(item.receivedAt).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {item.pendingAmount > 0 && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => openReceive(item)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs px-2.5"
                                >
                                  Mark Received
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedRecord(item)}
                                className="h-7 text-xs px-2 text-slate-600"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </div>
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

      {/* Record Details Dialog */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Commission Record Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm py-2">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border">
                <div>
                  <div className="text-xs text-slate-500">Student Name</div>
                  <div className="font-semibold text-slate-900">{selectedRecord.studentName}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Enrollment Number</div>
                  <div className="font-semibold text-slate-900">{selectedRecord.enrollmentNumber}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">University</div>
                  <div className="font-semibold text-slate-900">{selectedRecord.universityName}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Program</div>
                  <div className="font-semibold text-slate-900">{selectedRecord.programName}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Study Center</div>
                  <div className="font-semibold text-slate-900">{selectedRecord.studyCenterName}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Status</div>
                  <Badge variant="outline" className="capitalize">{selectedRecord.status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="text-xs text-indigo-600 font-medium">Expected</div>
                  <div className="text-base font-bold text-indigo-900">₹{selectedRecord.expectedAmount.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="text-xs text-emerald-600 font-medium">Received</div>
                  <div className="text-base font-bold text-emerald-900">₹{selectedRecord.receivedAmount.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="text-xs text-amber-600 font-medium">Pending</div>
                  <div className="text-base font-bold text-amber-900">₹{selectedRecord.pendingAmount.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {selectedRecord.paymentDetails && (
                <div className="p-3 bg-slate-50 rounded-lg border text-xs">
                  <span className="font-semibold text-slate-700">Bank Details / Remarks: </span>
                  <span className="text-slate-600">{selectedRecord.paymentDetails}</span>
                </div>
              )}

              {selectedRecord.centerPayouts && selectedRecord.centerPayouts.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Center Payouts</h4>
                  <div className="border rounded-lg divide-y text-xs">
                    {selectedRecord.centerPayouts.map((p: any) => (
                      <div key={p.id} className="p-2 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-800">{p.studyCenterName}</div>
                          <div className="text-[10px] text-slate-400">Status: {p.status}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">₹{p.amount.toLocaleString('en-IN')}</div>
                          {p.tdsAmount > 0 && (
                            <div className="text-[10px] text-slate-400">Net: ₹{p.netAmount?.toLocaleString('en-IN')}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Mark Received Dialog */}
      {receiveItem && (
        <Dialog open={!!receiveItem} onOpenChange={() => setReceiveItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Receive University Commission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 p-3 rounded-lg border text-xs space-y-1">
                <div><span className="text-slate-500">Student:</span> <span className="font-semibold">{receiveItem.studentName}</span></div>
                <div><span className="text-slate-500">University:</span> <span className="font-semibold">{receiveItem.universityName}</span></div>
                <div><span className="text-slate-500">Expected:</span> <span className="font-bold text-indigo-700">₹{receiveItem.expectedAmount.toLocaleString('en-IN')}</span></div>
              </div>

              <div>
                <Label className="text-xs font-medium">Received Amount (₹)</Label>
                <Input
                  type="number"
                  value={receiveForm.receivedAmount}
                  onChange={e => setReceiveForm({ ...receiveForm, receivedAmount: e.target.value })}
                  placeholder="Amount received from university"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Payment Reference / UTR</Label>
                <Input
                  value={receiveForm.paymentDetails}
                  onChange={e => setReceiveForm({ ...receiveForm, paymentDetails: e.target.value })}
                  placeholder="e.g., NEFT/UTR-12839219"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Allocated Center Payout (₹) (Optional)</Label>
                <Input
                  type="number"
                  value={receiveForm.centerPayoutAmount}
                  onChange={e => setReceiveForm({ ...receiveForm, centerPayoutAmount: e.target.value })}
                  placeholder="Amount to pay out to study center"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReceiveItem(null)}>Cancel</Button>
              <Button
                onClick={handleReceiveSubmit}
                disabled={submittingReceive}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submittingReceive ? 'Saving...' : 'Confirm Receipt'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
