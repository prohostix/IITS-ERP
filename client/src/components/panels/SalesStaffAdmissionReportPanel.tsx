import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  DollarSign, 
  Download, 
  RefreshCw, 
  Search, 
  Filter, 
  Building2, 
  GraduationCap, 
  Trophy, 
  Medal, 
  Award,
  ChevronRight,
  ArrowUpDown,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface SalesStaffItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  designation?: string;
  branch?: { id: string; name: string };
  department?: { id: string; name: string };
}

interface StaffSummaryItem {
  staff: SalesStaffItem;
  studyCentersCount: number;
  totalAdmissions: number;
  enrolledCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalRevenue: number;
  conversionRate: number;
  monthlyTrend: number[];
  admissionsCount: number;
}

interface AdmissionItem {
  id: string;
  enrollmentNumber: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  programName: string;
  programCode: string;
  universityName: string;
  studyCenterName: string;
  studyCenterCode: string;
  status: string;
  admissionDate: string;
  totalFee: number;
  salesStaff: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface OverallSummary {
  totalStaff: number;
  totalAdmissions: number;
  totalEnrolled: number;
  totalPending: number;
  totalRejected: number;
  totalRevenue: number;
  avgConversionRate: number;
}

const MONTHS = [
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'enrolled':
      return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30">Enrolled</Badge>;
    case 'rejected':
    case 'department_rejected':
      return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 border-rose-500/30">Rejected</Badge>;
    case 'pending_doc_review':
    case 'document_review':
    case 'pending_finance_review':
    case 'finance_review':
    case 'dept_review':
    case 'payment_pending':
      return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border-amber-500/30">In Review</Badge>;
    default:
      return <Badge variant="outline">{status || 'Pending'}</Badge>;
  }
};

const rankBadge = (index: number) => {
  if (index === 0) return <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full"><Trophy className="w-3.5 h-3.5" /> #1</span>;
  if (index === 1) return <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-400/10 px-2 py-0.5 rounded-full"><Medal className="w-3.5 h-3.5" /> #2</span>;
  if (index === 2) return <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-700/10 px-2 py-0.5 rounded-full"><Award className="w-3.5 h-3.5" /> #3</span>;
  return <span className="text-xs font-medium text-muted-foreground px-2">#{index + 1}</span>;
};

export function SalesStaffAdmissionReportPanel() {
  const [loading, setLoading] = useState(false);
  const [staffSummary, setStaffSummary] = useState<StaffSummaryItem[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionItem[]>([]);
  const [overallSummary, setOverallSummary] = useState<OverallSummary>({
    totalStaff: 0,
    totalAdmissions: 0,
    totalEnrolled: 0,
    totalPending: 0,
    totalRejected: 0,
    totalRevenue: 0,
    avgConversionRate: 0,
  });
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI state
  const [activeView, setActiveView] = useState<'leaderboard' | 'admissions'>('leaderboard');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedStaffId && selectedStaffId !== 'all') params.append('staffId', selectedStaffId);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`/sales/staff-admission-report?${params.toString()}`);
      if (res.data.success && res.data.data) {
        setStaffSummary(res.data.data.staffSummary || []);
        setAdmissions(res.data.data.admissions || []);
        setOverallSummary(res.data.data.overallSummary || {
          totalStaff: 0,
          totalAdmissions: 0,
          totalEnrolled: 0,
          totalPending: 0,
          totalRejected: 0,
          totalRevenue: 0,
          avgConversionRate: 0,
        });
        if (res.data.data.availableYears?.length) {
          setAvailableYears(res.data.data.availableYears);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load Sales Staff Admission Report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    setPage(1);
  }, [selectedYear, selectedMonth, selectedStaffId, selectedStatus]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReport();
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResetFilters = () => {
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedMonth('all');
    setSelectedStaffId('all');
    setSelectedStatus('all');
    setSearchQuery('');
  };

  const handleDrilldownStaff = (staffId: string) => {
    setSelectedStaffId(staffId);
    setActiveView('admissions');
    setPage(1);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!admissions.length) {
      toast.error('No admission records to export');
      return;
    }

    const headers = [
      'Enrollment Number',
      'Student Name',
      'Student Email',
      'Student Phone',
      'Program',
      'Program Code',
      'University',
      'Study Center',
      'Sales Representative',
      'Representative Role',
      'Admission Date',
      'Total Fee (INR)',
      'Status'
    ];

    const rows = admissions.map(a => [
      `"${a.enrollmentNumber || ''}"`,
      `"${a.studentName || ''}"`,
      `"${a.studentEmail || ''}"`,
      `"${a.studentPhone || ''}"`,
      `"${a.programName || ''}"`,
      `"${a.programCode || ''}"`,
      `"${a.universityName || ''}"`,
      `"${a.studyCenterName || ''}"`,
      `"${a.salesStaff?.name || ''}"`,
      `"${a.salesStaff?.role || ''}"`,
      `"${a.admissionDate ? new Date(a.admissionDate).toLocaleDateString() : ''}"`,
      a.totalFee || 0,
      `"${a.status || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Sales_Staff_Admissions_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${admissions.length} admission records to CSV`);
  };

  // Pagination for admissions table
  const paginatedAdmissions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return admissions.slice(start, start + pageSize);
  }, [admissions, page]);

  const totalPages = Math.ceil(admissions.length / pageSize) || 1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sales Staff Admission Report</h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Performance &amp; Analytics
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Track student admissions generated by individual sales executives with monthly and yearly comparative filters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchReport} 
            disabled={loading}
            className="h-9 shadow-sm"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>

          <Button 
            variant="default" 
            size="sm" 
            onClick={handleExportCSV}
            disabled={loading || admissions.length === 0}
            className="h-9 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Modern Filter Card */}
      <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
            {/* Year Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              >
                <option value="all">All Years</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr.toString()}>{yr}</option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Sales Staff Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" /> Sales Staff
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              >
                <option value="all">All Sales Executives</option>
                {staffSummary.map(item => (
                  <option key={item.staff.id} value={item.staff.id}>
                    {item.staff.name} ({item.totalAdmissions} admissions)
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-primary" /> Admission Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              >
                <option value="all">All Statuses</option>
                <option value="enrolled">Enrolled / Confirmed</option>
                <option value="dept_review">In Review (Dept/Doc/Finance)</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-primary" /> Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Student, Center, Program..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Active Filter Indicator & Reset */}
          {(selectedYear !== new Date().getFullYear().toString() || selectedMonth !== 'all' || selectedStaffId !== 'all' || selectedStatus !== 'all' || searchQuery) && (
            <div className="mt-3.5 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="font-semibold text-foreground">Active Filter:</span>
                <span>Year: <strong className="text-primary">{selectedYear}</strong></span>
                <span>·</span>
                <span>Month: <strong className="text-primary">{selectedMonth === 'all' ? 'All Months' : MONTHS.find(m => m.value === selectedMonth)?.label}</strong></span>
                {selectedStaffId !== 'all' && (
                  <>
                    <span>·</span>
                    <span>Staff: <strong className="text-primary">{staffSummary.find(s => s.staff.id === selectedStaffId)?.staff.name || selectedStaffId}</strong></span>
                  </>
                )}
                {selectedStatus !== 'all' && (
                  <>
                    <span>·</span>
                    <span>Status: <strong className="text-primary">{selectedStatus}</strong></span>
                  </>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleResetFilters}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Admissions */}
        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Admissions</p>
              <p className="text-3xl font-extrabold tracking-tight text-foreground">
                {loading ? '...' : overallSummary.totalAdmissions}
              </p>
              <p className="text-xs text-muted-foreground">
                Across {overallSummary.totalStaff} sales representatives
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Enrolled Admissions */}
        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrolled &amp; Verified</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {loading ? '...' : overallSummary.totalEnrolled}
                </p>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none text-[11px]">
                  {overallSummary.avgConversionRate}% Conv.
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Confirmed student enrolments
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Pending In Review */}
        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">In Verification</p>
              <p className="text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
                {loading ? '...' : overallSummary.totalPending}
              </p>
              <p className="text-xs text-muted-foreground">
                Pending document / dept review
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Admission Revenue */}
        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-extrabold tracking-tight text-foreground truncate">
                {loading ? '...' : formatINR(overallSummary.totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">
                From {overallSummary.totalAdmissions} total student leads
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex border-b border-border/60 gap-4">
        <button
          onClick={() => setActiveView('leaderboard')}
          className={cn(
            'pb-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2',
            activeView === 'leaderboard'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Trophy className="w-4 h-4" />
          Sales Staff Leaderboard &amp; Trends ({staffSummary.length})
        </button>

        <button
          onClick={() => setActiveView('admissions')}
          className={cn(
            'pb-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2',
            activeView === 'admissions'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <GraduationCap className="w-4 h-4" />
          Detailed Admissions ({admissions.length})
        </button>
      </div>

      {/* VIEW 1: Leaderboard Table */}
      {activeView === 'leaderboard' && (
        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Staff Performance Overview</CardTitle>
              <CardDescription>
                Admission volume, conversion ratios, monthly distribution, and revenue generated by each sales rep
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Aggregating admission statistics...</p>
              </div>
            ) : staffSummary.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-base font-semibold">No sales staff found</p>
                <p className="text-xs mt-1">Try adjusting the filter criteria or date range.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold border-b border-border/40">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Rank</th>
                      <th className="py-3 px-4">Sales Representative</th>
                      <th className="py-3 px-4 text-center">Study Centers</th>
                      <th className="py-3 px-4 text-center">Total Admissions</th>
                      <th className="py-3 px-4 text-center">Enrolled</th>
                      <th className="py-3 px-4 text-center">Pending</th>
                      <th className="py-3 px-4 text-center">Rejected</th>
                      <th className="py-3 px-4 text-center">Conversion Rate</th>
                      <th className="py-3 px-4 text-right">Revenue</th>
                      <th className="py-3 px-4 text-center">Monthly Trend ({selectedYear === 'all' ? 'Current' : selectedYear})</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {staffSummary.map((item, index) => {
                      const maxTrendVal = Math.max(...item.monthlyTrend, 1);
                      return (
                        <tr 
                          key={item.staff.id}
                          className="hover:bg-muted/30 transition-colors group cursor-pointer"
                          onClick={() => handleDrilldownStaff(item.staff.id)}
                        >
                          <td className="py-3.5 px-4 text-center font-medium">
                            {rankBadge(index)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                                {item.staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                                  {item.staff.name}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                  <span>{item.staff.designation || item.staff.role.replace(/_/g, ' ')}</span>
                                  {item.staff.branch && (
                                    <>
                                      <span>•</span>
                                      <span className="text-[11px] font-medium">{item.staff.branch.name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              {item.studyCentersCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-foreground">
                            {item.totalAdmissions}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {item.enrolledCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {item.pendingCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="text-rose-500 font-medium">
                              {item.rejectedCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn(
                                'text-xs font-bold px-2 py-0.5 rounded-full',
                                item.conversionRate >= 70 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                                item.conversionRate >= 40 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                                'bg-muted text-muted-foreground'
                              )}>
                                {item.conversionRate}%
                              </span>
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    'h-full rounded-full transition-all',
                                    item.conversionRate >= 70 ? 'bg-emerald-500' :
                                    item.conversionRate >= 40 ? 'bg-amber-500' :
                                    'bg-primary/50'
                                  )}
                                  style={{ width: `${Math.min(100, item.conversionRate)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-foreground">
                            {formatINR(item.totalRevenue)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {/* 12-month mini sparkline bars */}
                            <div className="flex items-end justify-center gap-0.5 h-7 w-32 mx-auto">
                              {item.monthlyTrend.map((count, mIdx) => {
                                const heightPct = maxTrendVal > 0 ? (count / maxTrendVal) * 100 : 0;
                                return (
                                  <div 
                                    key={mIdx}
                                    title={`${MONTH_NAMES[mIdx]}: ${count} admissions`}
                                    className="flex-1 flex flex-col items-center group/bar"
                                  >
                                    <div 
                                      className={cn(
                                        'w-full rounded-t-sm transition-all',
                                        count > 0 ? 'bg-primary group-hover/bar:bg-primary/80' : 'bg-muted/40'
                                      )}
                                      style={{ height: `${Math.max(12, heightPct)}%` }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex justify-between w-32 mx-auto mt-0.5">
                              <span>J</span><span>D</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDrilldownStaff(item.staff.id);
                              }}
                              className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                            >
                              Admissions <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* VIEW 2: Detailed Admissions Table */}
      {activeView === 'admissions' && (
        <Card className="border border-border/60 shadow-sm bg-card/60 backdrop-blur-md overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                Detailed Admissions List
                <Badge variant="secondary" className="text-xs font-normal">
                  {admissions.length} records
                </Badge>
              </CardTitle>
              <CardDescription>
                Individual student enrollment records filtered by the selected sales staff and timeframe
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Loading admission records...</p>
              </div>
            ) : admissions.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-base font-semibold">No admissions match current filters</p>
                <p className="text-xs mt-1">Change the year, month, or staff filter to view records.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/40 text-muted-foreground text-xs uppercase font-semibold border-b border-border/40">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Enrollment No</th>
                      <th className="py-3 px-4">Program &amp; University</th>
                      <th className="py-3 px-4">Study Center</th>
                      <th className="py-3 px-4">Sales Representative</th>
                      <th className="py-3 px-4">Admission Date</th>
                      <th className="py-3 px-4 text-right">Fee</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {paginatedAdmissions.map((adm) => (
                      <tr key={adm.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground">{adm.studentName}</div>
                          <div className="text-xs text-muted-foreground">{adm.studentEmail || adm.studentPhone || 'No contact'}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-medium text-foreground">
                          {adm.enrollmentNumber || 'Pending'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-foreground">{adm.programName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span className="inline-block px-1.5 py-0.2 rounded bg-muted text-[10px] font-semibold">{adm.programCode}</span>
                            <span>{adm.universityName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-foreground">{adm.studyCenterName}</div>
                          {adm.studyCenterCode && (
                            <div className="text-xs text-muted-foreground">{adm.studyCenterCode}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                              {adm.salesStaff.name[0]?.toUpperCase() || 'S'}
                            </div>
                            <span>{adm.salesStaff.name}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 ml-7">
                            {adm.salesStaff.role.replace(/_/g, ' ')}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          {adm.admissionDate ? new Date(adm.admissionDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }) : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-foreground">
                          {formatINR(adm.totalFee)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {getStatusBadge(adm.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, admissions.length)} of {admissions.length} admissions
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-8 px-3"
                      >
                        Previous
                      </Button>
                      <span className="font-semibold text-foreground">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="h-8 px-3"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SalesStaffAdmissionReportPanel;
