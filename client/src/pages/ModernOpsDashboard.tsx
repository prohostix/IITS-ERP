import { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Building2, 
  BookOpen, 
  Users, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Wallet,
  Receipt,
  Landmark,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Filter,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { UniversitiesPanel } from '@/components/panels/UniversitiesPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import { StudyCentersPanel } from '@/components/panels/StudyCentersPanel';
import { AdmissionSessionsPanel } from '@/components/panels/AdmissionSessionsPanel';
import { InternalMarksPanel } from '@/components/panels/InternalMarksPanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { BroadcastNotificationsPanel } from '@/components/panels/BroadcastNotificationsPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { OpsCenterVerificationPanel } from '@/components/panels/OpsCenterVerificationPanel';
import { OpsProgramAllocationPanel } from '@/components/panels/OpsProgramAllocationPanel';
import { DeptEnrollmentReviewPanel } from '@/components/panels/DeptEnrollmentReviewPanel';
import { SubOpsPortalPanel } from '@/components/panels/SubOpsPortalPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { PollsPanel } from '@/components/panels/PollsPanel';
import { PayrollPanel } from '@/components/panels/PayrollPanel';
import { CentersAdmissionsPanel } from '@/components/panels/CentersAdmissionsPanel';
import { SalesStaffAdmissionReportPanel } from '@/components/panels/SalesStaffAdmissionReportPanel';
import { FinanceSalesUsersReportPanel } from '@/components/panels/FinanceSalesUsersReportPanel';
import { StatusRequestsPanel } from '@/components/panels/StatusRequestsPanel';
import { ManagerHiringPanel } from '@/components/panels/hr/ManagerHiringPanel';
import { LeaveApprovalsPanel } from '@/components/panels/hr/LeaveApprovalsPanel';
import { useAuth } from '@/hooks/useAuth';
import { MyDocumentsPanel } from '@/components/panels/hr/MyDocumentsPanel';
import { FinanceCenterLedgerPanel } from '@/components/panels/FinanceCenterLedgerPanel';
import { FinanceStudentLedgerPanel } from '@/components/panels/FinanceStudentLedgerPanel';
import { FinanceUniversityFeeReportPanel } from '@/components/panels/FinanceUniversityFeeReportPanel';
import { FinanceReregReportWrapper } from '@/components/panels/FinanceReregReportWrapper';


export function ModernOpsDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  const isSubDeptManager = Boolean((user)?.subDepartmentId);
  const [metrics, setMetrics] = useState<any>({});
  const [activeTab, setActiveTab] = useState(initialTab || (isSubDeptManager ? 'my_subdept' : 'overview'));

  // Declare before useEffect so the reference is stable
  const fetchOpsMetrics = async () => {
    try {
      const response = await api.get('/dashboard/metrics');
      setMetrics(response.data.data || {});
    } catch (error) {
    }
  };

  // Sync initialTab changes to activeTab
  useEffect(() => {
    setActiveTab(initialTab || (isSubDeptManager ? 'my_subdept' : 'overview'));
  }, [initialTab]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchOpsMetrics(); }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3"><OverviewContent metrics={metrics} onNavigate={setActiveTab} /></div>
        </div>
      );
      case 'my_subdept': return <SubOpsPortalPanel />;
      case 'students': return <StudentsPanel />;
      case 'universities': return <UniversitiesPanel />;
      case 'programs': return <ProgramsPanel />;
      case 'centers': return <StudyCentersPanel />;
      case 'pending_verification': return <OpsCenterVerificationPanel />;
      case 'program_allocations': return <OpsProgramAllocationPanel />;
      case 'enrollment_review': return <DeptEnrollmentReviewPanel />;
      case 'status_requests': return <StatusRequestsPanel type="operations" />;
      case 'sessions': return <AdmissionSessionsPanel />;
      case 'marks': return <InternalMarksPanel />;
      case 'center_admissions': return <CentersAdmissionsPanel />;
      case 'sales_admission_report': return <SalesStaffAdmissionReportPanel />;
      case 'sales_users_report': return <FinanceSalesUsersReportPanel />;
      // Financial & Session Reports for Operations Admin
      case 'center_ledger':
      case 'center-ledger': return <FinanceCenterLedgerPanel />;
      case 'student_ledger':
      case 'student-ledger': return <FinanceStudentLedgerPanel />;
      case 'university_fee_report':
      case 'university-fee-report': return <FinanceUniversityFeeReportPanel />;
      case 'rereg_report':
      case 'rereg-report':
      case 'rereg_payment_report':
      case 'rereg-payment-report': return <FinanceReregReportWrapper />;
      case 'announcements': return <AnnouncementsPanel />;
      case 'broadcast_notifications': return <BroadcastNotificationsPanel />;
      case 'tasks': return <TasksPanel />;
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
      case 'polls': return <PollsPanel />;
      default: return <div className="p-8 text-center text-red-500 font-bold">Unknown tab: {activeTab} (initialTab: {initialTab})</div>;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {renderContent()}
    </div>
  );
}

export function getOpsNavItems(isSubDeptManager: boolean, isManager: boolean = true) {
  return [
    { id: '__ops_section', label: 'Operations', isSection: true },
    { id: 'overview', label: 'Overview' },
    ...(isSubDeptManager ? [{ id: 'my_subdept', label: 'My Sub-Dept' }] : []),
    { id: '__ops_finance_reports', label: 'Financial & Session Reports', isSection: true },
    { id: 'center_ledger', label: 'Center Report' },
    { id: 'student_ledger', label: 'Students Report' },
    { id: 'university_fee_report', label: 'University Reports' },
    { id: 'rereg_report', label: 'Re-Reg Report' },
    { id: '__academic_management', label: 'Academics & Admissions', isSection: true },
    { id: 'students', label: 'Students' },
    { id: 'universities', label: 'Universities' },
    { id: 'programs', label: 'Programs' },
    { id: 'sessions', label: 'Admission Sessions' },
    { id: 'marks', label: 'Internal Marks' },
    { id: 'program_allocations', label: 'Program Allocations' },
    { id: '__center_management', label: 'Center Management', isSection: true },
    { id: 'centers', label: 'Study Centers' },
    { id: 'center_admissions', label: 'Centers Admissions' },
    { id: 'sales_admission_report', label: 'Sales Staff Admission Report' },
    { id: '__verification_review', label: 'Verification & Review', isSection: true },
    { id: 'pending_verification', label: 'Pending Verification' },
    { id: 'enrollment_review', label: 'Enrollment Review' },
    { id: 'status_requests', label: 'Status Requests' },
    { id: '__communication_tasks', label: 'Communication & Tasks', isSection: true },
    { id: 'announcements', label: 'Announcements' },
    { id: 'broadcast_notifications', label: 'Send Notifications' },
    { id: 'tasks', label: 'Tasks' },
    { id: '__portal_section', label: 'My Portal', isSection: true },
    { id: 'my_leaves', label: 'My Leaves' },
    ...((isManager || isSubDeptManager) ? [{ id: 'leave_approvals', label: 'Leave Approvals' }] : []),
    { id: 'my_attendance', label: 'Attendance' },
    { id: 'my_payslips', label: 'Pay Slips' },
    { id: 'my_documents', label: 'My Documents' },
    { id: 'manager_hiring', label: 'My Hiring Requests' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'notice-board', label: 'Notice Board' },
    { id: 'polls', label: 'Polls' },
  ];
}

function OverviewContent({ metrics, onNavigate }: { metrics: any; onNavigate: (tab: string) => void }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
  const [sessionMetrics, setSessionMetrics] = useState<any>(metrics);
  const [loadingSession, setLoadingSession] = useState(false);

  useEffect(() => {
    setSessionMetrics(metrics);
  }, [metrics]);

  useEffect(() => {
    api.get('/operations/sessions')
      .then(res => {
        const sList = res.data.data || [];
        setSessions(sList);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedSessionId === 'all') {
      setSessionMetrics(metrics);
      return;
    }
    setLoadingSession(true);
    api.get(`/dashboard/metrics?sessionId=${selectedSessionId}`)
      .then(res => {
        if (res.data.data) {
          setSessionMetrics({ ...metrics, ...res.data.data });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSession(false));
  }, [selectedSessionId, metrics]);

  const activeSession = sessions.find(s => s.id === selectedSessionId);
  const sessionDisplayName = activeSession ? activeSession.name : 'All Sessions';
  const currentData = sessionMetrics || metrics || {};

  const navigateToStudentStatus = (statusKey: string) => {
    try {
      const raw = localStorage.getItem('erp_persist_filters_students_panel');
      const existing = raw ? JSON.parse(raw) : {};
      localStorage.setItem('erp_persist_filters_students_panel', JSON.stringify({ ...existing, status: statusKey }));
    } catch (e) {}
    onNavigate('students');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Dashboard Hero Header */}
      <DashboardHero
        title="Academic Operations Command"
        badge="Live Operational Services"
        subtitle="Manage student admissions, verify study center affiliations, oversee academic sessions, and track degree program allocations."
        stats={[
          { label: 'Total Students', value: currentData.totalStudents || 0, icon: GraduationCap },
          { label: 'Active Students', value: currentData.studentsActive ?? 0, icon: CheckCircle2 },
          { label: 'Pending Review', value: currentData.studentsPending ?? currentData.pendingApplications ?? 0, icon: Clock },
          { label: 'Affiliated Centers', value: metrics.totalCenters || 0, icon: Building2 },
        ]}
        primaryAction={{
          label: 'View Students',
          onClick: () => onNavigate('students'),
          icon: Users
        }}
        secondaryAction={{
          label: 'Academic Sessions',
          onClick: () => onNavigate('sessions'),
          icon: Calendar
        }}
      />

      {/* Session Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl glass-card border border-border/70 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Operational Scope</h4>
            <p className="text-xs text-muted-foreground">Select an academic session to scope enrollments and verification metrics.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-background/80 px-3 py-1.5 rounded-xl border border-border/70 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground shrink-0">Session:</span>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="h-7 border-none bg-transparent shadow-none text-xs font-bold w-[160px] focus:ring-0">
                <SelectValue placeholder="All Sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {sessions.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} {s.status === 'active' ? '(Active)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={() => onNavigate('pending_verification')} className="h-8 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Center Approvals
          </Button>
        </div>
      </div>

      {/* Operations Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-5">
        <OpsMetricCard 
          title="Total Students" 
          value={currentData.totalStudents || 0} 
          icon={<GraduationCap className="w-5 h-5 text-blue-500" />}
          subtext={`In ${sessionDisplayName}`}
          onClick={() => onNavigate('students')}
          colorClass="from-blue-500/20 to-blue-500/5 border-blue-500/20"
          extraContent={
            <div className="mt-3 pt-2.5 border-t border-border/50 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                <span>By Status</span>
                <span className="text-[10px] text-muted-foreground/80 font-normal truncate max-w-[110px]">{sessionDisplayName}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigateToStudentStatus('active'); }}
                  className="flex items-center justify-between px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs transition-all hover:scale-[1.02]"
                  title="Filter Active Students"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                  <span className="font-black text-xs font-display">{currentData.studentsActive ?? 0}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigateToStudentStatus('pending'); }}
                  className="flex items-center justify-between px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs transition-all hover:scale-[1.02]"
                  title="Filter Pending Students"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Pending
                  </span>
                  <span className="font-black text-xs font-display">{currentData.studentsPending ?? 0}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigateToStudentStatus('hold'); }}
                  className="flex items-center justify-between px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-xs transition-all hover:scale-[1.02]"
                  title="Filter On Hold Students"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    Hold
                  </span>
                  <span className="font-black text-xs font-display">{currentData.studentsHold ?? 0}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigateToStudentStatus('dropout'); }}
                  className="flex items-center justify-between px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-xs transition-all hover:scale-[1.02]"
                  title="Filter Dropout Students"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Dropout
                  </span>
                  <span className="font-black text-xs font-display">{currentData.studentsDropout ?? 0}</span>
                </button>
              </div>
            </div>
          }
        />
        <OpsMetricCard 
          title="Study Centers" 
          value={metrics.totalCenters || 0} 
          icon={<MapPin className="w-5 h-5 text-emerald-500" />}
          subtext="Verified institutions"
          onClick={() => onNavigate('centers')}
          colorClass="from-emerald-500/20 to-emerald-500/5 border-emerald-500/20"
        />
        <OpsMetricCard 
          title="Active Programs" 
          value={metrics.totalPrograms || 0} 
          icon={<BookOpen className="w-5 h-5 text-purple-500" />}
          subtext="Across all departments"
          onClick={() => onNavigate('programs')}
          colorClass="from-purple-500/20 to-purple-500/5 border-purple-500/20"
        />
        <OpsMetricCard 
          title="Affiliated Unis" 
          value={metrics.totalOrganizations || 0} 
          icon={<Building2 className="w-5 h-5 text-orange-500" />}
          subtext="Partner universities"
          onClick={() => onNavigate('universities')}
          colorClass="from-orange-500/20 to-orange-500/5 border-orange-500/20"
        />
      </div>

      {/* Student Enrollment Status Distribution (Active / Pending / Hold / Dropout) */}
      <div className="p-4 sm:p-5 rounded-2xl glass-card border border-border/70 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-foreground">Student Status Overview</h4>
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25 font-bold">
                  {currentData.totalStudents || 0} Total Enrolled
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active, Pending, Hold, and Dropout counts for <strong className="font-semibold text-foreground">{sessionDisplayName}</strong>. Click any status to view and filter records.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono text-xs w-fit">
            Viewing: {sessionDisplayName}
          </Badge>
        </div>

        {/* Visual Multi-Segment Proportion Bar */}
        {(() => {
          const tot = currentData.totalStudents || 0;
          const act = currentData.studentsActive ?? 0;
          const pnd = currentData.studentsPending ?? 0;
          const hld = currentData.studentsHold ?? 0;
          const drp = currentData.studentsDropout ?? 0;

          const actPct = tot > 0 ? Math.round((act / tot) * 100) : 0;
          const pndPct = tot > 0 ? Math.round((pnd / tot) * 100) : 0;
          const hldPct = tot > 0 ? Math.round((hld / tot) * 100) : 0;
          const drpPct = tot > 0 ? Math.round((drp / tot) * 100) : 0;

          return (
            <div className="space-y-3">
              <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden flex shadow-inner p-0.5 gap-0.5">
                {tot > 0 ? (
                  <>
                    {act > 0 && (
                      <div 
                        style={{ width: `${Math.max((act / tot) * 100, 2)}%` }} 
                        className="bg-emerald-500 rounded-sm transition-all duration-500" 
                        title={`Active: ${act} (${actPct}%)`}
                      />
                    )}
                    {pnd > 0 && (
                      <div 
                        style={{ width: `${Math.max((pnd / tot) * 100, 2)}%` }} 
                        className="bg-amber-500 rounded-sm transition-all duration-500" 
                        title={`Pending: ${pnd} (${pndPct}%)`}
                      />
                    )}
                    {hld > 0 && (
                      <div 
                        style={{ width: `${Math.max((hld / tot) * 100, 2)}%` }} 
                        className="bg-indigo-500 rounded-sm transition-all duration-500" 
                        title={`Hold: ${hld} (${hldPct}%)`}
                      />
                    )}
                    {drp > 0 && (
                      <div 
                        style={{ width: `${Math.max((drp / tot) * 100, 2)}%` }} 
                        className="bg-rose-500 rounded-sm transition-all duration-500" 
                        title={`Dropout: ${drp} (${drpPct}%)`}
                      />
                    )}
                  </>
                ) : (
                  <div className="w-full bg-muted rounded-sm" />
                )}
              </div>

              {/* 4 Status Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Active */}
                <div 
                  onClick={() => navigateToStudentStatus('active')}
                  className="group cursor-pointer p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:shadow-md transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Active Students</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Enrolled & regular</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                      {actPct}%
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-display">{act}</span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View Students <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* 2. Pending */}
                <div 
                  onClick={() => navigateToStudentStatus('pending')}
                  className="group cursor-pointer p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 hover:shadow-md transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Pending Students</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting activation</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                      {pndPct}%
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-amber-700 dark:text-amber-400 font-display">{pnd}</span>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View Students <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* 3. Hold */}
                <div 
                  onClick={() => navigateToStudentStatus('hold')}
                  className="group cursor-pointer p-3.5 rounded-xl border border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/40 hover:shadow-md transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">On Hold</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Temporarily paused</p>
                    </div>
                    <Badge variant="outline" className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 text-[10px] font-bold">
                      {hldPct}%
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400 font-display">{hld}</span>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View Students <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* 4. Dropout */}
                <div 
                  onClick={() => navigateToStudentStatus('dropout')}
                  className="group cursor-pointer p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/40 hover:shadow-md transition-all duration-300 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Dropout</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Discontinued</p>
                    </div>
                    <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 text-[10px] font-bold">
                      {drpPct}%
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-rose-700 dark:text-rose-400 font-display">{drp}</span>
                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View Students <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Financial & Session Reports Hub (Required Feature) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Financial & Operational Reports</h3>
              <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px]">Session-Wise</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive financial statements, institution ledgers, and re-registration realizations.
            </p>
          </div>
          <Badge variant="outline" className="bg-slate-50 text-slate-700 font-mono text-xs w-fit">
            Viewing: {sessionDisplayName}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Center Report */}
          <ReportLaunchCard
            title="Center Report"
            tag="Wallets & Debits"
            desc="Study Center wallet balances, approved top-ups, and student admission debits per center."
            icon={<Wallet className="w-5 h-5 text-emerald-600" />}
            accentColor="emerald"
            buttonText="Open Center Report"
            onClick={() => onNavigate('center_ledger')}
          />

          {/* 2. Students Report */}
          <ReportLaunchCard
            title="Students Report"
            tag="Student Ledgers"
            desc="Student-by-student ledger, fee structures, receipts recorded, and balance dues."
            icon={<Receipt className="w-5 h-5 text-blue-600" />}
            accentColor="blue"
            buttonText="Open Students Report"
            onClick={() => onNavigate('student_ledger')}
          />

          {/* 3. University Reports */}
          <ReportLaunchCard
            title="University Reports"
            tag="University Fees"
            desc="University fee payments, semester remittances, verified UTR receipts, and university summaries."
            icon={<Landmark className="w-5 h-5 text-amber-600" />}
            accentColor="amber"
            buttonText="Open University Reports"
            onClick={() => onNavigate('university_fee_report')}
          />

          {/* 4. Re-Reg Report */}
          <ReportLaunchCard
            title="Re-Reg Report"
            tag="Session & Uni Wise"
            desc="Session-wise list & universities-wise list of semester 2+ re-registrations and realization rates."
            icon={<Layers className="w-5 h-5 text-indigo-600" />}
            accentColor="indigo"
            buttonText="Open Re-Reg Report"
            onClick={() => onNavigate('rereg_report')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admission Pipeline */}
        <Card className="lg:col-span-2 border-none shadow-xl bg-card/60 backdrop-blur-xl cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate('students')}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold">Admission Pipeline</CardTitle>
              <CardDescription className="text-xs">Progress & document verification workflow</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {loadingSession && <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />}
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
                {sessionDisplayName}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const enrolledCount = currentData.enrolledStudents || 0;
              const verifiedCount = currentData.verifiedApplications || 0;
              const pendingCount = currentData.pendingApplications || 0;
              const rawLeadsCount = currentData.totalLeads || 0;

              // The true intake pipeline is all students entering the admissions system (leads or enrolled/reviewed applicants)
              const totalCandidates = Math.max(rawLeadsCount, pendingCount + verifiedCount + enrolledCount + (currentData.rejectedApplications || 0));

              // Accurately compute percentages (0 if totalCandidates is 0)
              const leadsPct = totalCandidates > 0 ? 100 : 0;
              const pendingPct = totalCandidates > 0 ? Math.round((pendingCount / totalCandidates) * 100) : 0;
              const verifiedPct = totalCandidates > 0 ? Math.round((verifiedCount / totalCandidates) * 100) : 0;
              const enrolledPct = totalCandidates > 0 ? Math.round((enrolledCount / totalCandidates) * 100) : 0;

              return (
                <div className="space-y-6">
                  <PipelineStep 
                    label="Inquiry / Leads" 
                    value={totalCandidates} 
                    percentage={leadsPct} 
                    color="bg-primary"
                    subtext="Total potential admission candidates"
                  />
                  <PipelineStep 
                    label="Application Submitted" 
                    value={pendingCount} 
                    percentage={pendingPct} 
                    color="bg-info"
                    subtext="Documents under review & verification"
                  />
                  <PipelineStep 
                    label="Verified & Approved" 
                    value={verifiedCount} 
                    percentage={verifiedPct} 
                    color="bg-success"
                    subtext="Ready for final enrollment"
                  />
                  <PipelineStep 
                    label="Final Enrolled" 
                    value={enrolledCount} 
                    percentage={enrolledPct} 
                    color="bg-emerald-500"
                    subtext="Payment confirmed & ID allocated"
                  />
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Action Needed */}
        <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Urgent Actions</CardTitle>
            <CardDescription className="text-xs">Operations tasks requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!currentData.urgentActions || currentData.urgentActions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20 text-emerald-500" />
                <p className="text-xs font-medium">All center verifications & reports up to date</p>
              </div>
            ) : (
              currentData.urgentActions.map((action: any, idx: number) => (
                <ActionItem 
                  key={idx}
                  icon={action.type === 'error' ? <AlertCircle className="w-4 h-4 text-error" /> : <Clock className="w-4 h-4 text-warning" />}
                  title={action.title}
                  desc={action.desc}
                  action={action.btnText || "View"}
                  onClick={() => onNavigate(action.tab || 'dashboard')}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Management Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OpsQuickLink 
          title="Student Records" 
          desc="Manage profiles & docs"
          icon={<Users className="w-5 h-5 text-primary" />}
          onClick={() => onNavigate('students')}
        />
        <OpsQuickLink 
          title="University Portal" 
          desc="Manage affiliations"
          icon={<Building2 className="w-5 h-5 text-success" />}
          onClick={() => onNavigate('universities')}
        />
        <OpsQuickLink 
          title="Curriculum Info" 
          desc="Program details & fees"
          icon={<BookOpen className="w-5 h-5 text-info" />}
          onClick={() => onNavigate('programs')}
        />
        <OpsQuickLink 
          title="Admission Sessions" 
          desc="Session rules & dates"
          icon={<Calendar className="w-5 h-5 text-warning" />}
          onClick={() => onNavigate('sessions')}
        />
      </div>
    </div>
  );
}

function ReportLaunchCard({ title, tag, desc, icon, accentColor, buttonText, onClick }: {
  title: string;
  tag: string;
  desc: string;
  icon: React.ReactNode;
  accentColor: 'emerald' | 'blue' | 'purple' | 'amber' | 'indigo';
  buttonText: string;
  onClick: () => void;
}) {
  const colorMap = {
    emerald: {
      border: 'hover:border-emerald-300',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBg: 'bg-emerald-50',
      btn: 'text-emerald-700 group-hover:text-emerald-800'
    },
    blue: {
      border: 'hover:border-blue-300',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      iconBg: 'bg-blue-50',
      btn: 'text-blue-700 group-hover:text-blue-800'
    },
    purple: {
      border: 'hover:border-purple-300',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      iconBg: 'bg-purple-50',
      btn: 'text-purple-700 group-hover:text-purple-800'
    },
    amber: {
      border: 'hover:border-amber-300',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      iconBg: 'bg-amber-50',
      btn: 'text-amber-700 group-hover:text-amber-800'
    },
    indigo: {
      border: 'hover:border-indigo-300',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      iconBg: 'bg-indigo-50',
      btn: 'text-indigo-700 group-hover:text-indigo-800'
    }
  };

  const c = colorMap[accentColor] || colorMap.indigo;

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-card/60 backdrop-blur-xl flex flex-col justify-between p-4",
        c.border
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className={cn("p-2.5 rounded-xl ring-1 ring-black/5 group-hover:scale-110 transition-transform duration-300", c.iconBg)}>
            {icon}
          </div>
          <Badge variant="outline" className={cn("text-[10px] font-semibold", c.badge)}>
            {tag}
          </Badge>
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{title}</h4>
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
            {desc}
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100/80 mt-3 flex items-center justify-between">
        <span className={cn("text-xs font-bold flex items-center gap-1 transition-all", c.btn)}>
          {buttonText}
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </Card>
  );
}

function OpsMetricCard({ title, value, icon, subtext, onClick, colorClass = "from-primary/20 to-primary/5 border-primary/20", extraContent }: any) {
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden border shadow-lg bg-card/40 backdrop-blur-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full",
        colorClass.split(' ').find(c => c.startsWith('border-')) || "border-border"
      )} 
      onClick={onClick}
    >
      {/* Background glowing gradient */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-100 transition-opacity duration-500", colorClass.replace(/border-[^\s]+/g, ''))} />
      
      {/* Top glowing border line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="p-3.5 rounded-2xl bg-background/80 shadow-inner ring-1 ring-white/10 group-hover:scale-110 group-hover:bg-foreground group-hover:text-background transition-all duration-500">
              {icon}
            </div>
            <ArrowUpRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-foreground transition-all duration-500 transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-4xl font-black tracking-tight mt-1 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
        </div>

        {extraContent ? (
          extraContent
        ) : (
          <p className="text-xs text-muted-foreground mt-3 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 animate-pulse" />
            {subtext}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PipelineStep({ label, value, percentage, color, subtext }: any) {
  // Determine badge styling based on the progress color
  let badgeClasses = "bg-primary/10 text-primary border border-primary/20";
  if (color.includes('info')) badgeClasses = "bg-info/10 text-info border border-info/20";
  if (color.includes('success') || color.includes('emerald')) badgeClasses = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
  if (color.includes('warning') || color.includes('orange')) badgeClasses = "bg-orange-500/10 text-orange-500 border border-orange-500/20";

  return (
    <div className="space-y-3 group">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{label}</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtext}</p>
        </div>
        <div className="text-right flex items-center gap-3">
          <span className="text-lg font-black font-display tracking-tight text-foreground">{value.toLocaleString()}</span>
          <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full", badgeClasses)}>
            {percentage}%
          </span>
        </div>
      </div>
      <div className="h-2.5 w-full bg-muted/50 rounded-full overflow-hidden shadow-inner">
        <div 
          className={cn("h-full rounded-full transition-all duration-700 relative overflow-hidden", color)} 
          style={{ width: `${percentage > 0 ? Math.max(percentage, 2) : 0}%` }} 
        >
          {/* Subtle shimmer effect inside the progress bar */}
          {percentage > 0 && (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          )}
        </div>
      </div>
    </div>
  );
}

function ActionItem({ icon, title, desc, action, onClick }: any) {
  return (
    <div className="group relative p-4 rounded-xl border border-border/50 bg-background/40 hover:bg-background/80 hover:border-primary/30 hover:shadow-md transition-all space-y-3 cursor-pointer overflow-hidden" onClick={onClick}>
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-[100px] -z-10 group-hover:bg-primary/10 transition-colors" />
      <div className="flex items-start gap-3">
        <div className="mt-1 p-2 rounded-xl bg-card shadow-sm border border-border/50 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
          {icon}
        </div>
        <div className="space-y-1">
          <h5 className="text-[13px] font-bold tracking-tight">{title}</h5>
          <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
        </div>
      </div>
      <div className="pt-2 flex items-center text-xs font-bold text-primary opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
        {action}
        <ArrowRight className="w-3 h-3 ml-1.5" />
      </div>
    </div>
  );
}

function OpsQuickLink({ title, desc, icon, onClick }: any) {
  return (
    <button onClick={onClick} className="group flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card/20 hover:bg-card/80 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-left relative overflow-hidden backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
      <div className="p-3 rounded-xl bg-background/80 shadow-inner ring-1 ring-white/10 group-hover:bg-primary group-hover:text-white transition-all duration-300 z-10">
        {icon}
      </div>
      <div className="min-w-0 z-10">
        <h5 className="text-[13px] font-bold truncate group-hover:text-primary transition-colors">{title}</h5>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{desc}</p>
      </div>
    </button>
  );
}
