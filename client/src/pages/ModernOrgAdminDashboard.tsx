import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersPanel } from '@/components/panels/UsersPanel';
import { DepartmentsPanel } from '@/components/panels/DepartmentsPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { UniversitiesPanel } from '@/components/panels/UniversitiesPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import { StudyCentersPanel } from '@/components/panels/StudyCentersPanel';
import { InvoicesPanel } from '@/components/panels/InvoicesPanel';
import { PaymentsPanel } from '@/components/panels/PaymentsPanel';
import { ExpensesPanel } from '@/components/panels/ExpensesPanel';
import { EmployeesPanel } from '@/components/panels/EmployeesPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { LeaveApprovalsPanel } from '@/components/panels/hr/LeaveApprovalsPanel';
import { LeadsPanel } from '@/components/panels/LeadsPanel';
import { OrgHierarchyPanel } from '@/components/panels/OrgHierarchyPanel';
import { BranchesPanel } from '@/components/panels/BranchesPanel';
import { SubDepartmentsPanel } from '@/components/panels/SubDepartmentsPanel';
import { CentersAdmissionsPanel } from '@/components/panels/CentersAdmissionsPanel';
import { OrgAdminSessionsPanel } from '@/components/panels/OrgAdminSessionsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { MyDocumentsPanel } from '@/components/panels/hr/MyDocumentsPanel';
import { CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, MapPin, Building2, Target, FileText, ArrowRight, ArrowUpRight, Search, Activity, BookOpen, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';export function ModernOrgAdminDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const [metrics, setMetrics] = useState<any>({});
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');

  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab]);

  useEffect(() => {
    api.get('/dashboard/metrics')
      .then(r => setMetrics(r.data.data || {}))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Admin</h1>
        <p className="text-muted-foreground mt-1">Manage your organization's operations, finance, HR, and sales.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="relative">
          <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden no-scrollbar h-auto py-1 gap-1 bg-transparent border-b rounded-none flex-nowrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="hierarchy" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Hierarchy</TabsTrigger>
            <TabsTrigger value="branches" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Branches</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Users</TabsTrigger>
            <TabsTrigger value="departments" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Departments</TabsTrigger>
            <TabsTrigger value="subdepartments" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Sub-Departments</TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Tasks</TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Students</TabsTrigger>
            <TabsTrigger value="universities" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Universities</TabsTrigger>
            <TabsTrigger value="programs" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Programs</TabsTrigger>
            <TabsTrigger value="sessions" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Sessions</TabsTrigger>
            <TabsTrigger value="centers" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Study Centers</TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Invoices</TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Payments</TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Expenses</TabsTrigger>
            <TabsTrigger value="employees" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Employees</TabsTrigger>
            <TabsTrigger value="leaves" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Leave Requests</TabsTrigger>
            <TabsTrigger value="leave_approvals" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Leave Approvals</TabsTrigger>
            <TabsTrigger value="leads" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Leads</TabsTrigger>
            <TabsTrigger value="center_admissions" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Centers Admissions</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-6">
              <OrgMetricCard 
                title="Total Employees" 
                value={metrics.totalEmployees || 0} 
                icon={<Users className="w-5 h-5 text-blue-500" />}
                subtext="Across all departments"
                onClick={() => setActiveTab('employees')}
                colorClass="from-blue-500/20 to-blue-500/5 border-blue-500/20"
              />
              <OrgMetricCard 
                title="Active Students" 
                value={metrics.totalStudents || 0} 
                icon={<GraduationCap className="w-5 h-5 text-emerald-500" />}
                subtext="Enrolled in programs"
                onClick={() => setActiveTab('students')}
                colorClass="from-emerald-500/20 to-emerald-500/5 border-emerald-500/20"
              />
              <OrgMetricCard 
                title="Study Centers" 
                value={metrics.totalCenters || 0} 
                icon={<MapPin className="w-5 h-5 text-purple-500" />}
                subtext="Registered across branches"
                onClick={() => setActiveTab('centers')}
                colorClass="from-purple-500/20 to-purple-500/5 border-purple-500/20"
              />
              <OrgMetricCard 
                title="Universities" 
                value={metrics.totalOrganizations || 0} 
                icon={<Building2 className="w-5 h-5 text-orange-500" />}
                subtext="Partner institutions"
                onClick={() => setActiveTab('universities')}
                colorClass="from-orange-500/20 to-orange-500/5 border-orange-500/20"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-xl bg-card/60 backdrop-blur-xl hover:border-primary/30 transition-colors">
                <CardHeader>
                  <CardTitle>Organization Performance</CardTitle>
                  <CardDescription>Academic and operational progress</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <PipelineStep 
                    label="Departments Setup" 
                    value={metrics.totalDepartments || 0}
                    percentage={Math.min(100, (metrics.totalDepartments || 0) * 10)}
                    color="bg-primary"
                    subtext="Active divisions"
                  />
                  <PipelineStep 
                    label="Academic Programs" 
                    value={metrics.totalPrograms || 0}
                    percentage={Math.min(100, (metrics.totalPrograms || 0) * 5)}
                    color="bg-blue-500"
                    subtext="Available courses"
                  />
                  <PipelineStep 
                    label="Active Leads" 
                    value={metrics.totalLeads || 0}
                    percentage={Math.min(100, Math.max(1, (metrics.totalLeads || 0) / 10))}
                    color="bg-emerald-500"
                    subtext="Prospective students"
                  />
                  <PipelineStep 
                    label="Pending Applications" 
                    value={metrics.pendingApplications || 0}
                    percentage={Math.min(100, Math.max(1, (metrics.pendingApplications || 0) * 5))}
                    color="bg-orange-500"
                    subtext="Awaiting review"
                  />
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h3 className="text-lg font-bold tracking-tight px-1">Quick Links</h3>
                <ActionItem 
                  icon={<Users className="w-5 h-5" />} 
                  title="Manage Staff" 
                  desc="Add or update employee records" 
                  action="View Employees"
                  onClick={() => setActiveTab('employees')} 
                />
                <ActionItem 
                  icon={<BookOpen className="w-5 h-5" />} 
                  title="Academic Setup" 
                  desc="Configure programs and sessions" 
                  action="View Programs"
                  onClick={() => setActiveTab('programs')} 
                />
                <ActionItem 
                  icon={<Target className="w-5 h-5" />} 
                  title="Sales & Leads" 
                  desc="Monitor prospective students" 
                  action="View Leads"
                  onClick={() => setActiveTab('leads')} 
                />
                <ActionItem 
                  icon={<Layers className="w-5 h-5" />} 
                  title="Org Structure" 
                  desc="View hierarchy and branches" 
                  action="View Hierarchy"
                  onClick={() => setActiveTab('hierarchy')} 
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users"><UsersPanel /></TabsContent>
        <TabsContent value="hierarchy"><OrgHierarchyPanel /></TabsContent>
        <TabsContent value="branches"><BranchesPanel /></TabsContent>
        <TabsContent value="departments"><DepartmentsPanel /></TabsContent>
        <TabsContent value="subdepartments"><SubDepartmentsPanel /></TabsContent>
        <TabsContent value="tasks"><TasksPanel /></TabsContent>
        <TabsContent value="students"><StudentsPanel /></TabsContent>
        <TabsContent value="universities"><UniversitiesPanel /></TabsContent>
        <TabsContent value="programs"><ProgramsPanel /></TabsContent>
        <TabsContent value="sessions"><OrgAdminSessionsPanel /></TabsContent>
        <TabsContent value="centers"><StudyCentersPanel /></TabsContent>
        <TabsContent value="invoices"><InvoicesPanel /></TabsContent>
        <TabsContent value="payments"><PaymentsPanel /></TabsContent>
        <TabsContent value="expenses"><ExpensesPanel /></TabsContent>
        <TabsContent value="employees"><EmployeesPanel /></TabsContent>
        <TabsContent value="leaves"><LeavesPanel /></TabsContent>
        <TabsContent value="leave_approvals"><LeaveApprovalsPanel /></TabsContent>
        <TabsContent value="leave-approvals"><LeaveApprovalsPanel /></TabsContent>
        <TabsContent value="leads"><LeadsPanel /></TabsContent>
        <TabsContent value="center_admissions"><CentersAdmissionsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function OrgMetricCard({ title, value, icon, subtext, onClick, colorClass = "from-primary/20 to-primary/5 border-primary/20" }: any) {
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden border shadow-lg bg-card/40 backdrop-blur-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer",
        colorClass.split(' ').find((c: string) => c.startsWith('border-')) || "border-border"
      )} 
      onClick={onClick}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-100 transition-opacity duration-500", colorClass.replace(/border-[^\s]+/g, ''))} />
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardContent className="p-6 relative z-10">
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
              {value.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-2 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 animate-pulse" />
              {subtext}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineStep({ label, value, percentage, color, subtext }: any) {
  let badgeClasses = "bg-primary/10 text-primary";
  if (color.includes('info') || color.includes('blue')) badgeClasses = "bg-blue-500/10 text-blue-500";
  if (color.includes('success') || color.includes('emerald')) badgeClasses = "bg-emerald-500/10 text-emerald-500";
  if (color.includes('warning') || color.includes('orange')) badgeClasses = "bg-orange-500/10 text-orange-500";

  return (
    <div className="space-y-3 group">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{label}</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtext}</p>
        </div>
        <div className="text-right flex items-center gap-3">
          <span className="text-lg font-black">{value.toLocaleString()}</span>
        </div>
      </div>
      <div className="h-2.5 w-full bg-muted/50 rounded-full overflow-hidden shadow-inner">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000 relative overflow-hidden", color)} 
          style={{ width: `${Math.max(percentage, 5)}%` }} 
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
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
