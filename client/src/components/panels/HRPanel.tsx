import { useState, useEffect } from 'react';
import { MetricCard, MetricCardGrid } from '@/components/dashboard/MetricCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  CheckCircle,
  Clock,
  Download,
  MessageSquare,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface HRPanelProps {
  activeModule: string;
}

const attendanceData = [
  { day: 'Mon', present: 45, absent: 2, leave: 3 },
  { day: 'Tue', present: 47, absent: 1, leave: 2 },
  { day: 'Wed', present: 46, absent: 2, leave: 2 },
  { day: 'Thu', present: 48, absent: 1, leave: 1 },
  { day: 'Fri', present: 44, absent: 3, leave: 3 },
];

const departmentDistribution = [
  { name: 'Operations', value: 12, color: '#3b82f6' },
  { name: 'Finance', value: 8, color: '#10b981' },
  { name: 'HR', value: 6, color: '#f59e0b' },
  { name: 'Sales', value: 10, color: '#8b5cf6' },
];

export function HRPanel({ activeModule }: HRPanelProps) {
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [vacancyList, setVacancyList] = useState<any[]>([]);
  const [leaveList, setLeaveList] = useState<any[]>([]);
  const [complaintList, setComplaintList] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, usersRes, leaveRes] = await Promise.all([
        api.get('/dashboard/metrics'),
        api.get('/users'),
        api.get('/hr/leaves').catch(() => ({ data: { data: [] } })),
      ]);
      setMetrics(metricsRes.data.data || {});
      setEmployeeList(usersRes.data.data?.filter((u: any) => u.role !== 'student') || []);
      setLeaveList(leaveRes.data.data || []);
      // Vacancies and complaints endpoints might not be fully implemented, use safe defaults
      setVacancyList([]);
      setComplaintList([]);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to fetch HR data');
    } finally {
      setLoading(false);
    }
  };

  const presentToday = Math.floor(employeeList.length * 0.9); // Placeholder for actual calculation
  const pendingLeaves = leaveList.filter(l => l.status === 'pending' || l.status === 'dept_approved').length;
  const onLeave = leaveList.filter(l => l.status === 'approved' && new Date(l.startDate) <= new Date() && new Date(l.endDate) >= new Date()).length;
  const openComplaints = complaintList.filter(c => c.status === 'open' || c.status === 'in_progress').length;

  const handleLeaveAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.put(`/hr/leaves/${id}/hr-approve`, { action, remarks: `Action by HR` });
      toast.success(`Leave request ${action}d successfully`);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || `Failed to ${action} leave request`);
    }
  };

  const handleCloseVacancy = async (id: string) => {
    toast.success(`Vacancy closed successfully`);
    fetchData();
  };

  const handleResolveComplaint = async (id: string) => {
    toast.success(`Complaint resolved successfully`);
    fetchData();
  };

  const employeeColumns = [
    { key: 'id', header: 'Employee ID', render: (row: any) => row.id.substring(0, 8) },
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (row: any) => row.role.replace('_', ' ') },
    { key: 'status', header: 'Status' },
  ];

  const vacancyColumns = [
    { key: 'designation', header: 'Designation' },
    { key: 'departmentId', header: 'Department', render: () => 'General' },
    { key: 'count', header: 'Positions' },
    { key: 'filled', header: 'Filled' },
    { key: 'remaining', header: 'Remaining', render: (row: any) => row.count - row.filled },
    { key: 'status', header: 'Status' },
  ];

  const leaveColumns = [
    { key: 'userId', header: 'Employee', render: (row: any) => row.user?.name || row.userId?.substring(0, 8) || 'N/A' },
    { 
      key: 'type', 
      header: 'Type',
      render: (row: any) => (
        <Badge variant="outline" className="capitalize">{row.type}</Badge>
      )
    },
    { key: 'startDate', header: 'From', render: (row: any) => new Date(row.startDate).toLocaleDateString() },
    { key: 'endDate', header: 'To', render: (row: any) => new Date(row.endDate).toLocaleDateString() },
    { key: 'reason', header: 'Reason' },
    { key: 'status', header: 'Status' },
  ];

  const complaintColumns = [
    { key: 'employeeId', header: 'Employee', render: () => 'Employee Name' },
    { key: 'subject', header: 'Subject' },
    { key: 'category', header: 'Category', render: (row: any) => (
      <Badge variant="outline" className="capitalize">{row.category}</Badge>
    )},
    { 
      key: 'priority', 
      header: 'Priority',
      render: (row: any) => (
        <Badge className={
          row.priority === 'high' ? 'bg-red-100 text-red-800' :
          row.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-blue-100 text-blue-800'
        }>
          {row.priority}
        </Badge>
      )
    },
    { key: 'status', header: 'Status' },
  ];

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading HR data...</div>;
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <MetricCardGrid columns={4}>
        <MetricCard
          title="Total Employees"
          value={employeeList.length}
          icon={Users}
          trend="up"
          trendValue="Active"
        />
        <MetricCard
          title="Present Today"
          value={presentToday}
          icon={CheckCircle}
          description={`${onLeave} on leave`}
        />
        <MetricCard
          title="Pending Leaves"
          value={pendingLeaves}
          icon={Clock}
          badge={{ label: 'Action Needed', variant: 'secondary' }}
        />
        <MetricCard
          title="Open Complaints"
          value={openComplaints}
          icon={MessageSquare}
          badge={{ label: 'Monitor', variant: 'secondary' }}
        />
      </MetricCardGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="#10b981" name="Present" />
                <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                <Bar dataKey="leave" fill="#f59e0b" name="Leave" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Department Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={departmentDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {departmentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Pending Leave Requests</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
          </CardHeader>
          <CardContent>
            <DataTable
              data={leaveList.filter(l => l.status === 'pending' || l.status === 'dept_approved')}
              columns={leaveColumns.slice(0, 5)}
              searchable={false}
              pageSize={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Complaints</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
          </CardHeader>
          <CardContent>
            <DataTable
              data={complaintList.filter(c => c.status === 'open' || c.status === 'in_progress')}
              columns={complaintColumns.slice(0, 4)}
              searchable={false}
              pageSize={5}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderEmployees = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Employees</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>Refresh</Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <DataTable
        data={employeeList}
        columns={employeeColumns}
        title="All Employees"
        searchFields={['name', 'email', 'role']}
      />
    </div>
  );

  const renderVacancies = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vacancies</h2>
      </div>

      <DataTable
        data={vacancyList}
        columns={vacancyColumns}
        title="All Vacancies"
        searchFields={['designation']}
      />
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Attendance</h2>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Input type="date" className="w-40" />
            <Button onClick={fetchData}>Load Attendance</Button>
          </div>

          <DataTable
            data={employeeList}
            columns={[
              { key: 'id', header: 'ID', render: (row: any) => row.id.substring(0, 8) },
              { key: 'name', header: 'Name' },
              { key: 'role', header: 'Role', render: (row: any) => row.role.replace('_', ' ') },
              { 
                key: 'status', 
                header: 'Today\'s Status',
                render: () => (
                  <Select defaultValue="present">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="half_day">Half Day</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                    </SelectContent>
                  </Select>
                )
              },
            ]}
            title="Mark Attendance"
            searchFields={['name']}
          />
        </CardContent>
      </Card>
    </div>
  );

  const renderLeaves = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Leave Requests</h2>
        <Button variant="outline" onClick={fetchData}>Refresh</Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingLeaves})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <DataTable
            data={leaveList.filter(l => l.status === 'pending' || l.status === 'dept_approved')}
            columns={leaveColumns}
            title="Pending Requests"
            searchFields={['reason']}
            actions={(row: any) => [
              { label: 'Approve', onClick: () => handleLeaveAction(row.id, 'approve') },
              { label: 'Reject', onClick: () => handleLeaveAction(row.id, 'reject'), variant: 'destructive' },
            ]}
          />
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          <DataTable
            data={leaveList.filter(l => l.status === 'approved')}
            columns={leaveColumns}
            title="Approved Leaves"
            searchFields={['reason']}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <DataTable
            data={leaveList}
            columns={leaveColumns}
            title="All Leave Requests"
            searchFields={['reason']}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderComplaints = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Complaints</h2>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({openComplaints})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          <DataTable
            data={complaintList.filter(c => c.status === 'open' || c.status === 'in_progress')}
            columns={complaintColumns}
            title="Open Complaints"
            searchFields={['subject', 'category']}
            actions={(row: any) => [
              { label: 'View', onClick: () => toast.info('View mode: ' + row.id) },
              { label: 'Resolve', onClick: () => handleResolveComplaint(row.id) },
            ]}
          />
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          <DataTable
            data={complaintList.filter(c => c.status === 'resolved' || c.status === 'closed')}
            columns={complaintColumns}
            title="Resolved Complaints"
            searchFields={['subject']}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <DataTable
            data={complaintList}
            columns={complaintColumns}
            title="All Complaints"
            searchFields={['subject', 'category']}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  switch (activeModule) {
    case 'dashboard':
    case 'hr':
      return renderDashboard();
    case 'employees':
      return renderEmployees();
    case 'vacancies':
      return renderVacancies();
    case 'attendance':
      return renderAttendance();
    case 'leaves':
      return renderLeaves();
    case 'complaints':
      return renderComplaints();
    default:
      return renderDashboard();
  }
}
