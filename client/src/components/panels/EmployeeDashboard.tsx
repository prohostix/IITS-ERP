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
import { Textarea } from '@/components/ui/textarea';
import {
  CheckSquare,
  Calendar,
  Clock,
  CheckCircle,
  Plus,
} from 'lucide-react';
import { tasks, leaveRequests, announcements, holidays, complaints } from '@/data/mockData';
import type { Task, LeaveRequest, Complaint } from '@/types/erp';

interface EmployeeDashboardProps {
  activeModule: string;
}

export function EmployeeDashboard({ activeModule }: EmployeeDashboardProps) {
  const [taskList] = useState<Task[]>(tasks.filter(t => t.assignedTo === 'user-emp-005'));
  const [leaveList] = useState<LeaveRequest[]>(leaveRequests);
  const [complaintList] = useState<Complaint[]>(complaints);

  const pendingTasks = taskList.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = taskList.filter(t => t.status === 'completed');
  const overdueTasks = taskList.filter(t => t.status === 'overdue');

  const taskColumns = [
    { key: 'title', header: 'Task' },
    { key: 'description', header: 'Description' },
    { 
      key: 'priority', 
      header: 'Priority',
      render: (row: Task) => (
        <Badge className={
          row.priority === 'critical' ? 'bg-red-100 text-red-800' :
          row.priority === 'high' ? 'bg-orange-100 text-orange-800' :
          row.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-blue-100 text-blue-800'
        }>
          {row.priority}
        </Badge>
      )
    },
    { key: 'status', header: 'Status' },
    { 
      key: 'deadline', 
      header: 'Deadline',
      render: (row: Task) => new Date(row.deadline).toLocaleDateString()
    },
  ];

  const leaveColumns = [
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

  const renderDashboard = () => (
    <div className="space-y-6">
      <MetricCardGrid columns={4}>
        <MetricCard
          title="Pending Tasks"
          value={pendingTasks.length}
          icon={CheckSquare}
          badge={overdueTasks.length > 0 ? { label: `${overdueTasks.length} overdue`, variant: 'destructive' } : undefined}
        />
        <MetricCard
          title="Completed Tasks"
          value={completedTasks.length}
          icon={CheckCircle}
          trend="up"
          trendValue="This month"
        />
        <MetricCard
          title="Leave Balance"
          value="12"
          icon={Calendar}
          description="Days remaining"
        />
        <MetricCard
          title="Attendance"
          value="98%"
          icon={Clock}
          trend="up"
          trendValue="+2% this month"
        />
      </MetricCardGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">My Tasks</CardTitle>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <DataTable
              data={pendingTasks}
              columns={taskColumns}
              searchable={false}
              pageSize={5}
              actions={(row) => [
                { label: 'Complete', onClick: () => console.log('Complete', row.id) },
                { label: 'Add Evidence', onClick: () => console.log('Evidence', row.id) },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Announcements</CardTitle>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {announcements.slice(0, 3).map((ann) => (
                <div key={ann.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="capitalize">{ann.type}</Badge>
                    <span className="text-xs text-slate-500">{ann.postedAt.toLocaleDateString()}</span>
                  </div>
                  <p className="font-medium">{ann.title}</p>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{ann.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Holidays</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto">
            {holidays.slice(0, 5).map((holiday) => (
              <div key={holiday.id} className="min-w-[150px] p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {holiday.date.getDate()}
                </p>
                <p className="text-sm text-slate-600">
                  {holiday.date.toLocaleDateString('en-US', { month: 'short' })}
                </p>
                <p className="font-medium mt-2">{holiday.name}</p>
                <Badge variant="outline" className="mt-2 capitalize">{holiday.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Tasks</h2>
      
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdueTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <DataTable
            data={pendingTasks}
            columns={taskColumns}
            title="Pending Tasks"
            searchFields={['title', 'description']}
            actions={(row) => [
              { label: 'Complete', onClick: () => console.log('Complete', row.id) },
              { 
                label: 'Add Evidence', 
                onClick: () => console.log('Evidence', row.id) 
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <DataTable
            data={completedTasks}
            columns={taskColumns}
            title="Completed Tasks"
            searchFields={['title']}
          />
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <DataTable
            data={overdueTasks}
            columns={taskColumns}
            title="Overdue Tasks"
            searchFields={['title']}
            actions={(row) => [
              { label: 'Complete Now', onClick: () => console.log('Complete', row.id) },
              { label: 'Request Extension', onClick: () => console.log('Extension', row.id) },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Attendance</h2>
      
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-green-600">22</p>
              <p className="text-sm text-slate-600">Present Days</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-red-600">1</p>
              <p className="text-sm text-slate-600">Absent Days</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-yellow-600">2</p>
              <p className="text-sm text-slate-600">Leave Days</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-3xl font-bold text-blue-600">98%</p>
              <p className="text-sm text-slate-600">Attendance %</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Check In</th>
                  <th className="px-4 py-2 text-left">Check Out</th>
                  <th className="px-4 py-2 text-left">Hours</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { date: '2024-04-22', status: 'present', checkIn: '09:00', checkOut: '18:00', hours: '9h' },
                  { date: '2024-04-21', status: 'present', checkIn: '09:15', checkOut: '18:30', hours: '9h 15m' },
                  { date: '2024-04-20', status: 'present', checkIn: '08:45', checkOut: '17:45', hours: '9h' },
                  { date: '2024-04-19', status: 'leave', checkIn: '-', checkOut: '-', hours: '-' },
                  { date: '2024-04-18', status: 'present', checkIn: '09:00', checkOut: '18:00', hours: '9h' },
                ].map((day, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{day.date}</td>
                    <td className="px-4 py-2">
                      <Badge className={
                        day.status === 'present' ? 'bg-green-100 text-green-800' :
                        day.status === 'leave' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {day.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">{day.checkIn}</td>
                    <td className="px-4 py-2">{day.checkOut}</td>
                    <td className="px-4 py-2">{day.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderLeaves = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Leaves</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="earned">Earned Leave</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea placeholder="Enter reason for leave" />
              </div>
              <Button className="w-full">Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DataTable
            data={leaveList}
            columns={leaveColumns}
            title="Leave History"
            searchFields={['reason']}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <DataTable
            data={leaveList.filter(l => l.status === 'pending')}
            columns={leaveColumns}
            title="Pending Requests"
            searchFields={['reason']}
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
      </Tabs>
    </div>
  );

  const renderComplaints = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Complaints</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Raise Complaint
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Raise a Complaint</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input placeholder="Enter subject" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="hr">HR Related</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe your complaint" />
              </div>
              <Button className="w-full">Submit Complaint</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={complaintList}
        columns={[
          { key: 'subject', header: 'Subject' },
          { key: 'category', header: 'Category', render: (row: Complaint) => (
            <Badge variant="outline" className="capitalize">{row.category}</Badge>
          )},
          { key: 'priority', header: 'Priority', render: (row: Complaint) => (
            <Badge className={
              row.priority === 'high' ? 'bg-red-100 text-red-800' :
              row.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }>
              {row.priority}
            </Badge>
          )},
          { key: 'status', header: 'Status' },
          { key: 'submittedAt', header: 'Date', render: (row: Complaint) => row.submittedAt.toLocaleDateString() },
        ]}
        title="Complaint History"
        searchFields={['subject', 'category']}
      />
    </div>
  );

  switch (activeModule) {
    case 'dashboard':
    case 'employee':
      return renderDashboard();
    case 'my-tasks':
      return renderTasks();
    case 'my-attendance':
      return renderAttendance();
    case 'my-leaves':
      return renderLeaves();
    case 'my-complaints':
      return renderComplaints();
    default:
      return renderDashboard();
  }
}
