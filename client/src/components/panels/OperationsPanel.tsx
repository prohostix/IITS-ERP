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
import {
  GraduationCap,
  Building,
  Users,
  Plus,
  Calendar,
  Search,
  Filter,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface OperationsPanelProps {
  activeModule: string;
}

export function OperationsPanel({ activeModule }: OperationsPanelProps) {
  const [uniList, setUniList] = useState<any[]>([]);
  const [centerList, setCenterList] = useState<any[]>([]);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [sessionList, setSessionList] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        metricsRes,
        uniRes,
        centerRes,
        studentRes,
        sessionRes,
        tasksRes,
      ] = await Promise.all([
        api.get('/dashboard/metrics'),
        api.get('/operations/universities'),
        api.get('/operations/centers'),
        api.get('/student'),
        api.get('/operations/sessions'),
        api.get('/tasks').catch(() => ({ data: { data: [] } })),
      ]);
      setMetrics(metricsRes.data.data || {});
      setUniList(uniRes.data.data || []);
      setCenterList(centerRes.data.data || []);
      setStudentList(studentRes.data.data || []);
      setSessionList(sessionRes.data.data || []);
      setTasksList(tasksRes.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch operations data');
    } finally {
      setLoading(false);
    }
  };

  const pendingStudents = studentList.filter(s => s.status === 'pending');
  const pendingCenters = centerList.filter(c => c.status === 'pending');

  const universityColumns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'University Name' },
    { key: 'contact', header: 'Contact' },
    { key: 'status', header: 'Status' },
  ];

  const centerColumns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Center Name' },
    { key: 'contact', header: 'Contact' },
    { key: 'email', header: 'Email' },
    { 
      key: 'status', 
      header: 'Status',
      render: (row: any) => (
        <Badge className={
          row.status === 'active' ? 'bg-green-100 text-green-800' :
          row.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }>
          {row.status}
        </Badge>
      )
    },
  ];

  const studentColumns = [
    { key: 'enrollmentNo', header: 'Enrollment No' },
    { key: 'name', header: 'Student Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { 
      key: 'status', 
      header: 'Status',
      render: (row: any) => (
        <Badge className={
          row.status === 'active' ? 'bg-green-100 text-green-800' :
          row.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          row.status === 'completed' ? 'bg-blue-100 text-blue-800' :
          'bg-red-100 text-red-800'
        }>
          {row.status}
        </Badge>
      )
    },
  ];

  const sessionColumns = [
    { key: 'name', header: 'Session Name' },
    { 
      key: 'startDate', 
      header: 'Start Date',
      render: (row: any) => row.startDate ? new Date(row.startDate).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'endDate', 
      header: 'End Date',
      render: (row: any) => row.endDate ? new Date(row.endDate).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'examDate', 
      header: 'Exam Date',
      render: (row: any) => row.examDate ? new Date(row.examDate).toLocaleDateString() : '-'
    },
    { key: 'status', header: 'Status' },
  ];

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading operations data...</div>;
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <MetricCardGrid columns={4}>
        <MetricCard
          title="Total Universities"
          value={uniList.length}
          icon={GraduationCap}
          description="Active partnerships"
        />
        <MetricCard
          title="Study Centers"
          value={centerList.length}
          icon={Building}
          badge={{ label: `${pendingCenters.length} pending`, variant: 'secondary' }}
        />
        <MetricCard
          title="Total Students"
          value={studentList.length}
          icon={Users}
          badge={{ label: `${pendingStudents.length} pending`, variant: 'secondary' }}
        />
        <MetricCard
          title="Active Sessions"
          value={sessionList.filter(s => s.status === 'active').length}
          icon={Calendar}
          description={`${sessionList.filter(s => s.status === 'pending').length} pending approval`}
        />
      </MetricCardGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Pending Admissions</CardTitle>
            <Badge variant="secondary">{pendingStudents.length}</Badge>
          </CardHeader>
          <CardContent>
            <DataTable
              data={pendingStudents}
              columns={studentColumns.slice(0, 4)}
              searchable={false}
              pageSize={5}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Pending Center Approvals</CardTitle>
            <Badge variant="secondary">{pendingCenters.length}</Badge>
          </CardHeader>
          <CardContent>
            <DataTable
              data={pendingCenters}
              columns={centerColumns.slice(0, 4)}
              searchable={false}
              pageSize={5}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={tasksList.filter((t: any) => t.departmentId === 'dept-ops-001').slice(0, 5)}
            columns={[
              { key: 'title', header: 'Task' },
              { key: 'assignedTo', header: 'Assigned To', render: () => 'Operations Executive' },
              { key: 'priority', header: 'Priority' },
              { key: 'status', header: 'Status' },
              { 
                key: 'deadline', 
                header: 'Deadline',
                render: (row) => row.deadline ? new Date(row.deadline).toLocaleDateString() : 'N/A'
              },
            ]}
            searchable={false}
            pageSize={5}
          />
        </CardContent>
      </Card>
    </div>
  );

  const renderUniversities = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Universities</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add University
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New University</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>University Name</Label>
                <Input placeholder="Enter university name" />
              </div>
              <div className="space-y-2">
                <Label>University Code</Label>
                <Input placeholder="e.g., IGNOU" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input placeholder="Enter address" />
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input placeholder="Enter contact number" />
              </div>
              <Button className="w-full">Add University</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={uniList}
        columns={universityColumns}
        title="All Universities"
        searchFields={['name', 'code']}
        actions={(row) => [
        ]}
      />
    </div>
  );

  const renderCenters = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Study Centers</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Center
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({centerList.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({centerList.filter(c => c.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCenters.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DataTable
            data={centerList}
            columns={centerColumns}
            title="All Centers"
            searchFields={['name', 'code', 'email']}
            actions={(row) => [
            ].filter(Boolean)}
          />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <DataTable
            data={centerList.filter(c => c.status === 'active')}
            columns={centerColumns}
            title="Active Centers"
            searchFields={['name', 'code']}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <DataTable
            data={pendingCenters}
            columns={centerColumns}
            title="Pending Approvals"
            searchFields={['name', 'code']}
            actions={(row) => [
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderStudents = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Students</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({studentList.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({studentList.filter(s => s.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingStudents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DataTable
            data={studentList}
            columns={studentColumns}
            title="All Students"
            searchFields={['name', 'enrollmentNo', 'email']}
            actions={(row) => [
            ]}
          />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <DataTable
            data={studentList.filter(s => s.status === 'active')}
            columns={studentColumns}
            title="Active Students"
            searchFields={['name', 'enrollmentNo']}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <DataTable
            data={pendingStudents}
            columns={studentColumns}
            title="Pending Admissions"
            searchFields={['name', 'enrollmentNo']}
            actions={(row) => [
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderMarks = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Internal Marks</h2>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Select>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select Center" />
              </SelectTrigger>
              <SelectContent>
                {centerList.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prog-001">Bachelor of Arts</SelectItem>
                <SelectItem value="prog-002">Bachelor of Commerce</SelectItem>
                <SelectItem value="prog-003">Bachelor of Science</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Search className="w-4 h-4 mr-2" />
              Load Students
            </Button>
          </div>

          <DataTable
            data={studentList.filter(s => s.status === 'active')}
            columns={[
              { key: 'enrollmentNo', header: 'Enrollment No' },
              { key: 'name', header: 'Student Name' },
              { key: 'centerId', header: 'Center', render: () => 'Delhi Center' },
              { 
                key: 'internalMarks', 
                header: 'Internal Marks',
                render: () => (
                  <Input type="number" className="w-20" placeholder="0-30" />
                )
              },
              { 
                key: 'practicalMarks', 
                header: 'Practical Marks',
                render: () => (
                  <Input type="number" className="w-20" placeholder="0-20" />
                )
              },
            ]}
            title="Enter Marks"
            searchFields={['name', 'enrollmentNo']}
          />

          <div className="flex justify-end mt-4">
            <Button>Save Marks</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSessions = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Admission Sessions</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Admission Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Session Name</Label>
                <Input placeholder="e.g., Batch 2024-A" />
              </div>
              <div className="space-y-2">
                <Label>Sub-Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skill">Skill Development</SelectItem>
                    <SelectItem value="openschool">Open School</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="bvoc">BVoc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label>Exam Date</Label>
                <Input type="date" />
              </div>
              <Button className="w-full">Create Session</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={sessionList}
        columns={sessionColumns}
        title="All Sessions"
        searchFields={['name']}
        actions={(row) => [
        ].filter(Boolean)}
      />
    </div>
  );

  switch (activeModule) {
    case 'dashboard':
    case 'operations':
      return renderDashboard();
    case 'universities':
      return renderUniversities();
    case 'centers':
      return renderCenters();
    case 'students':
      return renderStudents();
    case 'marks':
      return renderMarks();
    case 'sessions':
      return renderSessions();
    default:
      return renderDashboard();
  }
}
