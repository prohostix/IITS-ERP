import { useState, useEffect, useMemo } from 'react';
import {
  IndianRupee,
  Clock,
  CheckCircle2,
  FileText,
  Search,
  Download,
  Receipt,
  ShieldAlert,
  Printer,
  X,
  RefreshCw,
  Building2,
  GraduationCap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export function CenterCommissionsPanel() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/commissions/out');
      if (data.success) {
        setCommissions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch commissions', error);
      toast.error('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  // Filtered commissions
  const filteredCommissions = useMemo(() => {
    return commissions.filter((item) => {
      const studentName = item.commissionIn?.enrollment?.studentName?.toLowerCase() || '';
      const programName = item.commissionIn?.enrollment?.program?.name?.toLowerCase() || '';
      const universityName = item.commissionIn?.enrollment?.program?.university?.name?.toLowerCase() || '';
      const paymentRef = (item.paymentDetails || '').toLowerCase();
      const q = searchTerm.toLowerCase().trim();

      const matchesSearch = !q || studentName.includes(q) || programName.includes(q) || universityName.includes(q) || paymentRef.includes(q);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [commissions, searchTerm, statusFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    let grossTotal = 0;
    let tdsTotal = 0;
    let netPaidTotal = 0;
    let pendingGross = 0;
    let pendingCount = 0;

    commissions.forEach((item) => {
      const gross = Number(item.grossAmount ?? item.amount ?? 0);
      const tds = Number(item.tdsAmount ?? 0);
      const net = Number(item.netAmount ?? (gross - tds));

      grossTotal += gross;
      tdsTotal += tds;

      if (item.status === 'paid') {
        netPaidTotal += net;
      } else {
        pendingGross += gross;
        pendingCount += 1;
      }
    });

    return {
      grossTotal,
      tdsTotal,
      netPaidTotal,
      pendingGross,
      pendingCount,
      totalCount: commissions.length
    };
  }, [commissions]);

  // Export to Excel
  const handleExport = () => {
    if (commissions.length === 0) {
      toast.info('No commissions data to export');
      return;
    }

    const rows = filteredCommissions.map((item) => {
      const gross = Number(item.grossAmount ?? item.amount ?? 0);
      const tds = Number(item.tdsAmount ?? 0);
      const net = Number(item.netAmount ?? (gross - tds));
      const tdsPct = gross > 0 && tds > 0 ? ((tds / gross) * 100).toFixed(1) : '0';

      return {
        'Student Name': item.commissionIn?.enrollment?.studentName || 'N/A',
        'Program': item.commissionIn?.enrollment?.program?.name || 'N/A',
        'University': item.commissionIn?.enrollment?.program?.university?.name || 'N/A',
        'Gross Commission (INR)': gross,
        'TDS Deducted (INR)': tds,
        'TDS Rate (%)': `${tdsPct}%`,
        'Net Commission (INR)': net,
        'Status': (item.status || 'pending').toUpperCase(),
        'Paid Date': fmtDate(item.paidAt),
        'Payment Details / UTR': item.paymentDetails || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Commissions & TDS');
    worksheet['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }));
    XLSX.writeFile(workbook, `Center_Commissions_TDS_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Commissions report exported successfully');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Commissions & TDS Settlements
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track gross referral earnings, Tax Deducted at Source (TDS u/s 194H), and net disbursed commissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCommissions}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExport}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm bg-card hover:border-primary/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gross Commission
            </CardTitle>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50">
              <Receipt className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              ₹{stats.grossTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total commission earnings before deductions
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card hover:border-amber-500/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              TDS Deducted (Sec 194H)
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">
              -₹{stats.tdsTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Income tax withheld for TDS compliance
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card hover:border-emerald-500/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Commission Disbursed
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ₹{stats.netPaidTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Actual payout received after TDS deduction
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card hover:border-blue-500/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Payouts
            </CardTitle>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/50">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
              ₹{stats.pendingGross.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingCount} payout{stats.pendingCount === 1 ? '' : 's'} awaiting disbursement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student, program, or UTR..."
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid Only</SelectItem>
              <SelectItem value="pending">Pending Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/60 shadow-sm overflow-hidden bg-card/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/60 border-b border-border/60">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Student & Program</th>
                <th className="px-4 py-3.5 font-semibold text-right">Gross Commission</th>
                <th className="px-4 py-3.5 font-semibold text-right">TDS Deducted</th>
                <th className="px-4 py-3.5 font-semibold text-right">Net Amount</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-4 py-3.5 font-semibold">Settlement Details</th>
                <th className="px-4 py-3.5 font-semibold text-center">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span className="text-xs">Loading commissions & TDS details...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-8 h-8 text-muted-foreground/40" />
                      <p className="font-medium text-slate-700 dark:text-slate-300">No commissions found</p>
                      <p className="text-xs text-muted-foreground">
                        {searchTerm || statusFilter !== 'all'
                          ? 'Try adjusting your search filters.'
                          : 'Commissions generated from student admissions will appear here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((item) => {
                  const gross = Number(item.grossAmount ?? item.amount ?? 0);
                  const tds = Number(item.tdsAmount ?? 0);
                  const net = Number(item.netAmount ?? (gross - tds));
                  const tdsPct = item.tdsPercentage || (gross > 0 && tds > 0 ? Number(((tds / gross) * 100).toFixed(0)) : 0);
                  const studentName = item.commissionIn?.enrollment?.studentName || '-';
                  const programName = item.commissionIn?.enrollment?.program?.name || '-';
                  const universityName = item.commissionIn?.enrollment?.program?.university?.name || '';
                  const enrollmentNo = item.commissionIn?.enrollment?.enrollmentNumber;

                  return (
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                      {/* Student & Program */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                            <span>{studentName}</span>
                            {enrollmentNo && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono text-muted-foreground">
                                {enrollmentNo}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span>{programName}</span>
                            {universityName && (
                              <>
                                <span className="text-border">•</span>
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                  {universityName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Gross Commission */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        ₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* TDS Deducted */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {item.status === 'paid' ? (
                          tds > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="font-semibold text-amber-700 dark:text-amber-500">
                                -₹{tds.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-amber-700/80 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800 mt-0.5 font-medium">
                                {tdsPct}% TDS (194H)
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground font-mono">₹0.00 (0%)</span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Deducted at payout
                          </span>
                        )}
                      </td>

                      {/* Net Amount */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[15px]">
                            ₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {item.status === 'paid' ? 'Net Disbursed' : 'Net Payable'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            item.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                          }
                        >
                          {item.status === 'paid' ? (
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1 text-amber-600" />
                          )}
                          {item.status === 'paid' ? 'PAID' : 'PENDING'}
                        </Badge>
                      </td>

                      {/* Settlement Details */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {item.paidAt ? fmtDate(item.paidAt) : 'Pending Processing'}
                          </span>
                          {item.paymentDetails && (
                            <p className="text-[11px] text-muted-foreground/90 truncate max-w-[180px]" title={item.paymentDetails}>
                              Ref: {item.paymentDetails}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Action / Voucher */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedVoucher(item)}
                          className="h-8 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Voucher
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Commission Settlement Voucher Modal */}
      <Dialog open={!!selectedVoucher} onOpenChange={() => setSelectedVoucher(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden print:m-0 print:p-0 print:border-none print:shadow-none">
          {selectedVoucher && (() => {
            const vGross = Number(selectedVoucher.grossAmount ?? selectedVoucher.amount ?? 0);
            const vTds = Number(selectedVoucher.tdsAmount ?? 0);
            const vNet = Number(selectedVoucher.netAmount ?? (vGross - vTds));
            const vTdsPct = selectedVoucher.tdsPercentage || (vGross > 0 && vTds > 0 ? Number(((vTds / vGross) * 100).toFixed(0)) : 0);
            const voucherNo = `VCH-COMM-${(selectedVoucher.id || '').slice(0, 8).toUpperCase()}`;

            return (
              <div className="flex flex-col">
                <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <Building2 className="w-5 h-5 text-primary" />
                        Commission Settlement Voucher
                      </DialogTitle>
                      <DialogDescription className="text-xs mt-0.5 font-mono">
                        Voucher No: {voucherNo}
                      </DialogDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        selectedVoucher.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                          : 'bg-amber-50 text-amber-700 border-amber-300 font-semibold'
                      }
                    >
                      {selectedVoucher.status === 'paid' ? 'SETTLED & PAID' : 'PENDING SETTLEMENT'}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="p-6 space-y-5 text-sm">
                  {/* Beneficiary & Reference Info */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 dark:bg-muted/40 border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Student Beneficiary</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                        {selectedVoucher.commissionIn?.enrollment?.studentName || '-'}
                      </span>
                      {selectedVoucher.commissionIn?.enrollment?.enrollmentNumber && (
                        <span className="text-muted-foreground block font-mono">
                          ID: {selectedVoucher.commissionIn?.enrollment?.enrollmentNumber}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Program / Course</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {selectedVoucher.commissionIn?.enrollment?.program?.name || '-'}
                      </span>
                      <span className="text-muted-foreground block text-[11px]">
                        {selectedVoucher.commissionIn?.enrollment?.program?.university?.name || ''}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-border/60">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Settlement Date</span>
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {selectedVoucher.paidAt ? fmtDate(selectedVoucher.paidAt) : 'Pending Settlement'}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-border/60">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Transaction / UTR Ref</span>
                      <span className="font-medium text-slate-800 dark:text-slate-100 font-mono">
                        {selectedVoucher.paymentDetails || 'System Ledger Settlement'}
                      </span>
                    </div>
                  </div>

                  {/* Financial Settlement Breakdown */}
                  <div className="rounded-lg border border-border/80 overflow-hidden">
                    <div className="bg-muted/60 px-4 py-2 border-b text-xs font-semibold uppercase text-muted-foreground">
                      Financial Calculation & Deduction Summary
                    </div>
                    <div className="p-4 space-y-2.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Gross Referral Commission:</span>
                        <span className="font-medium font-mono text-slate-900 dark:text-slate-100">
                          ₹{vGross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm text-amber-700 dark:text-amber-500">
                        <div className="flex items-center gap-1.5">
                          <span>Less: TDS Deduction u/s 194H:</span>
                          <span className="text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 px-1.5 py-0.2 rounded">
                            {vTdsPct}%
                          </span>
                        </div>
                        <span className="font-semibold font-mono">
                          -₹{vTds.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="border-t border-dashed border-border pt-2.5 mt-2 flex justify-between items-center text-base font-bold text-emerald-700 dark:text-emerald-400">
                        <span>Net Commission Disbursed:</span>
                        <span className="font-mono text-lg">
                          ₹{vNet.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Statutory Tax Compliance Note */}
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/50 rounded-lg text-xs text-amber-900 dark:text-amber-300">
                    <p className="font-semibold flex items-center gap-1 mb-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      Statutory Tax & TDS Compliance (Section 194H)
                    </p>
                    <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                      Tax has been deducted at source under Section 194H of the Indian Income Tax Act, 1961. The corresponding TDS will be deposited with the Central Government and Form 16A will be made available for tax filing.
                    </p>
                  </div>
                </div>

                <DialogFooter className="p-4 border-t bg-muted/20 flex sm:justify-between items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Voucher
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setSelectedVoucher(null)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
