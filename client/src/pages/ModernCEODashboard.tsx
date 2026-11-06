import { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight,
  Target,
  Zap,
  Building2,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Clock,
  RefreshCw,
  TrendingUp,
  BookOpen,
  UserCheck,
  GraduationCap,
  BarChart2,
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CEOTasksPanel } from '@/components/panels/CEOTasksPanel';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { InvoicesPanel } from '@/components/panels/InvoicesPanel';
import { LeadsPanel } from '@/components/panels/LeadsPanel';
import { UsersPanel } from '@/components/panels/UsersPanel';
import { DepartmentsPanel } from '@/components/panels/DepartmentsPanel';
import { PerformancePanel } from '@/components/panels/PerformancePanel';
import { CEOKPIReportPanel } from '@/components/panels/CEOKPIReportPanel';
import { EmployeeActivityReportPanel } from '@/components/panels/EmployeeActivityReportPanel';
import { CenterOnboardingOverviewPanel } from '@/components/panels/CenterOnboardingOverviewPanel';
import { FinanceStudentLedgerPanel } from '@/components/panels/FinanceStudentLedgerPanel';
import { FinanceCenterLedgerPanel } from '@/components/panels/FinanceCenterLedgerPanel';
import { FinanceCommissionUniversityReportPanel } from '@/components/panels/FinanceCommissionUniversityReportPanel';
import { FinanceUniversityFeeReportPanel } from '@/components/panels/FinanceUniversityFeeReportPanel';
import { FinanceReregPaymentReportPanel } from '@/components/panels/FinanceReregPaymentReportPanel';
import { FinanceSalesUsersReportPanel } from '@/components/panels/FinanceSalesUsersReportPanel';
import { LeaveApprovalsPanel } from '@/components/panels/hr/LeaveApprovalsPanel';
import { StudyCentersPanel } from '@/components/panels/StudyCentersPanel';
import { OpsCenterVerificationPanel } from '@/components/panels/OpsCenterVerificationPanel';
import { FinanceCenterVerificationPanel } from '@/components/panels/FinanceCenterVerificationPanel';

const DEPT_COLORS: Record<string, string> = {
  hr: 'hsl(var(--info))', finance: 'hsl(var(--success))',
  operations: 'hsl(var(--primary))', sales: 'hsl(var(--warning))',
};

export function ModernCEODashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const [metrics, setMetrics] = useState<any>({});
  const [analytics, setAnalytics] = useState<any>({ employeePerformance: [], departmentEfficiency: [] });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab === 'overview' ? 'dashboard' : tab);
    }
  };

  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoadingMetrics(true);
    try {
      const [metricsRes, analyticsRes] = await Promise.all([
        api.get('/dashboard/metrics'),
        api.get('/ceo/analytics').catch(() => ({ data: { data: { employeePerformance: [], departmentEfficiency: [] } } })),
      ]);
      setMetrics(metricsRes.data.data || {});
      setAnalytics(analyticsRes.data.data || { employeePerformance: [], departmentEfficiency: [] });
    } catch (e) {
    } finally {
      setLoadingMetrics(false);
    }
  };

  const deptPerformanceData = (analytics.departmentEfficiency || []).slice(0, 6).map((d: any) => ({
    name: d.name,
    score: d.efficiency,
    color: DEPT_COLORS[d.type] || 'hsl(var(--muted-foreground))',
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <DashboardHero
        title="Executive Command Center"
        badge="Strategic Oversight"
        description="Real-time institutional performance, fiscal trajectory, student enrollments, and cross-departmental operations."
        metrics={[
          { label: 'Total Revenue', value: metrics.totalRevenue ? `₹${(metrics.totalRevenue / 1000).toFixed(1)}K` : '₹0', change: '+14.2%', isPositive: true },
          { label: 'Active Students', value: metrics.totalStudents?.toLocaleString() || '0', change: '+6.8%', isPositive: true },
          { label: 'Pending Tasks', value: metrics.pendingTasks || 0, change: metrics.overdueTasks ? `${metrics.overdueTasks} overdue` : 'On track', isPositive: !metrics.overdueTasks },
          { label: 'Escalations', value: metrics.activeEscalations || 0, change: metrics.criticalEscalations ? `${metrics.criticalEscalations} crit` : 'Clear', isPositive: !metrics.criticalEscalations },
        ]}
        primaryAction={{
          label: 'KPI / KRA Report',
          icon: <Target className="w-4 h-4 mr-2" />,
          onClick: () => handleTabChange('kpi-kra'),
        }}
        secondaryAction={{
          label: 'Refresh',
          icon: <RefreshCw className={cn('w-4 h-4 mr-2', loadingMetrics && 'animate-spin')} />,
          onClick: fetchAll,
        }}
      />

      <div className="space-y-6">

        {activeTab === 'overview' && <div className="space-y-8">
          {/* Hero Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Revenue"
              value={metrics.totalRevenue ? `₹${(metrics.totalRevenue / 1000).toFixed(1)}K` : '₹0'}
              trend={metrics.totalRevenue ? 'Live stream' : 'No data yet'}
              trendType="up"
              icon={<DollarSign className="w-5 h-5" />}
              color="primary"
              onClick={() => handleTabChange('invoices')}
            />
            <MetricCard
              title="Active Students"
              value={metrics.totalStudents?.toLocaleString() || '0'}
              trend={metrics.totalStudents ? 'Verified' : 'No data yet'}
              trendType="up"
              icon={<GraduationCap className="w-5 h-5" />}
              color="success"
              onClick={() => handleTabChange('students')}
            />
            <MetricCard
              title="Pending Tasks"
              value={metrics.pendingTasks || 0}
              trend={metrics.overdueTasks ? `${metrics.overdueTasks} overdue` : 'On schedule'}
              trendType={metrics.overdueTasks > 0 ? 'down' : 'up'}
              icon={<Zap className="w-5 h-5" />}
              color="warning"
              onClick={() => handleTabChange('tasks')}
            />
            <MetricCard
              title="Active Escalations"
              value={metrics.activeEscalations || 0}
              trend={metrics.criticalEscalations ? `${metrics.criticalEscalations} critical` : 'None critical'}
              trendType={metrics.criticalEscalations > 0 ? 'down' : 'up'}
              icon={<AlertTriangle className="w-5 h-5" />}
              color="info"
              onClick={() => handleTabChange('escalations')}
            />
          </div>

          {/* Secondary metrics row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Employees', value: metrics.totalEmployees || 0, icon: <Users className="w-4 h-4 text-indigo-500" />, tab: 'users', bg: 'bg-indigo-500/10' },
              { label: 'Active Leads', value: metrics.totalLeads || 0, icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, tab: 'leads', bg: 'bg-emerald-500/10' },
              { label: 'Departments', value: metrics.totalDepartments || 0, icon: <Building2 className="w-4 h-4 text-amber-500" />, tab: 'departments', bg: 'bg-amber-500/10' },
              { label: 'Programs', value: metrics.totalPrograms || 0, icon: <BookOpen className="w-4 h-4 text-cyan-500" />, tab: 'students', bg: 'bg-cyan-500/10' },
            ].map(item => (
              <div
                key={item.label}
                className="group glass-card p-4 rounded-2xl cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-300 flex items-center gap-3.5 shadow-sm"
                onClick={() => handleTabChange(item.tab)}
              >
                <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110", item.bg)}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-xl font-black font-display tracking-tight text-foreground">{item.value}</p>
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Departmental Performance Chart */}
            <Card
              className="lg:col-span-3 overflow-hidden border-none shadow-2xl bg-card/50 backdrop-blur-xl cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => handleTabChange('performance')}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-xl font-bold">Departmental Performance</CardTitle>
                  <CardDescription>Efficiency scores by department — click to view full report</CardDescription>
                </div>
                <BarChart2 className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="h-[300px] px-2">
                {deptPerformanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptPerformanceData} layout="vertical" margin={{ left: 0, right: 40 }}>
                      <XAxis type="number" hide domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} tick={{fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500}} />
                      <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }} formatter={(v: any) => [`${v}%`, 'Score']} />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={18}>
                        {deptPerformanceData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <BarChart2 className="w-10 h-10 opacity-20" />
                    <p className="text-sm">No department data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right column snapshots */}
            <div className="space-y-4">
              <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => handleTabChange('invoices')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Finance Snapshot</p>
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">₹{metrics.totalRevenue ? (metrics.totalRevenue / 1000).toFixed(1) + 'K' : '0'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total revenue collected</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-primary font-medium">
                    <span>View Invoices</span><ArrowUpRight className="w-3 h-3" />
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-success/40 transition-colors" onClick={() => handleTabChange('users')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">People Snapshot</p>
                    <UserCheck className="w-4 h-4 text-success" />
                  </div>
                  <p className="text-2xl font-bold">{metrics.totalEmployees || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active employees</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-success font-medium">
                    <span>View Users</span><ArrowUpRight className="w-3 h-3" />
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-warning/40 transition-colors" onClick={() => handleTabChange('tasks')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tasks Snapshot</p>
                    <Zap className="w-4 h-4 text-warning" />
                  </div>
                  <p className="text-2xl font-bold">{metrics.pendingTasks || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pending tasks</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-warning font-medium">
                    <span>View Tasks</span><ArrowUpRight className="w-3 h-3" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Punch Widget + Quick Access */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-primary/5 border-primary/10 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => handleTabChange('kpi-kra')}>
                <CardContent className="pt-6">
                  <div className="p-2 w-fit rounded-lg bg-primary/10 text-primary mb-4">
                    <Target className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-lg">KPI / KRA Report</h4>
                  <p className="text-sm text-muted-foreground mt-1">View employee performance indicators and key result areas.</p>
                  <Button variant="link" className="p-0 h-auto mt-4 text-primary">Open Report <ArrowUpRight className="ml-1 w-3 h-3" /></Button>
                </CardContent>
              </Card>
              <Card className="bg-success/5 border-success/10 cursor-pointer hover:border-success/40 transition-colors" onClick={() => handleTabChange('performance')}>
                <CardContent className="pt-6">
                  <div className="p-2 w-fit rounded-lg bg-success/10 text-success mb-4">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-lg">Performance</h4>
                  <p className="text-sm text-muted-foreground mt-1">Departmental efficiency and org-wide performance analytics.</p>
                  <Button variant="link" className="p-0 h-auto mt-4 text-success">View Analytics <ArrowUpRight className="ml-1 w-3 h-3" /></Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Live Escalations Preview */}
          <EscalationPreview onViewAll={() => handleTabChange('escalations')} />
        </div>}

        {activeTab === 'performance' && <PerformancePanel />}
        {activeTab === 'kpi-kra' && <CEOKPIReportPanel />}
        {activeTab === 'users' && <UsersPanel />}
        {activeTab === 'departments' && <DepartmentsPanel />}
        {activeTab === 'tasks' && <CEOTasksPanel />}
        {activeTab === 'escalations' && <EscalationsPanel />}
        {activeTab === 'students' && <StudentsPanel />}
        {activeTab === 'invoices' && <InvoicesPanel />}
        {activeTab === 'leads' && <LeadsPanel />}
        {activeTab === 'center_onboarding' && <CenterOnboardingOverviewPanel mode="ceo" />}
        {activeTab === 'activity_report' && <EmployeeActivityReportPanel />}
        {activeTab === 'student_ledger' && <FinanceStudentLedgerPanel />}
        {activeTab === 'center_ledger' && <FinanceCenterLedgerPanel />}
        {activeTab === 'commission_university_report' && <FinanceCommissionUniversityReportPanel />}
        {activeTab === 'university_fee_report' && <FinanceUniversityFeeReportPanel />}
        {activeTab === 'rereg_payment_report' && <FinanceReregPaymentReportPanel />}
        {activeTab === 'sales_users_report' && <FinanceSalesUsersReportPanel />}
        {activeTab === 'centers' && <StudyCentersPanel />}
        {activeTab === 'pending_verification' && <OpsCenterVerificationPanel />}
        {activeTab === 'pending_payment' && <FinanceCenterVerificationPanel />}
        {(activeTab === 'leave_approvals' || activeTab === 'leave-approvals') && <LeaveApprovalsPanel />}
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, trendType, icon, color, onClick }: any) {
  const glowMap: Record<string, { ring: string; glow: string; text: string; bg: string }> = {
    primary: { ring: 'ring-indigo-500/20', glow: 'stat-glow-indigo', text: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-500/10' },
    success: { ring: 'ring-emerald-500/20', glow: 'stat-glow-emerald', text: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    warning: { ring: 'ring-amber-500/20', glow: 'stat-glow-amber', text: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10' },
    info: { ring: 'ring-cyan-500/20', glow: 'stat-glow-cyan', text: 'text-cyan-500 dark:text-cyan-400', bg: 'bg-cyan-500/10' },
  };

  const scheme = glowMap[color] || glowMap.primary;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card/75 p-6 backdrop-blur-xl transition-all duration-300",
        scheme.glow,
        "hover:-translate-y-1 hover:border-border hover:shadow-xl hover:shadow-primary/5",
        onClick && "cursor-pointer"
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center ring-1 transition-transform group-hover:scale-105 group-hover:rotate-1", scheme.bg, scheme.text, scheme.ring)}>
            {icon}
          </div>
          {trend && (
            <div className={cn(
              "flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border",
              trendType === 'up'
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            )}>
              {trendType === 'up' ? <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-1" />}
              {trend}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-3xl font-black tracking-tight text-foreground font-display">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ─── EscalationPreview ────────────────────────────────────────────────────────

function EscalationPreview({ onViewAll }: { onViewAll: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ceo/escalations')
      .then(r => setItems((r.data.data || []).filter((e: any) => e.status === 'pending').slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Live Escalations</CardTitle>
          <CardDescription>Pending items requiring your attention</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onViewAll}>
          View All <ArrowUpRight className="ml-1 w-3 h-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No pending escalations</p>
          </div>
        ) : (
          items.map(esc => (
            <div key={esc.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer" onClick={onViewAll}>
              <div className={cn("mt-0.5 p-1.5 rounded-md", esc.priority === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-warning/10 text-warning')}>
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{esc.taskId?.title || 'Task Escalation'}</p>
                <p className="text-xs text-muted-foreground">{esc.employeeId?.name || 'Unknown'} · {timeAgo(esc.escalatedAt)}</p>
              </div>
              <Badge className={cn('text-[10px] uppercase font-bold shrink-0', esc.priority === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-warning/10 text-warning')}>
                {esc.priority}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─── EscalationsPanel ────────────────────────────────────────────────────────

interface Escalation {
  id: string;
  taskId?: { id: string; title: string; description: string; deadline: string; priority: string };
  employeeId?: { id: string; name: string; email: string };
  deptAdminId?: { id: string; name: string; email: string };
  organizationId: string;
  priority: string;
  status: string;
  escalatedAt: string;
  resolution?: string;
  resolvedAt?: string;
  chain?: { level: string; action: string; timestamp: string }[];
}

const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-warning/10 text-warning',
  resolved:   'bg-success/10 text-success',
  reassigned: 'bg-info/10 text-info',
  extended:   'bg-primary/10 text-primary',
  justified:  'bg-muted text-muted-foreground',
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500',
  high:     'bg-orange-500/10 text-orange-500',
  medium:   'bg-yellow-500/10 text-yellow-500',
  low:      'bg-blue-500/10 text-blue-500',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function EscalationsPanel() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selected, setSelected] = useState<Escalation | null>(null);
  const [actionDialog, setActionDialog] = useState(false);
  const [actionData, setActionData] = useState({ action: '', resolution: '', newDeadline: '', reassignTo: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchEscalations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ceo/escalations');
      setEscalations(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEscalations(); }, []);

  const filtered = escalations.filter(e =>
    activeTab === 'all' ? true : e.status === activeTab
  );

  const handleAction = async () => {
    if (!selected || !actionData.action) return;
    setSubmitting(true);
    try {
      await api.patch(`/ceo/escalations/${selected.id}`, actionData);
      toast.success('Escalation handled successfully');
      setActionDialog(false);
      setSelected(null);
      setActionData({ action: '', resolution: '', newDeadline: '', reassignTo: '' });
      fetchEscalations();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to handle escalation');
    } finally {
      setSubmitting(false);
    }
  };

  const openAction = (esc: Escalation) => {
    setSelected(esc);
    setActionData({ action: '', resolution: '', newDeadline: '', reassignTo: '' });
    setActionDialog(true);
  };

  const counts = {
    all:      escalations.length,
    pending:  escalations.filter(e => e.status === 'pending').length,
    resolved: escalations.filter(e => e.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Escalations</h2>
          <p className="text-muted-foreground text-sm mt-1">Review and resolve escalated tasks from departments.</p>
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
              <p className="text-2xl font-bold">{counts.pending}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success"><CheckCircle className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold">{counts.resolved}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Resolved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary"><Clock className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold">{counts.all}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No escalations found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(esc => (
                <Card key={esc.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge className={cn('text-[10px] uppercase font-bold', STATUS_COLOR[esc.status] || 'bg-muted text-muted-foreground')}>
                            {esc.status}
                          </Badge>
                          <Badge className={cn('text-[10px] uppercase font-bold', PRIORITY_COLOR[esc.priority] || 'bg-muted text-muted-foreground')}>
                            {esc.priority}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(esc.escalatedAt)}</span>
                        </div>
                        <h4 className="font-semibold text-sm">{esc.taskId?.title || 'Task Escalation'}</h4>
                        {esc.taskId?.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{esc.taskId.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {esc.employeeId && <span>Employee: {esc.employeeId.name}</span>}
                          {esc.deptAdminId && <span>Dept Admin: {esc.deptAdminId.name}</span>}
                          {esc.taskId?.deadline && <span>Deadline: {new Date(esc.taskId.deadline).toLocaleDateString()}</span>}
                        </div>
                        {esc.resolution && (
                          <p className="text-xs text-success mt-2">Resolution: {esc.resolution}</p>
                        )}
                      </div>
                      {esc.status === 'pending' && (
                        <Button size="sm" onClick={() => openAction(esc)}>Take Action</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={actionDialog} onOpenChange={setActionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Handle Escalation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Task</Label>
              <p className="text-sm text-muted-foreground mt-1">{selected?.taskId?.title || 'N/A'}</p>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={actionData.action} onValueChange={v => setActionData(d => ({ ...d, action: v }))}>
                <SelectTrigger><SelectValue placeholder="Select action..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolve">Resolve</SelectItem>
                  <SelectItem value="reassign">Reassign</SelectItem>
                  <SelectItem value="extend">Extend Deadline</SelectItem>
                  <SelectItem value="justify">Justify</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {actionData.action === 'reassign' && (
              <div className="space-y-2">
                <Label>Reassign To (User ID)</Label>
                <Input value={actionData.reassignTo} onChange={e => setActionData(d => ({ ...d, reassignTo: e.target.value }))} placeholder="User ID..." />
              </div>
            )}
            {actionData.action === 'extend' && (
              <div className="space-y-2">
                <Label>New Deadline</Label>
                <Input type="date" value={actionData.newDeadline} onChange={e => setActionData(d => ({ ...d, newDeadline: e.target.value }))} />
              </div>
            )}
            {['resolve', 'justify'].includes(actionData.action) && (
              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea value={actionData.resolution} onChange={e => setActionData(d => ({ ...d, resolution: e.target.value }))} placeholder="Describe the resolution..." rows={3} />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleAction} disabled={!actionData.action || submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
              <Button variant="outline" onClick={() => setActionDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
