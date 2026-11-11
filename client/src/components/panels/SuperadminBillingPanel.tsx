import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Receipt,
  IndianRupee,
  GraduationCap,
  Calendar,
  Building2,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  Eye,
  Save,
  Calculator,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MONTH_OPTIONS = [
  { value: 'all', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function SuperadminBillingPanel() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [organizationId, setOrganizationId] = useState<string>('all');
  const [countMode, setCountMode] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [savingRate, setSavingRate] = useState<boolean>(false);
  const [updatingMonthKey, setUpdatingMonthKey] = useState<string | null>(null);

  const [billingData, setBillingData] = useState<any | null>(null);
  const [rateInput, setRateInput] = useState<string>('500');
  const [detailMonth, setDetailMonth] = useState<any | null>(null);

  const fetchBillingData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year,
        organizationId,
        countMode,
      });
      const res = await api.get(`/organizations/superadmin-billing?${params.toString()}`);
      if (res.data?.success) {
        const data = res.data.data;
        setBillingData(data);
        setRateInput(String(data.activeRatePerStudent ?? data.defaultRatePerStudent ?? 500));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load enrollment billing data');
    } finally {
      setLoading(false);
    }
  }, [year, organizationId, countMode]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleSaveFixedRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericRate = Number(rateInput);
    if (isNaN(numericRate) || numericRate < 0) {
      toast.error('Please enter a valid rate per student');
      return;
    }

    setSavingRate(true);
    try {
      const payload: any =
        organizationId !== 'all'
          ? { organizationId, orgRatePerStudent: numericRate }
          : { defaultRatePerStudent: numericRate };

      await api.put('/organizations/superadmin-billing/config', payload);
      toast.success(
        organizationId !== 'all'
          ? `Fixed rate updated to ₹${numericRate.toLocaleString('en-IN')}/student for selected organization`
          : `Global fixed rate updated to ₹${numericRate.toLocaleString('en-IN')}/student`
      );
      fetchBillingData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save fixed rate');
    } finally {
      setSavingRate(false);
    }
  };

  const handleToggleMonthStatus = async (monthRow: any) => {
    const nextStatus = monthRow.billingStatus === 'paid' ? 'unpaid' : 'paid';
    setUpdatingMonthKey(monthRow.monthKey);
    try {
      await api.put('/organizations/superadmin-billing/config', {
        organizationId,
        monthKey: monthRow.monthKey,
        billingStatus: nextStatus,
      });
      toast.success(
        `${monthRow.monthName} ${monthRow.year} marked as ${nextStatus.toUpperCase()}`
      );
      fetchBillingData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update billing status');
    } finally {
      setUpdatingMonthKey(null);
    }
  };

  const displayedMonths: any[] = (billingData?.monthlyBreakdown || []).filter((m: any) =>
    selectedMonth === 'all' ? true : String(m.monthNumber) === selectedMonth
  );

  const activeTotalEnrollments = displayedMonths.reduce(
    (s, m) => s + Number(m.totalEnrollments || 0),
    0
  );
  const activeConfirmedEnrollments = displayedMonths.reduce(
    (s, m) => s + Number(m.confirmedEnrollments || 0),
    0
  );
  const activeBillableStudents = displayedMonths.reduce(
    (s, m) => s + Number(m.billableCount || 0),
    0
  );
  const activeTotalBill = displayedMonths.reduce(
    (s, m) => s + Number(m.billAmount || 0),
    0
  );
  const activePaidBill = displayedMonths
    .filter((m) => m.billingStatus === 'paid')
    .reduce((s, m) => s + Number(m.billAmount || 0), 0);
  const activeUnpaidBill = Math.max(0, activeTotalBill - activePaidBill);

  const handleExportMonthlySummaryCsv = () => {
    if (!displayedMonths.length) {
      toast.error('No monthly billing data to export');
      return;
    }
    const headers = [
      'Month',
      'Year',
      'Total Enrollments',
      'Confirmed Enrollments',
      'Pending Enrollments',
      'Billable Students',
      'Rate Per Student (INR)',
      'Monthly Bill Amount (INR)',
      'Billing Status',
    ];
    const rows = displayedMonths.map((m) =>
      [
        `"${m.monthName}"`,
        m.year,
        m.totalEnrollments,
        m.confirmedEnrollments,
        m.pendingEnrollments,
        m.billableCount,
        m.ratePerStudent,
        m.billAmount,
        `"${String(m.billingStatus || 'unpaid').toUpperCase()}"`,
      ].join(',')
    );
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `superadmin-monthly-billing-${year}${selectedMonth !== 'all' ? `-month-${selectedMonth}` : ''}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Monthly billing report exported');
  };

  const handleExportMonthStudentsCsv = (monthRow: any) => {
    const list: any[] = monthRow?.students || [];
    if (list.length === 0) {
      toast.error('No students in this month to export');
      return;
    }
    const headers = [
      'SL NO',
      'Student Name',
      'Admission No',
      'Enrollment No',
      'University',
      'Program',
      'Study Center',
      'Enrollment Date',
      'Status',
      'Rate Per Student (INR)',
    ];
    const rows = list.map((s, idx) =>
      [
        idx + 1,
        `"${String(s.studentName || '-').replace(/"/g, '""')}"`,
        `"${String(s.admissionNo || '-').replace(/"/g, '""')}"`,
        `"${String(s.uniEnrollmentNo || '-').replace(/"/g, '""')}"`,
        `"${String(s.universityName || '-').replace(/"/g, '""')}"`,
        `"${String(s.programName || '-').replace(/"/g, '""')}"`,
        `"${String(s.centerName || '-').replace(/"/g, '""')}"`,
        `"${s.date ? new Date(s.date).toLocaleDateString('en-IN') : '-'}"`,
        `"${String(s.status || '-').toUpperCase()}"`,
        s.rate || billingData?.activeRatePerStudent || 0,
      ].join(',')
    );
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `billing-students-${monthRow.monthName.toLowerCase()}-${monthRow.year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${list.length} students for ${monthRow.monthName} ${monthRow.year}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight">Student Enrollment Billing</h2>
            <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
              Superadmin Billing
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Calculate monthly student enrollment charges based on the fixed per-student rate set by Superadmin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBillingData}
            disabled={loading}
            className="h-9 gap-1.5 font-semibold"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleExportMonthlySummaryCsv}
            className="h-9 gap-1.5 font-semibold"
          >
            <Download className="w-4 h-4" />
            Export Billing CSV
          </Button>
        </div>
      </div>

      {/* Superadmin Fixed Rate Configuration & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Rate Configuration Card */}
        <Card className="lg:col-span-5 border-primary/20 bg-primary/[0.02] shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              <span>Fixed Rate Per Student Enrollment</span>
            </CardTitle>
            <CardDescription className="text-xs">
              {organizationId === 'all'
                ? 'Set the default fixed rate charged per student enrollment each month.'
                : 'Set a custom fixed rate per student for the selected organization.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveFixedRate} className="flex items-end gap-2.5">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Rate per Student (₹ / Enrollment)
                </Label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    className="pl-9 h-9 font-bold text-sm"
                    placeholder="e.g. 500"
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={savingRate}
                className="h-9 px-4 font-semibold gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {savingRate ? 'Saving...' : 'Save Rate'}
              </Button>
            </form>
            <div className="mt-2.5 text-[11px] text-muted-foreground flex items-center justify-between bg-background/80 px-3 py-1.5 rounded-lg border">
              <span>Formula:</span>
              <span className="font-mono font-semibold text-foreground">
                Monthly Bill = Enrolled Students × ₹{Number(rateInput || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Filters Card */}
        <Card className="lg:col-span-7 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Billing Period & Scope Filters</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Filter enrollments by year, month, organization, and enrollment status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Organization</Label>
                <Select value={organizationId} onValueChange={setOrganizationId}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue placeholder="All Organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    {(billingData?.organizations || []).map((org: any) => (
                      <SelectItem key={org.organizationId} value={org.organizationId}>
                        {org.organizationName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold uppercase text-muted-foreground">Count Basis</Label>
                <Select value={countMode} onValueChange={setCountMode}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Student Enrollments</SelectItem>
                    <SelectItem value="enrolled_only">Confirmed / Enrolled Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Fixed Rate / Student</p>
              <p className="text-2xl font-bold mt-1 text-primary">
                ₹{Number(billingData?.activeRatePerStudent ?? rateInput ?? 0).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Per student enrolled</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {selectedMonth === 'all' ? `Enrollments (${year})` : 'Month Enrollments'}
              </p>
              <p className="text-2xl font-bold mt-1">{activeBillableStudents.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeConfirmedEnrollments} confirmed • {activeTotalEnrollments - activeConfirmedEnrollments} pending
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {selectedMonth === 'all' ? `Total Bill (${year})` : 'Selected Month Bill'}
              </p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                ₹{activeTotalBill.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeBillableStudents} × ₹{Number(billingData?.activeRatePerStudent ?? rateInput ?? 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Outstanding Balance</p>
              <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                ₹{activeUnpaidBill.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paid: ₹{activePaidBill.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month-by-Month Enrollment Billing Table */}
      <Card className="border shadow-xs">
        <CardHeader className="py-4 border-b bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>Monthly Student Enrollment Billing ({year})</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {displayedMonths.length} {displayedMonths.length === 1 ? 'Month' : 'Months'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Monthly student admissions multiplied by the fixed per-student rate.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Calculating monthly student enrollments and bills...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-center">Total Enrollments</th>
                    <th className="px-4 py-3 text-center">Confirmed / Pending</th>
                    <th className="px-4 py-3 text-center">Billable Students</th>
                    <th className="px-4 py-3 text-right">Fixed Rate / Student</th>
                    <th className="px-4 py-3 text-right">Monthly Bill Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayedMonths.map((m) => {
                    const isPaid = m.billingStatus === 'paid';
                    return (
                      <tr
                        key={m.monthKey}
                        className={cn(
                          'hover:bg-muted/30 transition-colors',
                          m.billableCount > 0 ? 'bg-background' : 'bg-muted/5 text-muted-foreground'
                        )}
                      >
                        <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span>
                              {m.monthName} {m.year}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold">
                          {m.totalEnrollments}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px]"
                            >
                              {m.confirmedEnrollments} Confirmed
                            </Badge>
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[10px]"
                            >
                              {m.pendingEnrollments} Pending
                            </Badge>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary" className="font-mono font-bold text-xs">
                            {m.billableCount}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          ₹{Number(m.ratePerStudent || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-sm text-foreground">
                          ₹{Number(m.billAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isPaid ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              PAID
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 text-[10px] gap-1"
                            >
                              <Clock className="w-3 h-3" />
                              UNPAID
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDetailMonth(m)}
                              className="h-7 px-2.5 text-xs font-semibold gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Students ({m.billableCount})
                            </Button>
                            <Button
                              variant={isPaid ? 'ghost' : 'outline'}
                              size="sm"
                              disabled={updatingMonthKey === m.monthKey}
                              onClick={() => handleToggleMonthStatus(m)}
                              className={cn(
                                'h-7 px-2.5 text-xs font-semibold',
                                isPaid
                                  ? 'text-muted-foreground hover:text-foreground'
                                  : 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              )}
                            >
                              {isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 border-t-2 font-bold text-xs">
                    <td className="px-4 py-3">TOTAL ({year})</td>
                    <td className="px-4 py-3 text-center font-mono">{activeTotalEnrollments}</td>
                    <td className="px-4 py-3 text-center font-mono">
                      {activeConfirmedEnrollments} Confirmed / {activeTotalEnrollments - activeConfirmedEnrollments} Pending
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{activeBillableStudents}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      ₹{Number(billingData?.activeRatePerStudent ?? rateInput ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-primary">
                      ₹{activeTotalBill.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-right text-muted-foreground">
                      Paid: ₹{activePaidBill.toLocaleString('en-IN')} • Unpaid: ₹{activeUnpaidBill.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organization-wise Billing Breakdown (when viewing all organizations) */}
      {organizationId === 'all' && (billingData?.organizations || []).length > 0 && (
        <Card className="border shadow-xs">
          <CardHeader className="py-4 border-b bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Organization-Wise Annual Billing Summary ({year})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Organization</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-center">Billable Enrollments</th>
                    <th className="px-4 py-3 text-right">Fixed Rate / Student</th>
                    <th className="px-4 py-3 text-right">Annual Bill ({year})</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {billingData.organizations.map((org: any) => (
                    <tr key={org.organizationId} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold">{org.organizationName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{org.email}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold">{org.billableCount}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        ₹{Number(org.ratePerStudent || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                        ₹{Number(org.totalBillAmount || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal: Student List for Selected Month */}
      <Dialog open={!!detailMonth} onOpenChange={(o) => !o && setDetailMonth(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {detailMonth && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
                  <div>
                    <DialogTitle className="text-lg font-bold">
                      {detailMonth.monthName} {detailMonth.year} — Enrolled Students ({detailMonth.billableCount})
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {detailMonth.billableCount} students × ₹{Number(detailMonth.ratePerStudent || 0).toLocaleString('en-IN')} ={' '}
                      <strong className="text-primary">₹{Number(detailMonth.billAmount || 0).toLocaleString('en-IN')}</strong>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportMonthStudentsCsv(detailMonth)}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Month CSV
                  </Button>
                </div>
              </DialogHeader>

              {(detailMonth.students || []).length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No student enrollments recorded in {detailMonth.monthName} {detailMonth.year}.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border mt-2">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b font-bold uppercase text-muted-foreground">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Student Name</th>
                        <th className="px-3 py-2">Admission No</th>
                        <th className="px-3 py-2">University</th>
                        <th className="px-3 py-2">Program</th>
                        <th className="px-3 py-2">Study Center</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2 text-center">Status</th>
                        <th className="px-3 py-2 text-right">Charge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {detailMonth.students.map((st: any, idx: number) => (
                        <tr key={st.id || idx} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono">{idx + 1}</td>
                          <td className="px-3 py-2 font-semibold">{st.studentName}</td>
                          <td className="px-3 py-2 font-mono">{st.admissionNo}</td>
                          <td className="px-3 py-2">{st.universityName}</td>
                          <td className="px-3 py-2">{st.programName}</td>
                          <td className="px-3 py-2">{st.centerName}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {st.date ? new Date(st.date).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {st.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">
                            ₹{Number(st.rate || detailMonth.ratePerStudent || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailMonth(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

