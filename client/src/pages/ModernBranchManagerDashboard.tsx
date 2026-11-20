import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  TrendingUp,
  Users,
  BookOpen,
  MapPin,
  Target,
  Zap,
  ArrowUpRight,
  Network,
  Calendar,
  GraduationCap,
  IndianRupee,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  FileCheck2,
  UserCheck,
  Briefcase,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
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
import { SalesStaffAdmissionReportPanel } from '@/components/panels/SalesStaffAdmissionReportPanel';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6'];
const REJECTED_STATUSES = ['rejected', 'department_rejected', 'cancelled', 'dropout', 'refunded'];

const formatCurrency = (amount: number) => {
  if (!amount || isNaN(amount)) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

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
    { id: 'sales_admission_report', label: 'Sales Staff Admission Report' },
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [branch, setBranch] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>({});
  const [leads, setLeads] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        branchRes,
        metricsRes,
        leadsRes,
        targetsRes,
        enrollmentsRes,
        centersRes,
        teamRes,
      ] = await Promise.all([
        api.get('/org/branches/my').catch(() => ({ data: { data: null } })),
        api.get('/dashboard/metrics').catch(() => ({ data: { data: {} } })),
        api.get('/sales/leads').catch(() => ({ data: { data: [] } })),
        api.get('/sales/targets').catch(() => ({ data: { data: [] } })),
        api.get('/enrollment/all').catch(() => ({ data: { data: [] } })),
        api.get('/ops/study-centers').catch(() =>
          api.get('/sales/my-centers').catch(() => ({ data: { data: [] } }))
        ),
        api.get('/sales/team-performance').catch(() => ({ data: { data: [] } })),
      ]);
      setBranch(branchRes.data?.data || null);
      setMetrics(metricsRes.data?.data || {});
      setLeads(Array.isArray(leadsRes.data?.data) ? leadsRes.data.data : []);
      setTargets(Array.isArray(targetsRes.data?.data) ? targetsRes.data.data : []);
      setEnrollments(Array.isArray(enrollmentsRes.data?.data) ? enrollmentsRes.data.data : []);
      setCenters(Array.isArray(centersRes.data?.data) ? centersRes.data.data : []);
      setTeam(Array.isArray(teamRes.data?.data) ? teamRes.data.data : []);
    } catch (_e) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    onNavigate?.(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <BranchOverview
            user={user}
            branch={branch}
            metrics={metrics}
            leads={leads}
            targets={targets}
            enrollments={enrollments}
            centers={centers}
            team={team}
            loading={loading}
            onRefresh={fetchAll}
            onNavigate={handleNavigate}
          />
        );
      // Sales
      case 'leads': return <LeadsPanel />;
      case 'targets': return <TargetsPanel endpoint="/sales/targets" title="Branch Targets" />;
      case 'invite_links': return <SalesInvitePanel />;
      case 'team':
      case 'my_team': return <TeamPerformancePanel />;
      case 'branch_centers_sales': return <SalesCentersPanel />;
      // Ops
      case 'students': return <StudentsPanel />;
      case 'universities': return <UniversitiesPanel />;
      case 'programs': return <ProgramsPanel />;
      case 'centers': return <StudyCentersPanel />;
      case 'pending_verification': return <OpsCenterVerificationPanel />;
      case 'enrollment_review': return <DeptEnrollmentReviewPanel />;
      case 'admission_sessions':
      case 'sessions': return <AdmissionSessionsPanel />;
      // Reports
      case 'sales_admission_report':
      case 'sales-admission-report': return <SalesStaffAdmissionReportPanel />;
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
      case 'payslips':
      case 'my_payslips': return <PayrollPanel isEmployeeView />;
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

function BranchOverview({
  user,
  branch,
  metrics,
  leads,
  targets,
  enrollments,
  centers,
  team,
  loading,
  onRefresh,
  onNavigate,
}: any) {
  // 1. Admissions & Revenue Calculations
  const validAdmissions = useMemo(
    () => enrollments.filter((e: any) => !REJECTED_STATUSES.includes(String(e.status || '').toLowerCase())),
    [enrollments]
  );
  const enrolledAdmissions = useMemo(
    () => enrollments.filter((e: any) => String(e.status || '').toLowerCase() === 'enrolled'),
    [enrollments]
  );
  const pendingAdmissions = useMemo(
    () => validAdmissions.filter((e: any) => String(e.status || '').toLowerCase() !== 'enrolled'),
    [validAdmissions]
  );
  const rejectedAdmissions = useMemo(
    () => enrollments.filter((e: any) => REJECTED_STATUSES.includes(String(e.status || '').toLowerCase())),
    [enrollments]
  );

  const totalAdmissionsCount = validAdmissions.length;
  const enrolledCount = enrolledAdmissions.length;
  const pendingCount = pendingAdmissions.length;
  const rejectedCount = rejectedAdmissions.length;
  const enrollmentConversionRate =
    totalAdmissionsCount > 0 ? Math.round((enrolledCount / totalAdmissionsCount) * 100) : 0;

  const totalRevenue = useMemo(
    () => validAdmissions.reduce((sum: number, e: any) => sum + (Number(e.totalFee) || 0), 0),
    [validAdmissions]
  );
  const avgFeePerAdmission = totalAdmissionsCount > 0 ? Math.round(totalRevenue / totalAdmissionsCount) : 0;

  // 2. Study Centers & Onboarding Verification
  const totalCenters = centers.length;
  const verifiedCenters = useMemo(
    () =>
      centers.filter(
        (c: any) =>
          c.status === 'verified' ||
          c.status === 'active' ||
          c.onboardingStatus === 'approved' ||
          c.isVerified === true
      ).length,
    [centers]
  );
  const pendingCentersCount = Math.max(0, totalCenters - verifiedCenters);

  // 3. Targets & Quotas (both active and completed)
  const totalTargetsCount = targets.length;
  const completedTargetsCount = useMemo(
    () => targets.filter((t: any) => Number(t.target) > 0 && Number(t.achieved || 0) >= Number(t.target)).length,
    [targets]
  );
  const totalTargetGoal = useMemo(
    () => targets.reduce((sum: number, t: any) => sum + (Number(t.target) || 0), 0),
    [targets]
  );
  const totalTargetAchieved = useMemo(
    () => targets.reduce((sum: number, t: any) => sum + (Number(t.achieved) || 0), 0),
    [targets]
  );
  const overallTargetProgress =
    totalTargetGoal > 0
      ? Math.min(100, Math.round((totalTargetAchieved / totalTargetGoal) * 100))
      : completedTargetsCount > 0
      ? 100
      : 0;

  // 4. Team & Leads
  const teamCount = team.length;
  const activeContributors = useMemo(
    () => team.filter((m: any) => (m.admissionsTotal || 0) > 0 || (m.centersCount || 0) > 0).length,
    [team]
  );
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l: any) => l.status === 'converted').length;
  const leadConversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  // 5. Monthly Admissions Trend (last 6 active months)
  const monthlyTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentYear = now.getFullYear();
    const buckets = months.map((m, idx) => ({
      month: m,
      monthIdx: idx,
      admissions: 0,
      enrolled: 0,
      revenue: 0,
    }));

    validAdmissions.forEach((e: any) => {
      const rawDate = e.admissionDate || e.enrolledAt || e.createdAt;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() === currentYear) {
        const mIdx = d.getMonth();
        buckets[mIdx].admissions += 1;
        if (String(e.status || '').toLowerCase() === 'enrolled') {
          buckets[mIdx].enrolled += 1;
        }
        buckets[mIdx].revenue += Number(e.totalFee) || 0;
      }
    });

    const curMonth = now.getMonth();
    const startIdx = Math.max(0, curMonth - 5);
    const slice = buckets.slice(startIdx, curMonth + 1);
    const hasDataInSlice = slice.some(b => b.admissions > 0);
    if (!hasDataInSlice && validAdmissions.length > 0) {
      const activeMonths = buckets.filter(b => b.admissions > 0);
      if (activeMonths.length > 0) return activeMonths;
    }
    return slice.length > 0 ? slice : buckets.slice(0, 6);
  }, [validAdmissions]);

  // 6. University Distribution
  const universityDistribution = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>();
    validAdmissions.forEach((e: any) => {
      const uniName = e.program?.university?.name || e.universityName || 'Other University';
      const existing = map.get(uniName) || { name: uniName, count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += Number(e.totalFee) || 0;
      map.set(uniName, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [validAdmissions]);

  // 7. Top Study Centers by Admissions
  const topCenters = useMemo(() => {
    const centerMap = new Map<
      string,
      {
        id: string;
        name: string;
        code: string;
        status: string;
        referrerName: string;
        admissions: number;
        enrolled: number;
        pending: number;
        revenue: number;
      }
    >();

    centers.forEach((c: any) => {
      centerMap.set(c.id, {
        id: c.id,
        name: c.name || 'Study Center',
        code: c.code || '',
        status: c.status || c.onboardingStatus || 'active',
        referrerName: c.referrer?.name || '',
        admissions: 0,
        enrolled: 0,
        pending: 0,
        revenue: 0,
      });
    });

    validAdmissions.forEach((e: any) => {
      const cId = e.studyCenterId || e.studyCenter?.id;
      if (!cId) return;
      const entry = centerMap.get(cId) || {
        id: cId,
        name: e.studyCenter?.name || 'Study Center',
        code: e.studyCenter?.code || '',
        status: 'active',
        referrerName: '',
        admissions: 0,
        enrolled: 0,
        pending: 0,
        revenue: 0,
      };
      entry.admissions += 1;
      if (String(e.status || '').toLowerCase() === 'enrolled') {
        entry.enrolled += 1;
      } else {
        entry.pending += 1;
      }
      entry.revenue += Number(e.totalFee) || 0;
      centerMap.set(cId, entry);
    });

    return Array.from(centerMap.values())
      .sort((a, b) => b.admissions - a.admissions || b.revenue - a.revenue)
      .slice(0, 5);
  }, [centers, validAdmissions]);

  // 8. Top Sales Staff Leaderboard
  const topTeamMembers = useMemo(() => {
    return [...team]
      .sort(
        (a: any, b: any) =>
          (b.admissionsTotal || 0) - (a.admissionsTotal || 0) ||
          (b.admissionsRevenue || 0) - (a.admissionsRevenue || 0) ||
          (b.centersCount || 0) - (a.centersCount || 0)
      )
      .slice(0, 5);
  }, [team]);

  // 9. Distinct Programs & Universities Count
  const distinctProgramsCount = useMemo(() => {
    const s = new Set<string>();
    validAdmissions.forEach((e: any) => {
      if (e.programId || e.program?.name) s.add(e.programId || e.program?.name);
    });
    return s.size;
  }, [validAdmissions]);

  const distinctUniversitiesCount = useMemo(() => {
    const s = new Set<string>();
    validAdmissions.forEach((e: any) => {
      const u = e.program?.university?.name || e.universityName;
      if (u) s.add(u);
    });
    return s.size;
  }, [validAdmissions]);

  const totalPendingVerifications = pendingCount + pendingCentersCount;

  return (
    <div className="space-y-6">
      {/* Branch Command Hero */}
      <DashboardHero
        title={branch?.name ? `${branch.name} Command Center` : 'Branch Operations Command Center'}
        badge={
          branch?.code
            ? `${branch.code} · ${(branch.status || 'ACTIVE').toUpperCase()}`
            : `${branch?.name?.toUpperCase() || 'REGIONAL'} · ACTIVE`
        }
        description={
          branch?.location || branch?.city
            ? `${[branch?.location, branch?.city, branch?.state].filter(Boolean).join(', ')} — Unified regional command for student admissions, study center verification, sales team quotas, and campus operations.`
            : 'Unified regional command for student admissions, partner study center verification, sales team targets, and branch operations.'
        }
        metrics={[
          {
            label: 'Branch Admissions',
            value: loading ? '...' : totalAdmissionsCount,
            change: `${enrolledCount} enrolled (${enrollmentConversionRate}%)`,
            isPositive: totalAdmissionsCount > 0,
          },
          {
            label: 'Admission Revenue',
            value: loading ? '...' : formatCurrency(totalRevenue),
            change: avgFeePerAdmission > 0 ? `Avg ${formatCurrency(avgFeePerAdmission)}/student` : 'Gross fee volume',
            isPositive: totalRevenue > 0,
          },
          {
            label: 'Study Centers',
            value: loading ? '...' : totalCenters,
            change: `${verifiedCenters} active · ${pendingCentersCount} pending`,
            isPositive: totalCenters > 0,
          },
          {
            label: 'Quota Achievement',
            value: loading ? '...' : `${overallTargetProgress}%`,
            change:
              totalTargetsCount > 0
                ? `${totalTargetAchieved}/${totalTargetGoal} (${completedTargetsCount}/${totalTargetsCount} met)`
                : 'No quotas assigned',
            isPositive: overallTargetProgress >= 50 || completedTargetsCount > 0,
          },
        ]}
        primaryAction={{
          label: 'Hierarchy Report',
          icon: <Network className="w-4 h-4 mr-2" />,
          onClick: () => onNavigate('admission_report'),
        }}
        secondaryAction={{
          label: 'Enrollment Review',
          icon: <FileCheck2 className="w-4 h-4 mr-2" />,
          onClick: () => onNavigate('enrollment_review'),
        }}
      />

      {/* Branch Identity & Operations Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/75 px-4 py-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Building2 className="w-4 h-4 text-primary" />
            <span>{branch?.name || 'Assigned Branch'}</span>
          </div>
          {branch?.code && (
            <Badge variant="outline" className="text-[10px] font-mono uppercase">
              Code: {branch.code}
            </Badge>
          )}
          {branch?.salesDept?.name && (
            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px]">
              <Briefcase className="w-3 h-3 mr-1" />
              {branch.salesDept.name}
            </Badge>
          )}
          {branch?.operationsDept?.name && (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
              <Layers className="w-3 h-3 mr-1" />
              {branch.operationsDept.name}
            </Badge>
          )}
          {user?.name && (
            <span className="text-muted-foreground hidden md:inline">
              · Manager: <strong className="text-foreground">{user.name}</strong>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Quick Command Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'My Sales Team',
            sub: `${teamCount} branch executives`,
            icon: <Users className="w-4 h-4 text-indigo-500" />,
            bg: 'bg-indigo-500/10 border-indigo-500/20',
            tab: 'my_team',
          },
          {
            label: 'Enrollment Review',
            sub: `${pendingCount} awaiting review`,
            icon: <FileCheck2 className="w-4 h-4 text-amber-500" />,
            bg: 'bg-amber-500/10 border-amber-500/20',
            tab: 'enrollment_review',
          },
          {
            label: 'Center Verification',
            sub: `${pendingCentersCount} pending centers`,
            icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
            bg: 'bg-emerald-500/10 border-emerald-500/20',
            tab: 'pending_verification',
          },
          {
            label: 'Session Report',
            sub: 'Intake session breakdown',
            icon: <Calendar className="w-4 h-4 text-purple-500" />,
            bg: 'bg-purple-500/10 border-purple-500/20',
            tab: 'session_report',
          },
          {
            label: 'Staff Admissions',
            sub: 'Executive performance',
            icon: <FileSpreadsheet className="w-4 h-4 text-cyan-500" />,
            bg: 'bg-cyan-500/10 border-cyan-500/20',
            tab: 'sales_admission_report',
          },
          {
            label: 'Target vs. Achv.',
            sub: `${overallTargetProgress}% quota progress`,
            icon: <Target className="w-4 h-4 text-rose-500" />,
            bg: 'bg-rose-500/10 border-rose-500/20',
            tab: 'target_achievement_report',
          },
        ].map(action => (
          <button
            key={action.tab}
            onClick={() => onNavigate(action.tab)}
            className="group flex items-center gap-3 p-3.5 rounded-2xl border border-border/60 bg-card/70 hover:bg-card hover:border-primary/40 hover:shadow-md transition-all text-left"
          >
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105', action.bg)}>
              {action.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {action.label}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{action.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* 8 KPI Cards Grid (Branch Sales + Operations) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BranchMetric
          title="Branch Admissions"
          value={loading ? '...' : totalAdmissionsCount}
          sub={`${enrolledCount} enrolled · ${pendingCount} review`}
          footer={`${enrollmentConversionRate}% enrollment completion rate`}
          icon={<GraduationCap className="w-5 h-5" />}
          color="primary"
          onClick={() => onNavigate('students')}
        />
        <BranchMetric
          title="Branch Fee Revenue"
          value={loading ? '...' : formatCurrency(totalRevenue)}
          sub={avgFeePerAdmission > 0 ? `Avg ${formatCurrency(avgFeePerAdmission)}` : 'Gross fees'}
          footer={`Across ${totalAdmissionsCount} student admissions`}
          icon={<IndianRupee className="w-5 h-5" />}
          color="success"
          onClick={() => onNavigate('sales_admission_report')}
        />
        <BranchMetric
          title="Partner Study Centers"
          value={loading ? '...' : totalCenters}
          sub={`${verifiedCenters} active centers`}
          footer={
            pendingCentersCount > 0
              ? `${pendingCentersCount} awaiting verification`
              : 'All branch centers verified'
          }
          icon={<Building2 className="w-5 h-5" />}
          color="info"
          onClick={() => onNavigate('centers')}
        />
        <BranchMetric
          title="Verification Queue"
          value={loading ? '...' : totalPendingVerifications}
          sub={totalPendingVerifications > 0 ? 'Action needed' : 'Queue clear'}
          footer={`${pendingCount} student applications · ${pendingCentersCount} centers`}
          icon={<ShieldCheck className="w-5 h-5" />}
          color="warning"
          onClick={() => onNavigate('enrollment_review')}
        />
        <BranchMetric
          title="Branch Sales Team"
          value={loading ? '...' : teamCount}
          sub={`${activeContributors} contributing`}
          footer="Sales executives, TLs & BDEs in branch"
          icon={<UserCheck className="w-5 h-5" />}
          color="purple"
          onClick={() => onNavigate('my_team')}
        />
        <BranchMetric
          title="Quota Achievement"
          value={loading ? '...' : `${overallTargetProgress}%`}
          sub={`${completedTargetsCount}/${totalTargetsCount} targets met`}
          footer={`${totalTargetAchieved} achieved of ${totalTargetGoal} target units`}
          icon={<Target className="w-5 h-5" />}
          color="rose"
          onClick={() => onNavigate('targets')}
        />
        <BranchMetric
          title="Academic Footprint"
          value={loading ? '...' : `${distinctUniversitiesCount} Unis`}
          sub={`${distinctProgramsCount} active programs`}
          footer="Universities & programs with branch enrollments"
          icon={<BookOpen className="w-5 h-5" />}
          color="info"
          onClick={() => onNavigate('universities')}
        />
        <BranchMetric
          title="Leads & Tasks"
          value={loading ? '...' : `${totalLeads} / ${metrics.pendingTasks || 0}`}
          sub={`${convertedLeads} leads converted (${leadConversionRate}%)`}
          footer={
            metrics.overdueTasks
              ? `${metrics.overdueTasks} overdue tasks require attention`
              : 'All branch operational tasks on track'
          }
          icon={<Zap className="w-5 h-5" />}
          color="primary"
          onClick={() => onNavigate('leads')}
        />
      </div>

      {/* Visual Analytics Row: Monthly Admissions & Pipeline + University Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Admissions Trend & Verification Pipeline */}
        <Card className="lg:col-span-7 border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">Branch Admissions &amp; Verification Velocity</CardTitle>
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                  Live Pipeline
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Monthly student admissions volume and stage-wise verification breakdown for {branch?.name || 'your branch'}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary h-8"
              onClick={() => onNavigate('session_report')}
            >
              Session Report <ArrowUpRight className="ml-1 w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Stage Breakdown Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Active Pipeline</span>
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <p className="text-xl font-black text-foreground mt-1">{totalAdmissionsCount}</p>
                <p className="text-[10px] text-indigo-500 font-medium">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Enrolled</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{enrolledCount}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {enrollmentConversionRate}% verified
                </p>
              </div>
              <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>In Verification</span>
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Doc / Dept / Finance</p>
              </div>
              <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Rejected / Drop</span>
                  <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{rejectedCount}</p>
                <p className="text-[10px] text-muted-foreground">Excluded from revenue</p>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="h-52 w-full pt-1">
              {loading ? (
                <div className="h-full w-full rounded-xl bg-muted/40 animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === 'admissions') return [value, 'Total Admissions'];
                        if (name === 'enrolled') return [value, 'Enrolled'];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="admissions" name="admissions" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={34} />
                    <Bar dataKey="enrolled" name="enrolled" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={34} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* University Enrollment & Revenue Mix */}
        <Card className="lg:col-span-5 border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">University Share</CardTitle>
              <CardDescription className="text-xs">
                Top universities by branch student admissions &amp; fee revenue
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary h-8"
              onClick={() => onNavigate('universities')}
            >
              Universities <ArrowUpRight className="ml-1 w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : universityDistribution.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="w-9 h-9 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No university enrollments yet</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  University distribution will populate as branch centers submit admissions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={universityDistribution}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={3}
                      >
                        {universityDistribution.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '10px',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [`${val} admissions`, 'Admissions']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {universityDistribution.map((u, idx) => {
                    const share =
                      totalAdmissionsCount > 0 ? Math.round((u.count / totalAdmissionsCount) * 100) : 0;
                    return (
                      <div
                        key={u.name}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground">{formatCurrency(u.revenue)}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-xs font-bold text-foreground">{u.count} students</p>
                          <p className="text-[10px] text-primary font-medium">{share}% share</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3-Column Operational Insights: Sales Leaderboard + Top Study Centers + Branch Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch Sales Team Leaderboard */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-base font-bold">Branch Sales Leaderboard</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Top performing executives &amp; TLs in {branch?.name || 'your branch'}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs h-8"
              onClick={() => onNavigate('my_team')}
            >
              My Team <ArrowUpRight className="ml-1 w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {loading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-muted/40 rounded-xl animate-pulse" />)
            ) : topTeamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No sales staff found</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Branch sales team members and their admission counts will appear here.
                </p>
              </div>
            ) : (
              topTeamMembers.map((member: any, idx: number) => (
                <div
                  key={member.id}
                  onClick={() => onNavigate('my_team')}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0',
                        idx === 0
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : idx === 1
                          ? 'bg-slate-400/15 text-slate-600 dark:text-slate-300 border border-slate-400/30'
                          : idx === 2
                          ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {member.designation || 'Sales Executive'} · {member.centersCount || 0} centers
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-black text-primary">
                      {member.admissionsTotal || 0} <span className="font-normal text-muted-foreground">adm</span>
                    </p>
                    <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(member.admissionsRevenue || 0)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top Partner Study Centers */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <CardTitle className="text-base font-bold">Top Partner Centers</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Study centers driving admissions in {branch?.name || 'your branch'}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs h-8"
              onClick={() => onNavigate('centers')}
            >
              All Centers <ArrowUpRight className="ml-1 w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {loading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-muted/40 rounded-xl animate-pulse" />)
            ) : topCenters.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No study centers onboarded</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Onboard study centers or share invite links to expand your branch network.
                </p>
              </div>
            ) : (
              topCenters.map((center: any) => (
                <div
                  key={center.id}
                  onClick={() => onNavigate('centers')}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-foreground truncate">{center.name}</p>
                      {center.code && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0">
                          {center.code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {center.enrolled} enrolled · {center.pending} in review
                      {center.referrerName ? ` · Ref: ${center.referrerName}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-foreground">{center.admissions} adm</p>
                    <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(center.revenue)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Branch Targets & Quotas Tracker */}
        <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-500" />
                <CardTitle className="text-base font-bold">Branch Targets &amp; Quotas</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Live quota attainment across branch staff &amp; study centers
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary text-xs h-8"
              onClick={() => onNavigate('targets')}
            >
              Manage <ArrowUpRight className="ml-1 w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-14 bg-muted/40 rounded-xl animate-pulse" />)
            ) : targets.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No targets assigned yet</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Assign monthly or session targets to branch sales staff to track achievement.
                </p>
              </div>
            ) : (
              targets.slice(0, 5).map((t: any) => {
                const goal = Number(t.target) || 0;
                const achieved = Number(t.achieved) || 0;
                const pct = goal > 0 ? Math.min(100, Math.round((achieved / goal) * 100)) : 0;
                const isCompleted = goal > 0 && achieved >= goal;
                const ownerName =
                  (typeof t.employeeId === 'object' ? t.employeeId?.name : t.employee?.name) ||
                  t.center?.name ||
                  (typeof t.departmentId === 'object' ? t.departmentId?.name : t.department?.name) ||
                  'Branch Target';
                const scopeLabel = t.university?.code || t.university?.name || t.session?.name || t.period || 'Current';

                return (
                  <div
                    key={t.id}
                    onClick={() => onNavigate('targets')}
                    className="p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{ownerName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {scopeLabel} · {achieved} / {goal} admissions
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-bold shrink-0',
                          isCompleted
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : pct >= 50
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        )}
                      >
                        {isCompleted ? 'COMPLETED' : `${pct}%`}
                      </Badge>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          isCompleted ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Branch Student Admissions + Operations & Reports Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Student Admissions Table */}
        <Card className="lg:col-span-8 border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <CardTitle className="text-base font-bold">Recent Branch Admissions</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Latest student applications submitted across study centers in {branch?.name || 'your branch'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => onNavigate('enrollment_review')}
              >
                Review Queue ({pendingCount})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary h-8"
                onClick={() => onNavigate('students')}
              >
                All Students <ArrowUpRight className="ml-1 w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : enrollments.length === 0 ? (
              <div className="text-center py-10">
                <GraduationCap className="w-9 h-9 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No student admissions recorded yet</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Once partner study centers in your branch submit enrollments, they will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Study Center</th>
                      <th className="py-2.5 px-3">University &amp; Program</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Fee</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs">
                    {enrollments.slice(0, 6).map((e: any) => {
                      const status = String(e.status || 'pending').toLowerCase();
                      const isEnrolled = status === 'enrolled';
                      const isRejected = REJECTED_STATUSES.includes(status);
                      const rawDate = e.admissionDate || e.enrolledAt || e.createdAt;
                      return (
                        <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-foreground">{e.studentName || 'Student'}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {e.enrollmentNumber || e.studentEmail || '-'}
                            </p>
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-medium text-foreground truncate max-w-[160px]">
                              {e.studyCenter?.name || '-'}
                            </p>
                            {e.studyCenter?.code && (
                              <p className="text-[10px] text-muted-foreground">{e.studyCenter.code}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-medium text-foreground truncate max-w-[190px]">
                              {e.program?.name || '-'}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[190px]">
                              {e.program?.university?.name || e.session?.name || '-'}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                            {rawDate ? new Date(rawDate).toLocaleDateString('en-IN') : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground whitespace-nowrap">
                            {formatCurrency(Number(e.totalFee) || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] uppercase font-semibold',
                                isEnrolled
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : isRejected
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              )}
                            >
                              {status.replace(/_/g, ' ')}
                            </Badge>
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

        {/* Operations & Verification Control Hub */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Campus Operations Hub</CardTitle>
                  <CardDescription className="text-xs">
                    Direct access to verification queues &amp; academic setup
                  </CardDescription>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5">
              {[
                {
                  label: 'Students',
                  sub: `${totalAdmissionsCount} active`,
                  icon: <Users className="w-4 h-4 text-indigo-500" />,
                  tab: 'students',
                },
                {
                  label: 'Study Centers',
                  sub: `${totalCenters} partners`,
                  icon: <MapPin className="w-4 h-4 text-emerald-500" />,
                  tab: 'centers',
                },
                {
                  label: 'Center Verification',
                  sub: `${pendingCentersCount} pending`,
                  icon: <ShieldCheck className="w-4 h-4 text-amber-500" />,
                  tab: 'pending_verification',
                },
                {
                  label: 'Enrollment Review',
                  sub: `${pendingCount} in review`,
                  icon: <FileCheck2 className="w-4 h-4 text-rose-500" />,
                  tab: 'enrollment_review',
                },
                {
                  label: 'Universities',
                  sub: `${distinctUniversitiesCount} active`,
                  icon: <Building2 className="w-4 h-4 text-cyan-500" />,
                  tab: 'universities',
                },
                {
                  label: 'Programs',
                  sub: `${distinctProgramsCount} enrolled`,
                  icon: <BookOpen className="w-4 h-4 text-purple-500" />,
                  tab: 'programs',
                },
              ].map(item => (
                <button
                  key={item.tab}
                  onClick={() => onNavigate(item.tab)}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-primary/30 transition-all text-left"
                >
                  <div className="p-2 rounded-lg bg-background border border-border/40 shrink-0">{item.icon}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Recent Inbound Leads</CardTitle>
                <CardDescription className="text-xs">
                  {totalLeads} total · {convertedLeads} converted
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary text-xs h-8"
                onClick={() => onNavigate('leads')}
              >
                Leads <ArrowUpRight className="ml-1 w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                [1, 2].map(i => <div key={i} className="h-10 bg-muted/40 rounded-xl animate-pulse" />)
              ) : leads.length === 0 ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Invite New Study Centers</p>
                    <p className="text-[10px] text-muted-foreground">
                      Generate branch referral links to capture leads &amp; onboard centers
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onNavigate('invite_links')}>
                    Invite Links
                  </Button>
                </div>
              ) : (
                leads.slice(0, 3).map((l: any) => (
                  <div
                    key={l.id}
                    onClick={() => onNavigate('leads')}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/25 border border-border/40 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-foreground truncate">
                        {l.centerName || l.contactName || l.name || 'Lead'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {l.contactName || l.email || l.phone || 'Direct'} ·{' '}
                        {l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                      {l.status || 'new'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BranchMetric({ title, value, sub, footer, icon, color, onClick }: any) {
  const glowMap: Record<string, { ring: string; glow: string; text: string; bg: string }> = {
    primary: {
      ring: 'ring-indigo-500/20',
      glow: 'stat-glow-indigo',
      text: 'text-indigo-500 dark:text-indigo-400',
      bg: 'bg-indigo-500/10',
    },
    success: {
      ring: 'ring-emerald-500/20',
      glow: 'stat-glow-emerald',
      text: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    warning: {
      ring: 'ring-amber-500/20',
      glow: 'stat-glow-amber',
      text: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
    info: {
      ring: 'ring-cyan-500/20',
      glow: 'stat-glow-cyan',
      text: 'text-cyan-500 dark:text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    purple: {
      ring: 'ring-purple-500/20',
      glow: 'stat-glow-indigo',
      text: 'text-purple-500 dark:text-purple-400',
      bg: 'bg-purple-500/10',
    },
    rose: {
      ring: 'ring-rose-500/20',
      glow: 'stat-glow-amber',
      text: 'text-rose-500 dark:text-rose-400',
      bg: 'bg-rose-500/10',
    },
  };

  const scheme = glowMap[color] || glowMap.primary;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-xl transition-all duration-300',
        scheme.glow,
        'hover:-translate-y-1 hover:border-border hover:shadow-xl hover:shadow-primary/5 cursor-pointer'
      )}
    >
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center ring-1 transition-transform group-hover:scale-105 group-hover:rotate-1 shrink-0',
              scheme.bg,
              scheme.text,
              scheme.ring
            )}
          >
            {icon}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full border border-border/40 truncate">
            {sub}
          </span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-display mt-0.5 truncate">
          {value}
        </p>
        {footer && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{footer}</p>}
      </div>
    </div>
  );
}
