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
  Wallet, RefreshCw, Download, Printer, Search, ArrowLeft,
  ArrowDownLeft, ArrowUpRight, Building2, Phone, Mail, MapPin,
  CheckCircle2, Clock, AlertCircle, Eye, Filter, Landmark
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export function FinanceCenterLedgerPanel({ initialCenterId }: { initialCenterId?: string } = {}) {
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Selected center mode
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(initialCenterId || null);

  useEffect(() => {
    if (initialCenterId) {
      setSelectedCenterId(initialCenterId);
    }
  }, [initialCenterId]);

  // Centers list mode
  const [centers, setCenters] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [search, setSearch] = useState('');

  // Detailed Ledger state
  const [ledgerData, setLedgerData] = useState<any | null>(null);

  // Detailed ledger filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');

  useEffect(() => {
    fetchCenterList();
  }, []);

  useEffect(() => {
    if (selectedCenterId) {
      fetchCenterLedgerDetails(selectedCenterId);
    }
  }, [selectedCenterId, typeFilter, dateFrom, dateTo]);

  const fetchCenterList = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.append('search', search);

      const res = await api.get(`/finance/center-ledger?${q.toString()}`);
      if (res.data.success) {
        setCenters(res.data.data.centers || []);
        setSummary(res.data.data.summary || {});
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to fetch center ledger accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchCenterLedgerDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const q = new URLSearchParams();
      if (typeFilter && typeFilter !== 'all') q.append('type', typeFilter);
      if (dateFrom) q.append('dateFrom', dateFrom);
      if (dateTo) q.append('dateTo', dateTo);
      if (ledgerSearch) q.append('search', ledgerSearch);

      const res = await api.get(`/finance/center-ledger/${id}?${q.toString()}`);
      if (res.data.success) {
        setLedgerData(res.data.data);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to fetch study center statement of account');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExportCSV = () => {
    if (!ledgerData || !ledgerData.ledger?.length) {
      toast.error('No ledger transactions to export');
      return;
    }

    const headers = [
      'Date', 'Type', 'Category', 'Description', 'Reference / UTR',
      'Debit (INR)', 'Credit (INR)', 'Running Balance (INR)', 'Payment Method', 'Verified By'
    ];

    const rows = ledgerData.ledger.map((e: any) => [
      `"${new Date(e.date).toLocaleString('en-IN')}"`,
      `"${e.type.toUpperCase()}"`,
      `"${e.category}"`,
      `"${e.description}"`,
      `"${e.reference || ''}"`,
      e.debit || 0,
      e.credit || 0,
      e.runningBalance || 0,
      `"${e.method || ''}"`,
      `"${e.verifiedBy || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Center_Ledger_${ledgerData.center.code || 'center'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Center statement exported successfully');
  };

  const handlePrint = () => {
    if (!ledgerData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const { center, summary, ledger } = ledgerData;
    const rowsHtml = (ledger || []).map((e: any, idx: number) => {
      const typeLabel = e.type === 'credit' ? 'CREDIT (+)' : 'DEBIT (-)';
      const typeColor = e.type === 'credit' ? '#047857' : '#be123c';
      const typeBg = e.type === 'credit' ? '#d1fae5' : '#ffe4e6';
      const debitStr = e.debit > 0 ? `₹${Number(e.debit).toLocaleString('en-IN')}` : '-';
      const creditStr = e.credit > 0 ? `₹${Number(e.credit).toLocaleString('en-IN')}` : '-';
      const balStr = `₹${Number(e.runningBalance).toLocaleString('en-IN')}`;
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
            <div>${e.reference || '-'}</div>
            <div style="color: #94a3b8; font-size: 9px;">${e.method || ''}</div>
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
        <title>Center_Statement_${center.code || 'Center'}</title>
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
            <h1>${center.name} (${center.code || 'CENTER'})</h1>
            <h2>OFFICIAL STUDY CENTER WALLET STATEMENT OF ACCOUNT</h2>
          </div>
          <div class="meta-area">
            <div><strong>Date of Issue:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div><strong>Statement Ref:</strong> CTR-STMT-${center.code || center.id.slice(0, 8)}</div>
          </div>
        </div>

        <div class="info-grid">
          <div>
            <div class="info-item"><strong>Center Name:</strong> <span style="font-weight: 700; color: #0f172a;">${center.name}</span></div>
            <div class="info-item"><strong>Center Code:</strong> <span style="font-family: monospace; font-weight: 700;">${center.code}</span></div>
            <div class="info-item"><strong>Location:</strong> ${center.city || ''} ${center.state ? `, ${center.state}` : ''}</div>
          </div>
          <div>
            <div class="info-item"><strong>Coordinator:</strong> ${center.coordinatorName || 'Center Admin'}</div>
            <div class="info-item"><strong>Contact:</strong> ${center.phone || ''} ${center.email ? `| ${center.email}` : ''}</div>
            <div class="info-item"><strong>Branch:</strong> ${center.branchName || 'Main'}</div>
          </div>
        </div>

        <div class="kpi-strip">
          <div class="kpi-card" style="background: #ecfdf5; border-color: #a7f3d0;">
            <div class="kpi-label" style="color: #047857;">Total Credits (Top-Ups & Comms)</div>
            <div class="kpi-value" style="color: #047857;">₹${summary.totalCredits.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card" style="background: #fff1f2; border-color: #fecdd3;">
            <div class="kpi-label" style="color: #be123c;">Total Debits (Enrollments & Fees)</div>
            <div class="kpi-value" style="color: #be123c;">₹${summary.totalDebits.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card" style="background: #f8fafc; border-color: #cbd5e1;">
            <div class="kpi-label" style="color: #0f172a;">Closing Wallet Balance</div>
            <div class="kpi-value" style="color: #0f172a;">₹${center.currentWalletBalance.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th style="width: 80px; text-align: left;">Date</th>
              <th style="width: 80px; text-align: center;">Type</th>
              <th style="text-align: left;">Category & Description</th>
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
              <td style="padding: 9px; text-align: right; color: #be123c; font-family: monospace;">₹${summary.totalDebits.toLocaleString('en-IN')}</td>
              <td style="padding: 9px; text-align: right; color: #047857; font-family: monospace;">₹${summary.totalCredits.toLocaleString('en-IN')}</td>
              <td style="padding: 9px; text-align: right; color: #0f172a; font-family: monospace;">₹${center.currentWalletBalance.toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer-section">
          <div>
            <div style="font-weight: 600; margin-bottom: 3px;">Accounts & Verification Note:</div>
            <div style="font-size: 10px; color: #64748b; max-width: 320px;">
              Official record of wallet top-ups, commissions, and student admission deductions processed through institutional finance.
            </div>
          </div>
          <div style="display: flex; gap: 40px;">
            <div class="sig-box">
              Verified by Finance Officer
            </div>
            <div class="sig-box">
              Authorized Signatory
            </div>
          </div>
        </div>

        <div class="disclaimer">
          Generated automatically by University ERP System on ${new Date().toLocaleString('en-IN')}.
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
  // DETAIL VIEW (Statement of Account for Selected Center)
  // ══════════════════════════════════════════════════════════════════════════
  if (selectedCenterId) {
    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedCenterId(null); setLedgerData(null); }}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Center List
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Center Statement of Account
              </h2>
              <p className="text-xs text-slate-500">
                Study center wallet ledger journal of top-up credits, enrollment debits, and running balance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Switcher */}
            <div className="w-[200px]">
              <Select value={selectedCenterId} onValueChange={v => setSelectedCenterId(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Switch Center" />
                </SelectTrigger>
                <SelectContent>
                  {centers.map(c => (
                    <SelectItem key={c.centerId} value={c.centerId}>
                      {c.centerName} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchCenterLedgerDetails(selectedCenterId)}
              disabled={loadingDetails}
              className="gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDetails ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
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
            Loading study center ledger statement...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Center Profile Banner */}
            <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-slate-50/50 via-white to-emerald-50/20">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-lg shadow-sm">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900">{ledgerData.center.name}</h3>
                        <Badge variant="outline" className="font-mono text-xs">
                          {ledgerData.center.code}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        {ledgerData.center.city && (
                          <div><MapPin className="w-3 h-3 inline mr-1" />{ledgerData.center.city}, {ledgerData.center.state}</div>
                        )}
                        {ledgerData.center.coordinatorName && (
                          <div><span className="font-semibold text-slate-700">Coordinator:</span> {ledgerData.center.coordinatorName}</div>
                        )}
                        {ledgerData.center.phone && (
                          <div><Phone className="w-3 h-3 inline mr-1" />{ledgerData.center.phone}</div>
                        )}
                        {ledgerData.center.email && (
                          <div><Mail className="w-3 h-3 inline mr-1" />{ledgerData.center.email}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Wallet KPI Strip */}
                  <div className="grid grid-cols-3 gap-3 border rounded-xl p-3 bg-white shadow-sm min-w-[340px]">
                    <div className="text-center">
                      <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Total Credits</div>
                      <div className="text-lg font-bold text-emerald-700">₹{ledgerData.summary.totalCredits.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="text-center border-x px-2">
                      <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Total Debits</div>
                      <div className="text-lg font-bold text-rose-700">₹{ledgerData.summary.totalDebits.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Current Wallet</div>
                      <div className="text-xl font-extrabold text-slate-900">
                        ₹{ledgerData.center.currentWalletBalance.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Filter Bar for Journal */}
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-[150px]">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Transactions</SelectItem>
                        <SelectItem value="credit">Credits Only (Top-Ups)</SelectItem>
                        <SelectItem value="debit">Debits Only (Fees)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">From:</span>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="w-[130px] text-xs h-8"
                    />
                    <span className="text-xs text-slate-500">To:</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="w-[130px] text-xs h-8"
                    />
                  </div>
                </div>

                <div className="relative w-full sm:w-[240px]">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search reference, student..."
                    value={ledgerSearch}
                    onChange={e => setLedgerSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchCenterLedgerDetails(selectedCenterId)}
                    className="pl-8 text-xs h-8 bg-slate-50/50"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Statement Table */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Wallet Statement of Account
                  </CardTitle>
                  <CardDescription>
                    Complete ledger record of wallet credits (top-ups, commissions) and debits (enrollment fees, invoices).
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {ledgerData.ledger?.length || 0} Entries
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {ledgerData.ledger.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">No transactions recorded for this study center.</div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b">
                        <tr>
                          <th className="px-4 py-3 text-left">Date & Time</th>
                          <th className="px-4 py-3 text-center">Type</th>
                          <th className="px-4 py-3 text-left">Category & Description</th>
                          <th className="px-4 py-3 text-left">Reference / Method</th>
                          <th className="px-4 py-3 text-right">Debit (INR)</th>
                          <th className="px-4 py-3 text-right">Credit (INR)</th>
                          <th className="px-4 py-3 text-right">Running Wallet Balance</th>
                          <th className="px-4 py-3 text-left">Verified By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerData.ledger.map((e: any) => (
                          <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                              {new Date(e.date).toLocaleString('en-IN', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
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
                              <div className="font-mono text-slate-700">{e.reference || '-'}</div>
                              <div className="text-[10px] text-slate-400 capitalize">{e.method?.replace('_', ' ') || ''}</div>
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
                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                              {e.verifiedBy}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50/80 font-bold border-t text-xs text-slate-900">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-right">Totals for Selected Period</td>
                          <td className="px-4 py-3 text-right text-rose-700">₹{ledgerData.summary.totalDebits.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-right text-emerald-700">₹{ledgerData.summary.totalCredits.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                            ₹{ledgerData.center.currentWalletBalance.toLocaleString('en-IN')}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DIRECTORY VIEW (Searchable List of All Study Centers)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Center Ledger</h2>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Study Center Accounts
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Study center wallet liquidity, top-up history, student enrollment deductions, and statements of account.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchCenterList} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Total Wallet Liquidity</CardTitle>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              ₹{(summary.totalLiquidity || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">Live balances across all centers</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Total Top-Ups Credited</CardTitle>
            <ArrowDownLeft className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              ₹{(summary.totalTopUpsAll || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">Approved wallet top-ups</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-rose-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Total Enrollment Debits</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-700">
              ₹{(summary.totalDebitsAll || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 mt-1">Deducted for student admissions</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-600">Registered Study Centers</CardTitle>
            <Building2 className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {summary.totalCenters || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">Partner centers with active wallets</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter / Search Bar */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="text-sm font-semibold text-slate-700">
            Study Centers Directory ({centers.length})
          </div>
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search center name, code, city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchCenterList()}
              className="pl-8 text-xs h-9 bg-slate-50/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Centers Directory Table */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">
            Study Center Accounts
          </CardTitle>
          <CardDescription>
            Select a center to inspect its live wallet balance and complete statement of account.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading study center ledger accounts...</div>
          ) : centers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No study centers match the search criteria.</div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">Center Name & Code</th>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-left">Coordinator / Contact</th>
                    <th className="px-4 py-3 text-right">Wallet Balance</th>
                    <th className="px-4 py-3 text-right">Total Top-Ups</th>
                    <th className="px-4 py-3 text-right">Total Debits</th>
                    <th className="px-4 py-3 text-center">Transactions</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {centers.map(c => (
                    <tr key={c.centerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div>{c.centerName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{c.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <div>{c.city || '-'}</div>
                        {c.state && <div className="text-[10px] text-slate-400">{c.state}</div>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <div className="font-medium text-slate-800">{c.coordinatorName || '-'}</div>
                        <div className="text-[10px] text-slate-400">{c.phone || c.email}</div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        ₹{c.walletBalance.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-emerald-700 whitespace-nowrap">
                        ₹{c.totalTopUps.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-rose-700 whitespace-nowrap">
                        ₹{c.totalDebits.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-600 font-medium">
                        {c.transactionCount}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setSelectedCenterId(c.centerId)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-2.5 gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Center Ledger
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
