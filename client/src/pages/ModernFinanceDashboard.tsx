import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Receipt,
  Wallet,
  FileText,
  Users,
  BookOpen,
  Landmark,
} from 'lucide-react';
import { InvoicesPanel } from '@/components/panels/InvoicesPanel';
import { PaymentsPanel } from '@/components/panels/PaymentsPanel';
import { ExpensesPanel } from '@/components/panels/ExpensesPanel';
import { TargetsPanel } from '@/components/panels/TargetsPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { PayrollPanel } from '@/components/panels/PayrollPanel';
import { PayrollBatchesPanel } from '@/components/panels/PayrollBatchesPanel';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { StudyCentersPanel } from '@/components/panels/StudyCentersPanel';
import { BroadcastNotificationsPanel } from '@/components/panels/BroadcastNotificationsPanel';
import { AdmissionSessionsPanel } from '@/components/panels/AdmissionSessionsPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { FinanceAuthFeePanel } from '@/components/panels/FinanceAuthFeePanel';
import { FinanceCenterVerificationPanel } from '@/components/panels/FinanceCenterVerificationPanel';
import { ProgramFeeStructurePanel } from '@/components/panels/ProgramFeeStructurePanel';
import { WalletTopUpsPanel } from '@/components/panels/WalletTopUpsPanel';
import { FinanceEnrollmentsPanel } from '@/components/panels/FinanceEnrollmentsPanel';
import { IncomeExpenditurePanel } from '@/components/panels/IncomeExpenditurePanel';
import { ProfitLossPanel } from '@/components/panels/ProfitLossPanel';
import { FinanceSalaryApprovalPanel } from '@/components/panels/FinanceSalaryApprovalPanel';
import { FinanceSalesTargetsPanel } from '@/components/panels/FinanceSalesTargetsPanel';
import { FinanceUniversityFeePanel } from '@/components/panels/FinanceUniversityFeePanel';
import { SubDepartmentsPanel } from '@/components/panels/SubDepartmentsPanel';
import { CentersAdmissionsPanel } from '@/components/panels/CentersAdmissionsPanel';
import { StatusRequestsPanel } from '@/components/panels/StatusRequestsPanel';
import { FinanceTotalReportPanel } from '@/components/panels/FinanceTotalReportPanel';
import { CommissionsPanel } from '@/components/panels/CommissionsPanel';
import { FinanceReregReportWrapper } from '@/components/panels/FinanceReregReportWrapper';
import { FinanceStudentPaymentLogsPanel } from '@/components/panels/FinanceStudentPaymentLogsPanel';
import { FinanceNoWalletReportPanel } from '@/components/panels/FinanceNoWalletReportPanel';
import { FinanceCommissionUniversityReportPanel } from '@/components/panels/FinanceCommissionUniversityReportPanel';
import { FinanceUniversityFeeReportPanel } from '@/components/panels/FinanceUniversityFeeReportPanel';
import { FinanceReregPaymentReportPanel } from '@/components/panels/FinanceReregPaymentReportPanel';
import { FinanceStudentLedgerPanel } from '@/components/panels/FinanceStudentLedgerPanel';
import { FinanceCenterLedgerPanel } from '@/components/panels/FinanceCenterLedgerPanel';
import { FinanceSalesUsersReportPanel } from '@/components/panels/FinanceSalesUsersReportPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { MyDocumentsPanel } from '@/components/panels/hr/MyDocumentsPanel';
import { LeaveApprovalsPanel } from '@/components/panels/hr/LeaveApprovalsPanel';


export function ModernFinanceDashboard({ initialTab, onNavigate: _onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const [metrics, setMetrics] = useState<any>({});
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payrollBatches, setPayrollBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [selectedStudentLedgerId, setSelectedStudentLedgerId] = useState<string | undefined>(undefined);
  const [selectedCenterLedgerId, setSelectedCenterLedgerId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab]);
  useEffect(() => { fetchAll(); }, []);

  const handleOpenStudentLedger = (studentId: string) => {
    setSelectedStudentLedgerId(studentId);
    setActiveTab('student_ledger');
  };

  const handleOpenCenterLedger = (centerId: string) => {
    setSelectedCenterLedgerId(centerId);
    setActiveTab('center_ledger');
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, metricsRes, invoicesRes, expensesRes, batchesRes] = await Promise.all([
        api.get('/finance/overview-stats').catch(() => ({ data: { data: null } })),
        api.get('/dashboard/metrics').catch(() => ({ data: { data: {} } })),
        api.get('/finance/invoices').catch(() => ({ data: { data: [] } })),
        api.get('/finance/expenses').catch(() => ({ data: { data: [] } })),
        api.get('/finance/payroll-batches').catch(() => ({ data: { data: [] } })),
      ]);
      setOverviewStats(statsRes.data?.data || null);
      setMetrics(metricsRes.data?.data || {});
      setInvoices(invoicesRes.data?.data || []);
      setExpenses(expensesRes.data?.data || []);
      setPayrollBatches(batchesRes.data?.data || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return (
        <OverviewContent
          stats={overviewStats}
          metrics={metrics} invoices={invoices} expenses={expenses}
          payrollBatches={payrollBatches} loading={loading} onNavigate={setActiveTab}
        />
      );
      case 'invoices': return <InvoicesPanel />;
      case 'payments': return <PaymentsPanel />;
      case 'university_fees': return <FinanceUniversityFeePanel />;
      case 'expenses': return <ExpensesPanel />;
      case 'targets': return <TargetsPanel endpoint="/finance/targets" title="Finance Targets" />;
      case 'fees': return <ProgramFeeStructurePanel />;
      case 'payroll': return <PayrollPanel />;
      case 'payroll-batches': return <PayrollBatchesPanel />;
      case 'students': return <StudentsPanel />;
      case 'centers': return <StudyCentersPanel onViewLedger={handleOpenCenterLedger} />;
      case 'broadcast_notifications': return <BroadcastNotificationsPanel />;
      case 'admission_sessions': return <AdmissionSessionsPanel />;
      case 'auth_fees': return <FinanceAuthFeePanel />;
      case 'pending_payment': return <FinanceCenterVerificationPanel />;
      case 'program_fees': return <ProgramFeeStructurePanel />;
      case 'wallet_topups': return <WalletTopUpsPanel />;
      case 'enrollments_finance': return <FinanceEnrollmentsPanel />;
      case 'status_requests': return <StatusRequestsPanel type="finance" />;
      case 'center_admissions': return <CentersAdmissionsPanel />;
      case 'income_expenditure': return <IncomeExpenditurePanel />;
      case 'profit_loss': return <ProfitLossPanel />;
      case 'salary_approvals': return <FinanceSalaryApprovalPanel />;
      case 'sales_targets': return <FinanceSalesTargetsPanel />;
      case 'leaves': return <LeavesPanel />;
      case 'leave_approvals':
      case 'leave-approvals': return <LeaveApprovalsPanel />;
      case 'tasks': return <TasksPanel />;
      case 'escalations': return <FinanceEscalationsPanel />;
      case 'my_leaves': return <LeavesPanel isPersonalView />;
      case 'my_attendance': return <AttendancePanel isPersonalView />;
      case 'my_payslips': return <PayrollPanel />;
      case 'my_documents': return <MyDocumentsPanel />;
      case 'holidays': return <HolidaysPanel />;
      case 'notice-board': return <NoticeBoardPanel />;
      case 'subdepartments': return <SubDepartmentsPanel />;
      case 'total_report': return <FinanceTotalReportPanel />;
      case 'student_payment_log': return <FinanceStudentPaymentLogsPanel onViewLedger={handleOpenStudentLedger} />;
      case 'commissions': return <CommissionsPanel />;
      case 'no_wallet_report': return <FinanceNoWalletReportPanel />;
      case 'rereg_report': return <FinanceReregReportWrapper />;
      case 'student_ledger': return <FinanceStudentLedgerPanel initialStudentId={selectedStudentLedgerId} />;
      case 'center_ledger': return <FinanceCenterLedgerPanel initialCenterId={selectedCenterLedgerId} />;
      case 'commission_university_report': return <FinanceCommissionUniversityReportPanel />;
      case 'university_fee_report': return <FinanceUniversityFeeReportPanel />;
      case 'rereg_payment_report': return <FinanceReregPaymentReportPanel />;
      case 'sales_users_report': return <FinanceSalesUsersReportPanel />;
      default: return (
        <OverviewContent
          metrics={metrics} invoices={invoices} expenses={expenses}
          payrollBatches={payrollBatches} loading={loading} onNavigate={setActiveTab}
        />
      );
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {renderContent()}
    </div>
  );
}

export function getFinanceNavItems(isManager: boolean = true) {
  return [
    { id: '__finance_section', label: 'Finance Management', isSection: true },
    { id: 'overview', label: 'Overview' },
    { id: 'student_ledger', label: 'Student Ledger' },
    { id: 'center_ledger', label: 'Center Ledger' },
    { id: 'student_payment_log', label: 'Student Payment Log' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'payments', label: 'Payments' },
    { id: 'university_fees', label: 'University Fees' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'targets', label: 'Targets' },
    { id: 'fees', label: 'Fee Structures' },
    { id: '__payroll_section', label: 'Payroll & HR', isSection: true },
    { id: 'payroll', label: 'Payroll' },
    { id: 'payroll-batches', label: 'Payroll Batches' },
    { id: 'salary_approvals', label: 'Salary Approvals' },
    { id: 'leaves', label: 'Leave Requests' },
    ...(isManager ? [{ id: 'leave_approvals', label: 'Leave Approvals' }] : []),
    { id: '__academic_section', label: 'Academics & Admissions', isSection: true },
    { id: 'students', label: 'Students' },
    { id: 'centers', label: 'Study Centers' },
    { id: 'admission_sessions', label: 'Admissions' },
    { id: 'center_admissions', label: 'Centers Admissions' },
    { id: 'enrollments_finance', label: 'Enrollments' },
    { id: 'program_fees', label: 'Program Fees' },
    { id: '__operations_section', label: 'Operations', isSection: true },
    { id: 'wallet_topups', label: 'Wallet Top-Ups' },
    { id: 'auth_fees', label: 'Auth Fees' },
    { id: 'pending_payment', label: 'Pending Payment' },
    { id: 'status_requests', label: 'Status Requests' },
    { id: 'broadcast_notifications', label: 'Send Notifications' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'escalations', label: 'Escalations' },
    { id: '__reports_section', label: 'Reports & Analytics', isSection: true },
    { id: 'sales_users_report', label: 'Sales User Report' },
    { id: 'commission_university_report', label: 'Commission Report (Univ)' },
    { id: 'university_fee_report', label: 'University Fee Payment Report' },
    { id: 'rereg_payment_report', label: 'Re-Registration Fee Report' },
    { id: 'income_expenditure', label: 'Income & Expenditure' },
    { id: 'profit_loss', label: 'Profit & Loss' },
    { id: 'sales_targets', label: 'Sales Targets' },
    { id: 'total_report', label: 'Total Data Report' },
    { id: 'no_wallet_report', label: 'No Wallet Report' },
    { id: 'rereg_report', label: 'Re-Registration Deadlines' },
    { id: 'commissions', label: 'Commissions' },
    { id: '__portal_section', label: 'My Portal', isSection: true },
    { id: 'my_leaves', label: 'My Leaves' },
    { id: 'my_attendance', label: 'My Attendance' },
    { id: 'my_payslips', label: 'Pay Slips' },
    { id: 'my_documents', label: 'My Documents' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'notice-board', label: 'Notice Board' },
    { id: 'subdepartments', label: 'Sub-Departments' },
  ];
}

// ─── Overview Content ─────────────────────────────────────────────────────────

function OverviewContent({ stats, metrics, invoices, expenses, payrollBatches, loading, onNavigate }: any) {
  const hasStats = Boolean(stats && stats.totals);

  // Authoritative live numbers from backend or fallback to array reduce
  const totalReceivables = hasStats
    ? Number(stats.totals.receivables || 0)
    : invoices.reduce((s: number, i: any) => s + Number(i.total || i.amount || 0), 0);

  const totalCollected = hasStats
    ? Number(stats.totals.collected || 0)
    : invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.total || i.amount || 0), 0);

  const totalExpenses = hasStats
    ? Number(stats.totals.operationalExpenses || 0)
    : expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  const totalWalletTopUps = hasStats ? Number(stats.totals.walletTopUps || 0) : 0;
  const totalUniFees = hasStats ? Number(stats.totals.universityFees || 0) : 0;
  const totalSalaries = hasStats ? Number(stats.totals.salaries || 0) : 0;

  const totalAdmissionsCount = hasStats
    ? (stats.counts.enrollments + stats.counts.invoices)
    : invoices.length;

  const pendingAmount = hasStats
    ? Number(stats.totals.pending || 0)
    : Math.max(0, totalReceivables - totalCollected);

  const collectionRate = hasStats
    ? Number(stats.totals.collectionRate || 0)
    : (totalReceivables > 0 ? Math.round((totalCollected / totalReceivables) * 100) : 0);

  const pendingExpensesCount = hasStats
    ? stats.counts.pendingExpenses
    : expenses.filter((e: any) => e.status === 'pending').length;

  const pendingBatches = hasStats
    ? stats.counts.pendingBatches
    : payrollBatches.filter((b: any) => b.status === 'pending_finance_approval' || b.status === 'pending_finance').length;

  const fullyPaidCount = hasStats
    ? stats.counts.fullyPaid
    : invoices.filter((i: any) => i.status === 'paid').length;

  const partialPaidCount = hasStats
    ? stats.counts.partialPaid
    : invoices.filter((i: any) => i.status === 'partial').length;

  const unpaidCount = hasStats
    ? stats.counts.unpaid
    : invoices.filter((i: any) => i.status === 'pending' || i.status === 'unpaid').length;

  const fullyPaidPct = hasStats
    ? stats.feeBreakdown.fullyPaidPct
    : (totalAdmissionsCount > 0 ? Math.round((fullyPaidCount / totalAdmissionsCount) * 100) : 0);

  const partialPaidPct = hasStats
    ? stats.feeBreakdown.partialPaidPct
    : (totalAdmissionsCount > 0 ? Math.round((partialPaidCount / totalAdmissionsCount) * 100) : 0);

  const unpaidPct = hasStats
    ? stats.feeBreakdown.unpaidPct
    : (totalAdmissionsCount > 0 ? Math.round((unpaidCount / totalAdmissionsCount) * 100) : 0);

  const formatINR = (n: number) => {
    if (!n || isNaN(n)) return '₹0.0K';
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  };

  const formatFullINR = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

  const chartData = hasStats && stats.chartData?.length ? stats.chartData : [
    { label: 'Receivables', value: Math.round(totalReceivables / 1000), fullValue: totalReceivables, color: 'hsl(var(--primary))' },
    { label: 'Collected', value: Math.round(totalCollected / 1000), fullValue: totalCollected, color: 'hsl(var(--success))' },
    { label: 'Wallet Funds', value: Math.round(totalWalletTopUps / 1000), fullValue: totalWalletTopUps, color: '#3b82f6' },
    { label: 'Salaries', value: Math.round(totalSalaries / 1000), fullValue: totalSalaries, color: '#f59e0b' },
    { label: 'Univ Fees', value: Math.round(totalUniFees / 1000), fullValue: totalUniFees, color: '#8b5cf6' },
  ];

  const recentActivities = hasStats && stats.recentActivities?.length ? stats.recentActivities : invoices.slice(0, 5).map((inv: any) => ({
    id: `#${inv.id?.slice(-8).toUpperCase()}`,
    name: inv.center?.name || inv.student?.name || 'Invoice',
    sub: 'Invoice',
    amount: inv.total || inv.amount || 0,
    status: inv.status,
    date: inv.createdAt,
    type: 'revenue'
  }));

  return (
    <div className="space-y-6">
      {/* Dashboard Hero Header */}
      <DashboardHero
        title="Financial Operations & Treasury Hub"
        badge="Live Treasury Reconciled"
        subtitle="Live monitoring of institutional fee receivables, student collections, study center ledgers, university royalty payments, and monthly payroll batches."
        stats={[
          { label: 'Total Receivables', value: formatINR(totalReceivables), icon: DollarSign },
          { label: 'Total Collected', value: formatINR(totalCollected), icon: CreditCard, change: `${collectionRate}% rate`, isPositive: true },
          { label: 'Operational Outflow', value: formatINR(totalExpenses), icon: TrendingUp },
          { label: 'Pending Batches', value: pendingBatches, icon: Users, change: pendingBatches > 0 ? 'Requires review' : 'All clear', isPositive: pendingBatches === 0 },
        ]}
        primaryAction={{
          label: 'Student Ledger',
          onClick: () => onNavigate('student_ledger'),
          icon: FileText
        }}
        secondaryAction={{
          label: 'Invoices',
          onClick: () => onNavigate('invoices'),
          icon: Receipt
        }}
      />

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <FinanceMetric
          title="Total Receivables"
          value={formatINR(totalReceivables)}
          fullValue={formatFullINR(totalReceivables)}
          sub={`${totalAdmissionsCount} admissions & invoices • ${formatINR(pendingAmount)} pending`}
          trend={pendingAmount > 0 ? `${formatINR(pendingAmount)} pending` : 'All collected'}
          trendType={pendingAmount > 0 ? 'warn' : 'up'}
          icon={<DollarSign className="w-5 h-5" />}
          color="primary"
          onClick={() => onNavigate('student_payment_log')}
        />
        <FinanceMetric
          title="Total Collected"
          value={formatINR(totalCollected)}
          fullValue={formatFullINR(totalCollected)}
          sub={`${fullyPaidCount} settled • ${formatINR(totalWalletTopUps)} wallet funds`}
          trend={collectionRate > 0 ? `${collectionRate}% collected` : 'No payments yet'}
          trendType="up"
          icon={<CreditCard className="w-5 h-5" />}
          color="success"
          onClick={() => onNavigate('wallet_topups')}
        />
        <FinanceMetric
          title="Operational Expenses"
          value={formatINR(totalExpenses)}
          fullValue={formatFullINR(totalExpenses)}
          sub={`${hasStats ? stats.counts.payrolls : payrollBatches.length} payrolls • ${hasStats ? stats.counts.expenseClaims : expenses.length} claims • ${formatINR(totalUniFees)} uni fees`}
          trend={pendingBatches > 0 ? `${pendingBatches} pending approval` : 'All reviewed'}
          trendType={pendingBatches > 0 ? 'down' : 'up'}
          icon={<TrendingUp className="w-5 h-5" />}
          color="warning"
          onClick={() => onNavigate('payroll-batches')}
        />
      </div>

      {/* Secondary quick-nav row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Payroll Batches', value: pendingBatches, sub: 'Pending approval', icon: <Users className="w-4 h-4" />, tab: 'payroll-batches', urgent: pendingBatches > 0 },
          { label: 'Wallet Top-Ups', value: (hasStats ? stats.counts.pendingWalletTopUps : metrics.pendingWalletTopUps) || 0, sub: 'Awaiting review', icon: <Wallet className="w-4 h-4" />, tab: 'wallet_topups', urgent: ((hasStats ? stats.counts.pendingWalletTopUps : metrics.pendingWalletTopUps) || 0) > 0 },
          { label: 'Enrollments', value: (hasStats ? stats.counts.pendingEnrollments : metrics.pendingEnrollments) || 0, sub: 'Pending review', icon: <FileText className="w-4 h-4" />, tab: 'enrollments_finance', urgent: ((hasStats ? stats.counts.pendingEnrollments : metrics.pendingEnrollments) || 0) > 0 },
          { label: 'Pending Centers', value: (hasStats ? stats.counts.pendingCenters : metrics.pendingCenters) || 0, sub: 'Payment verification', icon: <Receipt className="w-4 h-4" />, tab: 'pending_payment', urgent: ((hasStats ? stats.counts.pendingCenters : metrics.pendingCenters) || 0) > 0 },
        ].map(item => (
          <Card
            key={item.label}
            className={cn('cursor-pointer transition-colors', item.urgent ? 'hover:border-warning/50 border-warning/20' : 'hover:border-primary/40')}
            onClick={() => onNavigate(item.tab)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', item.urgent ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground')}>
                {item.icon}
              </div>
              <div>
                <p className="text-xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial Ledgers & Strategic Reports Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Sales User Report', sub: 'Staff revenue & margin', icon: <TrendingUp className="w-4 h-4 text-rose-600" />, tab: 'sales_users_report' },
          { label: 'Student Ledger', sub: 'Accounts & balances', icon: <BookOpen className="w-4 h-4 text-blue-600" />, tab: 'student_ledger' },
          { label: 'Center Ledger', sub: 'Wallet liquidity & debits', icon: <Wallet className="w-4 h-4 text-purple-600" />, tab: 'center_ledger' },
          { label: 'Univ Commission', sub: 'Expected vs received', icon: <Landmark className="w-4 h-4 text-emerald-600" />, tab: 'commission_university_report' },
          { label: 'Univ Fee Payments', sub: 'University liabilities', icon: <CreditCard className="w-4 h-4 text-amber-600" />, tab: 'university_fee_report' },
          { label: 'Re-Registration Fee', sub: 'Installment schedule', icon: <Receipt className="w-4 h-4 text-indigo-600" />, tab: 'rereg_payment_report' },
        ].map(item => (
          <Card
            key={item.label}
            className="cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-sm bg-card/70"
            onClick={() => onNavigate(item.tab)}
          >
            <CardContent className="p-3.5 flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-background border border-slate-200/60 shadow-xs shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Health Overview Chart */}
        <Card className="lg:col-span-2 border-none shadow-xl bg-card/60 backdrop-blur-xl hover:border-primary/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Financial Health & Liquidity Overview</CardTitle>
              <CardDescription>Live comparison of receivables, collections, wallet deposits, salaries, and university fees (in ₹K)</CardDescription>
            </div>
            <Badge variant="outline" className="font-semibold text-xs border-primary/20 text-primary bg-primary/5">
              Live Real-Time
            </Badge>
          </CardHeader>
          <CardContent className="h-[280px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} allowDecimals={false} tickFormatter={v => `₹${v}K`} />
                  <Tooltip
                    formatter={(val: any, _name: any, item: any) => [
                      formatFullINR(item.payload.fullValue || val * 1000),
                      item.payload.label
                    ]}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={42}>
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Receipt className="w-10 h-10 opacity-20" />
                <p className="text-sm">No financial metrics available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fee Collection Status */}
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate('student_payment_log')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Fee Collection Status</CardTitle>
              <Badge variant="secondary" className="text-[11px] font-bold">
                {collectionRate}% Settled
              </Badge>
            </div>
            <CardDescription>Live student & course fee collection progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FeeStat label="Fully Paid" value={`${fullyPaidPct}%`} color="bg-success" count={`${fullyPaidCount} admissions`} />
            <FeeStat label="Partial Payments" value={`${partialPaidPct}%`} color="bg-warning" count={`${partialPaidCount} admissions`} />
            <FeeStat label="Outstanding / Pending" value={`${unpaidPct}%`} color="bg-error" count={`${unpaidCount} admissions`} />
            <div className="pt-3 mt-3 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Total Tracked Admissions</span>
                <span className="text-sm font-bold">{totalAdmissionsCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Click to inspect student payment logs & ledgers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Stream */}
        <Card className="lg:col-span-2 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate('student_payment_log')}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Financial Activity</CardTitle>
              <CardDescription className="text-xs">Live stream of student fees, center wallet deposits, and payouts</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); onNavigate('student_payment_log'); }}>
              View All <ArrowUpRight className="ml-1 w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              [1,2,3,4].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)
            ) : recentActivities.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No recent financial transactions</p>
              </div>
            ) : (
              recentActivities.map((act: any) => (
                <TransactionItem
                  key={act.id + (act.date || '')}
                  name={act.name}
                  id={act.id}
                  sub={act.sub}
                  date={act.date ? new Date(act.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                  amount={`${act.type === 'revenue' ? '+' : '-'}${formatFullINR(act.amount)}`}
                  status={act.status}
                  type={act.type}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Priority Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Priority Financial Actions</CardTitle>
            <CardDescription className="text-xs">Pending items requiring Accounts review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingBatches > 0 && (
              <div
                className="p-4 rounded-xl border border-warning/20 bg-warning/5 flex items-start gap-3 cursor-pointer hover:bg-warning/10 transition-colors"
                onClick={() => onNavigate('payroll-batches')}
              >
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-sm">Payroll Batches Pending</h5>
                  <p className="text-xs text-muted-foreground mt-1">{pendingBatches} batch{pendingBatches > 1 ? 'es' : ''} awaiting finance approval.</p>
                </div>
              </div>
            )}
            {pendingExpensesCount > 0 && (
              <div
                className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3 cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => onNavigate('expenses')}
              >
                <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-sm">Expense Claims Pending</h5>
                  <p className="text-xs text-muted-foreground mt-1">{pendingExpensesCount} expense claim{pendingExpensesCount > 1 ? 's' : ''} waiting for review.</p>
                </div>
              </div>
            )}
            {unpaidCount > 0 && (
              <div
                className="p-4 rounded-xl border border-error/20 bg-error/5 flex items-start gap-3 cursor-pointer hover:bg-error/10 transition-colors"
                onClick={() => onNavigate('student_payment_log')}
              >
                <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-sm">Pending Fee Collections</h5>
                  <p className="text-xs text-muted-foreground mt-1">{unpaidCount} admission{unpaidCount > 1 ? 's' : ''} with pending course fee balance ({formatINR(pendingAmount)}).</p>
                </div>
              </div>
            )}
            {pendingBatches === 0 && pendingExpensesCount === 0 && unpaidCount === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30 text-success" />
                <p className="text-sm">All clear — no pending actions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FinanceMetric({ title, value, fullValue, sub, trend, trendType, icon, color, onClick }: any) {
  const colorMap: any = {
    primary: {
      bg: 'text-primary bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground',
      glow: 'stat-glow-indigo',
      border: 'group-hover:border-primary/40',
    },
    success: {
      bg: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 group-hover:bg-emerald-600 group-hover:text-white',
      glow: 'stat-glow-emerald',
      border: 'group-hover:border-emerald-500/40',
    },
    warning: {
      bg: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 group-hover:bg-amber-600 group-hover:text-white',
      glow: 'stat-glow-amber',
      border: 'group-hover:border-amber-500/40',
    },
    info: {
      bg: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 group-hover:bg-sky-600 group-hover:text-white',
      glow: 'stat-glow-cyan',
      border: 'group-hover:border-sky-500/40',
    },
  };

  const style = colorMap[color] || colorMap.primary;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300 rounded-2xl border border-border/70 bg-card/85 backdrop-blur-xl hover:-translate-y-1 hover:shadow-xl',
        style.glow,
        style.border,
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3.5">
          <div className={cn('p-3 rounded-2xl transition-all duration-300 shadow-xs border border-border/40', style.bg)}>
            <div className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 flex items-center justify-center">
              {icon}
            </div>
          </div>
          <div className={cn(
            'flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md border',
            trendType === 'up' 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
              : trendType === 'down' 
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          )}>
            {trendType === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {trend}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground/70 transition-colors">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-feature-settings-tnum">
              {value}
            </h3>
            {fullValue && <span className="text-xs text-muted-foreground/80 font-mono">({fullValue})</span>}
          </div>
          <p className="text-[11px] text-muted-foreground group-hover:text-foreground/60 transition-colors pt-0.5 truncate">
            {sub}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function FeeStat({ label, value, color, count }: any) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: value }} />
      </div>
      <p className="text-[10px] text-muted-foreground text-right">{count}</p>
    </div>
  );
}

function TransactionItem({ name, id, sub, date, amount, status, type }: any) {
  const statusColor: Record<string, string> = {
    paid: 'bg-success/10 text-success',
    approved: 'bg-success/10 text-success',
    pending: 'bg-warning/10 text-warning',
    partial: 'bg-info/10 text-info',
    rejected: 'bg-error/10 text-error',
  };
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/60">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', type === 'revenue' ? 'bg-success/10 text-success' : 'bg-rose-500/10 text-rose-600')}>
          {type === 'revenue' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate max-w-[180px] sm:max-w-[260px]">{name}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-mono uppercase font-semibold">{id}</span>
            {sub && <span>• {sub}</span>}
            {date && <span className="text-[10px] opacity-75">({date})</span>}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <p className={cn('text-sm font-bold', type === 'revenue' ? 'text-success' : 'text-foreground')}>{amount}</p>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider', statusColor[status?.toLowerCase()] || 'bg-muted text-muted-foreground')}>
          {status}
        </span>
      </div>
    </div>
  );
}

// ─── Finance Escalations Panel ────────────────────────────────────────────────

interface Escalation {
  id: string;
  title?: string;
  description?: string;
  type?: string;
  status: string;
  priority?: string;
  raisedBy?: { name: string; email: string };
  raisedAt?: string;
}

function FinanceEscalationsPanel() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEscalations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/escalations');
      setEscalations(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEscalations(); }, []);

  const handleResolve = async (id: string) => {
    try {
      await api.put(`/escalations/${id}/resolve`, { remarks: 'Resolved by Finance Admin' });
      toast.success('Escalation resolved');
      fetchEscalations();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to resolve');
    }
  };

  const STATUS_COLOR: Record<string, string> = {
    open:     'bg-warning/10 text-warning',
    resolved: 'bg-success/10 text-success',
    closed:   'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Escalations</h2>
          <p className="text-muted-foreground text-sm mt-1">View and resolve escalations in your organisation.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEscalations} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 text-warning"><AlertTriangle className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold">{escalations.filter(e => e.status === 'open').length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success"><CheckCircle className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold">{escalations.filter(e => e.status === 'resolved').length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Resolved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary"><Clock className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold">{escalations.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : escalations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No escalations found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {escalations.map(esc => (
            <Card key={esc.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge className={cn('text-[10px] uppercase font-bold', STATUS_COLOR[esc.status] || 'bg-muted text-muted-foreground')}>
                        {esc.status}
                      </Badge>
                      {esc.priority && <Badge variant="outline" className="text-[10px] uppercase font-bold">{esc.priority}</Badge>}
                      {esc.type && <Badge variant="outline" className="text-[10px]">{esc.type}</Badge>}
                    </div>
                    <h4 className="font-semibold text-sm">{esc.title || 'Escalation'}</h4>
                    {esc.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{esc.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {esc.raisedBy && <span>Raised by: {esc.raisedBy.name}</span>}
                      {esc.raisedAt && <span>{new Date(esc.raisedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  {esc.status === 'open' && (
                    <Button size="sm" variant="outline" onClick={() => handleResolve(esc.id)}>Resolve</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
