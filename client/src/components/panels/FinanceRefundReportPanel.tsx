import { useState, useEffect, useMemo } from 'react';
import {
  Search, RefreshCw, FileSpreadsheet, RotateCcw, Wallet, Banknote,
  Receipt, Eye, Download, CheckCircle2, Clock, AlertTriangle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MultiSelectFilter } from '@/components/ui/MultiSelectFilter';
import { ActiveFilterBar, type ActiveFilterItem } from '@/components/ui/ActiveFilterBar';
import { usePersistentFilters } from '@/hooks/usePersistentFilters';
import api from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface RefundItem {
  id: string;
  studentName: string;
  enrollmentNumber?: string;
  studentEmail?: string;
  studentPhone?: string;
  studyCenter?: { id: string; name: string; code: string; branchName?: string };
  program?: { id: string; name: string; code: string; university?: { id: string; name: string; code: string } };
  session?: { id: string; name: string };
  originalFee: number;
  refundAmount: number;
  refundMethod: 'wallet' | 'cash';
  refundStatus: 'processed' | 'processing' | 'failed';
  receiptUrl?: string | null;
  referenceNo?: string | null;
  remarks?: string | null;
  processedByName?: string;
  processedAt?: string;
  createdAt: string;
}

interface RefundSummary {
  totalRefunded: number;
  walletRefunded: number;
  cashRefunded: number;
  totalCount: number;
  walletCount: number;
  cashCount: number;
  processedCount: number;
  processingCount: number;
  failedCount: number;
}

export function FinanceRefundReportPanel() {
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [summary, setSummary] = useState<RefundSummary>({
    totalRefunded: 0,
    walletRefunded: 0,
    cashRefunded: 0,
    totalCount: 0,
    walletCount: 0,
    cashCount: 0,
    processedCount: 0,
    processingCount: 0,
    failedCount: 0,
  });
  const [loading, setLoading] = useState(false);

  // Metadata dropdown options
  const [branches, setBranches] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);

  // Receipt preview modal
  const [previewDoc, setPreviewDoc] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: '',
    title: '',
  });

  // Persistent filters
  const [filters, , clearFilters, isFiltered, setField] = usePersistentFilters('finance_refund_report_v1', {
    branches: [] as string[],
    sessions: [] as string[],
    universities: [] as string[],
    programs: [] as string[],
    centers: [] as string[],
    refundMethod: 'all',
    refundStatus: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  // Dynamic program filtering scoped by selected universities
  const filteredPrograms = useMemo(() => {
    if (!filters.universities || filters.universities.length === 0) return programs;
    const uniIds = filters.universities.map(String);
    return programs.filter((p: any) => uniIds.includes(String(p.universityId || p.university?.id)));
  }, [programs, filters.universities]);

  // Prune any programs not in selected universities
  useEffect(() => {
    if (filters.universities && filters.universities.length > 0 && filters.programs && filters.programs.length > 0) {
      const allowedIds = new Set(filteredPrograms.map((p: any) => String(p.id)));
      const valid = filters.programs.filter((id: string) => allowedIds.has(String(id)));
      if (valid.length !== filters.programs.length) {
        setField('programs', valid);
      }
    }
  }, [filters.universities, filteredPrograms, filters.programs, setField]);

  // Fetch filter metadata once
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [uRes, pRes, sRes, cRes, bRes] = await Promise.allSettled([
          api.get('/universities'),
          api.get('/programs'),
          api.get('/sessions'),
          api.get('/study-centers'),
          api.get('/branches'),
        ]);

        if (uRes.status === 'fulfilled') setUniversities(uRes.value.data?.data || uRes.value.data || []);
        if (pRes.status === 'fulfilled') setPrograms(pRes.value.data?.data || pRes.value.data || []);
        if (sRes.status === 'fulfilled') setSessions(sRes.value.data?.data || sRes.value.data || []);
        if (cRes.status === 'fulfilled') setCenters(cRes.value.data?.data || cRes.value.data || []);
        if (bRes.status === 'fulfilled') setBranches(bRes.value.data?.data || bRes.value.data || []);
      } catch (err) {
        console.error('Failed to load filter metadata', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch report data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.branches.length > 0) params.set('branchId', filters.branches.join(','));
      if (filters.sessions.length > 0) params.set('sessionId', filters.sessions.join(','));
      if (filters.universities.length > 0) params.set('universityId', filters.universities.join(','));
      if (filters.programs.length > 0) params.set('programId', filters.programs.join(','));
      if (filters.centers.length > 0) params.set('centerId', filters.centers.join(','));
      if (filters.refundMethod && filters.refundMethod !== 'all') params.set('refundMethod', filters.refundMethod);
      if (filters.refundStatus && filters.refundStatus !== 'all') params.set('refundStatus', filters.refundStatus);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.search) params.set('search', filters.search);

      const res = await api.get(`/finance/reports/refunds?${params.toString()}`);
      if (res.data?.success) {
        setRefunds(res.data.data.refunds || []);
        setSummary(res.data.data.summary || {
          totalRefunded: 0,
          walletRefunded: 0,
          cashRefunded: 0,
          totalCount: 0,
          walletCount: 0,
          cashCount: 0,
          processedCount: 0,
          processingCount: 0,
          failedCount: 0,
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load refund report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.branches,
    filters.sessions,
    filters.universities,
    filters.programs,
    filters.centers,
    filters.refundMethod,
    filters.refundStatus,
    filters.dateFrom,
    filters.dateTo,
  ]);

  // Active filter items for pills
  const activeFilterItems: ActiveFilterItem[] = useMemo(() => {
    const items: ActiveFilterItem[] = [];

    (filters.branches || []).forEach((bid: string) => {
      const match = branches.find(b => String(b.id) === String(bid));
      items.push({
        category: 'Branch',
        label: match?.name || bid,
        onRemove: () => setField('branches', (filters.branches || []).filter((id: string) => id !== bid)),
      });
    });

    (filters.sessions || []).forEach((sid: string) => {
      const match = sessions.find(s => String(s.id) === String(sid));
      items.push({
        category: 'Session',
        label: match?.name || sid,
        onRemove: () => setField('sessions', (filters.sessions || []).filter((id: string) => id !== sid)),
      });
    });

    (filters.universities || []).forEach((uid: string) => {
      const match = universities.find(u => String(u.id) === String(uid));
      items.push({
        category: 'University',
        label: match?.code ? `${match.name} (${match.code})` : (match?.name || uid),
        onRemove: () => setField('universities', (filters.universities || []).filter((id: string) => id !== uid)),
      });
    });

    (filters.programs || []).forEach((pid: string) => {
      const match = programs.find(p => String(p.id) === String(pid));
      items.push({
        category: 'Program',
        label: match?.code ? `${match.name} (${match.code})` : (match?.name || pid),
        onRemove: () => setField('programs', (filters.programs || []).filter((id: string) => id !== pid)),
      });
    });

    (filters.centers || []).forEach((cid: string) => {
      const match = centers.find(c => String(c.id) === String(cid));
      items.push({
        category: 'Study Center',
        label: match?.code ? `${match.name} (${match.code})` : (match?.name || cid),
        onRemove: () => setField('centers', (filters.centers || []).filter((id: string) => id !== cid)),
      });
    });

    if (filters.refundMethod && filters.refundMethod !== 'all') {
      items.push({
        category: 'Method',
        label: filters.refundMethod === 'wallet' ? 'Wallet Credit' : 'Cash / Direct Payout',
        onRemove: () => setField('refundMethod', 'all'),
      });
    }

    if (filters.refundStatus && filters.refundStatus !== 'all') {
      items.push({
        category: 'Status',
        label: filters.refundStatus.toUpperCase(),
        onRemove: () => setField('refundStatus', 'all'),
      });
    }

    if (filters.dateFrom) {
      items.push({
        category: 'Date From',
        label: filters.dateFrom,
        onRemove: () => setField('dateFrom', ''),
      });
    }

    if (filters.dateTo) {
      items.push({
        category: 'Date To',
        label: filters.dateTo,
        onRemove: () => setField('dateTo', ''),
      });
    }

    if (filters.search) {
      items.push({
        category: 'Search',
        label: `"${filters.search}"`,
        onRemove: () => setField('search', ''),
      });
    }

    return items;
  }, [filters, branches, sessions, universities, programs, centers, setField]);

  // Export to Excel
  const exportToExcel = () => {
    if (refunds.length === 0) {
      toast.error('No refund records to export');
      return;
    }

    const exportRows = refunds.map((r, idx) => ({
      'S.No': idx + 1,
      'Student Name': r.studentName,
      'Admission / Enrollment No': r.enrollmentNumber || r.id,
      'Student Phone': r.studentPhone || '',
      'Student Email': r.studentEmail || '',
      'Study Center': r.studyCenter?.name || '',
      'Center Code': r.studyCenter?.code || '',
      'Branch': r.studyCenter?.branchName || '',
      'University': r.program?.university?.name || '',
      'Program': r.program?.name || '',
      'Session': r.session?.name || '',
      'Original Fee (INR)': r.originalFee || 0,
      'Refund Amount (INR)': r.refundAmount || 0,
      'Refund Method': r.refundMethod === 'wallet' ? 'Center Wallet Credit' : 'Cash / Direct Payout',
      'Refund Status': r.refundStatus.toUpperCase(),
      'Reference / Voucher No': r.referenceNo || '',
      'Receipt URL': r.receiptUrl ? `${window.location.origin}${r.receiptUrl}` : 'None',
      'Remarks / Reason': r.remarks || '',
      'Processed By': r.processedByName || '',
      'Processed Date': r.processedAt ? new Date(r.processedAt).toLocaleString('en-IN') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Refund Report');
    XLSX.writeFile(wb, `Finance_Refund_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Refund report exported to Excel');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Refund Report</h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {summary.totalCount} records
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit and track student enrollment refunds, study center wallet credits, and cash/direct payouts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReport}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            className="h-9 gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Refunded */}
        <Card className="border shadow-sm bg-gradient-to-br from-card to-muted/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Refunded</p>
              <h3 className="text-2xl font-extrabold text-foreground mt-1">
                ₹{summary.totalRefunded.toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Across {summary.totalCount} transactions
              </p>
            </div>
            <div className="p-3 rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
              <Receipt className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Wallet Refunds */}
        <Card className="border shadow-sm bg-gradient-to-br from-card to-muted/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Wallet Credits</p>
              <h3 className="text-2xl font-extrabold text-primary mt-1">
                ₹{summary.walletRefunded.toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {summary.walletCount} credited to center balance
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <Wallet className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Cash Refunds */}
        <Card className="border shadow-sm bg-gradient-to-br from-card to-muted/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cash / Direct Payouts</p>
              <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{summary.cashRefunded.toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {summary.cashCount} direct cash/bank payouts
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Banknote className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="border shadow-sm bg-gradient-to-br from-card to-muted/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status Breakdown</p>
              <div className="flex items-center gap-3 pt-1">
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {summary.processedCount} Processed
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5" /> {summary.processingCount} Pending
                </span>
                {summary.failedCount > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> {summary.failedCount} Failed
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Branches */}
            <MultiSelectFilter
              title="Branches"
              options={branches.map(b => ({ label: b.name, value: String(b.id) }))}
              selectedValues={filters.branches}
              onChange={vals => setField('branches', vals)}
            />

            {/* Sessions */}
            <MultiSelectFilter
              title="Sessions"
              options={sessions.map(s => ({ label: s.name, value: String(s.id) }))}
              selectedValues={filters.sessions}
              onChange={vals => setField('sessions', vals)}
            />

            {/* Universities */}
            <MultiSelectFilter
              title="Universities"
              options={universities.map(u => ({
                label: u.code ? `${u.name} (${u.code})` : u.name,
                value: String(u.id),
              }))}
              selectedValues={filters.universities}
              onChange={vals => setField('universities', vals)}
            />

            {/* Programs scoped by universities */}
            <MultiSelectFilter
              title="Programs"
              options={filteredPrograms.map(p => ({
                label: p.code ? `${p.name} (${p.code})` : p.name,
                value: String(p.id),
              }))}
              selectedValues={filters.programs}
              onChange={vals => setField('programs', vals)}
            />

            {/* Centers */}
            <MultiSelectFilter
              title="Study Centers"
              options={centers.map(c => ({
                label: c.code ? `${c.name} (${c.code})` : c.name,
                value: String(c.id),
              }))}
              selectedValues={filters.centers}
              onChange={vals => setField('centers', vals)}
            />

            {/* Refund Method Select */}
            <div className="inline-flex rounded-lg border border-input p-1 bg-muted/20">
              <button
                type="button"
                onClick={() => setField('refundMethod', 'all')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  filters.refundMethod === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Methods
              </button>
              <button
                type="button"
                onClick={() => setField('refundMethod', 'wallet')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  filters.refundMethod === 'wallet' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Wallet
              </button>
              <button
                type="button"
                onClick={() => setField('refundMethod', 'cash')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  filters.refundMethod === 'cash' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Cash / Direct
              </button>
            </div>

            {/* Refund Status Select */}
            <select
              value={filters.refundStatus}
              onChange={e => setField('refundStatus', e.target.value)}
              className="h-9 px-3 py-1.5 text-xs border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="processed">Processed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>From:</span>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={e => setField('dateFrom', e.target.value)}
                className="h-9 w-32 text-xs"
              />
              <span>To:</span>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={e => setField('dateTo', e.target.value)}
                className="h-9 w-32 text-xs"
              />
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={e => setField('search', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') fetchReport(); }}
                placeholder="Search student, ref#, center, phone..."
                className="h-9 pl-8 text-xs"
              />
            </div>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Active Filter Pills */}
          <ActiveFilterBar filters={activeFilterItems} onClearAll={clearFilters} />
        </CardContent>
      </Card>

      {/* Refunds Table */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider border-b">
              <tr>
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">Student</th>
                <th className="p-3">Study Center</th>
                <th className="p-3">University & Program</th>
                <th className="p-3">Session</th>
                <th className="p-3 text-right">Original Fee</th>
                <th className="p-3 text-right">Refund Amount</th>
                <th className="p-3 text-center">Method & Proof</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Date & Processed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading refund records...
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-muted-foreground">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No refund transactions found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                refunds.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 text-center text-muted-foreground font-mono">{idx + 1}</td>

                    {/* Student Info */}
                    <td className="p-3">
                      <div className="font-semibold text-foreground">{r.studentName}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {r.enrollmentNumber || r.id.slice(-8)}
                      </div>
                      {(r.studentPhone || r.studentEmail) && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                          {r.studentPhone || r.studentEmail}
                        </div>
                      )}
                    </td>

                    {/* Center */}
                    <td className="p-3">
                      <div className="font-medium text-foreground">{r.studyCenter?.name || '-'}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {r.studyCenter?.code && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {r.studyCenter.code}
                          </span>
                        )}
                        {r.studyCenter?.branchName && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                            {r.studyCenter.branchName}
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* University & Program */}
                    <td className="p-3">
                      <div className="font-medium text-foreground">
                        {r.program?.name || '-'}
                        {r.program?.code ? ` (${r.program.code})` : ''}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.program?.university?.name || '-'}
                      </div>
                    </td>

                    {/* Session */}
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {r.session?.name || '-'}
                    </td>

                    {/* Original Fee */}
                    <td className="p-3 text-right text-muted-foreground font-mono">
                      ₹{Number(r.originalFee || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Refund Amount */}
                    <td className="p-3 text-right font-mono font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                      ₹{Number(r.refundAmount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Method & Proof */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-1">
                        {r.refundMethod === 'wallet' ? (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-300 border-none font-medium text-[10px] gap-1">
                            <Wallet className="w-3 h-3" /> Wallet Credit
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 border-none font-medium text-[10px] gap-1">
                            <Banknote className="w-3 h-3" /> Cash Payout
                          </Badge>
                        )}

                        {r.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({
                              open: true,
                              url: r.receiptUrl || '',
                              title: `Refund Receipt - ${r.studentName} (${r.referenceNo || 'Voucher'})`
                            })}
                            className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Eye className="w-3 h-3" /> View Receipt
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">No receipt attached</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={
                          r.refundStatus === 'processed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : r.refundStatus === 'processing'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400'
                        }
                      >
                        {r.refundStatus.toUpperCase()}
                      </Badge>
                    </td>

                    {/* Date, Processed By, Remarks */}
                    <td className="p-3">
                      <div className="text-foreground">
                        {r.processedAt ? new Date(r.processedAt).toLocaleDateString('en-IN') : '-'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        By {r.processedByName || 'Finance Admin'}
                      </div>
                      {r.referenceNo && (
                        <div className="text-[10px] font-mono text-primary truncate max-w-[150px]">
                          Ref: {r.referenceNo}
                        </div>
                      )}
                      {r.remarks && (
                        <div className="text-[10px] text-muted-foreground italic truncate max-w-[150px]" title={r.remarks}>
                          "{r.remarks}"
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {refunds.length > 0 && (
              <tfoot className="bg-muted/60 border-t font-semibold text-foreground">
                <tr>
                  <td colSpan={5} className="p-3 text-right">Totals for Filtered Results:</td>
                  <td className="p-3 text-right font-mono text-muted-foreground">
                    ₹{refunds.reduce((acc, r) => acc + (r.originalFee || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-orange-600 dark:text-orange-400">
                    ₹{refunds.reduce((acc, r) => acc + (r.refundAmount || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Receipt Proof Preview Modal */}
      <Dialog open={previewDoc.open} onOpenChange={open => !open && setPreviewDoc({ open: false, url: '', title: '' })}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base">
              <span>{previewDoc.title}</span>
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noreferrer"
                download
                className="text-xs text-primary hover:underline flex items-center gap-1 font-normal mr-6"
              >
                <Download className="w-3.5 h-3.5" /> Download / Open
              </a>
            </DialogTitle>
            <DialogDescription>
              Attached payment receipt / cash voucher proof for this refund transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto rounded-lg border bg-muted/20 p-2 flex items-center justify-center min-h-[300px]">
            {previewDoc.url.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={previewDoc.url}
                className="w-full h-[500px] rounded border"
                title="Receipt PDF"
              />
            ) : (
              <img
                src={previewDoc.url}
                alt="Receipt Preview"
                className="max-h-[500px] max-w-full object-contain rounded shadow"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

