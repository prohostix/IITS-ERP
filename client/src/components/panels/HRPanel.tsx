import { useState } from 'react';
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
import { employees, vacancies, leaveRequests, complaints, departments } from '@/data/mockData';
import type { Employee, Vacancy, LeaveRequest, Complaint } from '@/types/erp';

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
  const [employeeList] = useState<Employee[]>(employees);
  const [vacancyList] = useState<Vacancy[]>(vacancies);
  const [leaveList] = useState<LeaveRequest[]>(leaveRequests);
  const [complaintList] = useState<Complaint[]>(complaints);

  const presentToday = 42;
  const onLeave = 3;
  const pendingLeaves = leaveList.filter(l => l.status === 'pending' || l.status === 'dept_approved').length;
  const openComplaints = complaintList.filter(c => c.status === 'open' || c.status === 'in_progress').length;

  const employeeColumns = [
    { key: 'employeeId', header: 'Employee ID' },
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'designation', header: 'Designation' },
    { 
      key: 'departmentId', 
      header: 'Department',
      render: (row: Employee) => {
        const dept = departments.find(d => d.id === row.departmentId);
        return dept?.name || 'N/A';
      }
    },
    { key: 'status', header: 'Status' },
  ];

  const vacancyColumns = [
    { key: 'designation', header: 'Designation' },
    { 
      key: 'departmentId', 
      header: 'Department',
      render: (row: Vacancy) => {
        const dept = departments.find(d => d.id === row.departmentId);
        return dept?.name || 'N/A';
      }
    },
    { key: 'count', header: 'Positions' },
    { key: 'filled', header: 'Filled' },
    { 
      key: 'remaining', 
      header: 'Remaining',
      render: (row: Vacancy) => row.count - row.filled
    },
    { key: 'status', header: 'Status' },
  ];

  const leaveColumns = [
    { 
      key: 'employeeId', 
      header: 'Employee',
      render: () => 'Employee Name'
    },
    { 
      key: 'type', 
      header: 'Type',
      render: (row: LeaveRequest) => (
        <Badge variant="outline" className="capitalize">{row.type}</Badge>
      )
    },
    { 
      key: 'startDate', 
      header: 'From',
      render: (row: LeaveRequest) => row.startDate.toLocaleDateString()
    },
    { 
      key: 'endDate', 
      header: 'To',
      render: (row: LeaveRequest) => row.endDate.toLocaleDateString()
    },
    { key: 'reason', header: 'Reason' },
    { key: 'status', header: 'Status' },
  ];

  const complaintColumns = [
    { key: 'employeeId', header: 'Employee', render: () => 'Employee Name' },
    { key: 'subject', header: 'Subject' },
    { key: 'category', header: 'Category', render: (row: Complaint) => (
      <Badge variant="outline" className="capitalize">{row.category}</Badge>
    )},
    { 
      key: 'priority', 
      header: 'Priority',
      render: (row: Complaint) => (
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

  const renderDashboard = () => (
    <div className="space-y-6">
      <MetricCardGrid columns={4}>
        <MetricCard
          title="Total Employees"
          value={employeeList.length}
          icon={Users}
          trend="up"
          trendValue="+3 this month"
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
            <Button variant="outline" size="sm">View All</Button>
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
            <Button variant="outline" size="sm">View All</Button>
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
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input placeholder="Enter full name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="Enter email" />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input placeholder="Enter designation" />
                </div>
                <div className="space-y-2">
                  <Label>Join Date</Label>
                  <Input type="date" />
                </div>
                <Button className="w-full">Add Employee</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DataTable
        data={employeeList}
        columns={employeeColumns}
        title="All Employees"
        searchFields={['name', 'employeeId', 'email', 'designation']}
        actions={(row) => [
          { label: 'View', onClick: () => console.log('View', row.id) },
          { label: 'Edit', onClick: () => console.log('Edit', row.id) },
          { label: 'Delete', onClick: () => console.log('Delete', row.id), variant: 'destructive' },
        ]}
      />
    </div>
  );

  const renderVacancies = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vacancies</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Vacancy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Vacancy</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input placeholder="Enter designation" />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Number of Positions</Label>
                <Input type="number" placeholder="Enter count" />
              </div>
              <Button className="w-full">Create Vacancy</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={vacancyList}
        columns={vacancyColumns}
        title="All Vacancies"
        searchFields={['designation']}
        actions={(row) => [
          { label: 'View', onClick: () => console.log('View', row.id) },
          { label: 'Edit', onClick: () => console.log('Edit', row.id) },
          { label: 'Close', onClick: () => console.log('Close', row.id) },
        ]}
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
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button>Load Attendance</Button>
          </div>

          <DataTable
            data={employeeList}
            columns={[
              { key: 'employeeId', header: 'ID' },
              { key: 'name', header: 'Name' },
              { key: 'designation', header: 'Designation' },
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
              { 
                key: 'checkIn', 
                header: 'Check In',
                render: () => <Input type="time" className="w-32" />
              },
              { 
                key: 'checkOut', 
                header: 'Check Out',
                render: () => <Input type="time" className="w-32" />
              },
            ]}
            title="Mark Attendance"
            searchFields={['name', 'employeeId']}
          />

          <div className="flex justify-end mt-4">
            <Button>Save Attendance</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderLeaves = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Leave Requests</h2>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
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
            actions={(row) => [
              { label: 'Approve', onClick: () => console.log('Approve', row.id) },
              { label: 'Reject', onClick: () => console.log('Reject', row.id), variant: 'destructive' },
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
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
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
            actions={(row) => [
              { label: 'View', onClick: () => console.log('View', row.id) },
              { label: 'Resolve', onClick: () => console.log('Resolve', row.id) },
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
