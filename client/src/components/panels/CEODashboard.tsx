import { MetricCard, MetricCardGrid } from '@/components/dashboard/MetricCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  School,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Target,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';
import { employees, studyCenters, escalations, getDashboardMetrics } from '@/data/mockData';

interface CEODashboardProps {
  activeModule: string;
}

const revenueData = [
  { month: 'Jan', revenue: 450000, target: 500000 },
  { month: 'Feb', revenue: 520000, target: 500000 },
  { month: 'Mar', revenue: 480000, target: 550000 },
  { month: 'Apr', revenue: 649000, target: 600000 },
  { month: 'May', revenue: 580000, target: 600000 },
  { month: 'Jun', revenue: 720000, target: 700000 },
];

const studentData = [
  { month: 'Jan', admissions: 45, enrollments: 38 },
  { month: 'Feb', admissions: 52, enrollments: 48 },
  { month: 'Mar', admissions: 38, enrollments: 35 },
  { month: 'Apr', admissions: 65, enrollments: 58 },
  { month: 'May', admissions: 48, enrollments: 42 },
  { month: 'Jun', admissions: 72, enrollments: 68 },
];

const departmentPerformance = [
  { name: 'Operations', completion: 92, target: 90 },
  { name: 'Finance', completion: 88, target: 90 },
  { name: 'HR', completion: 95, target: 90 },
  { name: 'Sales', completion: 78, target: 85 },
];

const leadConversionData = [
  { name: 'Converted', value: 12, color: '#10b981' },
  { name: 'In Progress', value: 18, color: '#3b82f6' },
  { name: 'Lost', value: 8, color: '#ef4444' },
  { name: 'New', value: 15, color: '#f59e0b' },
];

export function CEODashboard({ activeModule }: CEODashboardProps) {
  const metrics = getDashboardMetrics('ceo', 'org-001');

  const escalationColumns = [
    { key: 'type', header: 'Type', render: (row: any) => (
      <Badge variant="outline" className="capitalize">{row.type.replace('_', ' ')}</Badge>
    )},
    { key: 'description', header: 'Description' },
    { 
      key: 'impact', 
      header: 'Impact',
      render: (row: any) => (
        <Badge className={
          row.impact === 'critical' ? 'bg-red-100 text-red-800' :
          row.impact === 'high' ? 'bg-orange-100 text-orange-800' :
          row.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-blue-100 text-blue-800'
        }>
          {row.impact}
        </Badge>
      )
    },
    { 
      key: 'raisedAt', 
      header: 'Raised',
      render: (row: any) => new Date(row.raisedAt).toLocaleDateString()
    },
    { key: 'status', header: 'Status' },
  ];

  const renderMainDashboard = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <MetricCardGrid columns={4}>
        <MetricCard
          title="Total Employees"
          value={metrics.totalEmployees || 0}
          icon={Users}
          trend="up"
          trendValue="+3 this month"
          description="Across all departments"
        />
        <MetricCard
          title="Active Students"
          value={metrics.activeStudents || 0}
          icon={School}
          trend="up"
          trendValue="+12 this month"
          description={`${metrics.pendingAdmissions} pending admissions`}
        />
        <MetricCard
          title="Monthly Revenue"
          value={`₹${(metrics.monthlyRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          trendValue="+8% vs last month"
          description={`${metrics.pendingInvoices} pending invoices`}
        />
        <MetricCard
          title="Active Centers"
          value={metrics.activeCenters || 0}
          icon={TrendingUp}
          trend="up"
          trendValue="+2 this quarter"
          description={`${metrics.pendingCenters} pending approval`}
        />
      </MetricCardGrid>

      {/* Performance Metrics */}
      <MetricCardGrid columns={4}>
        <MetricCard
          title="Task Completion Rate"
          value="87%"
          icon={CheckCircle}
          trend="up"
          trendValue="+5% this week"
          badge={{ label: 'On Track', variant: 'default' }}
        />
        <MetricCard
          title="Overdue Tasks"
          value={metrics.overdueTasks || 0}
          icon={Clock}
          trend="down"
          trendValue="-2 this week"
          badge={{ label: 'Action Needed', variant: 'destructive' }}
        />
        <MetricCard
          title="Lead Conversion"
          value="24%"
          icon={Target}
          trend="up"
          trendValue="+3% this month"
          badge={{ label: 'Good', variant: 'default' }}
        />
        <MetricCard
          title="Critical Escalations"
          value={metrics.criticalIssues || 0}
          icon={AlertTriangle}
          trend="neutral"
          trendValue="No change"
          badge={{ label: 'Monitor', variant: 'secondary' }}
        />
      </MetricCardGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Revenue vs Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                <Bar dataKey="target" fill="#e5e7eb" name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Admissions & Enrollments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={studentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="admissions" stroke="#3b82f6" name="Admissions" />
                <Line type="monotone" dataKey="enrollments" stroke="#10b981" name="Enrollments" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Department Performance & Lead Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Department Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentPerformance.map((dept) => (
                <div key={dept.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{dept.name}</span>
                    <span className={dept.completion >= dept.target ? 'text-green-600' : 'text-orange-600'}>
                      {dept.completion}% / {dept.target}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dept.completion >= dept.target ? 'bg-green-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min(dept.completion, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Lead Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RePieChart>
                <Pie
                  data={leadConversionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leadConversionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Escalations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Recent Escalations
          </CardTitle>
          <Button variant="outline" size="sm">View All</Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={escalations}
            columns={escalationColumns}
            searchable={false}
            pageSize={5}
          />
        </CardContent>
      </Card>
    </div>
  );

  const renderEscalations = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Escalations</h2>
        <div className="flex gap-2">
          <Button variant="outline">Filter</Button>
          <Button variant="outline">Export</Button>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({escalations.filter(e => e.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-4">
          <DataTable
            data={escalations.filter(e => e.status === 'active')}
            columns={escalationColumns}
            title="Active Escalations"
            searchFields={['description', 'type']}
          />
        </TabsContent>
        
        <TabsContent value="resolved" className="mt-4">
          <div className="text-center py-12 text-slate-500">
            No resolved escalations yet
          </div>
        </TabsContent>
        
        <TabsContent value="all" className="mt-4">
          <DataTable
            data={escalations}
            columns={escalationColumns}
            title="All Escalations"
            searchFields={['description', 'type']}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Reports</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Financial Report', description: 'Revenue, expenses, and cash flow', icon: DollarSign },
          { title: 'Admission Report', description: 'Student admissions and enrollments', icon: School },
          { title: 'Employee Performance', description: 'Task completion and productivity', icon: Users },
          { title: 'Center Performance', description: 'Revenue and student metrics by center', icon: TrendingUp },
          { title: 'Sales Report', description: 'Leads, conversions, and revenue', icon: Target },
          { title: 'Compliance Report', description: 'Audit trails and compliance status', icon: CheckCircle },
        ].map((report) => (
          <Card key={report.title} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <report.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{report.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{report.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Performance Metrics</h2>
      
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="centers">Centers</TabsTrigger>
        </TabsList>
        
        <TabsContent value="employees" className="mt-4">
          <DataTable
            data={employees}
            columns={[
              { key: 'employeeId', header: 'ID' },
              { key: 'name', header: 'Name' },
              { key: 'designation', header: 'Designation' },
              { key: 'departmentId', header: 'Department', render: () => 'Operations' },
              { key: 'status', header: 'Status' },
            ]}
            title="Employee Performance"
            searchFields={['name', 'employeeId', 'designation']}
          />
        </TabsContent>
        
        <TabsContent value="departments" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                {departmentPerformance.map((dept) => (
                  <div key={dept.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-lg">{dept.name}</span>
                      <Badge className={dept.completion >= dept.target ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                        {dept.completion >= dept.target ? 'On Track' : 'Below Target'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Completion Rate</span>
                      <span>{dept.completion}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          dept.completion >= dept.target ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(dept.completion, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="centers" className="mt-4">
          <DataTable
            data={studyCenters}
            columns={[
              { key: 'code', header: 'Code' },
              { key: 'name', header: 'Center Name' },
              { key: 'status', header: 'Status' },
              { key: 'students', header: 'Students', render: (row) => row.students?.length || 0 },
              { key: 'referredBy', header: 'Referred By', render: (row) => row.referredBy || 'Direct' },
            ]}
            title="Center Performance"
            searchFields={['name', 'code']}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  switch (activeModule) {
    case 'dashboard':
    case 'ceo-dashboard':
      return renderMainDashboard();
    case 'escalations':
      return renderEscalations();
    case 'reports':
      return renderReports();
    case 'performance':
      return renderPerformance();
    default:
      return renderMainDashboard();
  }
}
