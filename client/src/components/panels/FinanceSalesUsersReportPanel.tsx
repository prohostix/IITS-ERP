import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  RefreshCw,
  Search,
  Filter,
  Building2,
  GraduationCap,
  Trophy,
  Medal,
  Award,
  ChevronDown,
  ChevronUp,
  Calendar,
  Wallet,
  Receipt,
  Percent,
  Landmark,
  ArrowUpRight,
  Eye,
  BarChart3,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// ─── Formatters & Helpers ────────────────────────────────────────────────────

const formatCurrency = (amount: number | undefined | null): string => {
  const val = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTHS_DROPDOWN = [
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

const getStatusBadge = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'enrolled' || s === 'approved' || s === 'active') {
    return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">Enrolled</Badge>;
  }
  if (s.includes('pending')) {
    return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">Pending</Badge>;
  }
  if (s === 'rejected' || s === 'cancelled') {
    return <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium">Rejected</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">{status || '-'}</Badge>;
};

const getPaymentBadge = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'paid' || s === 'completed') {
    return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Paid</Badge>;
  }
  if (s === 'partial') {
    return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20">Partial</Badge>;
  }
  return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20">Pending</Badge>;
};

const getRankBadge = (index: number) => {
  if (index === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full shadow-xs">
        <Trophy className="w-3.5 h-3.5 fill-amber-500 text-amber-600" /> Rank #1
      </span>
    );
  }
  if (index === 1) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-400/15 border border-slate-400/30 px-2.5 py-0.5 rounded-full shadow-xs">
        <Medal className="w-3.5 h-3.5 fill-slate-400 text-slate-500" /> Rank #2
      </span>
    );
  }
  if (index === 2) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-600 bg-amber-700/15 border border-amber-700/30 px-2.5 py-0.5 rounded-full shadow-xs">
        <Award className="w-3.5 h-3.5 fill-amber-700 text-amber-800" /> Rank #3
      </span>
    );
  }
  return <span className="text-xs font-semibold text-muted-foreground px-2">#{index + 1}</span>;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function FinanceSalesUsersReportPanel() {
  const [loading, setLoading] = useState(false);
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [allSalesStaff, setAllSalesStaff] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [summary, setSummary] = useState<any>({
    totalSalesUsers: 0,
    totalCentersOnboarded: 0,
    totalAdmissions: 0,
    totalEnrolled: 0,
    totalPending: 0,
    totalRejected: 0,
    totalRevenue: 0,
    totalCollected: 0,
    totalPendingFee: 0,
    totalCommissionInExpected: 0,
    totalCommissionInReceived: 0,
    totalCommissionOut: 0,
    totalNetMargin: 0,
    avgConversionRate: 0,
  });

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Active view: 'cards' | 'table' | 'admissions'
  const [activeView, setActiveView] = useState<'cards' | 'table' | 'admissions'>('cards');
  // Expanded user cards in breakdown view
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());
  // User drilldown modal
  const [selectedUserModal, setSelectedUserModal] = useState<any | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<'admissions' | 'centers' | 'trend'>('admissions');

  // Master admissions pagination
  const [admPage, setAdmPage] = useState(1);
  const admPageSize = 20;

  const toggleExpand = (userId: string) => {
    setExpandedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedUserIds(new Set(salesUsers.map(u => u.user.id)));
  };

  const collapseAll = () => {
    setExpandedUserIds(new Set());
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedMonth && selectedMonth !== 'all') params.append('month', selectedMonth);
      if (selectedStaffId && selectedStaffId !== 'all') params.append('staffId', selectedStaffId);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get(`/finance/reports/sales-users?${params.toString()}`);
      if (res.data.success && res.data.data) {
        setSalesUsers(res.data.data.salesUsers || []);
        setSummary(res.data.data.summary || {});
        if (res.data.data.allSalesStaff?.length) {
          setAllSalesStaff(res.data.data.allSalesStaff);
        }
        if (res.data.data.availableYears?.length) {
          setAvailableYears(res.data.data.availableYears);
        }
        // Auto-expand first 2 users if not expanded
        if (expandedUserIds.size === 0 && res.data.data.salesUsers?.length > 0) {
          const firstIds = res.data.data.salesUsers.slice(0, 2).map((u: any) => u.user.id);
          setExpandedUserIds(new Set(firstIds));
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load Sales Users Financial Report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedYear, selectedMonth, selectedStaffId, selectedStatus, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport();
  };

  const clearFilters = () => {
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedMonth('all');
    setSelectedStaffId('all');
    setSelectedStatus('all');
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  };

  // Flattened admissions list for master view
  const allFlattenedAdmissions = useMemo(() => {
    const list: any[] = [];
    salesUsers.forEach(u => {
      (u.admissions || []).forEach((adm: any) => {
        list.push({
          ...adm,
          salesUserName: u.user.name,
          salesUserRole: u.user.role,
          salesUserEmail: u.user.email,
        });
      });
    });
    return list;
  }, [salesUsers]);

  // Export to Excel (Multiple structured sheets)
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Sales Users Summary
      const summaryRows = salesUsers.map((item, index) => ({
        'Rank': index + 1,
        'Staff Name': item.user.name,
        'Email': item.user.email,
        'Role': item.user.role,
        'Designation': item.user.designation || '-',
        'Branch': item.user.branchName,
        'Department': item.user.departmentName,
        'Study Centers Onboarded': item.stats.studyCentersCount,
        'Centers Wallet Balance (INR)': item.stats.totalCentersWalletBalance,
        'Total Admissions': item.stats.totalAdmissions,
        'Enrolled Count': item.stats.enrolledCount,
        'Pending Admissions': item.stats.pendingCount,
        'Rejected Admissions': item.stats.rejectedCount,
        'Conversion Rate (%)': item.stats.conversionRate,
        'Gross Course Fee (INR)': item.stats.totalRevenue,
        'Fee Collected (INR)': item.stats.totalCollected,
        'Pending Fee (INR)': item.stats.totalPendingFee,
        'Expected Univ Commission (INR)': item.stats.totalCommissionInExpected,
        'Received Univ Commission (INR)': item.stats.totalCommissionInReceived,
        'Center Commission Out (INR)': item.stats.totalCommissionOut,
        'Net Operating Margin (INR)': item.stats.netMargin,
        'Revenue Target (INR)': item.targetStats.revenueTarget,
        'Revenue Achieved %': item.targetStats.revenueProgress,
        'Students Target': item.targetStats.studentsTarget,
        'Students Achieved %': item.targetStats.studentsProgress,
      }));

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Sales Staff Summary');

      // Sheet 2: Admissions Master Ledger
      const admissionsRows = allFlattenedAdmissions.map(adm => ({
        'Sales Staff': adm.salesUserName,
        'Staff Role': adm.salesUserRole,
        'Enrollment No': adm.enrollmentNumber,
        'Student Name': adm.studentName,
        'Student Email': adm.studentEmail,
        'Student Phone': adm.studentPhone,
        'Program': adm.programName,
        'Program Code': adm.programCode,
        'University': adm.universityName,
        'Admission Session': adm.sessionName,
        'Study Center': adm.studyCenterName,
        'Center City': adm.studyCenterCity,
        'Admission Date': formatDate(adm.admissionDate),
        'Admission Status': adm.status,
        'Total Course Fee': adm.totalFee,
        'Collected Fee': adm.collectedAmount,
        'Pending Fee': adm.pendingAmount,
        'Payment Status': adm.paymentStatus,
        'Payment Method': adm.paymentMethod || '-',
        'Univ Commission Expected': adm.commissionExpected,
        'Univ Commission Received': adm.commissionReceived,
      }));

      const wsAdmissions = XLSX.utils.json_to_sheet(admissionsRows);
      XLSX.utils.book_append_sheet(wb, wsAdmissions, 'Admissions Ledger');

      // Sheet 3: Study Centers Onboarded
      const centersRows: any[] = [];
      salesUsers.forEach(u => {
        (u.centers || []).forEach((c: any) => {
          centersRows.push({
            'Referred By (Staff)': u.user.name,
            'Staff Email': u.user.email,
            'Center Name': c.name,
            'Center Code': c.code,
            'City': c.city || '-',
            'State': c.state || '-',
            'Status': c.status,
            'Coordinator': c.coordinatorName || '-',
            'Contact': c.contact || '-',
            'Wallet Balance (INR)': c.walletBalance,
            'Total Enrollments': c.enrollmentCount,
            'Total Students': c.studentCount,
            'Onboarded Date': formatDate(c.createdAt)
          });
        });
      });

      const wsCenters = XLSX.utils.json_to_sheet(centersRows);
      XLSX.utils.book_append_sheet(wb, wsCenters, 'Onboarded Study Centers');

      const fileName = `Finance_Sales_Users_Report_${selectedYear}_${selectedMonth}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Sales Users Financial Report exported to Excel');
    } catch (err) {
      toast.error('Failed to export Excel report');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ─── Header Section ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Sales Users Financial Report
                <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 bg-primary/5 text-primary border-primary/20">
                  Individual Breakdown
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Comprehensive financial and admission performance report isolated per sales staff member
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/60">
            <Button
              variant={activeView === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('cards')}
              className={cn("h-8 text-xs font-medium gap-1.5", activeView === 'cards' && "shadow-xs")}
            >
              <Users className="w-3.5 h-3.5" />
              Users Breakdown
            </Button>
            <Button
              variant={activeView === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('table')}
              className={cn("h-8 text-xs font-medium gap-1.5", activeView === 'table' && "shadow-xs")}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Leaderboard Table
            </Button>
            <Button
              variant={activeView === 'admissions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveView('admissions')}
              className={cn("h-8 text-xs font-medium gap-1.5", activeView === 'admissions' && "shadow-xs")}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              All Admissions ({allFlattenedAdmissions.length})
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            className="h-8 gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchReport}
            disabled={loading}
            className="h-8 gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Executive Summary KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        <Card className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/20 shadow-xs hover:border-indigo-500/40 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sales Staff</span>
              <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight">{summary.totalSalesUsers || 0}</span>
              <span className="text-xs text-muted-foreground">{summary.totalCentersOnboarded || 0} centers</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active sales users & referrers</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20 shadow-xs hover:border-blue-500/40 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Admissions</span>
              <div className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                {summary.totalAdmissions || 0}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {summary.totalEnrolled || 0} enrolled
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t pt-1.5 border-border/50">
              <span>Pending: {summary.totalPending || 0}</span>
              <span>Conv: {summary.avgConversionRate || 0}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20 shadow-xs hover:border-purple-500/40 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Course Fee</span>
              <div className="p-2 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-purple-700 dark:text-purple-300">
                {formatCurrency(summary.totalRevenue)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total revenue generated</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20 shadow-xs hover:border-emerald-500/40 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fee Collected</span>
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatCurrency(summary.totalCollected)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t pt-1.5 border-border/50">
              <span className="text-amber-600 dark:text-amber-400">Pending: {formatCurrency(summary.totalPendingFee)}</span>
              <span>
                {summary.totalRevenue > 0
                  ? `${((summary.totalCollected / summary.totalRevenue) * 100).toFixed(0)}% collected`
                  : '0%'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 shadow-xs hover:border-amber-500/40 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Margin</span>
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {formatCurrency(summary.totalNetMargin)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t pt-1.5 border-border/50">
              <span>Comm Out: {formatCurrency(summary.totalCommissionOut)}</span>
              <span className="text-emerald-600 dark:text-emerald-400">Univ Rec: {formatCurrency(summary.totalCommissionInReceived)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filters & Search Toolbar ───────────────────────────────────────── */}
      <Card className="border border-border/70 shadow-xs bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Year Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3 text-primary" /> Year
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map(yr => (
                    <SelectItem key={yr} value={yr.toString()}>{yr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3 text-primary" /> Month
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_DROPDOWN.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sales Staff Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3 text-primary" /> Sales Staff
              </label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger className="h-9 w-full text-xs truncate">
                  <SelectValue placeholder="All Sales Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sales Staff</SelectItem>
                  {(allSalesStaff.length > 0 ? allSalesStaff : salesUsers.map(s => s.user)).map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Admission Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-primary" /> Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="enrolled">Enrolled Only</SelectItem>
                  <SelectItem value="pending">Pending Only</SelectItem>
                  <SelectItem value="rejected">Rejected Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Search bar and Quick Controls */}
          <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search staff name, email, center, student name, enrollment #..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs w-full"
              />
            </form>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {activeView === 'cards' && (
                <>
                  <Button variant="ghost" size="sm" onClick={expandAll} className="h-7 text-xs px-2">
                    Expand All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={collapseAll} className="h-7 text-xs px-2">
                    Collapse All
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Main Content View ──────────────────────────────────────────────── */}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading Sales Users Financial Report...</p>
        </div>
      ) : salesUsers.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold">No Sales Users Data Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            No sales staff records matched your current filters. Try selecting "All Years" or clearing search query.
          </p>
          <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 text-xs">
            Reset Filters
          </Button>
        </Card>
      ) : (
        <>
          {/* ──────────────── VIEW 1: INDIVIDUAL CARDS BREAKDOWN ──────────────── */}
          {activeView === 'cards' && (
            <div className="space-y-4">
              {salesUsers.map((item, index) => {
                const u = item.user || {};
                const stats = item.stats || {};
                const targets = item.targetStats || {};
                const admissions = item.admissions || [];
                const centers = item.centers || [];
                const isExpanded = expandedUserIds.has(u.id);

                return (
                  <Card
                    key={u.id}
                    className={cn(
                      "transition-all border shadow-xs overflow-hidden",
                      isExpanded ? "border-primary/40 ring-1 ring-primary/20" : "hover:border-border/80"
                    )}
                  >
                    {/* User Card Header / Summary Bar */}
                    <div
                      onClick={() => toggleExpand(u.id)}
                      className="p-4 cursor-pointer hover:bg-muted/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Left: User Avatar & Info */}
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="relative">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                            {u.name ? u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'SU'}
                          </div>
                          <div className="absolute -bottom-1 -right-1">
                            {getRankBadge(index)}
                          </div>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-base text-foreground hover:text-primary transition-colors">
                              {u.name}
                            </h3>
                            <Badge variant="outline" className="text-[11px] font-semibold capitalize bg-primary/5 text-primary border-primary/20">
                              {u.role ? u.role.replace(/_/g, ' ') : 'Sales'}
                            </Badge>
                            {u.status && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                {u.status}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-muted-foreground" /> {u.email}
                            </span>
                            {u.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-muted-foreground" /> {u.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-muted-foreground" /> {u.branchName || 'Head Office'}
                            </span>
                            {u.designation && (
                              <span className="text-muted-foreground/80">• {u.designation}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Financial & Admission KPIs Pill */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 lg:gap-3 text-left">
                        <div className="bg-muted/50 p-2 rounded-lg border border-border/50">
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Admissions</span>
                          <span className="text-sm font-bold text-foreground">
                            {stats.totalAdmissions} <span className="text-xs font-normal text-emerald-600">({stats.enrolledCount} enrolled)</span>
                          </span>
                        </div>

                        <div className="bg-muted/50 p-2 rounded-lg border border-border/50">
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Revenue</span>
                          <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                            {formatCurrency(stats.totalRevenue)}
                          </span>
                        </div>

                        <div className="bg-muted/50 p-2 rounded-lg border border-border/50">
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Collected Fee</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(stats.totalCollected)}
                          </span>
                        </div>

                        <div className="bg-muted/50 p-2 rounded-lg border border-border/50">
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Net Margin</span>
                          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(stats.netMargin)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Expand Toggle & Quick Drilldown */}
                      <div className="flex items-center gap-2 self-end lg:self-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserModal(item);
                            setModalActiveTab('admissions');
                          }}
                          className="h-8 text-xs gap-1 border border-primary/20 text-primary hover:bg-primary/10"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Details
                        </Button>
                        <div className="p-1 rounded-md text-muted-foreground hover:bg-muted">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content Section */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20 p-4 space-y-5 animate-in fade-in duration-300">
                        {/* 1. Target Progress Bars */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Revenue Target */}
                          <div className="bg-background p-3 rounded-lg border border-border/70 shadow-2xs">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-semibold text-muted-foreground flex items-center gap-1">
                                <Receipt className="w-3.5 h-3.5 text-purple-500" /> Revenue Target
                              </span>
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                {targets.revenueProgress}%
                              </span>
                            </div>
                            <Progress value={Math.min(100, targets.revenueProgress)} className="h-2 bg-purple-500/15" />
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
                              <span>Achieved: {formatCurrency(targets.revenueAchieved)}</span>
                              <span>Target: {targets.revenueTarget > 0 ? formatCurrency(targets.revenueTarget) : 'Not set'}</span>
                            </div>
                          </div>

                          {/* Student Admissions Target */}
                          <div className="bg-background p-3 rounded-lg border border-border/70 shadow-2xs">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-semibold text-muted-foreground flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> Students Target
                              </span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {targets.studentsProgress}%
                              </span>
                            </div>
                            <Progress value={Math.min(100, targets.studentsProgress)} className="h-2 bg-blue-500/15" />
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
                              <span>Enrolled: {targets.studentsAchieved}</span>
                              <span>Target: {targets.studentsTarget > 0 ? targets.studentsTarget : 'Not set'}</span>
                            </div>
                          </div>

                          {/* Centers Onboarding Target */}
                          <div className="bg-background p-3 rounded-lg border border-border/70 shadow-2xs">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-semibold text-muted-foreground flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-emerald-500" /> Centers Onboarding
                              </span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {targets.centersProgress}%
                              </span>
                            </div>
                            <Progress value={Math.min(100, targets.centersProgress)} className="h-2 bg-emerald-500/15" />
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
                              <span>Onboarded: {targets.centersAchieved}</span>
                              <span>Target: {targets.centersTarget > 0 ? targets.centersTarget : 'Not set'}</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Detailed Tabs for this Sales User */}
                        <Tabs defaultValue="admissions" className="w-full">
                          <div className="flex items-center justify-between border-b pb-2">
                            <TabsList className="bg-background border h-8 p-0.5">
                              <TabsTrigger value="admissions" className="text-xs h-7 gap-1">
                                <GraduationCap className="w-3 h-3" />
                                Admissions ({item.admissions.length})
                              </TabsTrigger>
                              <TabsTrigger value="centers" className="text-xs h-7 gap-1">
                                <Building2 className="w-3 h-3" />
                                Study Centers ({item.centers.length})
                              </TabsTrigger>
                              <TabsTrigger value="trend" className="text-xs h-7 gap-1">
                                <BarChart3 className="w-3 h-3" />
                                Monthly Performance
                              </TabsTrigger>
                            </TabsList>

                            <div className="text-xs text-muted-foreground hidden sm:block">
                              Conversion Rate: <span className="font-bold text-foreground">{stats.conversionRate}%</span>
                            </div>
                          </div>

                          {/* Tab Content: Admissions */}
                          <TabsContent value="admissions" className="mt-3">
                            {item.admissions.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-6 text-center italic">
                                No admissions credited to this sales user in the selected period.
                              </p>
                            ) : (
                              <div className="rounded-lg border bg-background overflow-x-auto shadow-2xs">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                                      <th className="py-2.5 px-3 text-left">Enrollment #</th>
                                      <th className="py-2.5 px-3 text-left">Student Name</th>
                                      <th className="py-2.5 px-3 text-left">Program & Univ</th>
                                      <th className="py-2.5 px-3 text-left">Study Center</th>
                                      <th className="py-2.5 px-3 text-left">Admission Date</th>
                                      <th className="py-2.5 px-3 text-right">Course Fee</th>
                                      <th className="py-2.5 px-3 text-right">Collected</th>
                                      <th className="py-2.5 px-3 text-right">Pending</th>
                                      <th className="py-2.5 px-3 text-center">Status</th>
                                      <th className="py-2.5 px-3 text-center">Payment</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/60">
                                    {item.admissions.slice(0, 10).map((adm: any) => (
                                      <tr key={adm.id} className="hover:bg-muted/40 transition-colors">
                                        <td className="py-2 px-3 font-mono font-medium text-foreground">
                                          {adm.enrollmentNumber}
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="font-medium text-foreground">{adm.studentName}</div>
                                          <div className="text-[10px] text-muted-foreground">{adm.studentPhone || adm.studentEmail}</div>
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="font-medium text-foreground">{adm.programName}</div>
                                          <div className="text-[10px] text-muted-foreground">{adm.universityName}</div>
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="font-medium text-foreground">{adm.studyCenterName}</div>
                                          <div className="text-[10px] text-muted-foreground">{adm.studyCenterCity}</div>
                                        </td>
                                        <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">
                                          {formatDate(adm.admissionDate)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium">
                                          {formatCurrency(adm.totalFee)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                          {formatCurrency(adm.collectedAmount)}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-amber-600 dark:text-amber-400">
                                          {formatCurrency(adm.pendingAmount)}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          {getStatusBadge(adm.status)}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          {getPaymentBadge(adm.paymentStatus)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {item.admissions.length > 10 && (
                                  <div className="p-2 border-t text-center text-xs text-muted-foreground bg-muted/20">
                                    Showing 10 of {item.admissions.length} admissions. Click "View Details" to see complete list.
                                  </div>
                                )}
                              </div>
                            )}
                          </TabsContent>

                          {/* Tab Content: Study Centers */}
                          <TabsContent value="centers" className="mt-3">
                            {item.centers.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-6 text-center italic">
                                No study centers onboarded by this sales user.
                              </p>
                            ) : (
                              <div className="rounded-lg border bg-background overflow-x-auto shadow-2xs">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                                      <th className="py-2.5 px-3 text-left">Center Name</th>
                                      <th className="py-2.5 px-3 text-left">Code</th>
                                      <th className="py-2.5 px-3 text-left">City / State</th>
                                      <th className="py-2.5 px-3 text-left">Coordinator</th>
                                      <th className="py-2.5 px-3 text-right">Wallet Balance</th>
                                      <th className="py-2.5 px-3 text-center">Total Students</th>
                                      <th className="py-2.5 px-3 text-center">Enrollments</th>
                                      <th className="py-2.5 px-3 text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/60">
                                    {item.centers.map((c: any) => (
                                      <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                                        <td className="py-2 px-3 font-medium text-foreground">{c.name}</td>
                                        <td className="py-2 px-3 font-mono text-muted-foreground">{c.code}</td>
                                        <td className="py-2 px-3 text-muted-foreground">{c.city || '-'}{c.state ? `, ${c.state}` : ''}</td>
                                        <td className="py-2 px-3 text-muted-foreground">{c.coordinatorName || c.contact || '-'}</td>
                                        <td className="py-2 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                          {formatCurrency(c.walletBalance)}
                                        </td>
                                        <td className="py-2 px-3 text-center font-medium">{c.studentCount}</td>
                                        <td className="py-2 px-3 text-center font-medium">{c.enrollmentCount}</td>
                                        <td className="py-2 px-3 text-center">
                                          <Badge variant="outline" className="text-[10px] capitalize">
                                            {c.status || 'Active'}
                                          </Badge>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </TabsContent>

                          {/* Tab Content: Monthly Trend Chart */}
                          <TabsContent value="trend" className="mt-3">
                            <div className="bg-background p-4 rounded-lg border shadow-2xs">
                              <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                                12-Month Admissions & Collection Performance ({selectedYear})
                              </h4>
                              <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={item.monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                                    <XAxis
                                      dataKey="month"
                                      tickFormatter={(m) => MONTH_NAMES[m - 1] || m}
                                      tick={{ fontSize: 11 }}
                                      axisLine={{ stroke: '#e2e8f0' }}
                                    />
                                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                                    <YAxis
                                      yAxisId="right"
                                      orientation="right"
                                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                                      tick={{ fontSize: 10 }}
                                    />
                                    <Tooltip
                                      formatter={(val: any, name: any) => {
                                        if (name === 'revenue' || name === 'collected') return [formatCurrency(val), name === 'revenue' ? 'Course Fee' : 'Collected Fee'];
                                        return [val, name === 'admissions' ? 'Total Admissions' : 'Enrolled Students'];
                                      }}
                                      labelFormatter={(m: any) => `Month: ${MONTH_NAMES[m - 1] || m}`}
                                    />
                                    <Legend
                                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                                      formatter={(value) => {
                                        if (value === 'admissions') return 'Admissions';
                                        if (value === 'enrolled') return 'Enrolled';
                                        if (value === 'revenue') return 'Course Fee';
                                        if (value === 'collected') return 'Collected';
                                        return value;
                                      }}
                                    />
                                    <Bar yAxisId="left" dataKey="admissions" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                    <Bar yAxisId="left" dataKey="enrolled" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                    <Bar yAxisId="right" dataKey="collected" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* ──────────────── VIEW 2: COMPARISON LEADERBOARD TABLE ────────────── */}
          {activeView === 'table' && (
            <Card className="border shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/60 text-muted-foreground font-semibold">
                      <th className="py-3 px-3 text-center">Rank</th>
                      <th className="py-3 px-3 text-left">Sales Representative</th>
                      <th className="py-3 px-3 text-left">Branch / Department</th>
                      <th className="py-3 px-3 text-center">Centers</th>
                      <th className="py-3 px-3 text-center">Admissions</th>
                      <th className="py-3 px-3 text-center">Enrolled</th>
                      <th className="py-3 px-3 text-right">Gross Fee</th>
                      <th className="py-3 px-3 text-right">Fee Collected</th>
                      <th className="py-3 px-3 text-right">Pending Fee</th>
                      <th className="py-3 px-3 text-right">Univ Comm (Exp)</th>
                      <th className="py-3 px-3 text-right">Center Comm (Out)</th>
                      <th className="py-3 px-3 text-right">Net Margin</th>
                      <th className="py-3 px-3 text-center">Conv. Rate</th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {salesUsers.map((item, index) => {
                      const u = item.user;
                      const stats = item.stats;
                      return (
                        <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-3 text-center font-bold">
                            {getRankBadge(index)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-foreground text-sm">{u.name}</div>
                            <div className="text-[11px] text-muted-foreground">{u.email}</div>
                            <div className="text-[10px] text-muted-foreground capitalize">{u.role?.replace(/_/g, ' ')}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-foreground">{u.branchName || 'Head Office'}</div>
                            <div className="text-[10px] text-muted-foreground">{u.departmentName}</div>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold">
                            <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              {stats.studyCentersCount}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold">
                            {stats.totalAdmissions}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                            {stats.enrolledCount}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-purple-700 dark:text-purple-300">
                            {formatCurrency(stats.totalRevenue)}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(stats.totalCollected)}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-amber-600 dark:text-amber-400">
                            {formatCurrency(stats.totalPendingFee)}
                          </td>
                          <td className="py-3 px-3 text-right text-muted-foreground">
                            {formatCurrency(stats.totalCommissionInExpected)}
                          </td>
                          <td className="py-3 px-3 text-right text-muted-foreground">
                            {formatCurrency(stats.totalCommissionOut)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(stats.netMargin)}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-semibold",
                              stats.conversionRate >= 70 ? "bg-emerald-500/15 text-emerald-600" :
                              stats.conversionRate >= 40 ? "bg-blue-500/15 text-blue-600" : "bg-muted text-muted-foreground"
                            )}>
                              {stats.conversionRate}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUserModal(item);
                                setModalActiveTab('admissions');
                              }}
                              className="h-7 text-xs px-2 gap-1"
                            >
                              <Eye className="w-3 h-3" /> Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ──────────────── VIEW 3: MASTER ALL ADMISSIONS AUDIT ─────────────── */}
          {activeView === 'admissions' && (
            <Card className="border shadow-xs overflow-hidden">
              <CardHeader className="py-3 px-4 border-b bg-muted/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      Master Admissions Financial Audit
                      <Badge variant="secondary" className="text-xs">
                        {allFlattenedAdmissions.length} Total Records
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      All student admissions tagged with corresponding sales staff attribution and payment statuses
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/60 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3 text-left">Sales Representative</th>
                      <th className="py-2.5 px-3 text-left">Enrollment #</th>
                      <th className="py-2.5 px-3 text-left">Student Name</th>
                      <th className="py-2.5 px-3 text-left">Program & Univ</th>
                      <th className="py-2.5 px-3 text-left">Study Center</th>
                      <th className="py-2.5 px-3 text-left">Admission Date</th>
                      <th className="py-2.5 px-3 text-right">Fee</th>
                      <th className="py-2.5 px-3 text-right">Collected</th>
                      <th className="py-2.5 px-3 text-right">Pending</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {allFlattenedAdmissions
                      .slice((admPage - 1) * admPageSize, admPage * admPageSize)
                      .map((adm: any) => (
                        <tr key={adm.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2 px-3">
                            <span className="font-semibold text-foreground block">{adm.salesUserName}</span>
                            <span className="text-[10px] text-muted-foreground capitalize">{adm.salesUserRole?.replace(/_/g, ' ')}</span>
                          </td>
                          <td className="py-2 px-3 font-mono font-medium text-foreground">
                            {adm.enrollmentNumber}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-medium text-foreground">{adm.studentName}</div>
                            <div className="text-[10px] text-muted-foreground">{adm.studentPhone || adm.studentEmail}</div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-medium text-foreground">{adm.programName}</div>
                            <div className="text-[10px] text-muted-foreground">{adm.universityName}</div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-medium text-foreground">{adm.studyCenterName}</div>
                            <div className="text-[10px] text-muted-foreground">{adm.studyCenterCity}</div>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">
                            {formatDate(adm.admissionDate)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {formatCurrency(adm.totalFee)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(adm.collectedAmount)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-amber-600 dark:text-amber-400">
                            {formatCurrency(adm.pendingAmount)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {getStatusBadge(adm.status)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {getPaymentBadge(adm.paymentStatus)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {allFlattenedAdmissions.length > admPageSize && (
                <div className="p-3 border-t flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
                  <span>
                    Showing {(admPage - 1) * admPageSize + 1} to {Math.min(admPage * admPageSize, allFlattenedAdmissions.length)} of {allFlattenedAdmissions.length} admissions
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={admPage === 1}
                      onClick={() => setAdmPage(p => Math.max(1, p - 1))}
                      className="h-7 text-xs px-2"
                    >
                      Previous
                    </Button>
                    <span className="px-2 font-medium">
                      Page {admPage} of {Math.ceil(allFlattenedAdmissions.length / admPageSize)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={admPage >= Math.ceil(allFlattenedAdmissions.length / admPageSize)}
                      onClick={() => setAdmPage(p => p + 1)}
                      className="h-7 text-xs px-2"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* ─── Detailed Sales User Drilldown Dialog ───────────────────────────── */}
      <Dialog open={Boolean(selectedUserModal)} onOpenChange={(open) => !open && setSelectedUserModal(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedUserModal && (() => {
            const modalUser = selectedUserModal.user || {};
            const modalStats = selectedUserModal.stats || {};
            const modalAdmissions = selectedUserModal.admissions || [];
            const modalCenters = selectedUserModal.centers || [];
            const modalTrend = selectedUserModal.monthlyTrend || [];

            return (
              <div className="space-y-4">
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        {modalUser.name}
                        <Badge variant="outline" className="text-xs capitalize font-semibold bg-primary/10 text-primary border-primary/20">
                          {modalUser.role?.replace(/_/g, ' ')}
                        </Badge>
                      </DialogTitle>
                      <DialogDescription className="text-xs mt-1">
                        {modalUser.email} • {modalUser.branchName || 'Head Office'} • {modalUser.departmentName}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Metric Highlights Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted/40 p-3 rounded-lg border">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Admissions</span>
                    <p className="text-lg font-bold text-foreground">
                      {modalStats.totalAdmissions || 0}
                      <span className="text-xs font-normal text-emerald-600 ml-1">({modalStats.enrolledCount || 0} enrolled)</span>
                    </p>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-lg border">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Course Fee</span>
                    <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                      {formatCurrency(modalStats.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-lg border">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Fee Collected</span>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(modalStats.totalCollected)}
                    </p>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-lg border">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Net Margin</span>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(modalStats.netMargin)}
                    </p>
                  </div>
                </div>

                {/* Sub-tabs */}
                <Tabs value={modalActiveTab} onValueChange={(v: any) => setModalActiveTab(v)}>
                  <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-9">
                    <TabsTrigger value="admissions" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                      Admissions Ledger ({modalAdmissions.length})
                    </TabsTrigger>
                    <TabsTrigger value="centers" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                      Referred Centers ({modalCenters.length})
                    </TabsTrigger>
                    <TabsTrigger value="trend" className="text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                      Monthly Performance Trend
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="admissions" className="mt-4">
                    <div className="rounded-lg border overflow-x-auto max-h-96">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs">
                          <tr className="border-b text-muted-foreground font-semibold">
                            <th className="py-2 px-3 text-left">Enrollment #</th>
                            <th className="py-2 px-3 text-left">Student</th>
                            <th className="py-2 px-3 text-left">Program</th>
                            <th className="py-2 px-3 text-left">Center</th>
                            <th className="py-2 px-3 text-right">Fee</th>
                            <th className="py-2 px-3 text-right">Collected</th>
                            <th className="py-2 px-3 text-right">Pending</th>
                            <th className="py-2 px-3 text-center">Status</th>
                            <th className="py-2 px-3 text-center">Payment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {modalAdmissions.map((adm: any) => (
                            <tr key={adm.id} className="hover:bg-muted/40">
                              <td className="py-2 px-3 font-mono font-medium">{adm.enrollmentNumber}</td>
                              <td className="py-2 px-3">
                                <div className="font-medium">{adm.studentName}</div>
                                <div className="text-[10px] text-muted-foreground">{adm.studentPhone}</div>
                              </td>
                              <td className="py-2 px-3">{adm.programName}</td>
                              <td className="py-2 px-3">{adm.studyCenterName}</td>
                              <td className="py-2 px-3 text-right font-medium">{formatCurrency(adm.totalFee)}</td>
                              <td className="py-2 px-3 text-right font-medium text-emerald-600">{formatCurrency(adm.collectedAmount)}</td>
                              <td className="py-2 px-3 text-right font-medium text-amber-600">{formatCurrency(adm.pendingAmount)}</td>
                              <td className="py-2 px-3 text-center">{getStatusBadge(adm.status)}</td>
                              <td className="py-2 px-3 text-center">{getPaymentBadge(adm.paymentStatus)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="centers" className="mt-4">
                    <div className="rounded-lg border overflow-x-auto max-h-96">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs">
                          <tr className="border-b text-muted-foreground font-semibold">
                            <th className="py-2 px-3 text-left">Center Name</th>
                            <th className="py-2 px-3 text-left">Code</th>
                            <th className="py-2 px-3 text-left">City</th>
                            <th className="py-2 px-3 text-right">Wallet Balance</th>
                            <th className="py-2 px-3 text-center">Enrollments</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {modalCenters.map((c: any) => (
                            <tr key={c.id} className="hover:bg-muted/40">
                              <td className="py-2 px-3 font-medium">{c.name}</td>
                              <td className="py-2 px-3 font-mono text-muted-foreground">{c.code}</td>
                              <td className="py-2 px-3 text-muted-foreground">{c.city || '-'}</td>
                              <td className="py-2 px-3 text-right font-medium text-emerald-600">{formatCurrency(c.walletBalance)}</td>
                              <td className="py-2 px-3 text-center font-medium">{c.enrollmentCount}</td>
                              <td className="py-2 px-3 text-center">
                                <Badge variant="outline" className="text-[10px] capitalize">{c.status || 'Active'}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="trend" className="mt-4">
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={modalTrend}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                          <XAxis dataKey="month" tickFormatter={(m) => MONTH_NAMES[m - 1] || m} tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(val: any, name: any) => {
                              if (name === 'revenue' || name === 'collected') return [formatCurrency(val), name === 'revenue' ? 'Course Fee' : 'Collected'];
                              return [val, name];
                            }}
                            labelFormatter={(m: any) => `Month: ${MONTH_NAMES[m - 1] || m}`}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Bar dataKey="admissions" fill="#3b82f6" name="Admissions" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="enrolled" fill="#10b981" name="Enrolled" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
