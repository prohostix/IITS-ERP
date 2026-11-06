import { useState, useEffect } from 'react';
import { Building2, TrendingUp, Users, BookOpen, MapPin, Target, Zap, ArrowUpRight, Network, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// Sales panels
import { LeadsPanel } from '@/components/panels/LeadsPanel';
import { TargetsPanel } from '@/components/panels/TargetsPanel';
import { SalesInvitePanel } from '@/components/panels/SalesInvitePanel';
import { TeamPerformancePanel } from '@/components/panels/TeamPerformancePanel';
import { SalesCentersPanel } from '@/components/panels/SalesCentersPanel';

// Ops panels
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { UniversitiesPanel } from '@/components/panels/UniversitiesPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import { StudyCentersPanel } from '@/components/panels/StudyCentersPanel';
import { AdmissionSessionsPanel } from '@/components/panels/AdmissionSessionsPanel';
import { OpsCenterVerificationPanel } from '@/components/panels/OpsCenterVerificationPanel';
import { DeptEnrollmentReviewPanel } from '@/components/panels/DeptEnrollmentReviewPanel';

// Shared panels
import { TasksPanel } from '@/components/panels/TasksPanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { PayrollPanel } from '@/components/panels/PayrollPanel';
import { ManagerHiringPanel } from '@/components/panels/hr/ManagerHiringPanel';
import { MyDocumentsPanel } from '@/components/panels/hr/MyDocumentsPanel';
import { LeaveApprovalsPanel } from '@/components/panels/hr/LeaveApprovalsPanel';

// Report panels
import { AdmissionHierarchyReportPanel } from '@/components/panels/AdmissionHierarchyReportPanel';
import { TargetVsAchievementReportPanel } from '@/components/panels/TargetVsAchievementReportPanel';
import { SessionReportPanel } from '@/components/panels/SessionReportPanel';

export function getBranchManagerNavItems() {
  return [
    { id: '__branch_section', label: 'Branch Overview', isSection: true },
    { id: 'overview', label: 'Overview' },
    { id: '__sales_section', label: 'Sales', isSection: true },
    { id: 'leads', label: 'Leads' },
    { id: 'targets', label: 'Targets' },
    { id: 'invite_links', label: 'Invite Links' },
    { id: 'my_team', label: 'My Team' },
    { id: 'branch_centers_sales', label: 'Study Centers (Sales)' },
    { id: '__ops_section', label: 'Operations', isSection: true },
    { id: 'students', label: 'Students' },
    { id: 'universities', label: 'Universities' },
    { id: 'programs', label: 'Programs' },
    { id: 'centers', label: 'Study Centers' },
    { id: 'pending_verification', label: 'Pending Verification' },
    { id: 'enrollment_review', label: 'Enrollment Review' },
    { id: 'sessions', label: 'Admission Sessions' },
    { id: '__reports_section', label: 'Reports', isSection: true },
    { id: 'admission_report', label: 'Admission Report (Hierarchy)' },
    { id: 'target_achievement_report', label: 'Target vs. Achievement' },
    { id: 'session_report', label: 'Session Report' },
    { id: '__shared_section', label: 'Management', isSection: true },
    { id: 'tasks', label: 'Tasks' },
    { id: 'announcements', label: 'Announcements' },
    { id: '__portal_section', label: 'My Portal', isSection: true },
    { id: 'my_leaves', label: 'My Leaves' },
    { id: 'leave_approvals', label: 'Leave Approvals' },
    { id: 'my_attendance', label: 'Attendance' },
    { id: 'my_payslips', label: 'Pay Slips' },
    { id: 'my_documents', label: 'My Documents' },
    { id: 'manager_hiring', label: 'My Hiring Requests' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'notice-board', label: 'Notice Board' },
  ];
}

export function ModernBranchManagerDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  useAuth();
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [branch, setBranch] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>({});
  const [leads, setLeads] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [branchRes, metricsRes, leadsRes, targetsRes] = await Promise.all([
          api.get('/org/branches/my').catch(() => ({ data: { data: null } })),
          api.get('/dashboard/metrics').catch(() => ({ data: { data: {} } })),
          api.get('/sales/leads').catch(() => ({ data: { data: [] } })),
          api.get('/sales/targets').catch(() => ({ data: { data: [] } })),
        ]);
        setBranch(branchRes.data.data);
        setMetrics(metricsRes.data.data || {});
        setLeads(leadsRes.data.data || []);
        setTargets(targetsRes.data.data || []);
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <BranchOverview branch={branch} metrics={metrics} leads={leads} targets={targets} loading={loading} onNavigate={setActiveTab} />;
      // Sales
      case 'leads': return <LeadsPanel />;
      case 'targets': return <TargetsPanel endpoint="/sales/targets" title="Branch Targets" />;
      case 'invite_links': return <SalesInvitePanel />;
      case 'my_team': return <TeamPerformancePanel />;
      case 'branch_centers_sales': return <SalesCentersPanel />;
      // Ops
      case 'students': return <StudentsPanel />;
      case 'universities': return <UniversitiesPanel />;
      case 'programs': return <ProgramsPanel />;
      case 'centers': return <StudyCentersPanel />;
      case 'pending_verification': return <OpsCenterVerificationPanel />;
      case 'enrollment_review': return <DeptEnrollmentReviewPanel />;
      case 'sessions': return <AdmissionSessionsPanel />;
      // Reports
      case 'admission_report': return <AdmissionHierarchyReportPanel />;
      case 'target_achievement_report': return <TargetVsAchievementReportPanel />;
      case 'session_report': return <SessionReportPanel />;
      // Shared
      case 'tasks': return <TasksPanel />;
      case 'announcements': return <AnnouncementsPanel />;
      // Portal
      case 'my_leaves': return <LeavesPanel isPersonalView />;
      case 'leave_approvals':
      case 'leave-approvals': return <LeaveApprovalsPanel />;
      case 'leaves': return <LeavesPanel />;
      case 'my_attendance': return <AttendancePanel isPersonalView />;
      case 'my_payslips': return <PayrollPanel />;
      case 'my_documents': return <MyDocumentsPanel />;
      case 'manager_hiring': return <ManagerHiringPanel />;
      case 'holidays': return <HolidaysPanel />;
      case 'notice-board': return <NoticeBoardPanel />;
      default: return null;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {renderContent()}
    </div>
  );
}

function BranchOverview({ branch, metrics, leads, targets, loading, onNavigate }: any) {
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l: any) => l.status === 'converted').length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
  const activeTargets = targets.filter((t: any) => (t.achieved || 0) < t.target);

  return (
    <div className="space-y-6">
      {/* Branch Hero */}
      <DashboardHero
        title={branch?.name ? `${branch.name} Command Center` : "Branch Operations Command Center"}
        badge={branch?.code ? `${branch.code} · ${branch.status?.toUpperCase() || 'ACTIVE'}` : "REGIONAL HUB"}
        description={
          branch?.location
            ? `${branch.location}${branch.city ? `, ${branch.city}` : ''}${branch.state ? `, ${branch.state}` : ''} — Regional admissions, sales targets, study center networks, and team operations.`
            : "Regional operations, center verification, sales targets, and admissions pipeline."
        }
        metrics={[
          { label: 'Total Leads', value: loading ? '...' : totalLeads, change: `+${leads.filter((l: any) => l.status === 'new').length} new`, isPositive: true },
          { label: 'Conversions', value: loading ? '...' : convertedLeads, change: `${conversionRate}% rate`, isPositive: conversionRate >= 30 },
          { label: 'Active Targets', value: loading ? '...' : activeTargets.length, change: 'Active', isPositive: true },
          { label: 'Pending Tasks', value: loading ? '...' : (metrics.pendingTasks || 0), change: metrics.overdueTasks ? `${metrics.overdueTasks} overdue` : 'On track', isPositive: !metrics.overdueTasks },
        ]}
        primaryAction={{
          label: 'Branch Reports',
          icon: <Network className="w-4 h-4 mr-2" />,
          onClick: () => onNavigate('admission_report'),
        }}
        secondaryAction={{
          label: 'Sales Pipeline',
          icon: <Target className="w-4 h-4 mr-2" />,
          onClick: () => onNavigate('leads'),
        }}
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <BranchMetric title="Total Leads" value={loading ? '...' : totalLeads} sub={`${leads.filter((l:any) => l.status === 'new').length} new`} icon={<TrendingUp className="w-5 h-5" />} color="primary" onClick={() => onNavigate('leads')} />
        <BranchMetric title="Conversions" value={loading ? '...' : convertedLeads} sub={`${conversionRate}% rate`} icon={<Target className="w-5 h-5" />} color="success" onClick={() => onNavigate('leads')} />
        <BranchMetric title="Active Targets" value={loading ? '...' : activeTargets.length} sub="in progress" icon={<Zap className="w-5 h-5" />} color="warning" onClick={() => onNavigate('targets')} />
        <BranchMetric title="Pending Tasks" value={loading ? '...' : (metrics.pendingTasks || 0)} sub={metrics.overdueTasks ? `${metrics.overdueTasks} overdue` : 'on track'} icon={<Users className="w-5 h-5" />} color="info" onClick={() => onNavigate('tasks')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales snapshot */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Sales Pipeline</CardTitle>
              <CardDescription>Recent leads activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => onNavigate('leads')}>
              View All <ArrowUpRight className="ml-1 w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? [1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />) :
              leads.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No leads yet</p> :
              leads.slice(0, 4).map((l: any) => (
                <div key={l.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{l.name || l.contactName || 'Lead'}</p>
                    <p className="text-[10px] text-muted-foreground">{l.source || 'Direct'} · {new Date(l.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">{l.status}</Badge>
                </div>
              ))
            }
          </CardContent>
        </Card>

        {/* Ops snapshot + punch */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Operations</CardTitle>
                <CardDescription>Quick access</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: 'Students', icon: <Users className="w-4 h-4" />, tab: 'students' },
                { label: 'Study Centers', icon: <MapPin className="w-4 h-4" />, tab: 'centers' },
                { label: 'Programs', icon: <BookOpen className="w-4 h-4" />, tab: 'programs' },
                { label: 'Universities', icon: <Building2 className="w-4 h-4" />, tab: 'universities' },
              ].map(item => (
                <button key={item.tab} onClick={() => onNavigate(item.tab)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/30 transition-all text-left">
                  <div className="p-1.5 rounded-lg bg-background">{item.icon}</div>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Branch Reports</CardTitle>
                <CardDescription>Hierarchies, targets &amp; sessions</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: 'Admission Report', sub: 'TL/BDE Hierarchy', icon: <Network className="w-4 h-4 text-blue-500" />, tab: 'admission_report' },
                { label: 'Target vs. Achv.', sub: 'Monthly Performance', icon: <Target className="w-4 h-4 text-emerald-500" />, tab: 'target_achievement_report' },
                { label: 'Session Report', sub: 'Session Breakdown', icon: <Calendar className="w-4 h-4 text-purple-500" />, tab: 'session_report' },
              ].map(item => (
                <button key={item.tab} onClick={() => onNavigate(item.tab)}
                  className="flex flex-col gap-1 p-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/30 transition-all text-left">
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    {item.icon} {item.label}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{item.sub}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Active targets */}
      {activeTargets.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Active Targets</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => onNavigate('targets')}>
              View All <ArrowUpRight className="ml-1 w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeTargets.slice(0, 3).map((t: any) => {
              const pct = t.target > 0 ? Math.min(100, Math.round((t.achieved / t.target) * 100)) : 0;
              const label = (typeof t.employeeId === 'object' ? t.employeeId?.name : t.employee?.name)
                || (typeof t.departmentId === 'object' ? t.departmentId?.name : t.department?.name)
                || t.type || 'Target';
              return (
                <div key={t.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{label} · {t.period}</span>
                    <span className="font-bold text-primary">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BranchMetric({ title, value, sub, icon, color, onClick }: any) {
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
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-xl transition-all duration-300",
        scheme.glow,
        "hover:-translate-y-1 hover:border-border hover:shadow-xl hover:shadow-primary/5 cursor-pointer"
      )}
    >
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center ring-1 transition-transform group-hover:scale-105 group-hover:rotate-1", scheme.bg, scheme.text, scheme.ring)}>
            {icon}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/40">{sub}</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="text-3xl font-black tracking-tight text-foreground font-display mt-0.5">{value}</p>
      </div>
    </div>
  );
}
