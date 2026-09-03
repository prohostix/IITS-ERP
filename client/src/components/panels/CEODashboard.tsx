import { useState, useEffect } from 'react';
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
import api from '@/lib/api';
import { toast } from 'sonner';

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
  const [metrics, setMetrics] = useState<any>({});
  const [escalations, setEscalations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [studyCenters, setStudyCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, escRes, empRes, centerRes] = await Promise.all([
        api.get('/dashboard/metrics'),
        api.get('/escalation'),
        api.get('/users'),
        api.get('/operations/centers')
      ]);
      setMetrics(metricsRes.data.data || {});
      setEscalations(escRes.data.data || []);
      setEmployees(empRes.data.data?.filter((u: any) => u.role !== 'student') || []);
      setStudyCenters(centerRes.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const escalationColumns = [
    { key: 'type', header: 'Type', render: (row: any) => (
      <Badge variant="outline" className="capitalize">{row.type?.replace('_', ' ') || 'General'}</Badge>
    )},
    { key: 'description', header: 'Description', render: (row: any) => row.description || row.title || 'N/A' },
    { 
      key: 'impact', 
      header: 'Impact',
      render: (row: any) => (
        <Badge className={
          row.priority === 'critical' || row.impact === 'critical' ? 'bg-red-100 text-red-800' :
          row.priority === 'high' || row.impact === 'high' ? 'bg-orange-100 text-orange-800' :
          row.priority === 'medium' || row.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-blue-100 text-blue-800'
        }>
          {row.priority || row.impact || 'low'}
        </Badge>
      )
    },
    { 
      key: 'createdAt', 
      header: 'Raised',
      render: (row: any) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'N/A'
    },
    { key: 'status', header: 'Status' },
  ];

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading dashboard...</div>;
  }

  const renderMainDashboard = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <MetricCardGrid columns={4}>
        <MetricCard
          title="Total Employees"
          value={metrics.totalEmployees || 0}
          icon={Users}
          trend="up"
          trendValue="Active"
          description="Across all departments"
        />
        <MetricCard
          title="Active Students"
          value={metrics.totalStudents || 0}
          icon={School}
          trend="up"
          trendValue="Current"
          description={`${metrics.pendingApplications || 0} pending applications`}
        />
        <MetricCard
          title="Monthly Revenue"
          value={`₹${(metrics.totalRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          trendValue="Total paid"
          description={`${metrics.pendingInvoices || 0} pending invoices`}
        />
        <MetricCard
          title="Active Centers"
          value={metrics.activeCenters || 0}
          icon={TrendingUp}
          trend="up"
          trendValue="Verified"
          description={`${metrics.pendingCenters || 0} pending approval`}
        />
      </MetricCardGrid>

      {/* Performance Metrics */}
      <MetricCardGrid columns={4}>
        <MetricCard
          title="Completed Tasks"
          value={metrics.completedTasks || 0}
          icon={CheckCircle}
          trend="up"
          trendValue="Total"
          badge={{ label: 'Good', variant: 'default' }}
        />
        <MetricCard
          title="Pending Tasks"
          value={metrics.pendingTasks || 0}
          icon={Clock}
          trend="down"
          trendValue="To do"
          badge={{ label: 'Action Needed', variant: 'destructive' }}
        />
        <MetricCard
          title="Converted Leads"
          value={metrics.convertedLeads || 0}
          icon={Target}
          trend="up"
          trendValue={`out of ${metrics.totalLeads || 0}`}
          badge={{ label: 'Good', variant: 'default' }}
        />
        <MetricCard
          title="Active Escalations"
          value={metrics.activeEscalations || 0}
          icon={AlertTriangle}
          trend="neutral"
          trendValue="Attention"
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
          <Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
        </CardHeader>
        <CardContent>
          <DataTable
            data={escalations.slice(0, 5)}
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
          <Button variant="outline" onClick={fetchData}>Refresh</Button>
          <Button variant="outline">Export</Button>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({escalations.filter((e: any) => e.status !== 'resolved').length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-4">
          <DataTable
            data={escalations.filter((e: any) => e.status !== 'resolved')}
            columns={escalationColumns}
            title="Active Escalations"
            searchFields={['description', 'title']}
          />
        </TabsContent>
        
        <TabsContent value="resolved" className="mt-4">
          <DataTable
            data={escalations.filter((e: any) => e.status === 'resolved')}
            columns={escalationColumns}
            title="Resolved Escalations"
            searchFields={['description', 'title']}
          />
        </TabsContent>
        
        <TabsContent value="all" className="mt-4">
          <DataTable
            data={escalations}
            columns={escalationColumns}
            title="All Escalations"
            searchFields={['description', 'title']}
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
              { key: 'id', header: 'ID', render: (row: any) => row.id.substring(0, 8) },
              { key: 'name', header: 'Name' },
              { key: 'role', header: 'Role', render: (row: any) => row.role.replace('_', ' ') },
              { key: 'status', header: 'Status' },
            ]}
            title="Employee Performance"
            searchFields={['name', 'role']}
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
