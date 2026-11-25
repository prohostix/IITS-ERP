import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Target, 
  Users, 
  Zap, 
  ArrowUpRight,
  BarChart3,
  Building2,
  GraduationCap,
  CheckCircle2,
  Clock,
  IndianRupee,
  Trophy,
  Medal,
  Award,
  Link2,
  FileBarChart,
  Calendar,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { LeadsPanel } from '@/components/panels/LeadsPanel';
import { TargetsPanel } from '@/components/panels/TargetsPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { SalesInvitePanel } from '@/components/panels/SalesInvitePanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { SubSalesPortalPanel } from '@/components/panels/SubSalesPortalPanel';
import { TeamPerformancePanel } from '@/components/panels/TeamPerformancePanel';
import { StudyCentersPanel } from '@/components/panels/StudyCentersPanel';
import { SalesCentersPanel } from '@/components/panels/SalesCentersPanel';
import { CenterOnboardingOverviewPanel } from '@/components/panels/CenterOnboardingOverviewPanel';
import { CentersAdmissionsPanel } from '@/components/panels/CentersAdmissionsPanel';
import { SalesStaffAdmissionReportPanel } from '@/components/panels/SalesStaffAdmissionReportPanel';
import { FinanceSalesUsersReportPanel } from '@/components/panels/FinanceSalesUsersReportPanel';
import { AdmissionHierarchyReportPanel } from '@/components/panels/AdmissionHierarchyReportPanel';
import { TargetVsAchievementReportPanel } from '@/components/panels/TargetVsAchievementReportPanel';
import { SessionReportPanel } from '@/components/panels/SessionReportPanel';
import { PayrollPanel } from '@/components/panels/PayrollPanel';
import { ManagerHiringPanel } from '@/components/panels/hr/ManagerHiringPanel';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { MyDocumentsPanel } from '@/components/panels/hr/MyDocumentsPanel';
import { LeaveApprovalsPanel } from '@/components/panels/hr/LeaveApprovalsPanel';
import { TADAClaimsPanel } from '@/components/panels/TADAClaimsPanel';

const REJECTED_STATUSES = ['rejected', 'department_rejected', 'ops_rejected', 'university_rejected', 'cancelled', 'dropout', 'refunded'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

const rankIcon = (i: number) => {
  if (i === 0) return <Trophy className="w-4 h-4 text-yellow-500" />;
  if (i === 1) return <Medal className="w-4 h-4 text-slate-400" />;
  if (i === 2) return <Award className="w-4 h-4 text-amber-600" />;
  return <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-muted-foreground">#{i + 1}</span>;
};

export function ModernSalesDashboard({ initialTab, isSubDeptManager, onNavigate }: { initialTab?: string; isSubDeptManager?: boolean; onNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  const hasSubDept = Boolean(isSubDeptManager || user?.subDepartmentId);

  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>({});
  const [leads, setLeads] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(initialTab || (hasSubDept && initialTab === 'my_subdept' ? 'my_subdept' : 'overview'));

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab === 'overview' || tab === 'my_subdept' ? 'dashboard' : tab);
    }
  };

  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [metricsRes, leadsRes, targetsRes, enrollmentsRes, centersRes, teamRes] = await Promise.all([
        api.get('/dashboard/metrics').catch(() => ({ data: { data: {} } })),
        api.get('/sales/leads').catch(() => ({ data: { data: [] } })),
        api.get('/sales/targets').catch(() => ({ data: { data: [] } })),
        api.get('/enrollment/all').catch(() => ({ data: { data: [] } })),
        api.get('/sales/my-centers').catch(() => ({ data: { data: [] } })),
        api.get('/sales/team-performance').catch(() => ({ data: { data: [] } })),
      ]);
      setMetrics(metricsRes.data.data || {});
      setLeads(leadsRes.data.data || []);
      setTargets(targetsRes.data.data || []);
      setEnrollments(enrollmentsRes.data.data || []);
      setCenters(centersRes.data.data || []);
      setTeam(teamRes.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewContent
            user={user}
            metrics={metrics}
            leads={leads}
            targets={targets}
            enrollments={enrollments}
            centers={centers}
            team={team}
            loading={loading}
            onRefresh={fetchAll}
            onNavigate={handleTabChange}
          />
        );
      case 'my_subdept': return hasSubDept ? <SubSalesPortalPanel /> : null;
      case 'leads': return <LeadsPanel />;
      case 'targets': return <TargetsPanel endpoint="/sales/targets" title="Sales Targets" />;
      case 'invite_links': return <SalesInvitePanel />;
      case 'team':
      case 'my_team': return <TeamPerformancePanel />;
      case 'study_centers': return <StudyCentersPanel />;
      case 'associated_centers':
      case 'associated-centers': return <SalesCentersPanel />;
      case 'center_admissions': return <CentersAdmissionsPanel />;
      case 'sales_admission_report': return <SalesStaffAdmissionReportPanel />;
      case 'sales_users_report': return <FinanceSalesUsersReportPanel />;
      case 'admission_report': return <AdmissionHierarchyReportPanel />;
      case 'target_achievement_report': return <TargetVsAchievementReportPanel />;
      case 'session_report': return <SessionReportPanel />;
      case 'center_onboarding': return <CenterOnboardingOverviewPanel mode="sales" />;
      case 'tasks': return <TasksPanel />;
      case 'my_leaves': return <LeavesPanel isPersonalView />;
      case 'leave_approvals':
      case 'leave-approvals': return <LeaveApprovalsPanel />;
      case 'leaves': return <LeavesPanel />;
      case 'my_attendance': return <AttendancePanel isPersonalView />;
      case 'payslips':
      case 'my_payslips': return <PayrollPanel isEmployeeView />;
      case 'my_tada':
      case 'my-tada': return <TADAClaimsPanel mode="employee" />;
      case 'my_documents': return <MyDocumentsPanel />;
      case 'manager_hiring': return <ManagerHiringPanel />;
      case 'holidays': return <HolidaysPanel />;
      case 'announcements': return <AnnouncementsPanel />;
      case 'notice-board': return <NoticeBoardPanel />;
      case 'ld-portal':
        return (
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Learning &amp; Development Portal</CardTitle>
              <CardDescription>Courses, certifications and growth resources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center text-muted-foreground">
                <p className="font-medium">Courses will be assigned by HR. Check back regularly.</p>
              </div>
            </CardContent>
          </Card>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{user?.name || 'Sales Dashboard'}</h1>
          <p className="text-muted-foreground mt-1">{user?.designation || 'Sales Administrator'}</p>
        </div>
        {activeTab === 'overview' && (
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="gap-1.5 self-start md:self-auto">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh Overview
          </Button>
        )}
      </div>
      {renderContent()}
    </div>
  );
}

export function getSalesNavItems(isManager: boolean = true) {
  return [
    { id: '__sales_section', label: 'Sales Management', isSection: true },
    { id: 'overview', label: 'Overview' },
    { id: '__lead_management', label: 'Lead Management', isSection: true },
    { id: 'leads', label: 'Leads' },
    { id: 'targets', label: 'Targets' },
    { id: 'invite_links', label: 'Invite Links' },
    { id: '__center_acquisition', label: 'Center Acquisition', isSection: true },
    { id: 'associated_centers', label: 'Associated Centers' },
    { id: 'center_onboarding', label: 'Center Onboarding Status' },
    { id: 'study_centers', label: 'Manual Center Creation' },
    { id: 'center_admissions', label: 'Centers Admissions' },
    { id: '__reports_section', label: 'Reports', isSection: true },
    { id: 'admission_report', label: 'Admission Report (Hierarchy)' },
    { id: 'target_achievement_report', label: 'Target vs. Achievement' },
    { id: 'session_report', label: 'Session Report' },
    { id: 'sales_admission_report', label: 'Sales Staff Admission Report' },
    { id: 'sales_users_report', label: 'Sales Financial Report' },
    { id: '__team_management', label: 'Team & Tasks', isSection: true },
    { id: 'my_team', label: 'My Team' },
    { id: 'tasks', label: 'Tasks' },
    { id: '__portal_section', label: 'My Portal', isSection: true },
    { id: 'my_leaves', label: 'My Leaves' },
    ...(isManager ? [{ id: 'leave_approvals', label: 'Leave Approvals' }] : []),
    { id: 'my_attendance', label: 'Attendance' },
    { id: 'my_tada', label: 'My TA/DA Claims' },
    { id: 'my_payslips', label: 'Pay Slips' },
    { id: 'my_documents', label: 'My Documents' },
    { id: 'manager_hiring', label: 'My Hiring Requests' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'notice-board', label: 'Notice Board' },
  ];
}

function OverviewContent({ user, metrics, leads, targets, enrollments, centers, team, loading, onNavigate }: any) {
  // 1. Study Centers stats
  const totalCenters = centers.length;
  const activeCentersCount = centers.filter((c: any) => c.status === 'active' || c.status === 'verified').length;
  const pendingCentersCount = totalCenters - activeCentersCount;

  // 2. Admissions & Revenue stats (combine direct enrollments & team downline admissions if any)
  const combinedAdmissions = useMemo(() => {
    const map = new Map<string, any>();
    (enrollments || []).forEach((e: any) => {
      if (e?.id) map.set(e.id, e);
    });
    (team || []).forEach((m: any) => {
      (m.admissions || []).forEach((a: any) => {
        if (a?.id && !map.has(a.id)) {
          map.set(a.id, {
            id: a.id,
            studentName: a.studentName,
            enrollmentNumber: a.enrollmentNumber,
            status: a.status,
            totalFee: a.totalFee,
            createdAt: a.admissionDate,
            admissionDate: a.admissionDate,
            studyCenter: { name: a.centerName, code: a.centerCode },
            program: { name: a.programName, university: { name: a.universityName } },
            session: { name: a.sessionName },
            memberName: m.name
          });
        }
      });
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.admissionDate || b.createdAt || 0).getTime() - new Date(a.admissionDate || a.createdAt || 0).getTime()
    );
  }, [enrollments, team]);

  const validAdmissions = useMemo(
    () => combinedAdmissions.filter((e: any) => !REJECTED_STATUSES.includes((e.status || '').toLowerCase())),
    [combinedAdmissions]
  );
  const enrolledAdmissions = useMemo(
    () => combinedAdmissions.filter((e: any) => e.status === 'enrolled'),
    [combinedAdmissions]
  );
  const rejectedAdmissions = useMemo(
    () => combinedAdmissions.filter((e: any) => REJECTED_STATUSES.includes((e.status || '').toLowerCase())),
    [combinedAdmissions]
  );
  const inReviewAdmissions = useMemo(
    () => validAdmissions.filter((e: any) => e.status !== 'enrolled'),
    [validAdmissions]
  );

  const totalRevenue = useMemo(
    () => validAdmissions.reduce((sum: number, e: any) => sum + (Number(e.totalFee) || 0), 0),
    [validAdmissions]
  );
  const avgFeePerStudent = validAdmissions.length > 0 ? Math.round(totalRevenue / validAdmissions.length) : 0;

  // 3. Targets stats (scoped to user + their team)
  const teamIdsSet = useMemo(() => {
    const s = new Set<string>();
    if (user?.id) s.add(user.id);
    (team || []).forEach((m: any) => { if (m?.id) s.add(m.id); });
    return s;
  }, [user?.id, team]);

  const scopedTargets = useMemo(() => {
    return (targets || []).filter((t: any) => {
      const empId = typeof t.employeeId === 'object' ? t.employeeId?.id : (t.employee?.id || t.employeeId);
      return !empId || teamIdsSet.has(empId);
    });
  }, [targets, teamIdsSet]);

  const completedTargetsCount = scopedTargets.filter((t: any) => Number(t.achieved || 0) >= Number(t.target || 1)).length;
  const avgTargetProgress = scopedTargets.length > 0
    ? Math.round(
        scopedTargets.reduce((sum: number, t: any) => {
          const pct = Number(t.target) > 0 ? Math.min(100, Math.round((Number(t.achieved || 0) / Number(t.target)) * 100)) : 0;
          return sum + pct;
        }, 0) / scopedTargets.length
      )
    : 0;

  // 4. Leads stats
  const totalLeads = leads.length;
  const newLeads = leads.filter((l: any) => l.status === 'new').length;
  const convertedLeads = leads.filter((l: any) => l.status === 'converted').length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  // 5. Team stats
  const directReportsCount = (team || []).filter((m: any) => m.isDirectReport).length;
  const teamAdmissionsCount = (team || []).reduce((s: number, m: any) => s + (Number(m.admissionsTotal) || 0), 0);

  // 6. Universities & Programs reach
  const { universityDistribution, uniqueUniversitiesCount, uniqueProgramsCount } = useMemo(() => {
    const uniMap = new Map<string, { name: string; count: number; revenue: number }>();
    const progSet = new Set<string>();

    validAdmissions.forEach((e: any) => {
      const uName = e.program?.university?.name || e.universityName || 'General University';
      const pName = e.program?.name || e.programName || '';
      if (pName) progSet.add(pName);
      if (!uniMap.has(uName)) uniMap.set(uName, { name: uName, count: 0, revenue: 0 });
      const entry = uniMap.get(uName)!;
      entry.count += 1;
      entry.revenue += Number(e.totalFee) || 0;
    });

    const COLORS = ['#6366f1', '#10b981', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6'];
    const dist = Array.from(uniMap.values())
      .sort((a, b) => b.count - a.count)
      .map((u, i) => ({ ...u, color: COLORS[i % COLORS.length] }));

    return {
      universityDistribution: dist,
      uniqueUniversitiesCount: uniMap.size,
      uniqueProgramsCount: progSet.size
    };
  }, [validAdmissions]);

  // 7. Monthly Admissions & Revenue Chart data
  const monthlyChartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const buckets = MONTH_LABELS.map(label => ({ month: label, admissions: 0, revenue: 0 }));
    validAdmissions.forEach((e: any) => {
      const dStr = e.admissionDate || e.createdAt;
      if (!dStr) return;
      const d = new Date(dStr);
      if (!isNaN(d.getTime()) && d.getFullYear() === currentYear) {
        const mIdx = d.getMonth();
        buckets[mIdx].admissions += 1;
        buckets[mIdx].revenue += Number(e.totalFee) || 0;
      }
    });
    return buckets;
  }, [validAdmissions]);

  // 8. Top Study Centers by Admissions
  const topCenters = useMemo(() => {
    const map = new Map<string, { name: string; code: string; count: number; enrolled: number; revenue: number }>();
    validAdmissions.forEach((e: any) => {
      const cName = e.studyCenter?.name || e.centerName || 'Direct';
      const cCode = e.studyCenter?.code || e.centerCode || '';
      if (!map.has(cName)) map.set(cName, { name: cName, code: cCode, count: 0, enrolled: 0, revenue: 0 });
      const item = map.get(cName)!;
      item.count += 1;
      if (e.status === 'enrolled') item.enrolled += 1;
      item.revenue += Number(e.totalFee) || 0;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count || b.revenue - a.revenue).slice(0, 5);
  }, [validAdmissions]);

  const statusBadge = (s: string) => {
    const lower = (s || '').toLowerCase();
    if (lower === 'enrolled') {
      return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">Enrolled</Badge>;
    }
    if (REJECTED_STATUSES.includes(lower)) {
      return <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 text-[10px]">Rejected</Badge>;
    }
    return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] capitalize">{lower.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Hero Header */}
      <DashboardHero
        title="Sales Growth & Admissions Command"
        badge="Live Sales & Center Intelligence"
        subtitle="Real-time visibility into study center acquisitions, student admission pipelines, team hierarchy performance, and target quota velocity."
        stats={[
          {
            label: 'Total Admissions',
            value: loading ? '...' : validAdmissions.length,
            icon: GraduationCap,
            change: `${enrolledAdmissions.length} enrolled · ${inReviewAdmissions.length} in review`,
            isPositive: validAdmissions.length > 0
          },
          {
            label: 'Admission Revenue',
            value: loading ? '...' : formatINR(totalRevenue),
            icon: IndianRupee,
            change: `Avg ${formatINR(avgFeePerStudent)} / student`,
            isPositive: totalRevenue > 0
          },
          {
            label: 'Study Centers',
            value: loading ? '...' : totalCenters,
            icon: Building2,
            change: `${activeCentersCount} active partners`,
            isPositive: true
          },
          {
            label: 'Target Achievement',
            value: loading ? '...' : `${avgTargetProgress}%`,
            icon: Target,
            change: `${completedTargetsCount}/${scopedTargets.length} quotas achieved`,
            isPositive: avgTargetProgress >= 70
          },
        ]}
        primaryAction={{
          label: 'Centers Admissions',
          onClick: () => onNavigate('center_admissions'),
          icon: GraduationCap
        }}
        secondaryAction={{
          label: 'Target vs. Achievement',
          onClick: () => onNavigate('target_achievement_report'),
          icon: Target
        }}
      />

      {/* 2. Quick Action Shortcuts Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'My Team', sub: `${team.length} Downline Staff`, icon: <Users className="w-4 h-4 text-indigo-500" />, tab: 'my_team' },
          { label: 'Admission Hierarchy', sub: 'Center & TL Rollup', icon: <FileBarChart className="w-4 h-4 text-emerald-500" />, tab: 'admission_report' },
          { label: 'Session Report', sub: 'All Intake Sessions', icon: <Calendar className="w-4 h-4 text-sky-500" />, tab: 'session_report' },
          { label: 'Study Centers', sub: `${totalCenters} Registered`, icon: <Building2 className="w-4 h-4 text-purple-500" />, tab: 'study_centers' },
          { label: 'Invite Links', sub: 'Onboard Centers', icon: <Link2 className="w-4 h-4 text-amber-500" />, tab: 'invite_links' },
          { label: 'Financial Report', sub: 'Revenue & Commissions', icon: <IndianRupee className="w-4 h-4 text-rose-500" />, tab: 'sales_users_report' },
        ].map(action => (
          <button
            key={action.tab}
            type="button"
            onClick={() => onNavigate(action.tab)}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/60 bg-card/70 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all text-left group"
          >
            <div className="p-2.5 rounded-xl bg-muted/60 group-hover:bg-primary/10 transition-colors shrink-0">
              {action.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{action.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{action.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* 3. Primary KPI Cards Grid (8 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-5">
        <SalesMetric
          title="Student Admissions"
          value={loading ? '...' : validAdmissions.length}
          subtext={`${enrolledAdmissions.length} confirmed enrolled · ${inReviewAdmissions.length} in verification`}
          trend={validAdmissions.length > 0 ? 'Active Intake' : 'No Admissions'}
          icon={<GraduationCap className="w-5 h-5" />}
          color="primary"
          onClick={() => onNavigate('center_admissions')}
        />
        <SalesMetric
          title="Admission Revenue"
          value={loading ? '...' : formatINR(totalRevenue)}
          subtext={`Average fee ${formatINR(avgFeePerStudent)} across ${validAdmissions.length} admissions`}
          trend={`${enrolledAdmissions.length} Enrolled`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="success"
          onClick={() => onNavigate('sales_users_report')}
        />
        <SalesMetric
          title="Partner Study Centers"
          value={loading ? '...' : totalCenters}
          subtext={`${activeCentersCount} active & verified · ${pendingCentersCount} onboarding`}
          trend={`${topCenters.length} Contributing`}
          icon={<Building2 className="w-5 h-5" />}
          color="info"
          onClick={() => onNavigate('center_onboarding')}
        />
        <SalesMetric
          title="Target Achievement"
          value={loading ? '...' : `${avgTargetProgress}%`}
          subtext={`${completedTargetsCount} of ${scopedTargets.length} targets completed`}
          trend={avgTargetProgress >= 100 ? 'Quota Exceeded' : avgTargetProgress >= 70 ? 'On Track' : 'In Progress'}
          icon={<Target className="w-5 h-5" />}
          color="warning"
          onClick={() => onNavigate('target_achievement_report')}
        />
        <SalesMetric
          title="Team Downline"
          value={loading ? '...' : team.length}
          subtext={`${directReportsCount} direct reports · ${teamAdmissionsCount} downline admissions`}
          trend="Hierarchy Active"
          icon={<Users className="w-5 h-5" />}
          color="primary"
          onClick={() => onNavigate('my_team')}
        />
        <SalesMetric
          title="Universities & Programs"
          value={loading ? '...' : uniqueUniversitiesCount}
          subtext={`${uniqueProgramsCount} distinct academic programs with active admissions`}
          trend="Session Report"
          icon={<Sparkles className="w-5 h-5" />}
          color="info"
          onClick={() => onNavigate('session_report')}
        />
        <SalesMetric
          title="Inbound Leads"
          value={loading ? '...' : totalLeads}
          subtext={`${newLeads} new leads · ${convertedLeads} converted (${conversionRate}%)`}
          trend={newLeads > 0 ? `${newLeads} New` : 'Lead Pipeline'}
          icon={<BarChart3 className="w-5 h-5" />}
          color="success"
          onClick={() => onNavigate('leads')}
        />
        <SalesMetric
          title="Pending Tasks"
          value={loading ? '...' : (metrics.pendingTasks || 0)}
          subtext={metrics.overdueTasks ? `${metrics.overdueTasks} tasks overdue` : 'All sales tasks & follow-ups on schedule'}
          trend="Action Items"
          icon={<Zap className="w-5 h-5" />}
          color="warning"
          onClick={() => onNavigate('tasks')}
        />
      </div>

      {/* 4. Visual Analytics Row: Monthly Admissions Trend + University Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Admissions & Pipeline Status Breakdown */}
        <Card className="lg:col-span-2 border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-lg">Monthly Admissions &amp; Pipeline Velocity ({new Date().getFullYear()})</CardTitle>
              <CardDescription>Monthly admission volume and stage distribution across your hierarchy</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => onNavigate('sales_admission_report')}>
              Full Staff Report <ArrowUpRight className="ml-1 w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Stage Breakdown Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  <span>Active Admissions</span>
                  <GraduationCap className="w-4 h-4" />
                </div>
                <p className="text-2xl font-extrabold mt-1">{validAdmissions.length}</p>
                <p className="text-[10px] text-muted-foreground">Total valid submissions</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Enrolled</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-2xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400">{enrolledAdmissions.length}</p>
                <p className="text-[10px] text-muted-foreground">Verified &amp; enrolled</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  <span>In Verification</span>
                  <Clock className="w-4 h-4" />
                </div>
                <p className="text-2xl font-extrabold mt-1 text-amber-600 dark:text-amber-400">{inReviewAdmissions.length}</p>
                <p className="text-[10px] text-muted-foreground">Doc / Finance review</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 font-semibold">
                  <span>Rejected / Drop</span>
                  <BarChart3 className="w-4 h-4" />
                </div>
                <p className="text-2xl font-extrabold mt-1">{rejectedAdmissions.length}</p>
                <p className="text-[10px] text-muted-foreground">Excluded from quota</p>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val: any, name: any) => [name === 'revenue' ? formatINR(Number(val)) : val, name === 'revenue' ? 'Revenue' : 'Admissions']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="admissions" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* University & Program Distribution */}
        <Card className="border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">University Share</CardTitle>
              <CardDescription>Admissions &amp; fee revenue by university</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => onNavigate('session_report')}>
              Details <ArrowUpRight className="ml-1 w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {universityDistribution.length > 0 ? (
              <>
                <div className="h-[165px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={universityDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={68}
                        paddingAngle={4}
                        dataKey="count"
                      >
                        {universityDistribution.map((entry, index) => (
                          <Cell key={`uni-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, _name: any, item: any) => [`${val} admissions (${formatINR(item?.payload?.revenue || 0)})`, item?.payload?.name]}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {universityDistribution.slice(0, 5).map(u => (
                    <div key={u.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: u.color }} />
                        <span className="font-semibold truncate">{u.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className="text-[10px]">{u.count} Adm.</Badge>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatINR(u.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[240px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <GraduationCap className="w-9 h-9 opacity-25" />
                <p className="text-sm">No university admissions recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Bottom Operational Grid: Team Leaderboard, Top Study Centers & Active Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Performance Leaderboard */}
        <Card className="border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Team Leaderboard</CardTitle>
              <CardDescription>Downline staff ranked by admissions &amp; targets</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary text-xs font-bold" onClick={() => onNavigate('my_team')}>
              View Team <ArrowUpRight className="ml-1 w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)
            ) : team.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-25" />
                <p className="text-sm">No subordinate team members</p>
              </div>
            ) : (
              team.slice(0, 5).map((m: any, idx: number) => (
                <div
                  key={m.id}
                  onClick={() => onNavigate('my_team')}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-5 flex justify-center shrink-0">{rankIcon(idx)}</div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {(m.name?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {m.designation} · {m.centersCount || 0} centers
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-extrabold text-primary">{m.admissionsTotal || 0} Adm.</p>
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatINR(m.admissionsRevenue || 0)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top Performing Study Centers */}
        <Card className="border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Top Study Centers</CardTitle>
              <CardDescription>Highest contributing partner centers</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary text-xs font-bold" onClick={() => onNavigate('admission_report')}>
              All Centers <ArrowUpRight className="ml-1 w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)
            ) : topCenters.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-25" />
                <p className="text-sm">No center admissions yet</p>
              </div>
            ) : (
              topCenters.map((c, idx) => (
                <div
                  key={c.name + idx}
                  onClick={() => onNavigate('admission_report')}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 font-bold text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.enrolled} enrolled · {c.count - c.enrolled} in review
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <Badge variant="outline" className="text-[10px] font-bold">{c.count} Adm.</Badge>
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatINR(c.revenue)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Sales Targets & Quota Tracker */}
        <Card className="border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Targets &amp; Quotas</CardTitle>
              <CardDescription>Live goal vs achievement progress</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary text-xs font-bold" onClick={() => onNavigate('target_achievement_report')}>
              Full Report <ArrowUpRight className="ml-1 w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)
            ) : scopedTargets.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-25" />
                <p className="text-sm">No targets assigned yet</p>
              </div>
            ) : (
              scopedTargets.slice(0, 5).map((t: any) => {
                const isRev = /revenue|fee|amount|sales/i.test(t.type || '');
                const goal = Number(t.target) || 0;
                const ach = Number(t.achieved) || 0;
                const pct = goal > 0 ? Math.round((ach / goal) * 100) : 0;
                const empName =
                  (typeof t.employeeId === 'object' ? t.employeeId?.name : t.employee?.name) ||
                  user?.name ||
                  'Target';
                return (
                  <div
                    key={t.id}
                    onClick={() => onNavigate('target_achievement_report')}
                    className="p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold truncate">{empName}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-bold',
                          pct >= 100 ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'text-primary'
                        )}
                      >
                        {pct}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="capitalize">{t.type} · {t.period}</span>
                      <span className="font-semibold text-foreground">
                        {isRev ? `${formatINR(ach)} / ${formatINR(goal)}` : `${ach} / ${goal} Students`}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', pct >= 100 ? 'bg-emerald-500' : 'bg-primary')}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. Recent Student Admissions Table */}
      <Card className="border border-border/60 shadow-lg bg-card/70 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">Recent Student Admissions</CardTitle>
            <CardDescription>Latest student enrollments submitted across your study centers and team</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => onNavigate('center_admissions')}>
            View All Admissions ({combinedAdmissions.length}) <ArrowUpRight className="ml-1 w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : combinedAdmissions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-25" />
              <p className="text-sm">No student admissions recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-2.5 px-3 font-semibold">Student</th>
                    <th className="py-2.5 px-3 font-semibold">Study Center</th>
                    <th className="py-2.5 px-3 font-semibold">University &amp; Program</th>
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Fee</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {combinedAdmissions.slice(0, 6).map((e: any) => (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-foreground">{e.studentName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{e.enrollmentNumber || 'Pending ID'}</p>
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        {e.studyCenter?.name || e.centerName || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold">{e.program?.university?.name || e.universityName || '-'}</p>
                        <p className="text-[10px] text-muted-foreground">{e.program?.name || e.programName || '-'}</p>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {e.admissionDate || e.createdAt
                          ? new Date(e.admissionDate || e.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">
                        {formatINR(Number(e.totalFee) || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {statusBadge(e.status)}
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

function SalesMetric({ title, value, subtext, trend, icon, color, onClick }: any) {
  const colorMap: any = {
    primary: {
      bg: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
      glow: 'stat-glow-indigo',
      border: 'group-hover:border-primary/40',
    },
    info: {
      bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-600 group-hover:text-white',
      glow: 'stat-glow-cyan',
      border: 'group-hover:border-sky-500/40',
    },
    warning: {
      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white',
      glow: 'stat-glow-amber',
      border: 'group-hover:border-amber-500/40',
    },
    success: {
      bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white',
      glow: 'stat-glow-emerald',
      border: 'group-hover:border-emerald-500/40',
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
          {trend && (
            <Badge variant="outline" className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 bg-background/50 border-border/60">
              {trend}
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground/70 transition-colors">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-feature-settings-tnum">
              {value}
            </h3>
          </div>
          {subtext && (
            <p className="text-[11px] text-muted-foreground group-hover:text-foreground/70 transition-colors truncate pt-0.5">
              {subtext}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
