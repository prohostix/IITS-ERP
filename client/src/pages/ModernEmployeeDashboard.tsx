import { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  Zap, 
  MessageSquare, 
  Bell, 
  Star,
  Trophy,
  Target,
  FileText,
  User,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { AnnouncementsPanel } from '@/components/panels/AnnouncementsPanel';
import { TeamPerformancePanel } from '@/components/panels/TeamPerformancePanel';
import { SubOpsPortalPanel } from '@/components/panels/SubOpsPortalPanel';
import { SubSalesPortalPanel } from '@/components/panels/SubSalesPortalPanel';
import { EmployeeEscalationsPanel } from '@/components/panels/EmployeeEscalationsPanel';
import { LeaveApprovalsPanel } from '@/components/panels/hr/LeaveApprovalsPanel';
import { PayrollPanel } from '@/components/panels/PayrollPanel';


export function ModernEmployeeDashboard({ initialTab, onNavigate }: { initialTab?: string; onNavigate?: (tab: string) => void }) {
  const { user } = useAuth();
  const isSubDeptManager = Boolean((user as any)?.subDepartmentId);
  // Determine sub-dept type from populated subDepartmentId object
  const subDeptObj = typeof (user as any)?.subDepartmentId === 'object' ? (user as any).subDepartmentId : null;
  const parentDeptType = subDeptObj?.parentDeptId?.type || null;
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>({});
  const [tasks, setTasks] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>({});
  const mappedInitialTab = initialTab === 'my-tasks' ? 'tasks' : 
    initialTab === 'my-leaves' ? 'leaves' : 
    initialTab === 'my-attendance' ? 'attendance' : 
    initialTab === 'my-complaints' ? 'escalations' : initialTab;

  const [activeTab, setActiveTab] = useState(mappedInitialTab || (isSubDeptManager ? 'my_subdept' : 'overview'));

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab === 'overview' || tab === 'my_subdept' ? 'dashboard' : tab);
    }
  };

  useEffect(() => {
    const mapped = initialTab === 'my-tasks' ? 'tasks' : 
      initialTab === 'my-leaves' ? 'leaves' : 
      initialTab === 'my-attendance' ? 'attendance' : 
      initialTab === 'my-complaints' ? 'escalations' : initialTab;
    setActiveTab(mapped || (isSubDeptManager ? 'my_subdept' : 'overview'));
  }, [initialTab, isSubDeptManager]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [metricsRes, tasksRes, leavesRes, attendanceRes] = await Promise.all([
        api.get('/dashboard/metrics'),
        api.get('/tasks').catch(() => ({ data: { data: [] } })),
        api.get('/hr/leaves/my').catch(() => ({ data: { data: [] } })),
        api.get('/hr/attendance/my-summary').catch(() => ({ data: { data: {} } })),
      ]);
      setMetrics(metricsRes.data.data || {});
      setTasks((tasksRes.data.data || []).filter((t: any) => t.status !== 'completed').slice(0, 5));
      setLeaves(leavesRes.data.data || []);
      setAttendance(attendanceRes.data.data || {});
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  // Compute leave balance from real allocation data
  const approvedLeaves = leaves.filter((l: any) => l.status === 'approved');
  const usedDays = approvedLeaves.reduce((s: number, l: any) => {
    if (!l.startDate || !l.endDate) return s;
    if (l.isHalfDay) return s + 0.5;
    const diff = Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1;
    return s + diff;
  }, 0);
  // Use allocation from metrics if available, otherwise fallback to sum of standard types
  const totalLeaveAllowance = metrics.leaveAllocation
    ? (metrics.leaveAllocation.sickLeave || 0) + (metrics.leaveAllocation.casualLeave || 0) + (metrics.leaveAllocation.earnedLeave || 0)
    : 39; // 12 sick + 12 casual + 15 earned
  const remainingLeaves = Math.max(0, totalLeaveAllowance - usedDays);

  // Work hours this week from attendance
  const weekHours = attendance.weekHours ?? null;

  // Pending tasks count
  const pendingTaskCount = tasks.length;
  const dueSoonCount = tasks.filter((t: any) => {
    if (!t.deadline) return false;
    const diff = new Date(t.deadline).getTime() - Date.now();
    return diff > 0 && diff < 7 * 86400000;
  }).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <DashboardHero
        title={`Welcome, ${user?.name?.split(' ')[0] || 'Team Member'}`}
        badge={user?.role?.toUpperCase() || 'WORKSPACE'}
        description={
          pendingTaskCount > 0
            ? `You have ${pendingTaskCount} active task${pendingTaskCount > 1 ? 's' : ''} assigned. Review priority items and deadlines below.`
            : 'You are completely up to date with your assignments for today. Great work!'
        }
        metrics={[
          { label: 'Assigned Tasks', value: pendingTaskCount, change: dueSoonCount > 0 ? `${dueSoonCount} due soon` : 'On track', isPositive: dueSoonCount === 0 },
          { label: 'Leave Balance', value: `${remainingLeaves} Days`, change: `${usedDays} taken`, isPositive: true },
          { label: 'Efficiency', value: metrics.efficiencyScore ? `${metrics.efficiencyScore}%` : 'Optimal', change: 'Personal KPI', isPositive: true },
        ]}
        primaryAction={{
          label: 'Notice Board',
          icon: <Bell className="w-4 h-4 mr-2" />,
          onClick: () => handleTabChange('notice-board'),
        }}
        secondaryAction={{
          label: 'Refresh',
          icon: <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />,
          onClick: fetchAll,
        }}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="leaves">My Leaves</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="notice-board">Notice Board</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="holidays">Holiday List</TabsTrigger>
          <TabsTrigger value="team">My Team</TabsTrigger>
          {isSubDeptManager && <TabsTrigger value="my_subdept">My Sub-Dept</TabsTrigger>}
          {isSubDeptManager && <TabsTrigger value="leave_approvals">Leave Approvals</TabsTrigger>}
          <TabsTrigger value="ld-portal">L&amp;D Portal</TabsTrigger>
          <TabsTrigger value="escalations">Escalations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Productivity Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <EmployeeMetric
              title="Assigned Tasks"
              value={loading ? '...' : pendingTaskCount}
              icon={<Target className="w-5 h-5" />}
              subtext={dueSoonCount > 0 ? `${dueSoonCount} due this week` : 'No urgent deadlines'}
              color="primary"
              onClick={() => handleTabChange('tasks')}
            />
            <EmployeeMetric
              title="Efficiency Score"
              value={metrics.efficiencyScore ? `${metrics.efficiencyScore}%` : 'N/A'}
              icon={<Zap className="w-5 h-5" />}
              subtext="Based on task completion"
              color="success"
              onClick={() => handleTabChange('tasks')}
            />
            <EmployeeMetric
              title="Leaves Remaining"
              value={loading ? '...' : `${remainingLeaves} Days`}
              icon={<Calendar className="w-5 h-5" />}
              subtext={`${usedDays} used of ${totalLeaveAllowance}`}
              color="info"
              onClick={() => handleTabChange('leaves')}
            />
            <EmployeeMetric
              title="Work Hours"
              value={loading ? '...' : (weekHours != null ? `${weekHours}h` : 'N/A')}
              icon={<Clock className="w-5 h-5" />}
              subtext="Current week"
              color="warning"
              onClick={() => handleTabChange('attendance')}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Task List */}
            <Card className="lg:col-span-3 border-none shadow-xl bg-card/60 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Priority Tasks</CardTitle>
                  <CardDescription>Your pending assignments</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-primary font-bold" onClick={() => handleTabChange('tasks')}>
                  View Board <ArrowUpRight className="ml-1 w-3 h-3" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  [1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)
                ) : tasks.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No pending tasks</p>
                  </div>
                ) : (
                  tasks.map((task: any) => (
                    <TaskItem
                      key={task.id}
                      title={task.title}
                      priority={task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low'}
                      due={task.deadline ? new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No deadline'}
                      progress={task.progress || 0}
                      onClick={() => handleTabChange('tasks')}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Rewards & Recognition */}
            <div className="space-y-4">
              <Card className="border-none shadow-lg bg-gradient-to-br from-primary to-primary/80 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/20">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Performance Tier: Gold</h4>
                      <p className="text-xs text-white/80 mt-0.5">Keep up the great work!</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                      <span>Current Progress</span>
                      <span>{pendingTaskCount > 0 ? `${Math.max(0, 10 - pendingTaskCount) * 100} / 1000 XP` : '1000 / 1000 XP'}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.max(10, 100 - pendingTaskCount * 10)}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'Apply for Leave', tab: 'leaves', color: 'text-info' },
                    { label: 'View Attendance', tab: 'attendance', color: 'text-warning' },
                    { label: 'Notice Board', tab: 'notice-board', color: 'text-success' },
                    { label: 'Announcements', tab: 'announcements', color: 'text-primary' },
                    { label: 'My Team', tab: 'team', color: 'text-warning' },
                    { label: 'Raise Escalation', tab: 'escalations', color: 'text-error' },
                  ].map(item => (
                    <button
                      key={item.tab}
                      className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
                      onClick={() => handleTabChange(item.tab)}
                    >
                      <span className={cn('font-medium', item.color)}>{item.label}</span>
                      <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Punch + Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ShortcutBtn
                icon={<FileText className="w-5 h-5 text-primary" />}
                title="Pay Slips"
                onClick={() => handleTabChange('payslips')}
              />
              <ShortcutBtn
                icon={<Calendar className="w-5 h-5 text-info" />}
                title="Holiday List"
                onClick={() => handleTabChange('holidays')}
              />
              <ShortcutBtn
                icon={<MessageSquare className="w-5 h-5 text-success" />}
                title="Announcements"
                onClick={() => handleTabChange('announcements')}
              />
              <ShortcutBtn
                icon={<Star className="w-5 h-5 text-warning" />}
                title="L&D Portal"
                onClick={() => handleTabChange('ld-portal')}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <TasksPanel />
        </TabsContent>

        <TabsContent value="leaves">
          <LeavesPanel isPersonalView />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendancePanel isPersonalView />
        </TabsContent>

        <TabsContent value="notice-board">
          <NoticeBoardPanel />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementsPanel />
        </TabsContent>

        <TabsContent value="holidays">
          <HolidaysPanel />
        </TabsContent>

        <TabsContent value="team">
          <TeamPerformancePanel />
        </TabsContent>

        {isSubDeptManager && (
          <TabsContent value="my_subdept">
            {parentDeptType === 'sales' ? <SubSalesPortalPanel /> : <SubOpsPortalPanel />}
          </TabsContent>
        )}

        {isSubDeptManager && (
          <>
            <TabsContent value="leave_approvals">
              <LeaveApprovalsPanel />
            </TabsContent>
            <TabsContent value="leave-approvals">
              <LeaveApprovalsPanel />
            </TabsContent>
          </>
        )}

        <TabsContent value="payslips">
          <PayrollPanel isEmployeeView />
        </TabsContent>

        <TabsContent value="ld-portal">
          <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Learning &amp; Development Portal</CardTitle>
              <CardDescription>Courses, certifications and growth resources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { title: 'Onboarding Essentials', category: 'Mandatory', status: 'Completed', color: 'text-success' },
                  { title: 'Communication Skills', category: 'Soft Skills', status: 'In Progress', color: 'text-warning' },
                  { title: 'Data Privacy & Compliance', category: 'Compliance', status: 'Not Started', color: 'text-muted-foreground' },
                ].map((course) => (
                  <Card key={course.title} className="border border-border hover:border-primary/40 transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <Badge variant="outline" className="text-[9px] mb-2">{course.category}</Badge>
                      <h4 className="font-bold text-sm mb-1">{course.title}</h4>
                      <p className={`text-xs font-medium ${course.color}`}>{course.status}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="py-6 text-center text-muted-foreground border-t border-border">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">More courses will be assigned by HR. Check back regularly.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalations">
          <EmployeeEscalationsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmployeeMetric({ title, value, icon, subtext, color, onClick }: any) {
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
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Live
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-3xl font-black tracking-tight text-foreground font-display">{value}</p>
          {subtext && <p className="text-xs text-muted-foreground/80 mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function TaskItem({ title, priority, due, progress, onClick }: any) {
  const priorityColor: any = {
    High: 'text-error border-error/20 bg-error/5',
    Medium: 'text-warning border-warning/20 bg-warning/5',
    Low: 'text-info border-info/20 bg-info/5',
  };

  return (
    <div
      className="p-4 rounded-xl border border-border group hover:border-primary/30 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-2 h-2 rounded-full', progress === 100 ? 'bg-success' : 'bg-primary')} />
          <h5 className="text-sm font-bold text-foreground line-clamp-1">{title}</h5>
        </div>
        <Badge variant="outline" className={cn('text-[9px] font-bold uppercase py-0', priorityColor[priority])}>{priority}</Badge>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {due}
        </span>
      </div>
    </div>
  );
}

function ShortcutBtn({ icon, title, onClick }: any) {
  return (
    <button
      className="flex flex-col items-center justify-center p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
      onClick={onClick}
    >
      <div className="p-3 rounded-xl bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all mb-3 group-hover:scale-110">
        {icon}
      </div>
      <span className="text-xs font-bold text-foreground">{title}</span>
    </button>
  );
}
