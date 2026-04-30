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
import { LeadsPanel } from '@/components/panels/LeadsPanel';
import { OrgHierarchyPanel } from '@/components/panels/OrgHierarchyPanel';
import { BranchesPanel } from '@/components/panels/BranchesPanel';
import { SubDepartmentsPanel } from '@/components/panels/SubDepartmentsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PunchWidget } from '@/components/attendance/PunchWidget';
import api from '@/lib/api';

export function ModernOrgAdminDashboard({ initialTab }: { initialTab?: string }) {
  const [metrics, setMetrics] = useState<any>({});
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
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
            <TabsTrigger value="centers" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Study Centers</TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Invoices</TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Payments</TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Expenses</TabsTrigger>
            <TabsTrigger value="employees" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Employees</TabsTrigger>
            <TabsTrigger value="leaves" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Leave Requests</TabsTrigger>
            <TabsTrigger value="leads" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">Leads</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                <MetricCard title="Total Users" value={metrics.totalEmployees || 0} />
                <MetricCard title="Students" value={metrics.totalStudents || 0} />
                <MetricCard title="Study Centers" value={metrics.totalCenters || 0} />
                <MetricCard title="Leads" value={metrics.totalLeads || 0} />
              </div>
            </div>
            <PunchWidget />
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
        <TabsContent value="centers"><StudyCentersPanel /></TabsContent>
        <TabsContent value="invoices"><InvoicesPanel /></TabsContent>
        <TabsContent value="payments"><PaymentsPanel /></TabsContent>
        <TabsContent value="expenses"><ExpensesPanel /></TabsContent>
        <TabsContent value="employees"><EmployeesPanel /></TabsContent>
        <TabsContent value="leaves"><LeavesPanel /></TabsContent>
        <TabsContent value="leads"><LeadsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
